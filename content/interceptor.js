/**
 * Network Interceptor - Content Script
 * 负责注入拦截器到页面并转发消息到后台
 */

(function() {
  'use strict';

  // 注入拦截器脚本到页面上下文
  function injectInterceptor() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('content/interceptor-injected.js');
    script.onload = function() {
      this.remove();
    };
    script.onerror = function() {
      console.error('❌ RequestHelper: Failed to inject interceptor');
    };
    (document.head || document.documentElement).appendChild(script);
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

  // 注入拦截器
  injectInterceptor();
})();
