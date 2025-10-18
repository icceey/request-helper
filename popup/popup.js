/**
 * RequestHelper - Popup UI
 */

// DOM 元素
const statusText = document.getElementById('status-text');
const toggleBtn = document.getElementById('toggle-btn');
const requestCount = document.getElementById('request-count');
const viewRequestsBtn = document.getElementById('view-requests-btn');
const clearBtn = document.getElementById('clear-btn');
const settingsBtn = document.getElementById('settings-btn');

// 状态
let isCapturing = false;

// 初始化
async function init() {
  console.log('Popup initialized');
  
  // TODO: 从后台获取当前状态
  await updateUI();
  
  // 绑定事件
  toggleBtn.addEventListener('click', handleToggle);
  viewRequestsBtn.addEventListener('click', handleViewRequests);
  clearBtn.addEventListener('click', handleClear);
  settingsBtn.addEventListener('click', handleSettings);
}

// 更新UI
async function updateUI() {
  // TODO: 实现UI更新逻辑
  console.log('Updating UI');
  
  if (isCapturing) {
    statusText.textContent = '正在捕获';
    toggleBtn.textContent = '停止捕获';
    toggleBtn.classList.add('active');
  } else {
    statusText.textContent = '准备就绪';
    toggleBtn.textContent = '启动捕获';
    toggleBtn.classList.remove('active');
  }
}

// 切换捕获状态
async function handleToggle() {
  console.log('Toggle capture');
  isCapturing = !isCapturing;
  
  // TODO: 发送消息到后台
  chrome.runtime.sendMessage({
    type: isCapturing ? 'START_CAPTURE' : 'STOP_CAPTURE'
  });
  
  await updateUI();
}

// 查看请求列表
function handleViewRequests() {
  console.log('View requests');
  // TODO: 打开请求列表页面
}

// 清空数据
async function handleClear() {
  console.log('Clear data');
  
  if (confirm('确定要清空所有捕获的数据吗？')) {
    // TODO: 发送清空消息到后台
    chrome.runtime.sendMessage({ type: 'CLEAR_REQUESTS' });
    requestCount.textContent = '0';
  }
}

// 打开设置页面
function handleSettings() {
  console.log('Open settings');
  chrome.runtime.openOptionsPage();
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', init);
