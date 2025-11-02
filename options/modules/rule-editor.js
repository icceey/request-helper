/**
 * Rule Editor Module  
 * 规则编辑器：规则的CRUD操作、渲染、模态框管理
 */

import { getMessage } from '../../utils/i18n.js';
import { getKeyValuePairsFromContainer, getKeysFromContainer, populateKeyValuePairs, populateKeys, showMessage as showFormMessage } from './form-utils.js';

// 规则状态
let currentRules = [];
let editingRuleId = null;

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

// 获取规则类型名称
export function getRuleTypeName(type) {
  const names = {
    'url-regex': getMessage('urlRegex')
  };
  return names[type] || type;
}

// 获取规则动作名称
export function getRuleActionName(actionType) {
  const names = {
    'capture': getMessage('capture'),
    'block': getMessage('block'),
    'modifyRequestBody': getMessage('modifyRequestBody'),
    'modifyQuery': getMessage('modifyQuery'),
    'modifyHeaders': getMessage('modifyHeaders'),
    'modifyResponseBody': getMessage('modifyResponseBody'),
    'modifyResponseHeaders': getMessage('modifyResponseHeaders')
  };
  return names[actionType] || actionType;
}

// 加载规则
export async function loadRules() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_RULES' });
    
    if (response.success) {
      currentRules = response.rules || [];
      return currentRules;
    }
    return [];
  } catch (error) {
    console.error('Failed to load rules:', error);
    throw error;
  }
}

// 渲染规则列表
export function renderRules(rulesList, emptyRules) {
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
          <label class="toggle-switch">
            <input type="checkbox" class="rule-toggle" data-rule-id="${rule.id}" ${rule.enabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
          <span class="rule-name">${escapeHtml(rule.name)}</span>
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
}

// 绑定规则操作按钮事件
export function bindRuleActions(rulesList, handlers) {
  rulesList.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ruleId = e.target.dataset.ruleId;
      if (handlers.onEdit) handlers.onEdit(ruleId);
    });
  });
  
  rulesList.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ruleId = e.target.dataset.ruleId;
      if (handlers.onDelete) handlers.onDelete(ruleId);
    });
  });
  
  rulesList.querySelectorAll('.btn-move-up').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ruleId = e.target.dataset.ruleId;
      if (handlers.onMoveUp) handlers.onMoveUp(ruleId);
    });
  });
  
  rulesList.querySelectorAll('.btn-move-down').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ruleId = e.target.dataset.ruleId;
      if (handlers.onMoveDown) handlers.onMoveDown(ruleId);
    });
  });
  
  rulesList.querySelectorAll('.rule-toggle').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const ruleId = e.currentTarget.dataset.ruleId;
      const enabled = e.currentTarget.checked;
      if (handlers.onToggle) handlers.onToggle(ruleId, enabled);
    });
  });
}

// 打开规则编辑模态框
export function openRuleModal(ruleId, elements) {
  editingRuleId = ruleId;
  
  if (ruleId) {
    // 编辑模式
    const rule = currentRules.find(r => r.id === ruleId);
    if (!rule) return;
    
    elements.modalTitle.textContent = getMessage('editRule');
    elements.ruleName.value = rule.name;
    elements.ruleType.value = rule.type;
    elements.rulePattern.value = rule.condition.pattern;
    elements.ruleAction.value = rule.action.type;
    
    // 加载修改配置
    loadModifyConfig(rule, elements);
  } else {
    // 新建模式
    resetModalForm(elements);
  }
  
  elements.modal.classList.remove('hidden');
}

// 加载修改配置到表单
function loadModifyConfig(rule, elements) {
  // 请求体修改
  if (rule.action.type === 'modifyRequestBody' && rule.action.modifications?.requestBody) {
    const reqBodyMod = rule.action.modifications.requestBody;
    elements.modifyType.value = reqBodyMod.type;
    
    if (reqBodyMod.type === 'text-replace') {
      elements.textPattern.value = reqBodyMod.pattern || '';
      elements.textReplacement.value = reqBodyMod.replacement || '';
    } else {
      elements.modifyValue.value = JSON.stringify(reqBodyMod.value, null, 2);
    }
  }
  
  // Query参数修改
  if (rule.action.type === 'modifyQuery' && rule.action.modifications?.query) {
    const queryMod = rule.action.modifications.query;
    
    if (queryMod.delete) {
      elements.queryOperation.value = 'delete';
      populateKeys(elements.queryDeleteList, queryMod.delete, 'query');
    } else if (queryMod.addOrUpdate) {
      elements.queryOperation.value = 'addOrUpdate';
      populateKeyValuePairs(elements.queryPairsList, queryMod.addOrUpdate, 'query');
    }
  }
  
  // 请求头修改
  if (rule.action.type === 'modifyHeaders' && rule.action.modifications?.headers) {
    const headersMod = rule.action.modifications.headers;
    
    if (headersMod.delete) {
      elements.headersOperation.value = 'delete';
      populateKeys(elements.headersDeleteList, headersMod.delete, 'header');
    } else if (headersMod.addOrUpdate) {
      elements.headersOperation.value = 'addOrUpdate';
      populateKeyValuePairs(elements.headersPairsList, headersMod.addOrUpdate, 'header');
    }
  }
  
  // 响应体修改
  if (rule.action.type === 'modifyResponseBody' && rule.action.modifications?.responseBody) {
    const respBodyMod = rule.action.modifications.responseBody;
    elements.responseBodyModifyType.value = respBodyMod.type;
    
    if (respBodyMod.type === 'text-replace') {
      elements.responseBodyTextPattern.value = respBodyMod.pattern || '';
      elements.responseBodyTextReplacement.value = respBodyMod.replacement || '';
    } else {
      elements.responseBodyModifyValue.value = JSON.stringify(respBodyMod.value, null, 2);
    }
  }
  
  // 响应头修改
  if (rule.action.type === 'modifyResponseHeaders' && rule.action.modifications?.responseHeaders) {
    const respHeadersMod = rule.action.modifications.responseHeaders;
    
    if (respHeadersMod.delete) {
      elements.responseHeadersOperation.value = 'delete';
      populateKeys(elements.responseHeadersDeleteList, respHeadersMod.delete, 'header');
    } else if (respHeadersMod.addOrUpdate) {
      elements.responseHeadersOperation.value = 'addOrUpdate';
      populateKeyValuePairs(elements.responseHeadersPairsList, respHeadersMod.addOrUpdate, 'header');
    }
  }
}

// 重置模态框表单
function resetModalForm(elements) {
  elements.modalTitle.textContent = getMessage('addNewRule');
  elements.ruleName.value = '';
  elements.ruleType.value = 'url-regex';
  elements.rulePattern.value = '';
  elements.ruleAction.value = 'capture';
  elements.modifyType.value = 'json-merge';
  elements.modifyValue.value = '';
  elements.textPattern.value = '';
  elements.textReplacement.value = '';
  elements.queryOperation.value = 'addOrUpdate';
  elements.headersOperation.value = 'addOrUpdate';
  elements.responseBodyModifyType.value = 'json-merge';
  elements.responseBodyModifyValue.value = '';
  elements.responseBodyTextPattern.value = '';
  elements.responseBodyTextReplacement.value = '';
  elements.responseHeadersOperation.value = 'addOrUpdate';
  
  // 初始化空的键值对列表
  populateKeyValuePairs(elements.queryPairsList, {}, 'query');
  populateKeys(elements.queryDeleteList, [], 'query');
  populateKeyValuePairs(elements.headersPairsList, {}, 'header');
  populateKeys(elements.headersDeleteList, [], 'header');
  populateKeyValuePairs(elements.responseHeadersPairsList, {}, 'header');
  populateKeys(elements.responseHeadersDeleteList, [], 'header');
}

// 关闭规则编辑模态框
export function closeRuleModal(modal) {
  modal.classList.add('hidden');
  editingRuleId = null;
}

// 保存规则
export async function saveRule(elements, saveMessage) {
  const name = elements.ruleName.value.trim();
  const type = elements.ruleType.value;
  const pattern = elements.rulePattern.value.trim();
  const actionType = elements.ruleAction.value;
  
  // 验证
  if (!name) {
    showFormMessage(saveMessage, getMessage('ruleNameRequired'), 'error');
    return false;
  }
  
  if (!pattern) {
    showFormMessage(saveMessage, getMessage('rulePatternRequired'), 'error');
    return false;
  }
  
  // 验证正则表达式
  try {
    new RegExp(pattern);
  } catch (error) {
    showFormMessage(saveMessage, getMessage('invalidRegexPattern') + ': ' + error.message, 'error');
    return false;
  }
  
  // 构建规则对象
  const rule = {
    id: editingRuleId || generateId(),
    name,
    enabled: editingRuleId ? currentRules.find(r => r.id === editingRuleId).enabled : true,
    type,
    condition: { pattern },
    action: { type: actionType }
  };
  
  // 添加修改配置
  const modifications = buildModifications(actionType, elements, saveMessage);
  if (modifications === null) return false; // 验证失败
  
  if (modifications) {
    rule.action.modifications = modifications;
  }
  
  try {
    // 保存规则
    const messageType = editingRuleId ? 'UPDATE_RULE' : 'ADD_RULE';
    const response = await chrome.runtime.sendMessage({
      type: messageType,
      rule: rule
    });
    
    if (response.success) {
      currentRules = response.rules || [];
      return true;
    } else {
      showFormMessage(saveMessage, getMessage('saveFailed'), 'error');
      return false;
    }
  } catch (error) {
    console.error('Failed to save rule:', error);
    showFormMessage(saveMessage, getMessage('saveFailed') + ': ' + error.message, 'error');
    return false;
  }
}

// 构建修改配置
function buildModifications(actionType, elements, saveMessage) {
  if (actionType === 'modifyRequestBody') {
    return buildRequestBodyModification(elements, saveMessage);
  } else if (actionType === 'modifyQuery') {
    return buildQueryModification(elements, saveMessage);
  } else if (actionType === 'modifyHeaders') {
    return buildHeadersModification(elements, saveMessage);
  } else if (actionType === 'modifyResponseBody') {
    return buildResponseBodyModification(elements, saveMessage);
  } else if (actionType === 'modifyResponseHeaders') {
    return buildResponseHeadersModification(elements, saveMessage);
  }
  
  return undefined;
}

// 构建请求体修改配置
function buildRequestBodyModification(elements, saveMessage) {
  const modifyType = elements.modifyType.value;
  
  if (modifyType === 'text-replace') {
    const textPattern = elements.textPattern.value.trim();
    const textReplacement = elements.textReplacement.value;
    
    if (!textPattern) {
      showFormMessage(saveMessage, '查找文本不能为空', 'error');
      return null;
    }
    
    return {
      requestBody: {
        type: 'text-replace',
        pattern: textPattern,
        replacement: textReplacement
      }
    };
  } else {
    const modifyValue = elements.modifyValue.value.trim();
    
    if (!modifyValue) {
      showFormMessage(saveMessage, '修改内容不能为空', 'error');
      return null;
    }
    
    try {
      const jsonValue = JSON.parse(modifyValue);
      return {
        requestBody: {
          type: modifyType,
          value: jsonValue
        }
      };
    } catch (error) {
      showFormMessage(saveMessage, '无效的 JSON 格式: ' + error.message, 'error');
      return null;
    }
  }
}

// 构建Query修改配置
function buildQueryModification(elements, saveMessage) {
  const operation = elements.queryOperation.value;
  
  if (operation === 'delete') {
    const deleteKeys = getKeysFromContainer(elements.queryDeleteList);
    
    if (deleteKeys.length === 0) {
      showFormMessage(saveMessage, '请至少添加一个要删除的参数', 'error');
      return null;
    }
    
    return { query: { delete: deleteKeys } };
  } else {
    const pairs = getKeyValuePairsFromContainer(elements.queryPairsList);
    
    if (Object.keys(pairs).length === 0) {
      showFormMessage(saveMessage, '请至少添加一个参数', 'error');
      return null;
    }
    
    return { query: { addOrUpdate: pairs } };
  }
}

// 构建请求头修改配置
function buildHeadersModification(elements, saveMessage) {
  const operation = elements.headersOperation.value;
  
  if (operation === 'delete') {
    const deleteKeys = getKeysFromContainer(elements.headersDeleteList);
    
    if (deleteKeys.length === 0) {
      showFormMessage(saveMessage, '请至少添加一个要删除的请求头', 'error');
      return null;
    }
    
    return { headers: { delete: deleteKeys } };
  } else {
    const pairs = getKeyValuePairsFromContainer(elements.headersPairsList);
    
    if (Object.keys(pairs).length === 0) {
      showFormMessage(saveMessage, '请至少添加一个请求头', 'error');
      return null;
    }
    
    return { headers: { addOrUpdate: pairs } };
  }
}

// 构建响应体修改配置
function buildResponseBodyModification(elements, saveMessage) {
  const modifyType = elements.responseBodyModifyType.value;
  
  if (modifyType === 'text-replace') {
    const textPattern = elements.responseBodyTextPattern.value.trim();
    const textReplacement = elements.responseBodyTextReplacement.value;
    
    if (!textPattern) {
      showFormMessage(saveMessage, '查找文本不能为空', 'error');
      return null;
    }
    
    return {
      responseBody: {
        type: 'text-replace',
        pattern: textPattern,
        replacement: textReplacement
      }
    };
  } else {
    const modifyValue = elements.responseBodyModifyValue.value.trim();
    
    if (!modifyValue) {
      showFormMessage(saveMessage, '修改内容不能为空', 'error');
      return null;
    }
    
    try {
      const jsonValue = JSON.parse(modifyValue);
      return {
        responseBody: {
          type: modifyType,
          value: jsonValue
        }
      };
    } catch (error) {
      showFormMessage(saveMessage, '无效的 JSON 格式: ' + error.message, 'error');
      return null;
    }
  }
}

// 构建响应头修改配置
function buildResponseHeadersModification(elements, saveMessage) {
  const operation = elements.responseHeadersOperation.value;
  
  if (operation === 'delete') {
    const deleteKeys = getKeysFromContainer(elements.responseHeadersDeleteList);
    
    if (deleteKeys.length === 0) {
      showFormMessage(saveMessage, '请至少添加一个要删除的响应头', 'error');
      return null;
    }
    
    return { responseHeaders: { delete: deleteKeys } };
  } else {
    const pairs = getKeyValuePairsFromContainer(elements.responseHeadersPairsList);
    
    if (Object.keys(pairs).length === 0) {
      showFormMessage(saveMessage, '请至少添加一个响应头', 'error');
      return null;
    }
    
    return { responseHeaders: { addOrUpdate: pairs } };
  }
}

// 删除规则
export async function deleteRule(ruleId) {
  if (!confirm(getMessage('confirmDeleteRule'))) {
    return false;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'DELETE_RULE',
      ruleId: ruleId
    });
    
    if (response.success) {
      currentRules = response.rules || [];
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to delete rule:', error);
    return false;
  }
}

// 上移规则
export async function moveRuleUp(ruleId) {
  const index = currentRules.findIndex(r => r.id === ruleId);
  if (index <= 0) return false;
  
  // 交换位置
  [currentRules[index - 1], currentRules[index]] = [currentRules[index], currentRules[index - 1]];
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_RULES',
      rules: currentRules
    });
    
    return response.success;
  } catch (error) {
    console.error('Failed to move rule up:', error);
    return false;
  }
}

// 下移规则
export async function moveRuleDown(ruleId) {
  const index = currentRules.findIndex(r => r.id === ruleId);
  if (index < 0 || index >= currentRules.length - 1) return false;
  
  // 交换位置
  [currentRules[index], currentRules[index + 1]] = [currentRules[index + 1], currentRules[index]];
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_RULES',
      rules: currentRules
    });
    
    return response.success;
  } catch (error) {
    console.error('Failed to move rule down:', error);
    return false;
  }
}

// 切换规则启用状态
export async function toggleRuleEnabled(ruleId, enabled) {
  const rule = currentRules.find(r => r.id === ruleId);
  if (!rule) return false;
  
  rule.enabled = enabled;
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'UPDATE_RULE',
      rule: rule
    });
    
    if (response.success) {
      currentRules = response.rules || [];
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to toggle rule:', error);
    return false;
  }
}
