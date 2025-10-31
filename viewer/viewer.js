/**
 * RequestHelper - Viewer (Main Entry)
 * 主入口文件，协调各个模块
 */

import { getMessage, translatePage } from '../utils/i18n.js';
import { state, updateAllRequests, updateFilteredRequests, clearState, toggleStatusCode, clearStatusCodes, toggleMethod, clearMethods, toggleRule, clearRules, toggleSlowRequestsOnly, toggleSearchScope } from './modules/state.js';
import { showToast } from './modules/utils.js';
import { updateMethodFilter, updateStatusFilter, updateRuleFilter, filterRequests, updateMethodButtonText, updateStatusButtonText, updateRuleButtonText } from './modules/filter-manager.js';
import { renderRequestsList, bindRequestListEvents } from './modules/request-list.js';
import { renderRequestDetails } from './modules/request-details.js';

// DOM元素
const requestsList = document.getElementById('requests-list');
const requestDetails = document.getElementById('request-details');
const searchInput = document.getElementById('search-input');
const searchUrlCheckbox = document.getElementById('search-url');
const searchRequestHeadersCheckbox = document.getElementById('search-request-headers');
const searchRequestBodyCheckbox = document.getElementById('search-request-body');
const searchResponseHeadersCheckbox = document.getElementById('search-response-headers');
const searchResponseBodyCheckbox = document.getElementById('search-response-body');
const methodFilterBtn = document.getElementById('method-filter-btn');
const methodFilterDropdown = document.getElementById('method-filter-dropdown');
const methodFilterList = document.getElementById('method-filter-list');
const methodClearBtn = document.getElementById('method-clear-btn');
const statusFilterBtn = document.getElementById('status-filter-btn');
const statusFilterDropdown = document.getElementById('status-filter-dropdown');
const statusFilterList = document.getElementById('status-filter-list');
const statusClearBtn = document.getElementById('status-clear-btn');
const ruleFilterBtn = document.getElementById('rule-filter-btn');
const ruleFilterDropdown = document.getElementById('rule-filter-dropdown');
const ruleFilterList = document.getElementById('rule-filter-list');
const ruleClearBtn = document.getElementById('rule-clear-btn');
const slowRequestBtn = document.getElementById('slow-request-btn');
const clearBtn = document.getElementById('clear-btn');
const resizer = document.getElementById('resizer');

// 初始化
async function init() {
  // 翻译页面
  translatePage();
  
  // 加载请求列表
  await loadRequests();
  
  // 绑定事件
  bindEvents();
  
  // 监听后台消息
  chrome.runtime.onMessage.addListener(handleBackgroundMessage);
  
  // 初始化拖拽分隔线
  initResizer();
}

// 加载请求列表
async function loadRequests() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_REQUESTS' });
    
    if (response.success) {
      updateAllRequests(response.requests || []);
      updateMethodFilter(methodFilterList, state.selectedMethods);
      updateStatusFilter(statusFilterList, state.selectedStatusCodes);
      updateRuleFilter(ruleFilterList, state.selectedRules);
      renderList();
    }
  } catch (error) {
    console.error('Failed to load requests:', error);
  }
}

// 渲染请求列表
function renderList() {
  renderRequestsList(requestsList, state.filteredRequests);
  bindRequestListEvents(requestsList, (request) => {
    renderRequestDetails(request, requestDetails);
  });
}

// 处理过滤
function handleFilter() {
  const searchText = searchInput.value.toLowerCase();
  const filtered = filterRequests(searchText);
  updateFilteredRequests(filtered);
  renderList();
}

// 绑定所有事件
function bindEvents() {
  // 搜索
  searchInput.addEventListener('input', handleFilter);
  searchUrlCheckbox.addEventListener('change', handleSearchScopeChange);
  searchRequestHeadersCheckbox.addEventListener('change', handleSearchScopeChange);
  searchRequestBodyCheckbox.addEventListener('change', handleSearchScopeChange);
  searchResponseHeadersCheckbox.addEventListener('change', handleSearchScopeChange);
  searchResponseBodyCheckbox.addEventListener('change', handleSearchScopeChange);
  
  // 方法过滤
  methodFilterBtn.addEventListener('click', toggleMethodDropdown);
  methodClearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearMethods();
    updateMethodFilter(methodFilterList, state.selectedMethods);
    updateMethodButtonText(methodFilterBtn);
    handleFilter();
  });
  
  // 状态码过滤
  statusFilterBtn.addEventListener('click', toggleStatusDropdown);
  statusClearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearStatusCodes();
    updateStatusFilter(statusFilterList, state.selectedStatusCodes);
    updateStatusButtonText(statusFilterBtn);
    handleFilter();
  });
  
  // 规则过滤
  ruleFilterBtn.addEventListener('click', toggleRuleDropdown);
  ruleClearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearRules();
    updateRuleFilter(ruleFilterList, state.selectedRules);
    updateRuleButtonText(ruleFilterBtn);
    handleFilter();
  });
  
  // 慢请求过滤
  slowRequestBtn.addEventListener('click', () => {
    const isActive = toggleSlowRequestsOnly();
    if (isActive) {
      slowRequestBtn.classList.add('active');
    } else {
      slowRequestBtn.classList.remove('active');
    }
    handleFilter();
  });
  
  // 清空按钮
  clearBtn.addEventListener('click', handleClear);

  // 点击外部关闭下拉菜单
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.method-filter-container')) {
      methodFilterDropdown.classList.remove('show');
    }
    if (!e.target.closest('.status-filter-container')) {
      statusFilterDropdown.classList.remove('show');
    }
    if (!e.target.closest('.rule-filter-container')) {
      ruleFilterDropdown.classList.remove('show');
    }
  });
}

// 切换方法下拉菜单
function toggleMethodDropdown(e) {
  e.stopPropagation();
  methodFilterDropdown.classList.toggle('show');
  
  // 重新绑定复选框事件
  methodFilterList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.removeEventListener('change', handleMethodFilterChange);
    checkbox.addEventListener('change', handleMethodFilterChange);
  });
}

// 处理方法筛选变化
function handleMethodFilterChange(e) {
  const method = e.target.value;
  
  if (e.target.checked) {
    state.selectedMethods.add(method);
  } else {
    state.selectedMethods.delete(method);
  }

  updateMethodButtonText(methodFilterBtn);
  handleFilter();
}

// 切换状态码下拉菜单
function toggleStatusDropdown(e) {
  e.stopPropagation();
  statusFilterDropdown.classList.toggle('show');
  
  // 重新绑定复选框事件
  statusFilterList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.removeEventListener('change', handleStatusFilterChange);
    checkbox.addEventListener('change', handleStatusFilterChange);
  });
}

// 处理状态码筛选变化
function handleStatusFilterChange(e) {
  const code = e.target.value;
  // 如果不是 pending，转换为整数
  const codeValue = code === 'pending' ? 'pending' : parseInt(code);
  
  if (e.target.checked) {
    state.selectedStatusCodes.add(codeValue);
  } else {
    state.selectedStatusCodes.delete(codeValue);
  }

  updateStatusButtonText(statusFilterBtn);
  handleFilter();
}

// 切换规则下拉菜单
function toggleRuleDropdown(e) {
  e.stopPropagation();
  ruleFilterDropdown.classList.toggle('show');
  
  // 重新绑定复选框事件
  ruleFilterList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.removeEventListener('change', handleRuleFilterChange);
    checkbox.addEventListener('change', handleRuleFilterChange);
  });
}

// 处理规则筛选变化
function handleRuleFilterChange(e) {
  const ruleId = e.target.value;
  
  if (e.target.checked) {
    state.selectedRules.add(ruleId);
  } else {
    state.selectedRules.delete(ruleId);
  }

  updateRuleButtonText(ruleFilterBtn);
  handleFilter();
}

// 处理搜索范围变化
function handleSearchScopeChange(e) {
  const scope = e.target.value;
  toggleSearchScope(scope);
  handleFilter();
}

// 初始化拖拽分隔线
function initResizer() {
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  
  const container = document.querySelector('.requests-container');
  
  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = requestsList.offsetWidth;
    
    // 添加选择禁用样式，防止拖拽时文本被选中
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX;
    const newWidth = startWidth + deltaX;
    const containerWidth = container.offsetWidth;
    
    // 限制最小和最大宽度（20% - 60%）
    const minWidth = containerWidth * 0.2;
    const maxWidth = containerWidth * 0.6;
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      const percentage = (newWidth / containerWidth * 100);
      requestsList.style.width = `${percentage}%`;
    }
  });
  
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
  });
}

// 清空数据
async function handleClear() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'CLEAR_REQUESTS' });
    
    if (response.success) {
      clearState();
      renderList();
      requestDetails.innerHTML = `
        <div class="empty-state">
          <p data-i18n="selectRequest">${getMessage('selectRequest')}</p>
        </div>
      `;
      showToast(getMessage('dataClearedSuccess'), 'success');
    }
  } catch (error) {
    console.error('Failed to clear:', error);
    showToast(getMessage('copyFailed'), 'error');
  }
}

// 处理后台消息
function handleBackgroundMessage(message) {
  if (message.type === 'REQUESTS_UPDATED') {
    loadRequests();
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', init);
