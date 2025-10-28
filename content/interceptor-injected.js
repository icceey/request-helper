/**
 * Interceptor Script - Runs in PAGE context (not Content Script context)
 * This script is injected into the page to intercept XHR and Fetch
 */

(function() {
  'use strict';

  // 存储捕获规则
  let captureRules = [];

  // 监听规则更新
  window.addEventListener('RequestHelperRules', function(event) {
    captureRules = event.detail || [];
  });

  // 请求规则（在脚本加载后发送）
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('RequestHelperGetRules'));
  }, 50);

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

  /**
   * 匹配修改规则
   * @param {string} url - 请求URL
   * @param {string} method - 请求方法
   * @returns {Object|null} - 匹配的规则或null
   */
  function matchModifyRule(url, method) {
    if (!captureRules || captureRules.length === 0) {
      return null;
    }

    // 按照优先级（数组顺序）匹配规则
    for (const rule of captureRules) {
      // 跳过禁用的规则
      if (!rule.enabled) {
        continue;
      }

      // 处理所有修改动作
      const actionType = rule.action.type;
      if (actionType !== 'modifyRequestBody' && 
          actionType !== 'modifyQuery' && 
          actionType !== 'modifyHeaders' &&
          actionType !== 'modifyResponseBody' &&
          actionType !== 'modifyResponseHeaders') {
        continue;
      }

      // 根据规则类型进行匹配
      if (rule.type === 'url-regex') {
        try {
          const regex = new RegExp(rule.condition.pattern);
          if (regex.test(url)) {
            return rule;
          }
        } catch (error) {
          console.error(`❌ Invalid regex pattern in rule ${rule.name}:`, error);
        }
      }
    }

    return null;
  }

  /**
   * 应用请求体修改
   * @param {any} originalBody - 原始请求体
   * @param {Object} rule - 修改规则
   * @returns {Object} - { modifiedBody, originalBody, modified, modificationDetails }
   */
  function applyBodyModification(originalBody, rule) {
    if (!rule || !rule.action || !rule.action.modifications) {
      return { modifiedBody: originalBody, modified: false };
    }

    const modifications = rule.action.modifications;
    const requestBodyMod = modifications.requestBody;

    if (!requestBodyMod) {
      return { modifiedBody: originalBody, modified: false };
    }

    try {
      let modifiedBody = originalBody;
      const modificationDetails = {
        ruleName: rule.name,
        ruleId: rule.id,
        modificationType: requestBodyMod.type
      };

      // 根据修改类型处理
      switch (requestBodyMod.type) {
        case 'json-merge': {
          // JSON 合并
          const original = typeof originalBody === 'string' 
            ? JSON.parse(originalBody) 
            : originalBody;
          
          if (typeof original !== 'object' || original === null) {
            return { modifiedBody: originalBody, modified: false };
          }

          const mergeData = requestBodyMod.value;
          modifiedBody = { ...original, ...mergeData };
          modificationDetails.mergedFields = Object.keys(mergeData);
          
          break;
        }

        case 'json-replace': {
          // JSON 替换
          modifiedBody = requestBodyMod.value;
          modificationDetails.replaced = true;
          break;
        }

        case 'text-replace': {
          // 文本替换（普通字符串替换，不使用正则）
          const bodyStr = typeof originalBody === 'string' 
            ? originalBody 
            : JSON.stringify(originalBody);
          
          const pattern = requestBodyMod.pattern;
          const replacement = requestBodyMod.replacement;
          
          if (pattern && replacement !== undefined) {
            // 使用 replaceAll 进行全局替换（不使用正则）
            modifiedBody = bodyStr.replaceAll(pattern, replacement);
            modificationDetails.pattern = pattern;
            modificationDetails.replacement = replacement;
          }
          break;
        }

        default:
          return { modifiedBody: originalBody, modified: false };
      }

      return {
        modifiedBody,
        originalBody,
        modified: true,
        modificationDetails
      };

    } catch (error) {
      console.error('❌ Failed to apply body modification:', error);
      return { modifiedBody: originalBody, modified: false };
    }
  }

  // 应用Query参数修改
  function applyQueryModification(url, rule) {
    if (!rule || !rule.action || !rule.action.modifications) {
      return { modifiedUrl: url, modified: false };
    }

    const modifications = rule.action.modifications;
    const queryMod = modifications.query;

    if (!queryMod) {
      return { modifiedUrl: url, modified: false };
    }

    try {
      const urlObj = new URL(url);
      const modificationDetails = {
        ruleName: rule.name,
        ruleId: rule.id
      };

      if (queryMod.addOrUpdate) {
        // 添加或更新查询参数
        const params = queryMod.addOrUpdate;
        for (const [key, value] of Object.entries(params)) {
          urlObj.searchParams.set(key, value);
        }
        modificationDetails.addedOrUpdated = Object.keys(params);
      } else if (queryMod.delete) {
        // 删除查询参数
        const keys = queryMod.delete;
        for (const key of keys) {
          urlObj.searchParams.delete(key);
        }
        modificationDetails.deleted = keys;
      }

      return {
        modifiedUrl: urlObj.toString(),
        originalUrl: url,
        modified: true,
        modificationDetails
      };
    } catch (error) {
      console.error('❌ Failed to apply query modification:', error);
      return { modifiedUrl: url, modified: false };
    }
  }

  // 应用Headers修改
  function applyHeadersModification(headers, rule) {
    if (!rule || !rule.action || !rule.action.modifications) {
      return { modifiedHeaders: headers, modified: false };
    }

    const modifications = rule.action.modifications;
    const headersMod = modifications.headers;

    if (!headersMod) {
      return { modifiedHeaders: headers, modified: false };
    }

    try {
      // 复制headers对象
      const modifiedHeaders = { ...headers };
      const modificationDetails = {
        ruleName: rule.name,
        ruleId: rule.id
      };

      if (headersMod.addOrUpdate) {
        // 添加或更新请求头
        const headersToAdd = headersMod.addOrUpdate;
        for (const [key, value] of Object.entries(headersToAdd)) {
          modifiedHeaders[key] = value;
        }
        modificationDetails.addedOrUpdated = Object.keys(headersToAdd);
      } else if (headersMod.delete) {
        // 删除请求头（大小写不敏感）
        const keysToDelete = headersMod.delete;
        const actuallyDeleted = [];
        for (const keyToDelete of keysToDelete) {
          const lowerKeyToDelete = keyToDelete.toLowerCase();
          // 查找并删除匹配的key（不区分大小写）
          for (const existingKey of Object.keys(modifiedHeaders)) {
            if (existingKey.toLowerCase() === lowerKeyToDelete) {
              delete modifiedHeaders[existingKey];
              actuallyDeleted.push(existingKey);
              break;
            }
          }
        }
        modificationDetails.deleted = actuallyDeleted;
        
        // 如果没有删除任何header，返回未修改
        if (actuallyDeleted.length === 0) {
          return { modifiedHeaders: headers, modified: false };
        }
      }

      return {
        modifiedHeaders,
        originalHeaders: headers,
        modified: true,
        modificationDetails
      };
    } catch (error) {
      console.error('❌ Failed to apply headers modification:', error);
      return { modifiedHeaders: headers, modified: false };
    }
  }

  // 应用响应体修改
  function applyResponseBodyModification(originalBody, rule) {
    if (!rule || !rule.action || !rule.action.modifications) {
      return { modifiedBody: originalBody, modified: false };
    }

    const modifications = rule.action.modifications;
    const responseBodyMod = modifications.responseBody;

    if (!responseBodyMod) {
      return { modifiedBody: originalBody, modified: false };
    }

    try {
      let modifiedBody = originalBody;
      const modificationDetails = {
        ruleName: rule.name,
        ruleId: rule.id,
        modificationType: responseBodyMod.type
      };

      // 根据修改类型处理
      switch (responseBodyMod.type) {
        case 'json-merge': {
          // JSON 合并
          const original = typeof originalBody === 'string' 
            ? JSON.parse(originalBody) 
            : originalBody;
          
          if (typeof original !== 'object' || original === null) {
            return { modifiedBody: originalBody, modified: false };
          }

          const mergeData = responseBodyMod.value;
          modifiedBody = { ...original, ...mergeData };
          modificationDetails.mergedFields = Object.keys(mergeData);
          
          break;
        }

        case 'json-replace': {
          // JSON 替换
          modifiedBody = responseBodyMod.value;
          modificationDetails.replaced = true;
          break;
        }

        case 'text-replace': {
          // 文本替换
          const bodyStr = typeof originalBody === 'string' 
            ? originalBody 
            : JSON.stringify(originalBody);
          
          const pattern = responseBodyMod.pattern;
          const replacement = responseBodyMod.replacement;
          
          if (pattern && replacement !== undefined) {
            modifiedBody = bodyStr.replaceAll(pattern, replacement);
            modificationDetails.pattern = pattern;
            modificationDetails.replacement = replacement;
          }
          break;
        }

        default:
          return { modifiedBody: originalBody, modified: false };
      }

      return {
        modifiedBody,
        originalBody,
        modified: true,
        modificationDetails
      };

    } catch (error) {
      console.error('❌ Failed to apply response body modification:', error);
      return { modifiedBody: originalBody, modified: false };
    }
  }

  // 应用响应头修改
  function applyResponseHeadersModification(headers, rule) {
    if (!rule || !rule.action || !rule.action.modifications) {
      return { modifiedHeaders: headers, modified: false };
    }

    const modifications = rule.action.modifications;
    const responseHeadersMod = modifications.responseHeaders;

    if (!responseHeadersMod) {
      return { modifiedHeaders: headers, modified: false };
    }

    try {
      // 复制headers对象
      const modifiedHeaders = { ...headers };
      const modificationDetails = {
        ruleName: rule.name,
        ruleId: rule.id
      };

      if (responseHeadersMod.addOrUpdate) {
        // 添加或更新响应头
        const headersToAdd = responseHeadersMod.addOrUpdate;
        for (const [key, value] of Object.entries(headersToAdd)) {
          modifiedHeaders[key] = value;
        }
        modificationDetails.addedOrUpdated = Object.keys(headersToAdd);
      } else if (responseHeadersMod.delete) {
        // 删除响应头（大小写不敏感）
        const keysToDelete = responseHeadersMod.delete;
        const actuallyDeleted = [];
        for (const keyToDelete of keysToDelete) {
          const lowerKeyToDelete = keyToDelete.toLowerCase();
          // 查找并删除匹配的key（不区分大小写）
          for (const existingKey of Object.keys(modifiedHeaders)) {
            if (existingKey.toLowerCase() === lowerKeyToDelete) {
              delete modifiedHeaders[existingKey];
              actuallyDeleted.push(existingKey);
              break;
            }
          }
        }
        modificationDetails.deleted = actuallyDeleted;
        
        // 如果没有删除任何header，返回未修改
        if (actuallyDeleted.length === 0) {
          return { modifiedHeaders: headers, modified: false };
        }
      }

      return {
        modifiedHeaders,
        originalHeaders: headers,
        modified: true,
        modificationDetails
      };
    } catch (error) {
      console.error('❌ Failed to apply response headers modification:', error);
      return { modifiedHeaders: headers, modified: false };
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
      originalBody: null,
      modified: false,
      modificationDetails: null,
      timestamp: Date.now()
    };

    xhrRequestMap.set(xhr, requestData);

    // 拦截 open
    const originalOpen = xhr.open;
    xhr.open = function(method, url, ...args) {
      requestData.method = method;
      requestData.url = url;
      
      // 检查是否需要修改Query参数
      const matchedRule = matchModifyRule(url, method);
      if (matchedRule && matchedRule.action.type === 'modifyQuery') {
        const queryModResult = applyQueryModification(url, matchedRule);
        if (queryModResult.modified) {
          // 使用修改后的URL
          const modifiedUrl = queryModResult.modifiedUrl;
          requestData.url = modifiedUrl;
          requestData.urlModified = true;
          requestData.urlModificationDetails = queryModResult.modificationDetails;
          return originalOpen.apply(this, [method, modifiedUrl, ...args]);
        }
      }
      
      return originalOpen.apply(this, [method, url, ...args]);
    };

    // 拦截 setRequestHeader
    const originalSetRequestHeader = xhr.setRequestHeader;
    xhr.setRequestHeader = function(header, value) {
      // 检查是否有删除该header的规则
      const matchedRule = matchModifyRule(requestData.url || window.location.href, requestData.method || 'GET');
      
      if (matchedRule && matchedRule.action.type === 'modifyHeaders') {
        const modifications = matchedRule.action.modifications.headers;
        if (modifications && modifications.delete) {
          // 检查当前header是否在删除列表中（大小写不敏感）
          const shouldDelete = modifications.delete.some(
            keyToDelete => keyToDelete.toLowerCase() === header.toLowerCase()
          );
          
          if (shouldDelete) {
            // 不设置这个header，但记录到requestData用于捕获
            return; // 不调用原始的setRequestHeader
          }
        }
      }
      
      requestData.headers[header] = value;
      return originalSetRequestHeader.apply(this, arguments);
    };

    // 拦截 send
    const originalSend = xhr.send;
    xhr.send = function(body) {
      let bodyToSend = body;
      requestData.body = body;
      requestData.sendTimestamp = Date.now();

      // 检查是否有匹配的修改规则
      const matchedRule = matchModifyRule(requestData.url, requestData.method);
      
      if (matchedRule) {
        // 应用Headers修改
        if (matchedRule.action.type === 'modifyHeaders') {
          const headersModResult = applyHeadersModification(requestData.headers, matchedRule);
          if (headersModResult.modified) {
            // 应用修改后的headers（包括新增和更新，删除已在setRequestHeader中处理）
            const modifications = matchedRule.action.modifications.headers;
            
            if (modifications.addOrUpdate) {
              // 添加或更新headers
              for (const [key, value] of Object.entries(modifications.addOrUpdate)) {
                originalSetRequestHeader.call(xhr, key, value);
                requestData.headers[key] = value;
              }
            }
            
            requestData.headersModified = true;
            requestData.headersModificationDetails = headersModResult.modificationDetails;
          }
        }
        
        // 应用请求体修改
        if (matchedRule.action.type === 'modifyRequestBody') {
          const modResult = applyBodyModification(body, matchedRule);
          if (modResult.modified) {
            bodyToSend = typeof modResult.modifiedBody === 'object' 
              ? JSON.stringify(modResult.modifiedBody) 
              : modResult.modifiedBody;
            
            requestData.originalBody = modResult.originalBody;
            requestData.modified = true;
            requestData.modificationDetails = modResult.modificationDetails;

            // 如果是JSON修改，更新Content-Type
            if (matchedRule.action.modifications.requestBody.type.startsWith('json')) {
              if (!requestData.headers['Content-Type']) {
                originalSetRequestHeader.call(xhr, 'Content-Type', 'application/json');
              }
            }
          }
        }
      }

      return originalSend.call(this, bodyToSend);
    };

    // 拦截响应头获取方法（用于删除响应头）
    const originalGetResponseHeader = xhr.getResponseHeader;
    const originalGetAllResponseHeaders = xhr.getAllResponseHeaders;
    
    xhr.getResponseHeader = function(header) {
      const value = originalGetResponseHeader.call(this, header);
      
      // 检查是否有删除该响应头的规则
      const matchedRule = matchModifyRule(requestData.url, requestData.method);
      if (matchedRule && matchedRule.action.type === 'modifyResponseHeaders') {
        const modifications = matchedRule.action.modifications.responseHeaders;
        if (modifications && modifications.delete) {
          // 检查当前header是否在删除列表中（大小写不敏感）
          const shouldDelete = modifications.delete.some(
            keyToDelete => keyToDelete.toLowerCase() === header.toLowerCase()
          );
          
          if (shouldDelete) {
            return null; // 返回null表示header不存在
          }
        }
      }
      
      return value;
    };
    
    xhr.getAllResponseHeaders = function() {
      const allHeaders = originalGetAllResponseHeaders.call(this);
      
      // 检查是否有删除响应头的规则
      const matchedRule = matchModifyRule(requestData.url, requestData.method);
      if (matchedRule && matchedRule.action.type === 'modifyResponseHeaders') {
        const modifications = matchedRule.action.modifications.responseHeaders;
        if (modifications && modifications.delete) {
          // 解析所有headers
          const headerLines = allHeaders.split('\r\n').filter(line => line.trim());
          const filteredLines = headerLines.filter(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) return true;
            
            const headerName = line.substring(0, colonIndex).trim();
            // 检查是否应该删除（大小写不敏感）
            const shouldDelete = modifications.delete.some(
              keyToDelete => keyToDelete.toLowerCase() === headerName.toLowerCase()
            );
            
            return !shouldDelete;
          });
          
          return filteredLines.join('\r\n') + (filteredLines.length > 0 ? '\r\n' : '');
        }
      }
      
      return allHeaders;
    };

    // 监听响应
    xhr.addEventListener('readystatechange', function() {
      if (this.readyState === 4) {
        const data = xhrRequestMap.get(xhr);
        if (data) {
          try {
            const contentType = this.getResponseHeader('Content-Type');
            let responseBody = this.responseText || this.response;
            let originalResponseBody = responseBody;
            let responseModified = false;
            let responseModificationDetails = null;
            
            // 检查是否需要修改响应
            const responseRule = matchModifyRule(data.url, data.method);
            
            // 检查响应体修改
            if (responseRule && responseRule.action.type === 'modifyResponseBody') {
              const modResult = applyResponseBodyModification(responseBody, responseRule);
              if (modResult.modified) {
                const modifiedBody = typeof modResult.modifiedBody === 'object'
                  ? JSON.stringify(modResult.modifiedBody)
                  : modResult.modifiedBody;
                
                // 重写响应属性
                Object.defineProperty(xhr, 'responseText', {
                  value: modifiedBody,
                  writable: false,
                  configurable: true
                });
                Object.defineProperty(xhr, 'response', {
                  value: modifiedBody,
                  writable: false,
                  configurable: true
                });
                
                originalResponseBody = modResult.originalBody;
                responseBody = modifiedBody;
                responseModified = true;
                responseModificationDetails = modResult.modificationDetails;
              }
            }
            
            // 检查响应头修改（删除操作）
            if (responseRule && responseRule.action.type === 'modifyResponseHeaders') {
              const modifications = responseRule.action.modifications.responseHeaders;
              if (modifications && modifications.delete && modifications.delete.length > 0) {
                responseModified = true;
                responseModificationDetails = {
                  ruleName: responseRule.name,
                  ruleId: responseRule.id,
                  deleted: modifications.delete
                };
              }
            }
            
            const capturedData = {
              id: data.id,
              url: data.url,
              method: data.method,
              requestHeaders: data.headers,
              requestBody: data.body,
              originalRequestBody: data.originalBody,
              modified: data.modified,
              modificationDetails: data.modificationDetails,
              statusCode: this.status,
              statusText: this.statusText,
              responseHeaders: this.getAllResponseHeaders(),
              responseBody: parseResponseBody(truncateBody(responseBody), contentType),
              originalResponseBody: responseModified ? parseResponseBody(truncateBody(originalResponseBody), contentType) : undefined,
              responseModified: responseModified,
              responseModificationDetails: responseModificationDetails,
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
    let originalRequestBody = null;
    let modified = false;
    let modificationDetails = null;
    let modifiedUrl = url; // 在外层声明
    let urlModified = false;
    let urlModificationDetails = null;
    let headersModified = false;
    let headersModificationDetails = null;

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

    // 检查是否有匹配的修改规则（移到外层）
    const matchedRule = matchModifyRule(url, method);

    if (matchedRule) {
      // 应用Query修改
      if (matchedRule.action.type === 'modifyQuery') {
        const queryModResult = applyQueryModification(url, matchedRule);
        if (queryModResult.modified) {
          modifiedUrl = queryModResult.modifiedUrl;
          urlModified = true;
          urlModificationDetails = queryModResult.modificationDetails;
        }
      }
      
      // 应用Headers修改
      if (matchedRule.action.type === 'modifyHeaders') {
        const currentHeaders = options.headers || {};
        const headersModResult = applyHeadersModification(currentHeaders, matchedRule);
        if (headersModResult.modified) {
          options = { ...options, headers: headersModResult.modifiedHeaders };
          headersModified = true;
          headersModificationDetails = headersModResult.modificationDetails;
        }
      }
      
      // 应用请求体修改
      if (matchedRule.action.type === 'modifyRequestBody' && 
          typeof requestBody === 'string' && 
          requestBody !== '[FormData]' && 
          requestBody !== '[Blob]' && 
          requestBody !== '[ArrayBuffer]') {
        const modResult = applyBodyModification(requestBody, matchedRule);
        if (modResult.modified) {
          const newBody = typeof modResult.modifiedBody === 'object'
            ? JSON.stringify(modResult.modifiedBody)
            : modResult.modifiedBody;
          
          // 创建新的options对象，修改body
          options = { ...options, body: newBody };
          
          originalRequestBody = modResult.originalBody;
          requestBody = newBody;
          modified = true;
          modificationDetails = modResult.modificationDetails;

          // 如果是JSON修改，更新Content-Type
          if (matchedRule.action.modifications.requestBody.type.startsWith('json')) {
            options.headers = {
              ...options.headers,
              'Content-Type': 'application/json'
            };
          }
        }
      }
    }

    try {
      // 执行原始fetch（使用可能被修改的URL和options）
      let response = await originalFetch.call(this, modifiedUrl, options);
      
      // 检查是否需要修改响应
      const responseRule = matchModifyRule(modifiedUrl, method);
      let responseModified = false;
      let responseModificationDetails = null;
      let originalResponseBody = null;
      
      if (responseRule && (responseRule.action.type === 'modifyResponseBody' || responseRule.action.type === 'modifyResponseHeaders')) {
        const clonedForModification = response.clone();
        const contentType = response.headers.get('Content-Type');
        
        // 读取原始响应体
        let responseBody;
        if (contentType && contentType.includes('application/json')) {
          try {
            responseBody = await clonedForModification.json();
          } catch {
            responseBody = await clonedForModification.text();
          }
        } else {
          responseBody = await clonedForModification.text();
        }
        
        let modifiedBody = responseBody;
        let modifiedHeaders = {};
        response.headers.forEach((value, key) => {
          modifiedHeaders[key] = value;
        });
        
        // 应用响应体修改
        if (responseRule.action.type === 'modifyResponseBody') {
          const modResult = applyResponseBodyModification(responseBody, responseRule);
          if (modResult.modified) {
            modifiedBody = typeof modResult.modifiedBody === 'object'
              ? JSON.stringify(modResult.modifiedBody)
              : modResult.modifiedBody;
            originalResponseBody = modResult.originalBody;
            responseModified = true;
            responseModificationDetails = modResult.modificationDetails;
          }
        }
        
        // 应用响应头修改
        if (responseRule.action.type === 'modifyResponseHeaders') {
          const headersModResult = applyResponseHeadersModification(modifiedHeaders, responseRule);
          if (headersModResult.modified) {
            modifiedHeaders = headersModResult.modifiedHeaders;
            responseModified = true;
            responseModificationDetails = headersModResult.modificationDetails;
          }
        }
        
        // 如果有修改，创建新的Response
        if (responseModified) {
          // 确保body是字符串或可序列化的格式
          let finalBody = modifiedBody;
          if (typeof modifiedBody === 'object' && modifiedBody !== null) {
            // 如果是对象，转换为JSON字符串
            finalBody = JSON.stringify(modifiedBody);
          }
          
          // 将headers对象转换为Headers实例
          const newHeaders = new Headers();
          for (const [key, value] of Object.entries(modifiedHeaders)) {
            newHeaders.append(key, value);
          }
          
          response = new Response(finalBody, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
          });
        }
      }
      
      // 克隆响应以便读取body（用于捕获）
      const clonedResponse = response.clone();
      
      // 异步读取响应体用于捕获
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
            url: modifiedUrl, // 使用修改后的URL
            method: method,
            requestHeaders: options.headers || {},
            requestBody: requestBody,
            originalRequestBody: originalRequestBody,
            modified: modified,
            modificationDetails: modificationDetails,
            urlModified: urlModified,
            urlModificationDetails: urlModificationDetails,
            headersModified: headersModified,
            headersModificationDetails: headersModificationDetails,
            statusCode: response.status,
            statusText: response.statusText,
            responseHeaders: responseHeaders,
            responseBody: parseResponseBody(truncateBody(responseBody), contentType),
            originalResponseBody: originalResponseBody ? parseResponseBody(truncateBody(originalResponseBody), contentType) : undefined,
            responseModified: responseModified,
            responseModificationDetails: responseModificationDetails,
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
        originalRequestBody: originalRequestBody,
        modified: modified,
        modificationDetails: modificationDetails,
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
