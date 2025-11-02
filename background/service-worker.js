/**
 * RequestHelper - Service Worker
 * 核心后台服务，负责静默抓包
 */

import { StorageManager } from './storage.js';
import { RequestCapture } from './capture.js';

let currentConfig = null;

/**
 * 更新扩展图标角标
 * @param {boolean} isCapturing - 是否正在捕获
 * @param {number} count - 已捕获的请求数量
 */
export async function updateBadge(isCapturing, count) {
  try {
    if (isCapturing) {
      // 正在捕获中：绿色角标，显示请求数量（即使为0）
      await chrome.action.setBadgeBackgroundColor({ color: '#34a853' });
      await chrome.action.setBadgeText({ text: count.toString() });
    } else {
      // 未捕获：灰色角标，仅在有请求时显示
      if (count > 0) {
        await chrome.action.setBadgeBackgroundColor({ color: '#9aa0a6' });
        await chrome.action.setBadgeText({ text: count.toString() });
      } else {
        // 无请求时不显示角标
        await chrome.action.setBadgeText({ text: '' });
      }
    }
  } catch (error) {
    console.error('Failed to update badge:', error);
  }
}

/**
 * 获取当前捕获状态
 */
export function getCapturingStatus() {
  return RequestCapture.isCapturing;
}

// 初始化
async function initialize() {
  try {
    // 加载配置
    currentConfig = await StorageManager.getConfig();

    // 注册网络监听器（一次性注册）
    RequestCapture.registerListeners();

    // Service Worker 重启后，捕获状态会重置为 false
    // 如果配置中的 enabled 为 true，需要将其更新为 false 并保存
    if (currentConfig.enabled && !RequestCapture.isCapturing) {
      currentConfig.enabled = false;
      await StorageManager.saveConfig(currentConfig);
    }

    // 获取当前请求数量并更新角标
    const stats = await StorageManager.getStats();
    const requestCount = stats.total || 0;
    // 使用实际的捕获状态来更新角标
    await updateBadge(RequestCapture.isCapturing, requestCount);

    // 如果配置了自动启动，则开始捕获
    if (currentConfig.autoStart) {
      startCapture();
    }
  } catch (error) {
    console.error('Failed to initialize:', error);
  }
}

// 启动捕获
async function startCapture() {
  RequestCapture.startCapture(currentConfig);
  
  // 更新配置状态
  currentConfig.enabled = true;
  StorageManager.saveConfig(currentConfig);
  
  // 更新角标为绿色
  const stats = await StorageManager.getStats();
  await updateBadge(true, stats.total || 0);
  
  // 通知所有 tab 助手已启动
  const tabs = await chrome.tabs.query({});
  tabs.forEach(tab => {
    chrome.tabs.sendMessage(tab.id, { type: 'HELPER_STARTED' }).catch(() => {
      // 忽略错误（某些tab可能无法接收消息）
    });
  });
}

// 停止捕获
async function stopCapture() {
  RequestCapture.stopCapture();
  
  // 更新配置状态
  currentConfig.enabled = false;
  StorageManager.saveConfig(currentConfig);
  
  // 更新角标为灰色（或清除）
  const stats = await StorageManager.getStats();
  await updateBadge(false, stats.total || 0);
}

// 监听插件安装
chrome.runtime.onInstalled.addListener((details) => {
  initialize();
});

// 监听插件启动
chrome.runtime.onStartup.addListener(() => {
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
      const allRules = await StorageManager.getRules();
      const enabledRulesCount = allRules.filter(r => r.enabled).length;
      return {
        success: true,
        capturing: RequestCapture.isCapturing,
        config: currentConfig,
        enabledRulesCount
      };

    case 'GET_REQUESTS':
      const requests = await StorageManager.getRequests(message.filters);
      return { success: true, requests };

    case 'GET_STATS':
      const stats = await StorageManager.getStats();
      return { success: true, stats };

    case 'CLEAR_REQUESTS':
      await StorageManager.clearRequests();
      // 清空后更新角标
      await updateBadge(RequestCapture.isCapturing, 0);
      return { success: true };

    case 'CONFIG_UPDATED':
      currentConfig = message.config;
      await StorageManager.saveConfig(currentConfig);
      
      // 如果正在捕获，更新捕获配置并重新应用阻断规则
      if (RequestCapture.isCapturing) {
        RequestCapture.config = currentConfig;
        // 重新应用阻断规则，因为 captureStaticResources 配置可能已更改
        await RequestCapture.updateBlockRules();
      }
      
      return { success: true };

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

    case 'GET_RULES':
      const rules = await StorageManager.getRules();
      return { success: true, rules };

    case 'SAVE_RULES':
      await StorageManager.saveRules(message.rules);
      // 如果正在捕获，重新加载规则并更新阻断规则
      if (RequestCapture.isCapturing) {
        RequestCapture.captureRules = message.rules;
        await RequestCapture.updateBlockRules();
      }
      return { success: true };

    case 'ADD_RULE':
      await StorageManager.addRule(message.rule, message.insertAtBeginning);
      // 如果正在捕获，重新加载规则并更新阻断规则
      if (RequestCapture.isCapturing) {
        RequestCapture.captureRules = await StorageManager.getRules();
        await RequestCapture.updateBlockRules();
      }
      return { success: true };

    case 'UPDATE_RULE':
      await StorageManager.updateRule(message.ruleId, message.rule);
      const updatedRules = await StorageManager.getRules();
      // 如果正在捕获，重新加载规则并更新阻断规则
      if (RequestCapture.isCapturing) {
        RequestCapture.captureRules = updatedRules;
        await RequestCapture.updateBlockRules();
      }
      return { success: true, rules: updatedRules };

    case 'DELETE_RULE':
      await StorageManager.deleteRule(message.ruleId);
      // 如果正在捕获，重新加载规则并更新阻断规则
      if (RequestCapture.isCapturing) {
        RequestCapture.captureRules = await StorageManager.getRules();
        await RequestCapture.updateBlockRules();
      }
      return { success: true };

    case 'REORDER_RULES':
      await StorageManager.reorderRules(message.rules);
      // 如果正在捕获，重新加载规则并更新阻断规则
      if (RequestCapture.isCapturing) {
        RequestCapture.captureRules = message.rules;
        await RequestCapture.updateBlockRules();
      }
      return { success: true };

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

// 处理存储变化
chrome.storage.onChanged.addListener((changes, areaName) => {
  // 可以在这里监听存储变化
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
