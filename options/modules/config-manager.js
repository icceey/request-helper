/**
 * Config Manager Module
 * 配置管理：基础设置的加载、保存、重置
 */

import { getMessage } from '../../utils/i18n.js';
import { showMessage } from './form-utils.js';

// 默认配置
export const DEFAULT_CONFIG = {
  autoStart: false,
  urlPatterns: ['*://*/*'],
  maxRequests: 1000,
  enabled: false,
  captureStaticResources: false,
  captureErrorSlowOnly: false
};

// 加载配置
export async function loadConfig(elements, saveMessage) {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    
    if (response.success && response.config) {
      const config = response.config;
      
      // 填充表单
      elements.autoStart.checked = config.autoStart || false;
      elements.captureStaticResources.checked = config.captureStaticResources || false;
      elements.captureErrorSlowOnly.checked = config.captureErrorSlowOnly || false;
      elements.maxRequests.value = config.maxRequests || DEFAULT_CONFIG.maxRequests;
    } else {
      // 使用默认配置
      elements.autoStart.checked = DEFAULT_CONFIG.autoStart;
      elements.captureStaticResources.checked = DEFAULT_CONFIG.captureStaticResources;
      elements.captureErrorSlowOnly.checked = DEFAULT_CONFIG.captureErrorSlowOnly;
      elements.maxRequests.value = DEFAULT_CONFIG.maxRequests;
    }
  } catch (error) {
    console.error('Failed to load config:', error);
    showMessage(saveMessage, getMessage('failedToLoadConfig'), 'error');
  }
}

// 保存配置
export async function saveConfig(elements, saveMessage) {
  try {
    const maxRequests = parseInt(elements.maxRequests.value, 10);
    if (isNaN(maxRequests) || maxRequests < 10 || maxRequests > 10000) {
      showMessage(saveMessage, getMessage('maxRequestsRange'), 'error');
      return;
    }

    const config = {
      autoStart: elements.autoStart.checked,
      captureStaticResources: elements.captureStaticResources.checked,
      captureErrorSlowOnly: elements.captureErrorSlowOnly.checked,
      maxRequests: maxRequests
    };
    
    // 发送消息到后台保存配置
    const response = await chrome.runtime.sendMessage({
      type: 'CONFIG_UPDATED',
      config: config
    });
    
    if (response.success) {
      showMessage(saveMessage, getMessage('settingsSaved'), 'success');
    } else {
      showMessage(saveMessage, getMessage('saveFailed'), 'error');
    }
  } catch (error) {
    console.error('Failed to save config:', error);
    showMessage(saveMessage, getMessage('saveFailed') + ': ' + error.message, 'error');
  }
}

// 恢复默认配置
export function resetConfig(elements, saveMessage) {
  if (!confirm(getMessage('confirmReset'))) {
    return;
  }

  elements.autoStart.checked = DEFAULT_CONFIG.autoStart;
  elements.captureStaticResources.checked = DEFAULT_CONFIG.captureStaticResources;
  elements.captureErrorSlowOnly.checked = DEFAULT_CONFIG.captureErrorSlowOnly;
  elements.maxRequests.value = DEFAULT_CONFIG.maxRequests;
  
  showMessage(saveMessage, getMessage('defaultSettingsRestored'), 'success');
}

// 切换标签页
export function switchTab(tabId) {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // 移除所有active类
  tabButtons.forEach(btn => btn.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));
  
  // 添加active类到选中的tab
  const selectedButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
  const selectedContent = document.getElementById(tabId); // 使用 ID 选择器
  
  if (selectedButton && selectedContent) {
    selectedButton.classList.add('active');
    selectedContent.classList.add('active');
  }
}
