/**
 * RequestHelper - Options Page
 */

// DOM 元素
const autoStartCheckbox = document.getElementById('auto-start');
const urlPatternsTextarea = document.getElementById('url-patterns');
const maxRequestsInput = document.getElementById('max-requests');
const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');
const saveMessage = document.getElementById('save-message');

// 默认配置
const DEFAULT_CONFIG = {
  autoStart: false,
  urlPatterns: ['*://*/*'],
  maxRequests: 1000
};

// 初始化
async function init() {
  console.log('Options page initialized');
  
  // 加载配置
  await loadConfig();
  
  // 绑定事件
  saveBtn.addEventListener('click', handleSave);
  resetBtn.addEventListener('click', handleReset);
}

// 加载配置
async function loadConfig() {
  console.log('Loading config');
  
  try {
    // TODO: 从存储中获取配置
    const config = DEFAULT_CONFIG;
    
    // 填充表单
    autoStartCheckbox.checked = config.autoStart;
    urlPatternsTextarea.value = config.urlPatterns.join('\n');
    maxRequestsInput.value = config.maxRequests;
  } catch (error) {
    console.error('Failed to load config:', error);
    showMessage('加载配置失败', 'error');
  }
}

// 保存配置
async function handleSave() {
  console.log('Saving config');
  
  try {
    // 获取表单数据
    const config = {
      autoStart: autoStartCheckbox.checked,
      urlPatterns: urlPatternsTextarea.value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0),
      maxRequests: parseInt(maxRequestsInput.value, 10)
    };
    
    // TODO: 保存到存储
    console.log('Config to save:', config);
    
    // 发送消息通知后台
    chrome.runtime.sendMessage({
      type: 'CONFIG_UPDATED',
      config
    });
    
    showMessage('设置已保存', 'success');
  } catch (error) {
    console.error('Failed to save config:', error);
    showMessage('保存失败', 'error');
  }
}

// 恢复默认配置
async function handleReset() {
  console.log('Resetting to default config');
  
  if (confirm('确定要恢复默认设置吗？')) {
    autoStartCheckbox.checked = DEFAULT_CONFIG.autoStart;
    urlPatternsTextarea.value = DEFAULT_CONFIG.urlPatterns.join('\n');
    maxRequestsInput.value = DEFAULT_CONFIG.maxRequests;
    
    showMessage('已恢复默认设置', 'success');
  }
}

// 显示消息
function showMessage(text, type = 'success') {
  saveMessage.textContent = text;
  saveMessage.className = `message ${type}`;
  
  setTimeout(() => {
    saveMessage.classList.add('hidden');
  }, 3000);
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', init);
