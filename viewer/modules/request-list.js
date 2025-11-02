/**
 * Request List Module
 * 请求列表渲染与交互
 */

import { getMessage } from '../../utils/i18n.js';
import { state, selectRequest as updateSelectedRequest } from './state.js';
import { truncateUrl, formatTime, formatDuration, isSlowRequest, getStatusClass, escapeHtml } from './utils.js';

// 渲染请求列表
export function renderRequestsList(requestsList, filteredRequests) {
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
        ${req.matchedRule ? `<span class="matched-rule-badge" title="${getMessage('matchedRule')}: ${escapeHtml(req.matchedRule.name)}">📋 ${escapeHtml(req.matchedRule.name)}</span>` : ''}
      </div>
      <div class="request-meta">
        <span>${formatTime(req.timestamp)}</span>
        <span class="duration ${isSlowRequest(req.duration) ? 'slow' : ''}">${formatDuration(req.duration)}</span>
        ${req.statusCode ? `<span class="status-code status-${getStatusClass(req.statusCode)}">${req.statusCode}</span>` : `<span class="status-code status-pending">${getMessage('pending')}</span>`}
      </div>
    </div>
  `).join('');

  requestsList.innerHTML = html;
}

// 选择请求
export function selectRequest(id, requestsList, onSelectCallback) {
  const request = state.allRequests.find(req => req.id === id);
  if (!request) return;

  updateSelectedRequest(request);

  // 更新选中状态
  requestsList.querySelectorAll('.request-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === id);
  });

  // 调用回调显示详情
  if (onSelectCallback) {
    onSelectCallback(request);
  }
}

// 绑定请求列表点击事件
export function bindRequestListEvents(requestsList, onSelectCallback) {
  requestsList.querySelectorAll('.request-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      selectRequest(id, requestsList, onSelectCallback);
    });
  });
}
