/**
 * RequestHelper - Viewer
 */

let allRequests = [];
let filteredRequests = [];
let selectedRequest = null;

// DOM元素
const requestsList = document.getElementById('requests-list');
const requestDetails = document.getElementById('request-details');
const searchInput = document.getElementById('search-input');
const methodFilter = document.getElementById('method-filter');
const exportBtn = document.getElementById('export-btn');
const clearBtn = document.getElementById('clear-btn');

// 初始化
async function init() {
  console.log('Viewer initialized');
  
  // 加载请求列表
  await loadRequests();
  
  // 绑定事件
  searchInput.addEventListener('input', handleFilter);
  methodFilter.addEventListener('change', handleFilter);
  exportBtn.addEventListener('click', handleExport);
  clearBtn.addEventListener('click', handleClear);

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
      renderRequestsList();
    }
  } catch (error) {
    console.error('Failed to load requests:', error);
  }
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

    return true;
  });

  renderRequestsList();
}

// 渲染请求列表
function renderRequestsList() {
  if (filteredRequests.length === 0) {
    requestsList.innerHTML = `
      <div class="empty-state">
        <p>没有找到匹配的请求</p>
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
      <h3>基本信息</h3>
      <div class="detail-grid">
        <span class="detail-label">URL:</span>
        <span class="detail-value">${request.url}</span>
        
        <span class="detail-label">方法:</span>
        <span class="detail-value">${request.method}</span>
        
        <span class="detail-label">状态码:</span>
        <span class="detail-value status-code status-${getStatusClass(request.statusCode)}">${request.statusCode || 'N/A'}</span>
        
        <span class="detail-label">类型:</span>
        <span class="detail-value">${request.type || 'N/A'}</span>
        
        <span class="detail-label">时间:</span>
        <span class="detail-value">${formatTime(request.timestamp)}</span>
        
        <span class="detail-label">耗时:</span>
        <span class="detail-value">${request.duration ? request.duration.toFixed(2) + 'ms' : 'N/A'}</span>
        
        ${request.ip ? `
          <span class="detail-label">IP:</span>
          <span class="detail-value">${request.ip}</span>
        ` : ''}
        
        ${request.fromCache ? `
          <span class="detail-label">缓存:</span>
          <span class="detail-value">来自缓存</span>
        ` : ''}
      </div>
    </div>

    ${renderHeaders('请求头', request.requestHeaders)}
    
    ${request.requestBody ? renderRequestBody(request.requestBody) : ''}
    
    ${renderHeaders('响应头', request.responseHeaders)}
    
    ${request.error ? `
      <div class="detail-section">
        <h3>错误信息</h3>
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
    bodyHtml = '<pre>Raw data (binary)</pre>';
  }

  return `
    <div class="detail-section">
      <h3>请求体</h3>
      ${bodyHtml}
    </div>
  `;
}

// 导出数据
async function handleExport() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'EXPORT_REQUESTS' });
    
    if (response.success && response.data) {
      downloadJSON(response.data, 'requests-export.json');
    }
  } catch (error) {
    console.error('Failed to export:', error);
    alert('导出失败');
  }
}

// 清空数据
async function handleClear() {
  if (!confirm('确定要清空所有捕获的数据吗？')) {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({ type: 'CLEAR_REQUESTS' });
    
    if (response.success) {
      allRequests = [];
      filteredRequests = [];
      selectedRequest = null;
      renderRequestsList();
      requestDetails.innerHTML = `
        <div class="empty-state">
          <p>选择一个请求查看详情</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Failed to clear:', error);
    alert('清空失败');
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
  return date.toLocaleString('zh-CN');
}

function getStatusClass(statusCode) {
  if (!statusCode) return '';
  const code = Math.floor(statusCode / 100);
  return `${code}xx`;
}

function downloadJSON(data, filename) {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// 初始化
document.addEventListener('DOMContentLoaded', init);
