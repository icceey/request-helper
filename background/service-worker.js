/**
 * RequestHelper - Service Worker
 * 核心后台服务，负责静默抓包
 */

import { StorageManager } from './storage.js';
import { RequestCapture } from './capture.js';

console.log('RequestHelper Service Worker loaded');

// 初始化
async function initialize() {
  console.log('Initializing RequestHelper...');
  
  // TODO: 加载配置
  // TODO: 设置网络监听
  // TODO: 初始化存储
}

// 监听插件安装
chrome.runtime.onInstalled.addListener((details) => {
  console.log('RequestHelper installed:', details.reason);
  initialize();
});

// 监听插件启动
chrome.runtime.onStartup.addListener(() => {
  console.log('RequestHelper started');
  initialize();
});

// 监听来自popup或options的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);
  
  // TODO: 处理各种消息类型
  
  return true; // 保持消息通道开启
});
