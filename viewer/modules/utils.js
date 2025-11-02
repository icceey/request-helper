/**
 * Utility Functions Module
 * 工具函数：格式化、转义、高亮等
 */

// HTML转义
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 截断URL
export function truncateUrl(url, maxLength = 60) {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
}

// 格式化时间
export function formatTime(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 格式化耗时
export function formatDuration(duration) {
  if (duration === undefined || duration === null) return '-';
  if (duration < 1000) {
    return `${Math.round(duration)}ms`;
  }
  return `${(duration / 1000).toFixed(2)}s`;
}

// 判断是否为慢请求（超过1秒）
export function isSlowRequest(duration) {
  return duration && duration > 1000;
}

// 获取状态码类别
export function getStatusClass(statusCode) {
  if (!statusCode) return '';
  const code = Math.floor(statusCode / 100);
  return `${code}xx`;
}

// JSON语法高亮
export function highlightJson(jsonString) {
  try {
    // 确保是有效的JSON字符串
    let obj;
    if (typeof jsonString === 'string') {
      obj = JSON.parse(jsonString);
    } else {
      obj = jsonString;
    }
    
    const formatted = JSON.stringify(obj, null, 2);
    
    // 为JSON添加语法高亮
    return formatted
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
          } else {
            cls = 'json-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return `<span class="${cls}">${match}</span>`;
      });
  } catch (e) {
    // 如果不是有效的JSON，返回转义后的原始文本
    return escapeHtml(String(jsonString));
  }
}

// 在对象中搜索文本（递归）
export function searchInObject(obj, searchText) {
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

// 去除URL中的query参数
export function removeQueryParams(url) {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch (error) {
    // 如果URL解析失败，尝试简单的字符串处理
    const queryIndex = url.indexOf('?');
    return queryIndex > 0 ? url.substring(0, queryIndex) : url;
  }
}

// 显示 Toast 提示
export function showToast(message, type = 'success') {
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
