/**
 * Filter Manager Module
 * 过滤器管理：方法、状态码、规则、慢请求
 */

import { getMessage } from '../../utils/i18n.js';
import { state, toggleStatusCode, clearStatusCodes, toggleMethod, clearMethods, toggleRule, clearRules, toggleSlowRequestsOnly, toggleSearchScope } from './state.js';
import { escapeHtml, getStatusClass, searchInObject } from './utils.js';

// 更新请求方法筛选器
export function updateMethodFilter(methodFilterList, selectedMethods) {
  // 统计所有请求方法及其数量
  const methodMap = new Map();
  
  state.allRequests.forEach(req => {
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
}

// 更新状态码筛选器
export function updateStatusFilter(statusFilterList, selectedStatusCodes) {
  // 统计所有状态码及其数量
  const statusCodeMap = new Map();
  
  state.allRequests.forEach(req => {
    if (req.statusCode) {
      const code = req.statusCode;
      statusCodeMap.set(code, (statusCodeMap.get(code) || 0) + 1);
    } else {
      // 没有状态码的请求标记为 pending
      statusCodeMap.set('pending', (statusCodeMap.get('pending') || 0) + 1);
    }
  });

  // 按状态码排序：pending 放在最后，数字状态码按升序排列
  const sortedCodes = Array.from(statusCodeMap.entries()).sort((a, b) => {
    if (a[0] === 'pending') return 1;
    if (b[0] === 'pending') return -1;
    return a[0] - b[0];
  });

  // 生成选项列表
  if (sortedCodes.length === 0) {
    statusFilterList.innerHTML = `<div class="empty-notice">${getMessage('noStatusCodes')}</div>`;
    return;
  }

  const html = sortedCodes.map(([code, count]) => {
    const isPending = code === 'pending';
    const displayText = isPending ? getMessage('pending') : code;
    const statusClass = isPending ? 'pending' : getStatusClass(code);
    const checkedAttr = selectedStatusCodes.has(code) ? 'checked' : '';
    
    return `
      <label class="status-checkbox-item">
        <input type="checkbox" value="${code}" ${checkedAttr}>
        <span class="status-code status-${statusClass}">${displayText}</span>
        <span class="status-count">(${count})</span>
      </label>
    `;
  }).join('');

  statusFilterList.innerHTML = html;
}

// 更新规则筛选器
export function updateRuleFilter(ruleFilterList, selectedRules) {
  // 统计所有规则及其匹配的请求数量
  const ruleMap = new Map();
  
  state.allRequests.forEach(req => {
    if (req.matchedRule) {
      const ruleId = req.matchedRule.id;
      const ruleName = req.matchedRule.name;
      const existing = ruleMap.get(ruleId) || { name: ruleName, count: 0 };
      existing.count++;
      ruleMap.set(ruleId, existing);
    }
  });

  // 生成选项列表
  if (ruleMap.size === 0) {
    ruleFilterList.innerHTML = `<div class="empty-notice">${getMessage('noRules')}</div>`;
    return;
  }

  const sortedRules = Array.from(ruleMap.entries()).sort((a, b) => 
    a[1].name.localeCompare(b[1].name)
  );

  const html = sortedRules.map(([ruleId, ruleData]) => `
    <label class="rule-checkbox-item">
      <input type="checkbox" value="${ruleId}" ${selectedRules.has(ruleId) ? 'checked' : ''}>
      <span class="rule-name">${escapeHtml(ruleData.name)}</span>
      <span class="rule-count">(${ruleData.count})</span>
    </label>
  `).join('');

  ruleFilterList.innerHTML = html;
}

// 过滤请求
export function filterRequests(searchText) {
  const filteredRequests = state.allRequests.filter(req => {
    // 搜索功能（如果有搜索文本）
    if (searchText) {
      let matchFound = false;
      
      // 在URL中搜索
      if (state.searchScopes.has('url') && req.url && req.url.toLowerCase().includes(searchText)) {
        matchFound = true;
      }
      
      // 在请求头中搜索
      if (!matchFound && state.searchScopes.has('requestHeaders') && req.requestHeaders) {
        matchFound = searchInObject(req.requestHeaders, searchText);
      }
      
      // 在请求体中搜索
      if (!matchFound && state.searchScopes.has('requestBody') && req.requestBody) {
        matchFound = searchInObject(req.requestBody, searchText);
      }
      
      // 在响应头中搜索
      if (!matchFound && state.searchScopes.has('responseHeaders') && req.responseHeaders) {
        matchFound = searchInObject(req.responseHeaders, searchText);
      }
      
      // 在响应体中搜索
      if (!matchFound && state.searchScopes.has('responseBody') && req.responseBody) {
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
    if (state.selectedMethods.size > 0) {
      if (!req.method || !state.selectedMethods.has(req.method)) {
        return false;
      }
    }

    // 状态码过滤（不选等于不过滤）
    if (state.selectedStatusCodes.size > 0) {
      // 如果请求有状态码，检查是否在选中的状态码中
      // 如果请求没有状态码，检查是否选中了 pending
      const requestStatusCode = req.statusCode || 'pending';
      if (!state.selectedStatusCodes.has(requestStatusCode)) {
        return false;
      }
    }

    // 规则过滤（不选等于不过滤）
    if (state.selectedRules.size > 0) {
      if (!req.matchedRule || !state.selectedRules.has(req.matchedRule.id)) {
        return false;
      }
    }

    // 慢请求过滤（仅显示耗时超过1秒的请求）
    if (state.showSlowRequestsOnly) {
      if (!req.duration || req.duration < 1000) {
        return false;
      }
    }

    return true;
  });

  return filteredRequests;
}

// 更新按钮文本的辅助函数
export function updateMethodButtonText(methodFilterBtn) {
  const count = state.selectedMethods.size;
  if (count > 0) {
    methodFilterBtn.innerHTML = `<span data-i18n="method">${getMessage('method')}</span> (${count}) ▼`;
    methodFilterBtn.classList.add('active');
  } else {
    methodFilterBtn.innerHTML = `<span data-i18n="method">${getMessage('method')}</span> ▼`;
    methodFilterBtn.classList.remove('active');
  }
}

export function updateStatusButtonText(statusFilterBtn) {
  const count = state.selectedStatusCodes.size;
  if (count > 0) {
    statusFilterBtn.innerHTML = `<span data-i18n="statusCode">${getMessage('statusCode')}</span> (${count}) ▼`;
    statusFilterBtn.classList.add('active');
  } else {
    statusFilterBtn.innerHTML = `<span data-i18n="statusCode">${getMessage('statusCode')}</span> ▼`;
    statusFilterBtn.classList.remove('active');
  }
}

export function updateRuleButtonText(ruleFilterBtn) {
  const count = state.selectedRules.size;
  if (count > 0) {
    ruleFilterBtn.innerHTML = `<span data-i18n="filterByRule">${getMessage('filterByRule')}</span> (${count}) ▼`;
    ruleFilterBtn.classList.add('active');
  } else {
    ruleFilterBtn.innerHTML = `<span data-i18n="filterByRule">${getMessage('filterByRule')}</span> ▼`;
    ruleFilterBtn.classList.remove('active');
  }
}
