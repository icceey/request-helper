/**
 * RequestHelper - Options Page
 */

import { getMessage, translatePage } from '../utils/i18n.js';

// DOM 元素 - Tabs
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

// DOM 元素 - Basic Settings
const autoStartCheckbox = document.getElementById('auto-start');
const captureStaticResourcesCheckbox = document.getElementById('capture-static-resources');
const maxRequestsInput = document.getElementById('max-requests');
const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');
const saveMessage = document.getElementById('save-message');

// DOM 元素 - Capture Rules
const addRuleBtn = document.getElementById('add-rule-btn');
const rulesList = document.getElementById('rules-list');
const emptyRules = document.getElementById('empty-rules');

// DOM 元素 - Modal
const ruleModal = document.getElementById('rule-modal');
const modalTitle = document.getElementById('modal-title');
const modalClose = document.getElementById('modal-close');
const modalCancel = document.getElementById('modal-cancel');
const modalSave = document.getElementById('modal-save');
const ruleNameInput = document.getElementById('rule-name');
const ruleEnabledCheckbox = document.getElementById('rule-enabled');
const ruleTypeSelect = document.getElementById('rule-type');
const rulePatternInput = document.getElementById('rule-pattern');
const ruleActionSelect = document.getElementById('rule-action');

// 状态变量
let currentRules = [];
let editingRuleId = null;

// 默认配置
const DEFAULT_CONFIG = {
  autoStart: false,
  urlPatterns: ['*://*/*'],
  maxRequests: 1000,
  enabled: false,
  captureStaticResources: false
};

// 初始化
async function init() {
  console.log('Options page initialized');
  
  // 翻译页面
  translatePage();
  
  // 绑定 Tab 切换事件
  tabButtons.forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });
  
  // 加载配置和规则
  await loadConfig();
  await loadRules();
  
  // 绑定事件
  saveBtn.addEventListener('click', handleSave);
  resetBtn.addEventListener('click', handleReset);
  addRuleBtn.addEventListener('click', () => openRuleModal());
  modalClose.addEventListener('click', closeRuleModal);
  modalCancel.addEventListener('click', closeRuleModal);
  modalSave.addEventListener('click', handleSaveRule);
}

// 切换 Tab
function switchTab(tabId) {
  // 更新按钮状态
  tabButtons.forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // 更新内容显示
  tabContents.forEach(content => {
    if (content.id === tabId) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
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
      maxRequestsInput.value = config.maxRequests || DEFAULT_CONFIG.maxRequests;
    } else {
      // 使用默认配置
      autoStartCheckbox.checked = DEFAULT_CONFIG.autoStart;
      captureStaticResourcesCheckbox.checked = DEFAULT_CONFIG.captureStaticResources;
      maxRequestsInput.value = DEFAULT_CONFIG.maxRequests;
    }
  } catch (error) {
    console.error('Failed to load config:', error);
    showMessage(getMessage('failedToLoadConfig'), 'error');
  }
}

// 加载规则
async function loadRules() {
  console.log('Loading rules');
  
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_RULES' });
    
    if (response.success) {
      currentRules = response.rules || [];
      renderRules();
    }
  } catch (error) {
    console.error('Failed to load rules:', error);
    showMessage(getMessage('failedToLoadConfig'), 'error');
  }
}

// 渲染规则列表
function renderRules() {
  if (currentRules.length === 0) {
    rulesList.innerHTML = '';
    emptyRules.classList.remove('hidden');
    return;
  }
  
  emptyRules.classList.add('hidden');
  
  rulesList.innerHTML = currentRules.map((rule, index) => `
    <div class="rule-item ${rule.enabled ? '' : 'disabled'}" data-rule-id="${rule.id}">
      <div class="rule-header">
        <div class="rule-info">
          <span class="rule-name">${escapeHtml(rule.name)}</span>
          <span class="rule-badge ${rule.enabled ? 'enabled' : 'disabled'}" data-i18n="${rule.enabled ? 'enabled' : 'disabled'}">
            ${getMessage(rule.enabled ? 'enabled' : 'disabled')}
          </span>
          <span class="rule-badge ${rule.action.type}">
            ${getRuleActionName(rule.action.type)}
          </span>
        </div>
        <div class="rule-actions">
          <button class="btn-icon btn-move-up" data-rule-id="${rule.id}" ${index === 0 ? 'disabled' : ''} title="${getMessage('moveUp')}">↑</button>
          <button class="btn-icon btn-move-down" data-rule-id="${rule.id}" ${index === currentRules.length - 1 ? 'disabled' : ''} title="${getMessage('moveDown')}">↓</button>
          <button class="btn-icon edit btn-edit" data-rule-id="${rule.id}" title="${getMessage('edit')}">✎</button>
          <button class="btn-icon delete btn-delete" data-rule-id="${rule.id}" title="${getMessage('delete')}">✕</button>
        </div>
      </div>
      <div class="rule-details">
        <div class="rule-detail-item">
          <span class="label" data-i18n="ruleType">${getMessage('ruleType')}:</span>
          <span class="value">${getRuleTypeName(rule.type)}</span>
        </div>
        <div class="rule-detail-item">
          <span class="label" data-i18n="ruleCondition">${getMessage('ruleCondition')}:</span>
          <code class="value">${escapeHtml(rule.condition.pattern)}</code>
        </div>
        <div class="rule-detail-item">
          <span class="label" data-i18n="ruleAction">${getMessage('ruleAction')}:</span>
          <span class="value">${getRuleActionName(rule.action.type)}</span>
        </div>
      </div>
    </div>
  `).join('');
  
  // 绑定事件监听器
  bindRuleActions();
}

// 获取规则类型名称
function getRuleTypeName(type) {
  const names = {
    'url-regex': getMessage('urlRegex')
  };
  return names[type] || type;
}

// 获取规则动作名称
function getRuleActionName(actionType) {
  const names = {
    'capture': getMessage('capture'),
    'block': getMessage('block')
  };
  return names[actionType] || actionType;
}

// 绑定规则操作按钮事件
function bindRuleActions() {
  // 使用事件委托处理所有按钮点击
  rulesList.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ruleId = e.target.dataset.ruleId;
      editRule(ruleId);
    });
  });
  
  rulesList.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ruleId = e.target.dataset.ruleId;
      deleteRule(ruleId);
    });
  });
  
  rulesList.querySelectorAll('.btn-move-up').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ruleId = e.target.dataset.ruleId;
      moveRuleUp(ruleId);
    });
  });
  
  rulesList.querySelectorAll('.btn-move-down').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ruleId = e.target.dataset.ruleId;
      moveRuleDown(ruleId);
    });
  });
}

// 打开规则编辑模态框
function openRuleModal(ruleId = null) {
  editingRuleId = ruleId;
  
  if (ruleId) {
    // 编辑模式
    const rule = currentRules.find(r => r.id === ruleId);
    if (!rule) return;
    
    modalTitle.textContent = getMessage('editRule');
    ruleNameInput.value = rule.name;
    ruleEnabledCheckbox.checked = rule.enabled;
    ruleTypeSelect.value = rule.type;
    rulePatternInput.value = rule.condition.pattern;
    ruleActionSelect.value = rule.action.type;
  } else {
    // 新建模式
    modalTitle.textContent = getMessage('addNewRule');
    ruleNameInput.value = '';
    ruleEnabledCheckbox.checked = true;
    ruleTypeSelect.value = 'url-regex';
    rulePatternInput.value = '';
    ruleActionSelect.value = 'capture';
  }
  
  ruleModal.classList.remove('hidden');
}

// 关闭规则编辑模态框
function closeRuleModal() {
  ruleModal.classList.add('hidden');
  editingRuleId = null;
}

// 保存规则
async function handleSaveRule() {
  const name = ruleNameInput.value.trim();
  const enabled = ruleEnabledCheckbox.checked;
  const type = ruleTypeSelect.value;
  const pattern = rulePatternInput.value.trim();
  const actionType = ruleActionSelect.value;
  
  // 验证
  if (!name) {
    showMessage(getMessage('ruleNameRequired'), 'error');
    return;
  }
  
  if (!pattern) {
    showMessage(getMessage('rulePatternRequired'), 'error');
    return;
  }
  
  // 验证正则表达式
  try {
    new RegExp(pattern);
  } catch (error) {
    showMessage(getMessage('invalidRegexPattern') + ': ' + error.message, 'error');
    return;
  }
  
  const rule = {
    id: editingRuleId || generateId(),
    name,
    enabled,
    type,
    condition: {
      pattern
    },
    action: {
      type: actionType,
      config: {}
    }
  };
  
  try {
    if (editingRuleId) {
      // 更新规则
      const index = currentRules.findIndex(r => r.id === editingRuleId);
      currentRules[index] = rule;
      await chrome.runtime.sendMessage({ 
        type: 'UPDATE_RULE', 
        ruleId: editingRuleId,
        rule 
      });
      showMessage(getMessage('ruleUpdated'), 'success');
    } else {
      // 添加规则
      currentRules.push(rule);
      await chrome.runtime.sendMessage({ 
        type: 'ADD_RULE', 
        rule 
      });
      showMessage(getMessage('ruleAdded'), 'success');
    }
    
    // 刷新列表
    await loadRules();
    closeRuleModal();
  } catch (error) {
    console.error('Failed to save rule:', error);
    showMessage(getMessage('saveFailed'), 'error');
  }
}

// 编辑规则
function editRule(ruleId) {
  openRuleModal(ruleId);
}

// 删除规则
async function deleteRule(ruleId) {
  if (!confirm(getMessage('confirmDeleteRule'))) {
    return;
  }
  
  try {
    await chrome.runtime.sendMessage({ 
      type: 'DELETE_RULE', 
      ruleId 
    });
    
    currentRules = currentRules.filter(r => r.id !== ruleId);
    renderRules();
    showMessage(getMessage('ruleDeleted'), 'success');
  } catch (error) {
    console.error('Failed to delete rule:', error);
    showMessage(getMessage('saveFailed'), 'error');
  }
}

// 上移规则
async function moveRuleUp(ruleId) {
  const index = currentRules.findIndex(r => r.id === ruleId);
  if (index <= 0) return;
  
  // 交换位置
  [currentRules[index], currentRules[index - 1]] = [currentRules[index - 1], currentRules[index]];
  
  try {
    await chrome.runtime.sendMessage({ 
      type: 'REORDER_RULES', 
      rules: currentRules 
    });
    renderRules();
  } catch (error) {
    console.error('Failed to reorder rules:', error);
    showMessage(getMessage('saveFailed'), 'error');
  }
}

// 下移规则
async function moveRuleDown(ruleId) {
  const index = currentRules.findIndex(r => r.id === ruleId);
  if (index < 0 || index >= currentRules.length - 1) return;
  
  // 交换位置
  [currentRules[index], currentRules[index + 1]] = [currentRules[index + 1], currentRules[index]];
  
  try {
    await chrome.runtime.sendMessage({ 
      type: 'REORDER_RULES', 
      rules: currentRules 
    });
    renderRules();
  } catch (error) {
    console.error('Failed to reorder rules:', error);
    showMessage(getMessage('saveFailed'), 'error');
  }
}

// 保存基础配置
async function handleSave() {
  console.log('Saving config');
  
  try {
    const maxRequests = parseInt(maxRequestsInput.value, 10);
    if (isNaN(maxRequests) || maxRequests < 10 || maxRequests > 10000) {
      showMessage(getMessage('maxRequestsRange'), 'error');
      return;
    }

    const config = {
      autoStart: autoStartCheckbox.checked,
      captureStaticResources: captureStaticResourcesCheckbox.checked,
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

// 生成唯一 ID
function generateId() {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', init);
