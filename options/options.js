/**
 * RequestHelper - Options Page
 */

import { getMessage, translatePage } from '../utils/i18n.js';

// DOM 元素
const autoStartCheckbox = document.getElementById('auto-start');
const captureStaticResourcesCheckbox = document.getElementById('capture-static-resources');
const urlPatternsTextarea = document.getElementById('url-patterns');
const maxRequestsInput = document.getElementById('max-requests');
const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');
const saveMessage = document.getElementById('save-message');

// 默认配置
const DEFAULT_CONFIG = {
  autoStart: false,
  urlPatterns: ['*://*/*'],
  maxRequests: 1000,
  enabled: false,
  captureStaticResources: false // 默认不捕获静态资源
};

// 初始化
async function init() {
  console.log('Options page initialized');
  
  // 翻译页面
  translatePage();
  
  // 加载配置
  await loadConfig();
  
  // 绑定事件
  saveBtn.addEventListener('click', handleSave);
  resetBtn.addEventListener('click', handleReset);
}

// 加载配置
async function loadConfig() {
  console.log('Loading config');
  
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    
    if (response.success && response.config) {
      const config = response.config;
      
      // 填充表单
      autoStartCheckbox.checked = config.autoStart || false;
      captureStaticResourcesCheckbox.checked = config.captureStaticResources || false;
      urlPatternsTextarea.value = (config.urlPatterns || DEFAULT_CONFIG.urlPatterns).join('\n');
      maxRequestsInput.value = config.maxRequests || DEFAULT_CONFIG.maxRequests;
    } else {
      // 使用默认配置
      autoStartCheckbox.checked = DEFAULT_CONFIG.autoStart;
      captureStaticResourcesCheckbox.checked = DEFAULT_CONFIG.captureStaticResources;
      urlPatternsTextarea.value = DEFAULT_CONFIG.urlPatterns.join('\n');
      maxRequestsInput.value = DEFAULT_CONFIG.maxRequests;
    }
  } catch (error) {
    console.error('Failed to load config:', error);
    showMessage(getMessage('failedToLoadConfig'), 'error');
  }
}

// 保存配置
async function handleSave() {
  console.log('Saving config');
  
  try {
    // 获取表单数据
    const urlPatternsText = urlPatternsTextarea.value.trim();
    const urlPatterns = urlPatternsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // 验证URL模式
    if (urlPatterns.length === 0) {
      showMessage(getMessage('pleaseAddUrlPattern'), 'error');
      return;
    }

    const maxRequests = parseInt(maxRequestsInput.value, 10);
    if (isNaN(maxRequests) || maxRequests < 10 || maxRequests > 10000) {
      showMessage(getMessage('maxRequestsRange'), 'error');
      return;
    }

    const config = {
      autoStart: autoStartCheckbox.checked,
      captureStaticResources: captureStaticResourcesCheckbox.checked,
      urlPatterns: urlPatterns,
      maxRequests: maxRequests
    };
    
    // 发送消息到后台保存配置
    const response = await chrome.runtime.sendMessage({
      type: 'CONFIG_UPDATED',
      config: config
    });
    
    if (response.success) {
      showMessage(getMessage('settingsSaved'), 'success');
    } else {
      showMessage(getMessage('saveFailed'), 'error');
    }
  } catch (error) {
    console.error('Failed to save config:', error);
    showMessage(getMessage('saveFailed') + ': ' + error.message, 'error');
  }
}

// 恢复默认配置
async function handleReset() {
  console.log('Resetting to default config');
  
  if (!confirm(getMessage('confirmClear'))) {
    return;
  }

  autoStartCheckbox.checked = DEFAULT_CONFIG.autoStart;
  captureStaticResourcesCheckbox.checked = DEFAULT_CONFIG.captureStaticResources;
  urlPatternsTextarea.value = DEFAULT_CONFIG.urlPatterns.join('\n');
  maxRequestsInput.value = DEFAULT_CONFIG.maxRequests;
  
  showMessage(getMessage('defaultSettingsRestored'), 'success');
}

// 显示消息
function showMessage(text, type = 'success') {
  saveMessage.textContent = text;
  saveMessage.className = `message ${type}`;
  
  setTimeout(() => {
    saveMessage.classList.add('hidden');
  }, 3000);
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', init);
