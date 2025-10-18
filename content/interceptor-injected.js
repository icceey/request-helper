/**
 * Interceptor Script - Runs in PAGE context (not Content Script context)
 * This script is injected into the page to intercept XHR and Fetch
 */

(function() {
  'use strict';

  console.log('🚀 RequestHelper interceptor initialized');

  // 生成唯一ID
  function generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // 通过自定义事件发送数据到 content script
  function sendToContentScript(data) {
    window.dispatchEvent(new CustomEvent('RequestHelperCapture', {
      detail: data
    }));
  }

  // 截断过大的响应体
  function truncateBody(body, maxSize = 5 * 1024 * 1024) {
    if (!body) return body;
    
    if (typeof body === 'string' && body.length > maxSize) {
      return body.substring(0, maxSize) + '\n... (truncated)';
    }
    
    return body;
  }

  // 尝试解析响应体
  function parseResponseBody(body, contentType) {
    if (!body) return null;

    try {
      // JSON
      if (contentType && contentType.includes('application/json')) {
        return {
          type: 'json',
          data: typeof body === 'string' ? JSON.parse(body) : body
        };
      }

      // HTML
      if (contentType && contentType.includes('text/html')) {
        return {
          type: 'html',
          data: body
        };
      }

      // XML
      if (contentType && contentType.includes('xml')) {
        return {
          type: 'xml',
          data: body
        };
      }

      // 其他文本
      if (contentType && contentType.includes('text/')) {
        return {
          type: 'text',
          data: body
        };
      }

      // 默认返回原始数据
      return {
        type: 'raw',
        data: body
      };
    } catch (err) {
      return {
        type: 'raw',
        data: body,
        parseError: err.message
      };
    }
  }

  // ============= 拦截 XMLHttpRequest =============
  const OriginalXHR = window.XMLHttpRequest;
  const xhrRequestMap = new Map();

  window.XMLHttpRequest = function() {
    const xhr = new OriginalXHR();
    const requestId = generateRequestId();
    
    const requestData = {
      id: requestId,
      method: null,
      url: null,
      headers: {},
      body: null,
      timestamp: Date.now()
    };

    xhrRequestMap.set(xhr, requestData);

    // 拦截 open
    const originalOpen = xhr.open;
    xhr.open = function(method, url, ...args) {
      requestData.method = method;
      requestData.url = url;
      return originalOpen.apply(this, [method, url, ...args]);
    };

    // 拦截 setRequestHeader
    const originalSetRequestHeader = xhr.setRequestHeader;
    xhr.setRequestHeader = function(header, value) {
      requestData.headers[header] = value;
      return originalSetRequestHeader.apply(this, arguments);
    };

    // 拦截 send
    const originalSend = xhr.send;
    xhr.send = function(body) {
      requestData.body = body;
      requestData.sendTimestamp = Date.now();
      return originalSend.apply(this, arguments);
    };

    // 监听响应
    xhr.addEventListener('readystatechange', function() {
      if (this.readyState === 4) {
        const data = xhrRequestMap.get(xhr);
        if (data) {
          try {
            const contentType = this.getResponseHeader('Content-Type');
            const responseBody = this.responseText || this.response;
            
            const capturedData = {
              id: data.id,
              url: data.url,
              method: data.method,
              requestHeaders: data.headers,
              requestBody: data.body,
              statusCode: this.status,
              statusText: this.statusText,
              responseHeaders: this.getAllResponseHeaders(),
              responseBody: parseResponseBody(truncateBody(responseBody), contentType),
              contentType: contentType,
              timestamp: data.timestamp,
              duration: Date.now() - data.sendTimestamp,
              type: 'xhr'
            };
            
            sendToContentScript(capturedData);
          } catch (err) {
            console.error('❌ Failed to capture XHR response:', err);
          } finally {
            xhrRequestMap.delete(xhr);
          }
        }
      }
    });

    return xhr;
  };

  // 保留原型链
  window.XMLHttpRequest.prototype = OriginalXHR.prototype;
  Object.setPrototypeOf(window.XMLHttpRequest, OriginalXHR);

  // ============= 拦截 Fetch API =============
  const originalFetch = window.fetch;
  
  window.fetch = async function(resource, options = {}) {
    const requestId = generateRequestId();
    const url = typeof resource === 'string' ? resource : resource.url;
    const method = options.method || 'GET';
    const timestamp = Date.now();

    let requestBody = null;
    if (options.body) {
      try {
        if (typeof options.body === 'string') {
          requestBody = options.body;
        } else if (options.body instanceof FormData) {
          requestBody = '[FormData]';
        } else if (options.body instanceof Blob) {
          requestBody = '[Blob]';
        } else if (options.body instanceof ArrayBuffer) {
          requestBody = '[ArrayBuffer]';
        } else {
          requestBody = String(options.body);
        }
      } catch (err) {
        requestBody = '[Unable to serialize]';
      }
    }

    try {
      // 执行原始fetch
      const response = await originalFetch.apply(this, arguments);
      
      // 克隆响应以便读取body
      const clonedResponse = response.clone();
      
      // 异步读取响应体
      (async () => {
        try {
          const contentType = response.headers.get('Content-Type');
          let responseBody = null;

          // 根据内容类型读取响应
          if (contentType && contentType.includes('application/json')) {
            try {
              responseBody = await clonedResponse.json();
            } catch {
              responseBody = await clonedResponse.text();
            }
          } else if (contentType && (contentType.includes('text/') || contentType.includes('application/xml') || contentType.includes('application/javascript'))) {
            responseBody = await clonedResponse.text();
          } else {
            // 对于二进制数据，只记录类型
            const blob = await clonedResponse.blob();
            responseBody = '[Binary data: ' + blob.type + ', size: ' + blob.size + ' bytes]';
          }

          // 收集响应头
          const responseHeaders = {};
          response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });

          const capturedData = {
            id: requestId,
            url: url,
            method: method,
            requestHeaders: options.headers || {},
            requestBody: requestBody,
            statusCode: response.status,
            statusText: response.statusText,
            responseHeaders: responseHeaders,
            responseBody: parseResponseBody(truncateBody(responseBody), contentType),
            contentType: contentType,
            timestamp: timestamp,
            duration: Date.now() - timestamp,
            type: 'fetch'
          };
          
          sendToContentScript(capturedData);
        } catch (err) {
          console.error('❌ Failed to capture fetch response:', err);
        }
      })();

      return response;
    } catch (err) {
      // 请求失败
      const capturedData = {
        id: requestId,
        url: url,
        method: method,
        requestHeaders: options.headers || {},
        requestBody: requestBody,
        error: err.message,
        timestamp: timestamp,
        duration: Date.now() - timestamp,
        type: 'fetch'
      };

      sendToContentScript(capturedData);
      throw err;
    }
  };
})();
