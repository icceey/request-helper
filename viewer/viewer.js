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
        
        ${request.source ? `
          <span class="detail-label">数据源:</span>
          <span class="detail-value">${request.source}</span>
        ` : ''}
      </div>
    </div>

    ${renderHeaders('请求头', request.requestHeaders)}
    
    ${request.requestBody ? renderRequestBody(request.requestBody) : ''}
    
    ${renderHeaders('响应头', request.responseHeaders)}
    
    ${request.responseBody ? renderResponseBody(request.responseBody, request.contentType) : `
      <div class="detail-section">
        <h3>响应体</h3>
        <p class="empty-notice">未捕获到响应体数据（webRequest API 无法获取响应体，仅能捕获页面发起的 XHR/Fetch 请求的响应体）</p>
      </div>
    `}
    
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
      <h3>请求体</h3>
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
            <button class="tab active" data-tab="formatted">格式化</button>
            <button class="tab" data-tab="raw">原始</button>
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
          bodyHtml += '<p class="truncated-notice">内容过长，已截断显示前50000个字符</p>';
        }
        break;
      
      case 'raw':
        bodyHtml = `<pre>${escapeHtml(String(responseBody.data).substring(0, 10000))}</pre>`;
        if (String(responseBody.data).length > 10000) {
          bodyHtml += '<p class="truncated-notice">内容过长，已截断</p>';
        }
        break;
    }

    if (responseBody.parseError) {
      bodyHtml += `<p class="error-notice">解析错误: ${escapeHtml(responseBody.parseError)}</p>`;
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
      <h3>响应体 ${contentType ? `<span class="content-type">(${contentType})</span>` : ''}</h3>
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

// 导出数据
async function handleExport() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'EXPORT_REQUESTS' });
    
    if (response.success && response.data) {
      downloadJSON(response.data, 'requests-export.json');
      showToast('导出成功', 'success');
    }
  } catch (error) {
    console.error('Failed to export:', error);
    showToast('导出失败', 'error');
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
          <p>选择一个请求查看详情</p>
        </div>
      `;
      showToast('数据已清空', 'success');
    }
  } catch (error) {
    console.error('Failed to clear:', error);
    showToast('清空失败', 'error');
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
