/**
 * RequestCapture
 * 处理网络请求捕获逻辑
 */

import { URLFilter } from '../utils/filter.js';
import { DataFormatter } from '../utils/formatter.js';
import { StorageManager } from './storage.js';

export class RequestCapture {
  static isCapturing = false;
  static config = null;
  static pendingRequests = new Map(); // 存储进行中的请求

  /**
   * 开始捕获网络请求
   */
  static startCapture(config) {
    console.log('Starting capture with config:', config);
    this.isCapturing = true;
    this.config = config;

    // 注册webRequest监听器
    this.registerListeners();
  }

  /**
   * 停止捕获
   */
  static stopCapture() {
    console.log('Stopping capture');
    this.isCapturing = false;
    
    // 注意：webRequest监听器一旦注册就无法移除
    // 我们通过 isCapturing 标志来控制是否处理请求
  }

  /**
   * 注册webRequest监听器
   */
  static registerListeners() {
    // 监听请求发送前
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => this.onBeforeRequest(details),
      { urls: ['<all_urls>'] },
      ['requestBody']
    );

    // 监听请求发送时（获取请求头）
    chrome.webRequest.onSendHeaders.addListener(
      (details) => this.onSendHeaders(details),
      { urls: ['<all_urls>'] },
      ['requestHeaders']
    );

    // 监听响应头接收
    chrome.webRequest.onHeadersReceived.addListener(
      (details) => this.onHeadersReceived(details),
      { urls: ['<all_urls>'] },
      ['responseHeaders']
    );

    // 监听请求完成
    chrome.webRequest.onCompleted.addListener(
      (details) => this.onCompleted(details),
      { urls: ['<all_urls>'] },
      ['responseHeaders']
    );

    // 监听请求错误
    chrome.webRequest.onErrorOccurred.addListener(
      (details) => this.onError(details),
      { urls: ['<all_urls>'] }
    );

    console.log('WebRequest listeners registered');
  }

  /**
   * 检查URL是否匹配过滤规则
   */
  static matchesFilter(url, patterns) {
    if (!patterns || patterns.length === 0) {
      return true;
    }
    return URLFilter.matches(url, patterns);
  }

  /**
   * 检查是否应该捕获此请求
   */
  static shouldCapture(url) {
    if (!this.isCapturing) {
      return false;
    }

    // 过滤掉Chrome内部请求
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return false;
    }

    // 检查URL过滤规则
    const patterns = this.config?.urlPatterns || [];
    return this.matchesFilter(url, patterns);
  }

  /**
   * 请求发送前（捕获请求体）
   */
  static onBeforeRequest(details) {
    if (!this.shouldCapture(details.url)) {
      return;
    }

    const requestData = {
      id: details.requestId,
      url: details.url,
      method: details.method,
      type: details.type,
      timestamp: details.timeStamp,
      tabId: details.tabId,
      frameId: details.frameId,
      requestBody: this.parseRequestBody(details.requestBody)
    };

    this.pendingRequests.set(details.requestId, requestData);
    console.log('Request started:', details.requestId, details.url);
  }

  /**
   * 请求发送时（捕获请求头）
   */
  static onSendHeaders(details) {
    if (!this.shouldCapture(details.url)) {
      return;
    }

    const requestData = this.pendingRequests.get(details.requestId);
    if (requestData) {
      requestData.requestHeaders = this.formatHeaders(details.requestHeaders);
      requestData.sendTimestamp = details.timeStamp;
    }
  }

  /**
   * 响应头接收（捕获响应头）
   */
  static onHeadersReceived(details) {
    if (!this.shouldCapture(details.url)) {
      return;
    }

    const requestData = this.pendingRequests.get(details.requestId);
    if (requestData) {
      requestData.statusCode = details.statusCode;
      requestData.statusLine = details.statusLine;
      requestData.responseHeaders = this.formatHeaders(details.responseHeaders);
      requestData.responseTimestamp = details.timeStamp;
    }
  }

  /**
   * 请求完成
   */
  static async onCompleted(details) {
    if (!this.shouldCapture(details.url)) {
      return;
    }

    const requestData = this.pendingRequests.get(details.requestId);
    if (requestData) {
      requestData.completed = true;
      requestData.completedTimestamp = details.timeStamp;
      requestData.duration = details.timeStamp - requestData.timestamp;
      requestData.fromCache = details.fromCache;
      requestData.ip = details.ip;

      // 尝试获取响应体
      await this.fetchResponseBody(requestData);

      // 保存请求数据
      await StorageManager.saveRequest(requestData);

      // 清理已完成的请求
      this.pendingRequests.delete(details.requestId);

      console.log('Request completed:', details.requestId, requestData);
    }
  }

  /**
   * 请求错误
   */
  static onError(details) {
    if (!this.shouldCapture(details.url)) {
      return;
    }

    const requestData = this.pendingRequests.get(details.requestId);
    if (requestData) {
      requestData.error = details.error;
      requestData.errorTimestamp = details.timeStamp;

      // 保存错误的请求
      StorageManager.saveRequest(requestData);

      this.pendingRequests.delete(details.requestId);
      console.log('Request error:', details.requestId, details.error);
    }
  }

  /**
   * 解析请求体
   */
  static parseRequestBody(requestBody) {
    if (!requestBody) {
      return null;
    }

    const result = {};

    // formData
    if (requestBody.formData) {
      result.formData = requestBody.formData;
    }

    // raw data (需要解码)
    if (requestBody.raw) {
      result.raw = requestBody.raw.map(item => ({
        bytes: item.bytes ? Array.from(new Uint8Array(item.bytes)) : null,
        file: item.file
      }));
    }

    return result;
  }

  /**
   * 格式化请求/响应头
   */
  static formatHeaders(headers) {
    if (!headers) {
      return {};
    }

    const formatted = {};
    headers.forEach(header => {
      formatted[header.name] = header.value;
    });
    return formatted;
  }

  /**
   * 获取响应体
   * 注意：webRequest API无法直接获取响应体
   * 这里我们使用fetch API重新请求来获取响应体（仅用于开发调试）
   */
  static async fetchResponseBody(requestData) {
    // 对于某些请求类型，我们可能无法重新获取响应体
    // 这是一个已知限制，后续可以通过content script注入来解决
    
    // 暂时只记录响应体大小
    const contentLength = requestData.responseHeaders?.['content-length'];
    if (contentLength) {
      requestData.responseBodySize = parseInt(contentLength, 10);
    }

    // TODO: 实现通过content script获取响应体的方案
  }
}
