/**
 * RequestHelper - Options Page (Main Entry)
 * 配置页面主入口
 */

import { getMessage, translatePage } from '../utils/i18n.js';
import { loadConfig, saveConfig, resetConfig, switchTab } from './modules/config-manager.js';
import { addKeyValuePair, addKeyItem, showMessage } from './modules/form-utils.js';
import { loadRules, renderRules, bindRuleActions, openRuleModal, closeRuleModal, saveRule, deleteRule, moveRuleUp, moveRuleDown } from './modules/rule-editor.js';

// DOM 元素 - Tabs
const tabButtons = document.querySelectorAll('.tab-button');

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

// DOM 元素 - Modify configurations
const modifyBodyConfigDiv = document.getElementById('modify-body-config');
const modifyTypeSelect = document.getElementById('modify-type');
const modifyValueTextarea = document.getElementById('modify-value');
const jsonModifyConfig = document.getElementById('json-modify-config');
const textReplaceConfig = document.getElementById('text-replace-config');
const textPatternInput = document.getElementById('text-pattern');
const textReplacementInput = document.getElementById('text-replacement');

const modifyQueryConfigDiv = document.getElementById('modify-query-config');
const queryOperationSelect = document.getElementById('query-operation');
const queryAddConfig = document.getElementById('query-add-config');
const queryDeleteConfig = document.getElementById('query-delete-config');
const queryPairsList = document.getElementById('query-pairs-list');
const addQueryPairBtn = document.getElementById('add-query-pair');
const queryDeleteList = document.getElementById('query-delete-list');
const addQueryDeleteKeyBtn = document.getElementById('add-query-delete-key');

const modifyHeadersConfigDiv = document.getElementById('modify-headers-config');
const headersOperationSelect = document.getElementById('headers-operation');
const headersAddConfig = document.getElementById('headers-add-config');
const headersDeleteConfig = document.getElementById('headers-delete-config');
const headersPairsList = document.getElementById('headers-pairs-list');
const addHeaderPairBtn = document.getElementById('add-header-pair');
const headersDeleteList = document.getElementById('headers-delete-list');
const addHeaderDeleteKeyBtn = document.getElementById('add-header-delete-key');

const modifyResponseBodyConfigDiv = document.getElementById('modify-response-body-config');
const responseBodyModifyTypeSelect = document.getElementById('response-body-modify-type');
const responseBodyModifyValueTextarea = document.getElementById('response-body-modify-value');
const responseBodyJsonConfig = document.getElementById('response-body-json-config');
const responseBodyTextReplaceConfig = document.getElementById('response-body-text-replace-config');
const responseBodyTextPatternInput = document.getElementById('response-body-text-pattern');
const responseBodyTextReplacementInput = document.getElementById('response-body-text-replacement');

const modifyResponseHeadersConfigDiv = document.getElementById('modify-response-headers-config');
const responseHeadersOperationSelect = document.getElementById('response-headers-operation');
const responseHeadersAddConfig = document.getElementById('response-headers-add-config');
const responseHeadersDeleteConfig = document.getElementById('response-headers-delete-config');
const responseHeadersPairsList = document.getElementById('response-headers-pairs-list');
const addResponseHeaderPairBtn = document.getElementById('add-response-header-pair');
const responseHeadersDeleteList = document.getElementById('response-headers-delete-list');
const addResponseHeaderDeleteKeyBtn = document.getElementById('add-response-header-delete-key');

// 配置元素对象
const configElements = {
  autoStart: autoStartCheckbox,
  captureStaticResources: captureStaticResourcesCheckbox,
  maxRequests: maxRequestsInput
};

// 规则模态框元素对象
const modalElements = {
  modal: ruleModal,
  modalTitle: modalTitle,
  ruleName: ruleNameInput,
  ruleEnabled: ruleEnabledCheckbox,
  ruleType: ruleTypeSelect,
  rulePattern: rulePatternInput,
  ruleAction: ruleActionSelect,
  modifyType: modifyTypeSelect,
  modifyValue: modifyValueTextarea,
  textPattern: textPatternInput,
  textReplacement: textReplacementInput,
  queryOperation: queryOperationSelect,
  queryPairsList: queryPairsList,
  queryDeleteList: queryDeleteList,
  headersOperation: headersOperationSelect,
  headersPairsList: headersPairsList,
  headersDeleteList: headersDeleteList,
  responseBodyModifyType: responseBodyModifyTypeSelect,
  responseBodyModifyValue: responseBodyModifyValueTextarea,
  responseBodyTextPattern: responseBodyTextPatternInput,
  responseBodyTextReplacement: responseBodyTextReplacementInput,
  responseHeadersOperation: responseHeadersOperationSelect,
  responseHeadersPairsList: responseHeadersPairsList,
  responseHeadersDeleteList: responseHeadersDeleteList
};

// 初始化
async function init() {
  // 翻译页面
  translatePage();
  
  // 绑定 Tab 切换事件
  tabButtons.forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });
  
  // 加载配置和规则
  await loadConfig(configElements, saveMessage);
  await loadAndRenderRules();
  
  // 绑定基础配置事件
  saveBtn.addEventListener('click', handleSaveConfig);
  resetBtn.addEventListener('click', handleResetConfig);
  
  // 绑定规则事件
  addRuleBtn.addEventListener('click', () => handleOpenRuleModal());
  modalClose.addEventListener('click', () => handleCloseRuleModal());
  modalCancel.addEventListener('click', () => handleCloseRuleModal());
  modalSave.addEventListener('click', handleSaveRule);
  
  // 监听动作类型变化
  ruleActionSelect.addEventListener('change', handleActionTypeChange);
  modifyTypeSelect.addEventListener('change', handleModifyTypeChange);
  queryOperationSelect.addEventListener('change', handleQueryOperationChange);
  headersOperationSelect.addEventListener('change', handleHeadersOperationChange);
  responseBodyModifyTypeSelect.addEventListener('change', handleResponseBodyModifyTypeChange);
  responseHeadersOperationSelect.addEventListener('change', handleResponseHeadersOperationChange);
  
  // 添加键值对按钮
  addQueryPairBtn.addEventListener('click', () => addKeyValuePair(queryPairsList, 'query'));
  addQueryDeleteKeyBtn.addEventListener('click', () => addKeyItem(queryDeleteList, 'query'));
  addHeaderPairBtn.addEventListener('click', () => addKeyValuePair(headersPairsList, 'header'));
  addHeaderDeleteKeyBtn.addEventListener('click', () => addKeyItem(headersDeleteList, 'header'));
  addResponseHeaderPairBtn.addEventListener('click', () => addKeyValuePair(responseHeadersPairsList, 'header'));
  addResponseHeaderDeleteKeyBtn.addEventListener('click', () => addKeyItem(responseHeadersDeleteList, 'header'));
}

// 加载并渲染规则
async function loadAndRenderRules() {
  try {
    await loadRules();
    renderRules(rulesList, emptyRules);
    bindRuleActions(rulesList, {
      onEdit: handleEditRule,
      onDelete: handleDeleteRule,
      onMoveUp: handleMoveRuleUp,
      onMoveDown: handleMoveRuleDown
    });
  } catch (error) {
    console.error('Failed to load rules:', error);
    showMessage(saveMessage, getMessage('failedToLoadConfig'), 'error');
  }
}

// 保存配置
async function handleSaveConfig() {
  await saveConfig(configElements, saveMessage);
}

// 重置配置
function handleResetConfig() {
  resetConfig(configElements, saveMessage);
}

// 打开规则模态框
function handleOpenRuleModal(ruleId = null) {
  openRuleModal(ruleId, modalElements);
  handleActionTypeChange();
}

// 关闭规则模态框
function handleCloseRuleModal() {
  closeRuleModal(ruleModal);
}

// 保存规则
async function handleSaveRule() {
  const success = await saveRule(modalElements, saveMessage);
  if (success) {
    handleCloseRuleModal();
    await loadAndRenderRules(); // 重新加载并渲染规则
    showMessage(saveMessage, getMessage('settingsSaved'), 'success');
  }
}

// 编辑规则
function handleEditRule(ruleId) {
  handleOpenRuleModal(ruleId);
}

// 删除规则
async function handleDeleteRule(ruleId) {
  const success = await deleteRule(ruleId);
  if (success) {
    await loadAndRenderRules(); // 重新加载并渲染规则
    showMessage(saveMessage, getMessage('settingsSaved'), 'success');
  }
}

// 上移规则
async function handleMoveRuleUp(ruleId) {
  const success = await moveRuleUp(ruleId);
  if (success) {
    await loadAndRenderRules(); // 重新加载并渲染规则
  }
}

// 下移规则
async function handleMoveRuleDown(ruleId) {
  const success = await moveRuleDown(ruleId);
  if (success) {
    await loadAndRenderRules(); // 重新加载并渲染规则
  }
}

// 处理动作类型变化
function handleActionTypeChange() {
  const actionType = ruleActionSelect.value;
  
  // 隐藏所有修改配置
  modifyBodyConfigDiv.classList.add('hidden');
  modifyQueryConfigDiv.classList.add('hidden');
  modifyHeadersConfigDiv.classList.add('hidden');
  modifyResponseBodyConfigDiv.classList.add('hidden');
  modifyResponseHeadersConfigDiv.classList.add('hidden');
  
  // 根据动作类型显示相应配置
  if (actionType === 'modifyRequestBody') {
    modifyBodyConfigDiv.classList.remove('hidden');
    handleModifyTypeChange();
  } else if (actionType === 'modifyQuery') {
    modifyQueryConfigDiv.classList.remove('hidden');
    handleQueryOperationChange();
  } else if (actionType === 'modifyHeaders') {
    modifyHeadersConfigDiv.classList.remove('hidden');
    handleHeadersOperationChange();
  } else if (actionType === 'modifyResponseBody') {
    modifyResponseBodyConfigDiv.classList.remove('hidden');
    handleResponseBodyModifyTypeChange();
  } else if (actionType === 'modifyResponseHeaders') {
    modifyResponseHeadersConfigDiv.classList.remove('hidden');
    handleResponseHeadersOperationChange();
  }
}

// 处理修改类型变化
function handleModifyTypeChange() {
  const modifyType = modifyTypeSelect.value;
  if (modifyType === 'text-replace') {
    jsonModifyConfig.classList.add('hidden');
    textReplaceConfig.classList.remove('hidden');
  } else {
    jsonModifyConfig.classList.remove('hidden');
    textReplaceConfig.classList.add('hidden');
  }
}

// 处理 Query 操作变化
function handleQueryOperationChange() {
  const operation = queryOperationSelect.value;
  if (operation === 'delete') {
    queryAddConfig.classList.add('hidden');
    queryDeleteConfig.classList.remove('hidden');
  } else {
    queryAddConfig.classList.remove('hidden');
    queryDeleteConfig.classList.add('hidden');
  }
}

// 处理请求头操作变化
function handleHeadersOperationChange() {
  const operation = headersOperationSelect.value;
  if (operation === 'delete') {
    headersAddConfig.classList.add('hidden');
    headersDeleteConfig.classList.remove('hidden');
  } else {
    headersAddConfig.classList.remove('hidden');
    headersDeleteConfig.classList.add('hidden');
  }
}

// 处理响应体修改类型变化
function handleResponseBodyModifyTypeChange() {
  const modifyType = responseBodyModifyTypeSelect.value;
  if (modifyType === 'text-replace') {
    responseBodyJsonConfig.classList.add('hidden');
    responseBodyTextReplaceConfig.classList.remove('hidden');
  } else {
    responseBodyJsonConfig.classList.remove('hidden');
    responseBodyTextReplaceConfig.classList.add('hidden');
  }
}

// 处理响应头操作变化
function handleResponseHeadersOperationChange() {
  const operation = responseHeadersOperationSelect.value;
  if (operation === 'delete') {
    responseHeadersAddConfig.classList.add('hidden');
    responseHeadersDeleteConfig.classList.remove('hidden');
  } else {
    responseHeadersAddConfig.classList.remove('hidden');
    responseHeadersDeleteConfig.classList.add('hidden');
  }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', init);
