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
  static captureRules = []; // 捕获规则列表
  static blockRules = []; // 阻断规则列表
  static DNR_RULE_ID_OFFSET = 10000; // declarativeNetRequest规则ID起始值

  /**
   * 开始捕获网络请求
   */
  static async startCapture(config) {
    this.isCapturing = true;
    this.config = config;

    // 加载捕获规则
    this.captureRules = await StorageManager.getRules();

    // 更新阻断规则
    await this.updateBlockRules();

    // 注册webRequest监听器
    this.registerListeners();
  }

  /**
   * 停止捕获
   */
  static async stopCapture() {
    this.isCapturing = false;
    
    // 清除所有阻断规则
    await this.clearBlockRules();
    
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
   * 检查URL是否匹配过滤规则（旧方法，保留兼容性）
   */
  static matchesFilter(url, patterns) {
    if (!patterns || patterns.length === 0) {
      return true;
    }
    return URLFilter.matches(url, patterns);
  }

  /**
   * 检查URL是否匹配捕获规则
   * @returns {Object|null} 返回匹配的规则，如果没有匹配返回null
   */
  static matchesCaptureRules(url, method = 'GET') {
    // 如果没有规则，不捕获任何内容
    if (!this.captureRules || this.captureRules.length === 0) {
      return null;
    }

    // 按照优先级（数组顺序）匹配规则
    for (const rule of this.captureRules) {
      // 跳过禁用的规则
      if (!rule.enabled) {
        continue;
      }

      // 根据规则类型进行匹配
      if (rule.type === 'url-regex') {
        try {
          const regex = new RegExp(rule.condition.pattern);
          if (regex.test(url)) {
            return rule;
          }
        } catch (error) {
          console.error(`Invalid regex pattern in rule ${rule.name}:`, error);
        }
      }
      // 未来可以添加更多规则类型的匹配逻辑
      // else if (rule.type === 'header') { ... }
      // else if (rule.type === 'body') { ... }
    }

    return null;
  }

  /**
   * 获取静态资源类型列表
   */
  static getStaticResourceTypes() {
    return [
      'main_frame',    // 主文档（HTML页面）
      'sub_frame',     // iframe 内的文档
      'stylesheet',    // CSS
      'script',        // JavaScript
      'image',         // 图片
      'font',          // 字体
      'media'         // 媒体资源（音视频）
    ];
  }

  /**
   * 检查是否为静态资源请求
   */
  static isStaticResource(type) {
    return this.getStaticResourceTypes().includes(type);
  }

  /**
   * 检查是否应该捕获此请求
   * @returns {Object|false} 返回匹配的规则对象，或false（不捕获）
   */
  static shouldCapture(url, type, method = 'GET') {
    if (!this.isCapturing) {
      return false;
    }

    // 过滤掉Chrome内部请求
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return false;
    }

    // 如果不捕获静态资源，且当前请求是静态资源，则跳过
    if (!this.config?.captureStaticResources && type && this.isStaticResource(type)) {
      return false;
    }

    // 使用新的规则系统进行匹配
    const matchedRule = this.matchesCaptureRules(url, method);
    return matchedRule || false;
  }

  /**
   * 请求发送前（捕获请求体）
   */
  static onBeforeRequest(details) {
    const matchedRule = this.shouldCapture(details.url, details.type, details.method);
    if (!matchedRule) {
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
      requestBody: this.parseRequestBody(details.requestBody),
      matchedRule: {
        id: matchedRule.id,
        name: matchedRule.name
      }
    };

    this.pendingRequests.set(details.requestId, requestData);
  }

  /**
   * 请求发送时（捕获请求头）
   */
  static onSendHeaders(details) {
    const matchedRule = this.shouldCapture(details.url, details.type, details.method);
    if (!matchedRule) {
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
    const matchedRule = this.shouldCapture(details.url, details.type, details.method);
    if (!matchedRule) {
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
    const matchedRule = this.shouldCapture(details.url, details.type, details.method);
    if (!matchedRule) {
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
    }
  }

  /**
   * 请求错误
   */
  static onError(details) {
    const matchedRule = this.shouldCapture(details.url, details.type, details.method);
    if (!matchedRule) {
      return;
    }

    const requestData = this.pendingRequests.get(details.requestId);
    if (requestData) {
      requestData.error = details.error;
      requestData.errorTimestamp = details.timeStamp;

      // 保存错误的请求
      StorageManager.saveRequest(requestData);

      this.pendingRequests.delete(details.requestId);
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
      result.raw = requestBody.raw.map(item => {
        const rawItem = {
          bytes: item.bytes ? Array.from(new Uint8Array(item.bytes)) : null,
          file: item.file
        };
        
        // 尝试将字节数组解码为文本
        if (item.bytes) {
          try {
            // item.bytes 可能是 ArrayBuffer 或者已经是数组
            let uint8Array;
            if (item.bytes instanceof ArrayBuffer) {
              uint8Array = new Uint8Array(item.bytes);
            } else if (Array.isArray(item.bytes)) {
              uint8Array = new Uint8Array(item.bytes);
            } else {
              uint8Array = new Uint8Array(item.bytes);
            }
            
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(uint8Array);
            rawItem.text = text;
            
            // 尝试解析为JSON
            try {
              rawItem.json = JSON.parse(text);
            } catch (e) {
              // 不是JSON，保留文本格式
            }
          } catch (e) {
            // 解码失败，保留字节数组
            console.warn('Failed to decode request body:', e);
          }
        }
        
        return rawItem;
      });
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
   * 响应体通过 content script 拦截器捕获
   */
  static async fetchResponseBody(requestData) {
    // 记录响应体大小
    const contentLength = requestData.responseHeaders?.['content-length'];
    if (contentLength) {
      requestData.responseBodySize = parseInt(contentLength, 10);
    }

    // 响应体将通过 content script 异步捕获并通过 handleResponseBody 方法处理
  }

  /**
   * 处理从 content script 捕获的响应体
   */
  static async handleResponseBody(capturedData) {
    if (!this.isCapturing) {
      return;
    }

    // 重新加载规则（防止规则在运行时被修改）
    this.captureRules = await StorageManager.getRules();

    // 检查是否应该捕获此请求
    const matchedRule = this.shouldCapture(capturedData.url, capturedData.type, capturedData.method);
    if (!matchedRule) {
      return;
    }

    // 尝试匹配已有的请求（通过URL和时间戳）
    const existingRequest = await this.findMatchingRequest(capturedData);

    if (existingRequest) {
      // 更新已有请求的响应体
      existingRequest.responseBody = capturedData.responseBody;
      existingRequest.contentType = capturedData.contentType;
      if (capturedData.responseHeaders) {
        existingRequest.responseHeaders = {
          ...existingRequest.responseHeaders,
          ...this.parseContentScriptHeaders(capturedData.responseHeaders)
        };
      }
      await StorageManager.updateRequest(existingRequest);
      
      // 通知 viewer 更新
      chrome.runtime.sendMessage({ type: 'REQUESTS_UPDATED' }).catch(() => {});
    } else {
      // 创建新的请求记录（来自 content script）
      const requestData = {
        id: capturedData.id,
        url: capturedData.url,
        method: capturedData.method,
        type: capturedData.type,
        timestamp: capturedData.timestamp,
        requestHeaders: capturedData.requestHeaders,
        requestBody: capturedData.requestBody,
        statusCode: capturedData.statusCode,
        statusText: capturedData.statusText,
        responseHeaders: this.parseContentScriptHeaders(capturedData.responseHeaders),
        responseBody: capturedData.responseBody,
        contentType: capturedData.contentType,
        duration: capturedData.duration,
        completed: true,
        source: 'content-script',
        matchedRule: {
          id: matchedRule.id,
          name: matchedRule.name
        }
      };

      await StorageManager.saveRequest(requestData);
      
      // 通知 viewer 更新
      chrome.runtime.sendMessage({ type: 'REQUESTS_UPDATED' }).catch(() => {});
    }
  }

  /**
   * 查找匹配的请求
   */
  static async findMatchingRequest(capturedData) {
    // 尝试在 pendingRequests 中查找
    for (const [requestId, requestData] of this.pendingRequests.entries()) {
      if (requestData.url === capturedData.url && 
          requestData.method === capturedData.method &&
          Math.abs(requestData.timestamp - capturedData.timestamp) < 5000) { // 5秒内
        return requestData;
      }
    }

    // 如果找不到，尝试从存储中查找最近的请求
    const recentRequests = await StorageManager.getRecentRequests(10);
    for (const request of recentRequests) {
      if (request.url === capturedData.url && 
          request.method === capturedData.method &&
          Math.abs(request.timestamp - capturedData.timestamp) < 5000) {
        return request;
      }
    }

    return null;
  }

  /**
   * 解析 content script 的响应头
   */
  static parseContentScriptHeaders(headers) {
    if (!headers) return {};

    // 如果已经是对象格式，直接返回
    if (typeof headers === 'object' && !Array.isArray(headers)) {
      return headers;
    }

    // 如果是字符串格式（XMLHttpRequest.getAllResponseHeaders()返回的格式）
    if (typeof headers === 'string') {
      const parsed = {};
      headers.split('\r\n').forEach(line => {
        const parts = line.split(': ');
        if (parts.length === 2) {
          parsed[parts[0].toLowerCase()] = parts[1];
        }
      });
      return parsed;
    }

    return headers;
  }

  /**
   * 更新阻断规则
   * 将配置的阻断规则转换为declarativeNetRequest规则
   */
  static async updateBlockRules() {
    try {
      // 获取所有启用的阻断规则
      const allRules = await StorageManager.getRules();
      const blockRules = allRules.filter(rule => 
        rule.enabled && 
        rule.action.type === 'block'
      );

      console.log('Updating block rules:', blockRules);

      // 获取静态资源类型
      const staticResourceTypes = this.getStaticResourceTypes();

      // 定义非静态资源类型
      const dynamicResourceTypes = [
        'object',
        'xmlhttprequest',
        'ping',
        'csp_report',
        'websocket',
        'webtransport',
        'webbundle',
        'other'
      ];

      // 根据配置决定要阻断的资源类型
      let allowedResourceTypes;
      if (this.config?.captureStaticResources) {
        // 如果允许捕获静态资源，阻断所有类型
        allowedResourceTypes = [...staticResourceTypes, ...dynamicResourceTypes];
      } else {
        // 如果不捕获静态资源，只阻断非静态资源
        allowedResourceTypes = dynamicResourceTypes;
      }

      // 转换为declarativeNetRequest规则格式
      const dnrRules = blockRules.map((rule, index) => {
        const dnrRule = {
          id: this.DNR_RULE_ID_OFFSET + index,
          priority: allRules.length - allRules.indexOf(rule), // 保持优先级顺序
          action: { type: 'block' },
          condition: {}
        };

        // 根据规则类型设置条件
        if (rule.type === 'url-regex') {
          dnrRule.condition.regexFilter = rule.condition.pattern;
          dnrRule.condition.resourceTypes = allowedResourceTypes;
        }

        return dnrRule;
      });

      // 获取当前所有规则
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      
      // 删除所有旧的阻断规则（ID >= DNR_RULE_ID_OFFSET）
      const ruleIdsToRemove = existingRules
        .filter(r => r.id >= this.DNR_RULE_ID_OFFSET)
        .map(r => r.id);

      // 更新规则
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIdsToRemove,
        addRules: dnrRules
      });

      this.blockRules = blockRules;
      console.log('Block rules updated successfully:', dnrRules.length, 'rules');
    } catch (error) {
      console.error('Failed to update block rules:', error);
      throw error;
    }
  }

  /**
   * 清除所有阻断规则
   */
  static async clearBlockRules() {
    try {
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const ruleIdsToRemove = existingRules
        .filter(r => r.id >= this.DNR_RULE_ID_OFFSET)
        .map(r => r.id);

      if (ruleIdsToRemove.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIdsToRemove
        });
        console.log('Cleared block rules:', ruleIdsToRemove.length);
      }

      this.blockRules = [];
    } catch (error) {
      console.error('Failed to clear block rules:', error);
    }
  }
}
