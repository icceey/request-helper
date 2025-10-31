/**
 * Form Utilities Module
 * 表单工具函数：键值对处理、输入项管理等
 */

import { getMessage } from '../../utils/i18n.js';

// 添加键值对输入项
export function addKeyValuePair(container, type) {
  const item = document.createElement('div');
  item.className = 'key-value-item';
  
  const keyPlaceholder = type === 'query' 
    ? getMessage('queryKeyPlaceholder') || 'parameter_name'
    : getMessage('headerKeyPlaceholder') || 'Header-Name';
  const valuePlaceholder = type === 'query' 
    ? getMessage('queryValuePlaceholder') || 'value'
    : getMessage('headerValuePlaceholder') || 'header value';
  const removeText = getMessage('remove') || 'Remove';
  
  item.innerHTML = `
    <input type="text" class="kv-key" placeholder="${keyPlaceholder}" />
    <input type="text" class="kv-value" placeholder="${valuePlaceholder}" />
    <button type="button" class="btn-remove">${removeText}</button>
  `;
  
  // 绑定删除按钮
  item.querySelector('.btn-remove').addEventListener('click', () => {
    item.remove();
  });
  
  container.appendChild(item);
  
  // 聚焦到key输入框
  item.querySelector('.kv-key').focus();
}

// 添加单键输入项（用于删除操作）
export function addKeyItem(container, type) {
  const item = document.createElement('div');
  item.className = 'key-item';
  
  const placeholder = type === 'query' 
    ? getMessage('queryKeyPlaceholder') || 'parameter_name'
    : getMessage('headerKeyPlaceholder') || 'Header-Name';
  const removeText = getMessage('remove') || 'Remove';
  
  item.innerHTML = `
    <input type="text" class="key-name" placeholder="${placeholder}" />
    <button type="button" class="btn-remove">${removeText}</button>
  `;
  
  // 绑定删除按钮
  item.querySelector('.btn-remove').addEventListener('click', () => {
    item.remove();
  });
  
  container.appendChild(item);
  
  // 聚焦到输入框
  item.querySelector('.key-name').focus();
}

// 从容器中提取键值对对象
export function getKeyValuePairsFromContainer(container) {
  const pairs = {};
  const items = container.querySelectorAll('.key-value-item');
  
  items.forEach(item => {
    const key = item.querySelector('.kv-key').value.trim();
    const value = item.querySelector('.kv-value').value.trim();
    
    if (key) { // 只添加非空的key
      pairs[key] = value;
    }
  });
  
  return pairs;
}

// 从容器中提取键名数组
export function getKeysFromContainer(container) {
  const keys = [];
  const items = container.querySelectorAll('.key-item');
  
  items.forEach(item => {
    const key = item.querySelector('.key-name').value.trim();
    if (key) {
      keys.push(key);
    }
  });
  
  return keys;
}

// 填充键值对到容器
export function populateKeyValuePairs(container, pairs, type) {
  // 清空现有内容
  container.innerHTML = '';
  
  if (!pairs || Object.keys(pairs).length === 0) {
    return;
  }
  
  // 添加每个键值对
  Object.entries(pairs).forEach(([key, value]) => {
    addKeyValuePair(container, type);
    const lastItem = container.lastElementChild;
    lastItem.querySelector('.kv-key').value = key;
    lastItem.querySelector('.kv-value').value = value;
  });
}

// 填充键名列表到容器
export function populateKeys(container, keys, type) {
  // 清空现有内容
  container.innerHTML = '';
  
  if (!keys || keys.length === 0) {
    return;
  }
  
  // 添加每个键
  keys.forEach(key => {
    addKeyItem(container, type);
    const lastItem = container.lastElementChild;
    lastItem.querySelector('.key-name').value = key;
  });
}

// 显示消息
export function showMessage(element, text, type = 'success') {
  element.textContent = text;
  element.className = `message ${type}`;
  element.classList.add('show');
  
  setTimeout(() => {
    element.classList.remove('show');
  }, 3000);
}
