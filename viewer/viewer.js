/**
 * RequestHelper - Viewer
 */

import { getMessage, translatePage } from '../utils/i18n.js';

let allRequests = [];
let filteredRequests = [];
let selectedRequest = null;
let selectedStatusCodes = new Set(); // 选中的状态码
let selectedMethods = new Set(); // 选中的请求方法
let showSlowRequestsOnly = false; // 是否仅显示慢请求
let searchScopes = new Set(['url']); // 搜索范围：url, requestBody, responseBody

// DOM元素
const requestsList = document.getElementById('requests-list');
const requestDetails = document.getElementById('request-details');
const searchInput = document.getElementById('search-input');
const searchUrlCheckbox = document.getElementById('search-url');
const searchRequestBodyCheckbox = document.getElementById('search-request-body');
const searchResponseBodyCheckbox = document.getElementById('search-response-body');
const methodFilterBtn = document.getElementById('method-filter-btn');
const methodFilterDropdown = document.getElementById('method-filter-dropdown');
const methodFilterList = document.getElementById('method-filter-list');
const methodClearBtn = document.getElementById('method-clear-btn');
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
  searchUrlCheckbox.addEventListener('change', handleSearchScopeChange);
  searchRequestBodyCheckbox.addEventListener('change', handleSearchScopeChange);
  searchResponseBodyCheckbox.addEventListener('change', handleSearchScopeChange);
  methodFilterBtn.addEventListener('click', toggleMethodDropdown);
  methodClearBtn.addEventListener('click', clearMethodFilter);
  statusFilterBtn.addEventListener('click', toggleStatusDropdown);
  statusClearBtn.addEventListener('click', clearStatusFilter);
  slowRequestBtn.addEventListener('click', toggleSlowRequestFilter);
  clearBtn.addEventListener('click', handleClear);

  // 点击外部关闭下拉菜单
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.method-filter-container')) {
      methodFilterDropdown.classList.remove('show');
    }
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
      updateMethodFilter(); // 更新请求方法筛选器
      updateStatusFilter(); // 更新状态码筛选器
      renderRequestsList();
    }
  } catch (error) {
    console.error('Failed to load requests:', error);
  }
}

// 更新请求方法筛选器
function updateMethodFilter() {
  // 统计所有请求方法及其数量
  const methodMap = new Map();
  
  allRequests.forEach(req => {
    if (req.method) {
      const method = req.method;
      methodMap.set(method, (methodMap.get(method) || 0) + 1);
    }
  });

  // 按常见顺序排序
  const methodOrder = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
  const sortedMethods = Array.from(methodMap.entries()).sort((a, b) => {
    const indexA = methodOrder.indexOf(a[0]);
    const indexB = methodOrder.indexOf(b[0]);
    if (indexA === -1 && indexB === -1) return a[0].localeCompare(b[0]);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // 生成选项列表
  if (sortedMethods.length === 0) {
    methodFilterList.innerHTML = `<div class="empty-notice">${getMessage('noMethods')}</div>`;
    return;
  }

  const html = sortedMethods.map(([method, count]) => `
    <label class="method-checkbox-item">
      <input type="checkbox" value="${method}" ${selectedMethods.has(method) ? 'checked' : ''}>
      <span class="request-method method-${method}">${method}</span>
      <span class="method-count">(${count})</span>
    </label>
  `).join('');

  methodFilterList.innerHTML = html;

  // 绑定复选框事件
  methodFilterList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', handleMethodFilterChange);
  });

  // 更新按钮文本
  updateMethodButtonText();
}

// 切换请求方法下拉菜单
function toggleMethodDropdown(e) {
  e.stopPropagation();
  methodFilterDropdown.classList.toggle('show');
}

// 处理请求方法筛选变化
function handleMethodFilterChange(e) {
  const method = e.target.value;
  
  if (e.target.checked) {
    selectedMethods.add(method);
  } else {
    selectedMethods.delete(method);
  }

  updateMethodButtonText();
  handleFilter();
}

// 更新请求方法按钮文本
function updateMethodButtonText() {
  const count = selectedMethods.size;
  if (count > 0) {
    methodFilterBtn.innerHTML = `<span data-i18n="method">${getMessage('method')}</span> (${count}) ▼`;
    methodFilterBtn.classList.add('active');
  } else {
    methodFilterBtn.innerHTML = `<span data-i18n="method">${getMessage('method')}</span> ▼`;
    methodFilterBtn.classList.remove('active');
  }
}

// 清除请求方法筛选
function clearMethodFilter(e) {
  e.stopPropagation();
  selectedMethods.clear();
  updateMethodFilter();
  handleFilter();
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

// 处理搜索范围变化
function handleSearchScopeChange(e) {
  const scope = e.target.value;
  
  if (e.target.checked) {
    searchScopes.add(scope);
  } else {
    searchScopes.delete(scope);
  }
  
  handleFilter();
}

// 在对象中搜索文本（递归）
function searchInObject(obj, searchText) {
  if (!obj) return false;
  
  // 如果是字符串，直接检查
  if (typeof obj === 'string') {
    return obj.toLowerCase().includes(searchText);
  }
  
  // 如果是数组，递归检查每个元素
  if (Array.isArray(obj)) {
    return obj.some(item => searchInObject(item, searchText));
  }
  
  // 如果是对象，递归检查每个值
  if (typeof obj === 'object') {
    return Object.values(obj).some(value => searchInObject(value, searchText));
  }
  
  // 其他类型转为字符串检查
  return String(obj).toLowerCase().includes(searchText);
}

// 过滤请求
function handleFilter() {
  const searchText = searchInput.value.toLowerCase();

  filteredRequests = allRequests.filter(req => {
    // 搜索功能（如果有搜索文本）
    if (searchText) {
      let matchFound = false;
      
      // 在URL中搜索
      if (searchScopes.has('url') && req.url && req.url.toLowerCase().includes(searchText)) {
        matchFound = true;
      }
      
      // 在请求体中搜索
      if (!matchFound && searchScopes.has('requestBody') && req.requestBody) {
        matchFound = searchInObject(req.requestBody, searchText);
      }
      
      // 在响应体中搜索
      if (!matchFound && searchScopes.has('responseBody') && req.responseBody) {
        // 检查响应体数据
        if (req.responseBody.data) {
          matchFound = searchInObject(req.responseBody.data, searchText);
        }
        // 如果响应体是字符串类型，也检查type字段
        if (!matchFound && req.responseBody.type) {
          matchFound = req.responseBody.type.toLowerCase().includes(searchText);
        }
      }
      
      if (!matchFound) {
        return false;
      }
    }

    // 方法过滤（不选等于不过滤）
    if (selectedMethods.size > 0) {
      if (!req.method || !selectedMethods.has(req.method)) {
        return false;
      }
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
        <p class="empty-notice">${getMessage('none') || 'None'}</p>
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
  
  // 绑定复制按钮事件
  setTimeout(() => {
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', handleCopyClick);
    });
  }, 0);
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
  let bodyContent = '';

  if (requestBody.formData) {
    bodyContent = JSON.stringify(requestBody.formData, null, 2);
    bodyHtml = '<pre>' + bodyContent + '</pre>';
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
    
    bodyContent = processedItems.join('\n\n');
    bodyHtml = '<pre>' + escapeHtml(bodyContent) + '</pre>';
  } else if (typeof requestBody === 'string') {
    bodyContent = requestBody;
    bodyHtml = '<pre>' + escapeHtml(bodyContent) + '</pre>';
  } else if (typeof requestBody === 'object') {
    bodyContent = JSON.stringify(requestBody, null, 2);
    bodyHtml = '<pre>' + bodyContent + '</pre>';
  }

  return `
    <div class="detail-section">
      <div class="section-header">
        <h3>${getMessage('requestBody')}</h3>
        <button class="copy-btn" data-copy-target="request-body" title="${getMessage('copy') || 'Copy'}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4z"/>
            <path d="M2 6V2a2 2 0 0 1 2-2h4v1H4a1 1 0 0 0-1 1v4H2z"/>
          </svg>
        </button>
      </div>
      ${bodyHtml}
    </div>
  `;
}

// 渲染响应体
function renderResponseBody(responseBody, contentType) {
  let bodyHtml = '';
  let tabs = '';
  let bodyContent = '';
  
  // 判断响应体类型
  if (!responseBody) {
    return '';
  }

  // 如果响应体有类型信息（来自 content script）
  if (responseBody.type) {
    switch (responseBody.type) {
      case 'json':
        bodyContent = JSON.stringify(responseBody.data, null, 2);
        bodyHtml = `<pre class="json-body">${bodyContent}</pre>`;
        tabs = `
          <div class="tabs">
            <button class="tab active" data-tab="formatted">${getMessage('formatted')}</button>
            <button class="tab" data-tab="raw">${getMessage('raw')}</button>
          </div>
          <div class="tab-content">
            <div class="tab-pane active" data-pane="formatted">
              <pre class="json-body">${bodyContent}</pre>
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
        bodyContent = String(responseBody.data);
        const truncatedContent = bodyContent.substring(0, 50000);
        bodyHtml = `<pre class="text-body">${escapeHtml(truncatedContent)}</pre>`;
        if (bodyContent.length > 50000) {
          bodyHtml += '<p class="truncated-notice">Content too long, showing first 50000 characters</p>';
        }
        break;
      
      case 'raw':
        bodyContent = String(responseBody.data);
        const truncatedRaw = bodyContent.substring(0, 10000);
        bodyHtml = `<pre>${escapeHtml(truncatedRaw)}</pre>`;
        if (bodyContent.length > 10000) {
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
      bodyContent = responseBody;
      bodyHtml = '<pre>' + escapeHtml(responseBody.substring(0, 10000)) + '</pre>';
    } else if (typeof responseBody === 'object') {
      bodyContent = JSON.stringify(responseBody, null, 2);
      bodyHtml = '<pre>' + bodyContent + '</pre>';
    }
  }

  const result = `
    <div class="detail-section">
      <div class="section-header">
        <h3>${getMessage('responseBody')} ${contentType ? `<span class="content-type">(${contentType})</span>` : ''}</h3>
        <button class="copy-btn" data-copy-target="response-body" title="${getMessage('copy') || 'Copy'}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4z"/>
            <path d="M2 6V2a2 2 0 0 1 2-2h4v1H4a1 1 0 0 0-1 1v4H2z"/>
          </svg>
        </button>
      </div>
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
    
    // 绑定复制按钮事件
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', handleCopyClick);
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

// 处理复制按钮点击
async function handleCopyClick(e) {
  const btn = e.currentTarget;
  const target = btn.dataset.copyTarget;
  
  if (!target || !selectedRequest) {
    showToast(getMessage('copyFailed') || 'Copy failed', 'error');
    return;
  }
  
  let content = '';
  
  try {
    // 根据目标类型获取内容
    if (target === 'request-body') {
      const requestBody = selectedRequest.requestBody;
      
      // 处理 formData 格式
      if (requestBody.formData) {
        content = JSON.stringify(requestBody.formData, null, 2);
      } 
      // 处理 raw 格式
      else if (requestBody.raw) {
        const rawItems = Array.isArray(requestBody.raw) ? requestBody.raw : [requestBody.raw];
        const processedItems = rawItems.map(item => {
          if (item.json) {
            return JSON.stringify(item.json, null, 2);
          }
          if (item.text) {
            return item.text;
          }
          if (item.bytes) {
            return `Raw data (${item.bytes.length} bytes)`;
          }
          return 'Raw data (binary)';
        });
        content = processedItems.join('\n\n');
      } 
      // 处理字符串格式
      else if (typeof requestBody === 'string') {
        content = requestBody;
      } 
      // 处理对象格式（但排除有 formData/raw 属性的情况）
      else if (typeof requestBody === 'object') {
        content = JSON.stringify(requestBody, null, 2);
      }
    } else if (target === 'response-body') {
      const responseBody = selectedRequest.responseBody;
      if (responseBody && typeof responseBody === 'object' && responseBody.data) {
        // 新格式的响应体
        if (responseBody.type === 'json' && responseBody.data) {
          content = JSON.stringify(responseBody.data, null, 2);
        } else if (responseBody.type === 'text' && responseBody.data) {
          content = responseBody.data;
        } else if (responseBody.type === 'binary') {
          content = `Binary data (${responseBody.data ? responseBody.data.length : 0} bytes)`;
        }
      } else {
        // 旧格式的响应体
        if (typeof responseBody === 'string') {
          content = responseBody;
        } else if (typeof responseBody === 'object') {
          content = JSON.stringify(responseBody, null, 2);
        }
      }
    }
    
    if (!content) {
      showToast(getMessage('copyFailed') || 'Copy failed', 'error');
      return;
    }
    
    await navigator.clipboard.writeText(content);
    
    // 显示成功提示
    showToast(getMessage('copiedSuccess') || 'Copied to clipboard', 'success');
    
    // 临时改变按钮样式
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
      </svg>
    `;
    btn.classList.add('copied');
    
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('copied');
    }, 2000);
    
  } catch (error) {
    console.error('Failed to copy:', error);
    showToast(getMessage('copyFailed') || 'Copy failed', 'error');
  }
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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getStatusClass(statusCode) {
  if (!statusCode) return '';
  const code = Math.floor(statusCode / 100);
  return `${code}xx`;
}

// 初始化
document.addEventListener('DOMContentLoaded', init);
