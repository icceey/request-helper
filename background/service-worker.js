/**
 * RequestHelper - Service Worker
 * 核心后台服务，负责静默抓包
 */

import { StorageManager } from './storage.js';
import { RequestCapture } from './capture.js';

console.log('RequestHelper Service Worker loaded');

let currentConfig = null;

// 初始化
async function initialize() {
  console.log('Initializing RequestHelper...');
  
  try {
    // 加载配置
    currentConfig = await StorageManager.getConfig();
    console.log('Config loaded:', currentConfig);

    // 注册网络监听器（一次性注册）
    RequestCapture.registerListeners();

    // 如果配置了自动启动，则开始捕获
    if (currentConfig.autoStart) {
      startCapture();
    }

    console.log('RequestHelper initialized successfully');
  } catch (error) {
    console.error('Failed to initialize:', error);
  }
}

// 启动捕获
function startCapture() {
  console.log('Starting capture...');
  RequestCapture.startCapture(currentConfig);
  
  // 更新配置状态
  currentConfig.enabled = true;
  StorageManager.saveConfig(currentConfig);
}

// 停止捕获
function stopCapture() {
  console.log('Stopping capture...');
  RequestCapture.stopCapture();
  
  // 更新配置状态
  currentConfig.enabled = false;
  StorageManager.saveConfig(currentConfig);
}

// 监听插件安装
chrome.runtime.onInstalled.addListener((details) => {
  console.log('RequestHelper installed:', details.reason);
  
  if (details.reason === 'install') {
    // 首次安装，设置默认配置
    console.log('First time installation, setting default config');
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
  
  initialize();
});

// 监听插件启动
chrome.runtime.onStartup.addListener(() => {
  console.log('RequestHelper started');
  initialize();
});

// 监听来自popup或options的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(response => {
      sendResponse(response);
    })
    .catch(error => {
      console.error('❌ RequestHelper: Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    });
  
  return true; // 保持消息通道开启
});

// 处理消息
async function handleMessage(message, sender) {
  switch (message.type) {
    case 'START_CAPTURE':
      startCapture();
      return { success: true, capturing: true };

    case 'STOP_CAPTURE':
      stopCapture();
      return { success: true, capturing: false };

    case 'GET_STATUS':
      return {
        success: true,
        capturing: RequestCapture.isCapturing,
        config: currentConfig
      };

    case 'GET_REQUESTS':
      const requests = await StorageManager.getRequests(message.filters);
      return { success: true, requests };

    case 'GET_STATS':
      const stats = await StorageManager.getStats();
      return { success: true, stats };

    case 'CLEAR_REQUESTS':
      await StorageManager.clearRequests();
      return { success: true };

    case 'CONFIG_UPDATED':
      currentConfig = message.config;
      await StorageManager.saveConfig(currentConfig);
      
      // 如果正在捕获，更新捕获配置
      if (RequestCapture.isCapturing) {
        RequestCapture.config = currentConfig;
      }
      
      return { success: true };

    case 'EXPORT_REQUESTS':
      const jsonData = await StorageManager.exportRequests();
      return { success: true, data: jsonData };

    case 'GET_REQUEST_BY_ID':
      const request = await StorageManager.getRequestById(message.id);
      return { success: true, request };

    case 'RESPONSE_BODY_CAPTURED':
      // 处理从 content script 捕获的响应体
      try {
        await RequestCapture.handleResponseBody(message.data);
        return { success: true };
      } catch (error) {
        console.error('❌ RequestHelper: Failed to process response body:', error);
        throw error;
      }

    default:
      console.warn('Unknown message type:', message.type);
      return { success: false, error: 'Unknown message type' };
  }
}

// 处理存储变化
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    console.log('Storage changed:', changes);
  }
});

// Service Worker 保活（可选）
// Chrome会在一段时间不活动后卸载Service Worker
// 这里可以添加心跳机制来保持活跃
let keepAliveInterval = null;

function startKeepAlive() {
  if (!keepAliveInterval) {
    keepAliveInterval = setInterval(() => {
      // 简单的心跳，防止Service Worker被卸载
      chrome.storage.local.get('keepalive', () => {});
    }, 20000); // 每20秒执行一次
  }
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// 当开始捕获时启动保活
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'START_CAPTURE') {
    startKeepAlive();
  } else if (message.type === 'STOP_CAPTURE') {
    stopKeepAlive();
  }
});

console.log('Service Worker setup complete');
