/**
 * Request Details Module
 * 请求详情渲染与交互
 */

import { getMessage } from '../../utils/i18n.js';
import { state } from './state.js';
import { escapeHtml, getStatusClass, highlightJson, showToast, removeQueryParams } from './utils.js';

// 渲染请求详情
export function renderRequestDetails(request, requestDetails) {
  const html = `
    <div class="detail-section">
      <div class="section-header">
        <h3>${getMessage('general')}</h3>
        <button class="create-rule-btn" data-request-id="${request.id}" title="${getMessage('createRuleForThisRequest') || 'Create rule for this request'}">
          📋 <span data-i18n="createRule">${getMessage('createRule')}</span>
        </button>
      </div>
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
        
        ${request.matchedRule ? `
          <span class="detail-label">${getMessage('matchedRule')}:</span>
          <span class="detail-value"><span class="matched-rule-badge">${escapeHtml(request.matchedRule.name)}</span></span>
        ` : ''}
        
        ${request.modified ? `
          <span class="detail-label">${getMessage('requestModified')}:</span>
          <span class="detail-value"><span class="modified-badge">✏️ ${getMessage('requestModified')}</span></span>
        ` : ''}
        
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
    
    ${request.requestBody ? renderRequestBody(request.requestBody, request.originalRequestBody, request.modified, request.modificationDetails) : ''}
    
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
  
  // 绑定事件
  bindDetailEvents();
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
function renderRequestBody(requestBody, originalRequestBody, modified, modificationDetails) {
  let bodyHtml = '';
  let bodyContent = '';
  let isJson = false;

  if (requestBody.formData) {
    bodyContent = JSON.stringify(requestBody.formData, null, 2);
    isJson = true;
  } else if (requestBody.raw) {
    // 尝试显示解码后的内容
    const rawItems = Array.isArray(requestBody.raw) ? requestBody.raw : [requestBody.raw];
    const processedItems = rawItems.map(item => {
      // 如果有JSON格式，优先显示JSON
      if (item.json) {
        isJson = true;
        return JSON.stringify(item.json, null, 2);
      }
      // 否则显示文本
      if (item.text) {
        // 尝试解析文本是否为JSON
        try {
          JSON.parse(item.text);
          isJson = true;
          return item.text;
        } catch (e) {
          return item.text;
        }
      }
      // 如果都没有，显示字节信息
      if (item.bytes) {
        return `Raw data (${item.bytes.length} bytes)`;
      }
      return 'Raw data (binary)';
    });
    
    bodyContent = processedItems.join('\n\n');
  } else if (typeof requestBody === 'string') {
    bodyContent = requestBody;
    // 尝试检测是否为JSON字符串
    try {
      JSON.parse(bodyContent);
      isJson = true;
    } catch (e) {
      // 不是JSON
    }
  } else if (typeof requestBody === 'object') {
    bodyContent = JSON.stringify(requestBody, null, 2);
    isJson = true;
  }

  // 根据是否为JSON应用不同的渲染
  if (isJson) {
    bodyHtml = '<pre class="json-highlighted">' + highlightJson(bodyContent) + '</pre>';
  } else {
    bodyHtml = '<pre>' + escapeHtml(bodyContent) + '</pre>';
  }

  // 如果请求被修改，显示修改信息
  let modificationHtml = '';
  if (modified && originalRequestBody) {
    let originalBodyContent = '';
    if (typeof originalRequestBody === 'string') {
      originalBodyContent = originalRequestBody;
    } else if (typeof originalRequestBody === 'object') {
      originalBodyContent = JSON.stringify(originalRequestBody, null, 2);
    }

    let modDetailsHtml = '';
    if (modificationDetails) {
      modDetailsHtml = `
        <div class="modification-details">
          <strong>${getMessage('modificationDetails')}:</strong>
          <div>规则: ${escapeHtml(modificationDetails.ruleName || '')}</div>
          <div>类型: ${escapeHtml(modificationDetails.modificationType || '')}</div>
          ${modificationDetails.mergedFields ? `<div>合并字段: ${modificationDetails.mergedFields.join(', ')}</div>` : ''}
          ${modificationDetails.pattern ? `<div>查找: ${escapeHtml(modificationDetails.pattern)}</div>` : ''}
          ${modificationDetails.replacement !== undefined ? `<div>替换为: ${escapeHtml(String(modificationDetails.replacement))}</div>` : ''}
        </div>
      `;
    }

    modificationHtml = `
      <div class="tabs">
        <button class="tab active" data-tab="modified">${getMessage('modifiedRequestBody')}</button>
        <button class="tab" data-tab="original">${getMessage('originalRequestBody')}</button>
      </div>
      <div class="tab-content">
        <div class="tab-pane active" data-pane="modified">
          ${modDetailsHtml}
          ${bodyHtml}
        </div>
        <div class="tab-pane" data-pane="original">
          <pre class="${isJson ? 'json-highlighted' : ''}">${isJson ? highlightJson(originalBodyContent) : escapeHtml(originalBodyContent)}</pre>
        </div>
      </div>
    `;
  }

  return `
    <div class="detail-section">
      <div class="section-header">
        <h3>${getMessage('requestBody')}${modified ? ' <span class="modified-badge">✏️ ' + getMessage('requestModified') + '</span>' : ''}</h3>
        <button class="copy-btn" data-copy-target="request-body" title="${getMessage('copy') || 'Copy'}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4z"/>
            <path d="M2 6V2a2 2 0 0 1 2-2h4v1H4a1 1 0 0 0-1 1v4H2z"/>
          </svg>
        </button>
      </div>
      ${modificationHtml || bodyHtml}
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
        const highlightedJson = highlightJson(bodyContent);
        bodyHtml = `<pre class="json-highlighted">${highlightedJson}</pre>`;
        tabs = `
          <div class="tabs">
            <button class="tab active" data-tab="formatted">${getMessage('formatted')}</button>
            <button class="tab" data-tab="raw">${getMessage('raw')}</button>
          </div>
          <div class="tab-content">
            <div class="tab-pane active" data-pane="formatted">
              <pre class="json-highlighted">${highlightedJson}</pre>
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
      // 尝试检测是否为JSON
      try {
        JSON.parse(bodyContent);
        bodyHtml = '<pre class="json-highlighted">' + highlightJson(bodyContent) + '</pre>';
      } catch (e) {
        bodyHtml = '<pre>' + escapeHtml(responseBody.substring(0, 10000)) + '</pre>';
      }
    } else if (typeof responseBody === 'object') {
      bodyContent = JSON.stringify(responseBody, null, 2);
      bodyHtml = '<pre class="json-highlighted">' + highlightJson(bodyContent) + '</pre>';
    }
  }

  return `
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
}

// 格式化时间（内部使用）
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

// 绑定详情页事件
function bindDetailEvents() {
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
    
    // 绑定创建规则按钮事件
    document.querySelectorAll('.create-rule-btn').forEach(btn => {
      btn.addEventListener('click', handleCreateRuleClick);
    });
  }, 0);
}

// 处理复制按钮点击
async function handleCopyClick(e) {
  const btn = e.currentTarget;
  const target = btn.dataset.copyTarget;
  
  if (!target || !state.selectedRequest) {
    showToast(getMessage('copyFailed') || 'Copy failed', 'error');
    return;
  }
  
  let content = '';
  
  try {
    // 根据目标类型获取内容
    if (target === 'request-body') {
      const requestBody = state.selectedRequest.requestBody;
      
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
      const responseBody = state.selectedRequest.responseBody;
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

// 处理创建规则按钮点击
async function handleCreateRuleClick(e) {
  const requestId = e.currentTarget.dataset.requestId;
  const request = state.allRequests.find(req => req.id === requestId);
  
  if (!request) {
    showToast(getMessage('copyFailed') || 'Request not found', 'error');
    return;
  }
  
  try {
    // 从URL中去除query参数
    const urlWithoutQuery = removeQueryParams(request.url);
    
    // 先询问用户确认
    const confirmed = confirm(
      `${getMessage('createRuleForThisRequest')}\n\n` +
      `${getMessage('method')}: ${request.method}\n` +
      `URL: ${urlWithoutQuery}\n\n` +
      `${getMessage('ruleAction')}: ${getMessage('capture')}\n\n` +
      `${getMessage('confirmCreateRule')}`
    );
    
    if (!confirmed) {
      return; // 用户取消，直接返回
    }
    
    // 转义特殊字符以生成正则表达式
    const escapedUrl = urlWithoutQuery
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // 构建规则对象
    const rule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${getMessage('capture')} - ${request.method} ${urlWithoutQuery.substring(0, 50)}${urlWithoutQuery.length > 50 ? '...' : ''}`,
      enabled: true,
      type: 'url-regex',
      condition: {
        pattern: `^${escapedUrl}$`
      },
      action: {
        type: 'capture'
      }
    };
    
    // 发送消息到后台添加规则（插入到最前面，优先级最高）
    const response = await chrome.runtime.sendMessage({ 
      type: 'ADD_RULE', 
      rule,
      insertAtBeginning: true // 插入到最前面
    });
    
    if (response.success) {
      showToast(getMessage('ruleCreatedSuccess') || 'Rule created successfully', 'success');
      
      // 询问用户是否打开设置页面查看规则
      setTimeout(() => {
        if (confirm(`${getMessage('ruleCreatedSuccess')}！\n\n${getMessage('openSettingsToViewRule')}`)) {
          chrome.runtime.openOptionsPage();
        }
      }, 500);
    } else {
      showToast(getMessage('saveFailed') || 'Failed to create rule', 'error');
    }
  } catch (error) {
    console.error('Failed to create rule:', error);
    showToast(getMessage('saveFailed') || 'Failed to create rule', 'error');
  }
}
