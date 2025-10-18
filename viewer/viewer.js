/**
 * RequestHelper - Viewer
 */

import { getMessage, translatePage } from '../utils/i18n.js';

let allRequests = [];
let filteredRequests = [];
let selectedRequest = null;
let selectedStatusCodes = new Set(); // 选中的状态码
let showSlowRequestsOnly = false; // 是否仅显示慢请求

// DOM元素
const requestsList = document.getElementById('requests-list');
const requestDetails = document.getElementById('request-details');
const searchInput = document.getElementById('search-input');
const methodFilter = document.getElementById('method-filter');
const statusFilterBtn = document.getElementById('status-filter-btn');
const statusFilterDropdown = document.getElementById('status-filter-dropdown');
const statusFilterList = document.getElementById('status-filter-list');
const statusClearBtn = document.getElementById('status-clear-btn');
const slowRequestBtn = document.getElementById('slow-request-btn');
const clearBtn = document.getElementById('clear-btn');

// 显示 Toast 提示
function showToast(message, type = 'success') {
  // 移除已存在的 toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  // 创建新 toast
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // 显示 toast
  setTimeout(() => toast.classList.add('show'), 10);

  // 3秒后自动隐藏
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 初始化
async function init() {
  console.log('Viewer initialized');
  
  // 翻译页面
  translatePage();
  
  // 加载请求列表
  await loadRequests();
  
  // 绑定事件
  searchInput.addEventListener('input', handleFilter);
  methodFilter.addEventListener('change', handleFilter);
  statusFilterBtn.addEventListener('click', toggleStatusDropdown);
  statusClearBtn.addEventListener('click', clearStatusFilter);
  slowRequestBtn.addEventListener('click', toggleSlowRequestFilter);
  clearBtn.addEventListener('click', handleClear);

  // 点击外部关闭下拉菜单
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.status-filter-container')) {
      statusFilterDropdown.classList.remove('show');
    }
  });

  // 监听后台消息
  chrome.runtime.onMessage.addListener(handleBackgroundMessage);
}

// 加载请求列表
async function loadRequests() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_REQUESTS' });
    
    if (response.success) {
      allRequests = response.requests || [];
      filteredRequests = [...allRequests];
      updateStatusFilter(); // 更新状态码筛选器
      renderRequestsList();
    }
  } catch (error) {
    console.error('Failed to load requests:', error);
  }
}

// 更新状态码筛选器
function updateStatusFilter() {
  // 统计所有状态码及其数量
  const statusCodeMap = new Map();
  
  allRequests.forEach(req => {
    if (req.statusCode) {
      const code = req.statusCode;
      statusCodeMap.set(code, (statusCodeMap.get(code) || 0) + 1);
    }
  });

  // 按状态码排序
  const sortedCodes = Array.from(statusCodeMap.entries()).sort((a, b) => a[0] - b[0]);

  // 生成选项列表
  if (sortedCodes.length === 0) {
    statusFilterList.innerHTML = `<div class="empty-notice">${getMessage('noStatusCodes')}</div>`;
    return;
  }

  const html = sortedCodes.map(([code, count]) => `
    <label class="status-checkbox-item">
      <input type="checkbox" value="${code}" ${selectedStatusCodes.has(code) ? 'checked' : ''}>
      <span class="status-code status-${getStatusClass(code)}">${code}</span>
      <span class="status-count">(${count})</span>
    </label>
  `).join('');

  statusFilterList.innerHTML = html;

  // 绑定复选框事件
  statusFilterList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', handleStatusFilterChange);
  });

  // 更新按钮文本
  updateStatusButtonText();
}

// 切换状态码下拉菜单
function toggleStatusDropdown(e) {
  e.stopPropagation();
  statusFilterDropdown.classList.toggle('show');
}

// 处理状态码筛选变化
function handleStatusFilterChange(e) {
  const code = parseInt(e.target.value);
  
  if (e.target.checked) {
    selectedStatusCodes.add(code);
  } else {
    selectedStatusCodes.delete(code);
  }

  updateStatusButtonText();
  handleFilter();
}

// 更新状态码按钮文本
function updateStatusButtonText() {
  const count = selectedStatusCodes.size;
  if (count > 0) {
    statusFilterBtn.innerHTML = `<span data-i18n="statusCode">${getMessage('statusCode')}</span> (${count}) ▼`;
    statusFilterBtn.classList.add('active');
  } else {
    statusFilterBtn.innerHTML = `<span data-i18n="statusCode">${getMessage('statusCode')}</span> ▼`;
    statusFilterBtn.classList.remove('active');
  }
}

// 清除状态码筛选
function clearStatusFilter(e) {
  e.stopPropagation();
  selectedStatusCodes.clear();
  updateStatusFilter();
  handleFilter();
}

// 切换慢请求筛选
function toggleSlowRequestFilter() {
  showSlowRequestsOnly = !showSlowRequestsOnly;
  
  if (showSlowRequestsOnly) {
    slowRequestBtn.classList.add('active');
  } else {
    slowRequestBtn.classList.remove('active');
  }
  
  handleFilter();
}

// 过滤请求
function handleFilter() {
  const searchText = searchInput.value.toLowerCase();
  const method = methodFilter.value;

  filteredRequests = allRequests.filter(req => {
    // URL搜索
    if (searchText && !req.url.toLowerCase().includes(searchText)) {
      return false;
    }

    // 方法过滤
    if (method && req.method !== method) {
      return false;
    }

    // 状态码过滤（不选等于不过滤）
    if (selectedStatusCodes.size > 0) {
      if (!req.statusCode || !selectedStatusCodes.has(req.statusCode)) {
        return false;
      }
    }

    // 慢请求过滤（仅显示耗时超过1秒的请求）
    if (showSlowRequestsOnly) {
      if (!req.duration || req.duration < 1000) {
        return false;
      }
    }

    return true;
  });

  renderRequestsList();
}

// 渲染请求列表
function renderRequestsList() {
  if (filteredRequests.length === 0) {
    requestsList.innerHTML = `
      <div class="empty-state">
        <p>${getMessage('noMatchingRequests')}</p>
      </div>
    `;
    return;
  }

  const html = filteredRequests.map(req => `
    <div class="request-item" data-id="${req.id}">
      <div>
        <span class="request-method method-${req.method}">${req.method}</span>
        <span class="request-url">${truncateUrl(req.url)}</span>
      </div>
      <div class="request-meta">
        <span>${formatTime(req.timestamp)}</span>
        ${req.statusCode ? `<span class="status-code status-${getStatusClass(req.statusCode)}">${req.statusCode}</span>` : '<span>pending</span>'}
      </div>
    </div>
  `).join('');

  requestsList.innerHTML = html;

  // 绑定点击事件
  requestsList.querySelectorAll('.request-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      selectRequest(id);
    });
  });
}

// 选择请求
async function selectRequest(id) {
  const request = allRequests.find(req => req.id === id);
  if (!request) return;

  selectedRequest = request;

  // 更新选中状态
  requestsList.querySelectorAll('.request-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === id);
  });

  // 显示详情
  renderRequestDetails(request);
}

// 渲染请求详情
function renderRequestDetails(request) {
  const html = `
    <div class="detail-section">
      <h3>${getMessage('general')}</h3>
      <div class="detail-grid">
        <span class="detail-label">${getMessage('url')}:</span>
        <span class="detail-value">${request.url}</span>
        
        <span class="detail-label">${getMessage('method')}:</span>
        <span class="detail-value">${request.method}</span>
        
        <span class="detail-label">${getMessage('status')}:</span>
        <span class="detail-value status-code status-${getStatusClass(request.statusCode)}">${request.statusCode || 'N/A'}</span>
        
        <span class="detail-label">${getMessage('type')}:</span>
        <span class="detail-value">${request.type || 'N/A'}</span>
        
        <span class="detail-label">${getMessage('timestamp')}:</span>
        <span class="detail-value">${formatTime(request.timestamp)}</span>
        
        <span class="detail-label">${getMessage('duration')}:</span>
        <span class="detail-value">${request.duration ? request.duration.toFixed(2) + 'ms' : 'N/A'}</span>
        
        ${request.ip ? `
          <span class="detail-label">IP:</span>
          <span class="detail-value">${request.ip}</span>
        ` : ''}
        
        ${request.fromCache ? `
          <span class="detail-label">Cache:</span>
          <span class="detail-value">From Cache</span>
        ` : ''}
        
        ${request.source ? `
          <span class="detail-label">${getMessage('source')}:</span>
          <span class="detail-value">${request.source}</span>
        ` : ''}
      </div>
    </div>

    ${renderHeaders(getMessage('requestHeaders'), request.requestHeaders)}
    
    ${request.requestBody ? renderRequestBody(request.requestBody) : ''}
    
    ${renderHeaders(getMessage('responseHeaders'), request.responseHeaders)}
    
    ${request.responseBody ? renderResponseBody(request.responseBody, request.contentType) : `
      <div class="detail-section">
        <h3>${getMessage('responseBody')}</h3>
        <p class="empty-notice">None</p>
      </div>
    `}
    
    ${request.error ? `
      <div class="detail-section">
        <h3>Error</h3>
        <pre>${request.error}</pre>
      </div>
    ` : ''}
  `;

  requestDetails.innerHTML = html;
}

// 渲染头部
function renderHeaders(title, headers) {
  if (!headers || Object.keys(headers).length === 0) {
    return '';
  }

  const headersHtml = Object.entries(headers)
    .map(([name, value]) => `
      <div class="header-item">
        <span class="header-name">${name}:</span>
        <span class="header-value">${value}</span>
      </div>
    `)
    .join('');

  return `
    <div class="detail-section">
      <h3>${title}</h3>
      <div class="headers-list">
        ${headersHtml}
      </div>
    </div>
  `;
}

// 渲染请求体
function renderRequestBody(requestBody) {
  let bodyHtml = '';

  if (requestBody.formData) {
    bodyHtml = '<pre>' + JSON.stringify(requestBody.formData, null, 2) + '</pre>';
  } else if (requestBody.raw) {
    // 尝试显示解码后的内容
    const rawItems = Array.isArray(requestBody.raw) ? requestBody.raw : [requestBody.raw];
    const processedItems = rawItems.map(item => {
      // 如果有JSON格式，优先显示JSON
      if (item.json) {
        return JSON.stringify(item.json, null, 2);
      }
      // 否则显示文本
      if (item.text) {
        return item.text;
      }
      // 如果都没有，显示字节信息
      if (item.bytes) {
        return `Raw data (${item.bytes.length} bytes)`;
      }
      return 'Raw data (binary)';
    });
    
    bodyHtml = '<pre>' + escapeHtml(processedItems.join('\n\n')) + '</pre>';
  } else if (typeof requestBody === 'string') {
    bodyHtml = '<pre>' + escapeHtml(requestBody) + '</pre>';
  } else if (typeof requestBody === 'object') {
    bodyHtml = '<pre>' + JSON.stringify(requestBody, null, 2) + '</pre>';
  }

  return `
    <div class="detail-section">
      <h3>${getMessage('requestBody')}</h3>
      ${bodyHtml}
    </div>
  `;
}

// 渲染响应体
function renderResponseBody(responseBody, contentType) {
  let bodyHtml = '';
  let tabs = '';
  
  // 判断响应体类型
  if (!responseBody) {
    return '';
  }

  // 如果响应体有类型信息（来自 content script）
  if (responseBody.type) {
    switch (responseBody.type) {
      case 'json':
        bodyHtml = `<pre class="json-body">${JSON.stringify(responseBody.data, null, 2)}</pre>`;
        tabs = `
          <div class="tabs">
            <button class="tab active" data-tab="formatted">${getMessage('formatted')}</button>
            <button class="tab" data-tab="raw">${getMessage('raw')}</button>
          </div>
          <div class="tab-content">
            <div class="tab-pane active" data-pane="formatted">
              <pre class="json-body">${JSON.stringify(responseBody.data, null, 2)}</pre>
            </div>
            <div class="tab-pane" data-pane="raw">
              <pre>${escapeHtml(JSON.stringify(responseBody.data))}</pre>
            </div>
          </div>
        `;
        break;
      
      case 'html':
      case 'xml':
      case 'text':
        bodyHtml = `<pre class="text-body">${escapeHtml(String(responseBody.data).substring(0, 50000))}</pre>`;
        if (String(responseBody.data).length > 50000) {
          bodyHtml += '<p class="truncated-notice">Content too long, showing first 50000 characters</p>';
        }
        break;
      
      case 'raw':
        bodyHtml = `<pre>${escapeHtml(String(responseBody.data).substring(0, 10000))}</pre>`;
        if (String(responseBody.data).length > 10000) {
          bodyHtml += '<p class="truncated-notice">Content truncated</p>';
        }
        break;
    }

    if (responseBody.parseError) {
      bodyHtml += `<p class="error-notice">Parse error: ${escapeHtml(responseBody.parseError)}</p>`;
    }
  } else {
    // 旧格式的响应体
    if (typeof responseBody === 'string') {
      bodyHtml = '<pre>' + escapeHtml(responseBody.substring(0, 10000)) + '</pre>';
    } else if (typeof responseBody === 'object') {
      bodyHtml = '<pre>' + JSON.stringify(responseBody, null, 2) + '</pre>';
    }
  }

  const result = `
    <div class="detail-section">
      <h3>${getMessage('responseBody')} ${contentType ? `<span class="content-type">(${contentType})</span>` : ''}</h3>
      ${tabs || bodyHtml}
    </div>
  `;

  // 绑定标签切换事件
  setTimeout(() => {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        const section = e.target.closest('.detail-section');
        
        section.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        section.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        
        e.target.classList.add('active');
        section.querySelector(`[data-pane="${tabName}"]`).classList.add('active');
      });
    });
  }, 0);

  return result;
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 清空数据
async function handleClear() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'CLEAR_REQUESTS' });
    
    if (response.success) {
      allRequests = [];
      filteredRequests = [];
      selectedRequest = null;
      renderRequestsList();
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

// 工具函数
function truncateUrl(url, maxLength = 60) {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US');
}

function getStatusClass(statusCode) {
  if (!statusCode) return '';
  const code = Math.floor(statusCode / 100);
  return `${code}xx`;
}

// 初始化
document.addEventListener('DOMContentLoaded', init);
