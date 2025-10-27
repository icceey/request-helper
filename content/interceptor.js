/**
 * Network Interceptor - Content Script
 * 负责注入拦截器到页面并转发消息到后台
 */

(function() {
  'use strict';

  let isInjected = false;

  // 注入拦截器脚本到页面上下文
  function injectInterceptor() {
    if (isInjected) return;
    
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('content/interceptor-injected.js');
    script.onload = function() {
      this.remove();
    };
    script.onerror = function() {
      console.error('❌ RequestHelper: Failed to inject interceptor');
    };
    (document.head || document.documentElement).appendChild(script);
    isInjected = true;
  }

  // 从background获取规则并传递给页面脚本
  async function sendRulesToPage() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_RULES' });
      if (response && response.success) {
        // 通过自定义事件发送规则到页面脚本
        window.dispatchEvent(new CustomEvent('RequestHelperRules', {
          detail: response.rules || []
        }));
      }
    } catch (error) {
      console.error('❌ RequestHelper: Failed to get rules:', error);
    }
  }

  // 检查助手是否启动
  async function checkHelperStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
      if (response && response.success && response.capturing) {
        // 只有在捕获状态时才注入拦截器
        injectInterceptor();
        // 延迟发送规则，确保脚本已加载
        setTimeout(() => {
          sendRulesToPage();
        }, 100);
      }
    } catch (error) {
      console.error('❌ RequestHelper: Failed to check status:', error);
    }
  }

  // 监听来自页面的自定义事件
  window.addEventListener('RequestHelperCapture', function(event) {
    const capturedData = event.detail;

    // 转发到后台
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'RESPONSE_BODY_CAPTURED',
        data: capturedData
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('❌ RequestHelper: Failed to send to background:', chrome.runtime.lastError.message);
        }
      });
    }
  });

  // 监听页面脚本请求规则
  window.addEventListener('RequestHelperGetRules', function() {
    sendRulesToPage();
  });

  // 监听来自 background 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'HELPER_STARTED') {
      // 助手启动，注入拦截器
      injectInterceptor();
      setTimeout(() => {
        sendRulesToPage();
      }, 100);
    }
    sendResponse({ success: true });
  });

  // 页面加载时检查状态
  checkHelperStatus();
})();
