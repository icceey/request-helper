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
let currentStats = null;

// 初始化
async function init() {
  console.log('Popup initialized');
  
  // 从后台获取当前状态
  await updateStatus();
  await updateStats();
  
  // 绑定事件
  toggleBtn.addEventListener('click', handleToggle);
  viewRequestsBtn.addEventListener('click', handleViewRequests);
  clearBtn.addEventListener('click', handleClear);
  settingsBtn.addEventListener('click', handleSettings);

  // 监听后台消息
  chrome.runtime.onMessage.addListener(handleBackgroundMessage);
}

// 从后台获取状态
async function updateStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    
    if (response.success) {
      isCapturing = response.capturing;
      await updateUI();
    }
  } catch (error) {
    console.error('Failed to get status:', error);
  }
}

// 获取统计信息
async function updateStats() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
    
    if (response.success) {
      currentStats = response.stats;
      requestCount.textContent = response.stats.total || 0;
    }
  } catch (error) {
    console.error('Failed to get stats:', error);
  }
}

// 更新UI
async function updateUI() {
  if (isCapturing) {
    statusText.textContent = '正在捕获';
    statusText.style.color = '#34a853';
    toggleBtn.textContent = '停止捕获';
    toggleBtn.classList.add('active');
  } else {
    statusText.textContent = '已停止';
    statusText.style.color = '#666';
    toggleBtn.textContent = '启动捕获';
    toggleBtn.classList.remove('active');
  }
}

// 切换捕获状态
async function handleToggle() {
  console.log('Toggle capture');
  
  try {
    const messageType = isCapturing ? 'STOP_CAPTURE' : 'START_CAPTURE';
    const response = await chrome.runtime.sendMessage({ type: messageType });
    
    if (response.success) {
      isCapturing = response.capturing;
      await updateUI();
    }
  } catch (error) {
    console.error('Failed to toggle capture:', error);
    alert('操作失败，请查看控制台');
  }
}

// 查看请求列表
function handleViewRequests() {
  console.log('View requests');
  
  // 创建一个新标签页显示请求列表
  // TODO: 创建专门的请求列表页面
  chrome.tabs.create({
    url: chrome.runtime.getURL('viewer/viewer.html')
  });
}

// 清空数据
async function handleClear() {
  console.log('Clear data');
  
  if (!confirm('确定要清空所有捕获的数据吗？')) {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({ type: 'CLEAR_REQUESTS' });
    
    if (response.success) {
      requestCount.textContent = '0';
      alert('数据已清空');
    }
  } catch (error) {
    console.error('Failed to clear:', error);
    alert('清空失败');
  }
}

// 打开设置页面
function handleSettings() {
  console.log('Open settings');
  chrome.runtime.openOptionsPage();
}

// 处理后台消息
function handleBackgroundMessage(message, sender, sendResponse) {
  console.log('Message from background:', message);
  
  if (message.type === 'REQUESTS_UPDATED') {
    requestCount.textContent = message.count;
  }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', init);
