# RequestHelper 快速检查清单

## ✅ 插件测试快速指南

### 前置准备
```bash
# 1. 确保项目已构建
cd /Users/icceey/Projects/request-helper
npm run build

# 2. 检查 dist 目录
ls dist/
# 应该看到: background, icons, manifest.json, options, popup, utils, viewer
```

### 加载插件（5分钟）

1. **打开Chrome扩展页面**
   - 地址栏输入: `chrome://extensions/`
   - 或菜单: 更多工具 → 扩展程序

2. **启用开发者模式**
   - 右上角开关打开

3. **加载插件**
   - 点击"加载已解压的扩展程序"
   - 选择 `/Users/icceey/Projects/request-helper/dist` 目录
   - 点击"选择"

4. **验证加载成功**
   - ✅ 扩展列表显示"RequestHelper"
   - ✅ 工具栏出现图标
   - ✅ 没有红色错误提示

### 快速功能测试（10分钟）

#### 测试1: Service Worker
1. 在扩展页面找到RequestHelper
2. 点击"Service Worker"
3. 查看控制台

**期望输出**:
```
RequestHelper Service Worker loaded
Initializing RequestHelper...
WebRequest listeners registered
RequestHelper initialized successfully
```

#### 测试2: Popup界面
1. 点击工具栏图标
2. 检查界面

**期望**:
- 显示"RequestHelper"标题
- 状态"已停止"
- "启动捕获"按钮（蓝色）
- 请求计数"0"
- 三个操作按钮

#### 测试3: 启动捕获
1. 点击"启动捕获"
2. **期望**: 按钮变红，文字变"停止捕获"，状态变"正在捕获"

#### 测试4: 捕获请求
1. 打开新标签页
2. 访问: `https://jsonplaceholder.typicode.com/posts/1`
3. 查看Service Worker控制台

**期望**: 看到请求日志
```
Request started: xxx https://jsonplaceholder.typicode.com/posts/1
Request completed: xxx {id: ..., url: ..., method: 'GET', statusCode: 200, ...}
```

4. 回到Popup查看
**期望**: 请求计数增加

#### 测试5: 配置页面
1. 在Popup点击"设置"
2. 修改URL过滤规则为:
```
https://jsonplaceholder.typicode.com/*
```
3. 点击"保存设置"
4. **期望**: 显示"设置已保存"

#### 测试6: 请求查看器
1. 在Popup点击"查看请求"
2. **期望**: 
   - 新标签页打开
   - 左侧显示请求列表
   - 点击请求显示详情

#### 测试7: 使用测试页面
1. 打开测试文件:
```bash
open test/test-page.html
```
2. 点击"发送 GET 请求"
3. 查看Service Worker控制台
4. 在查看器中查看捕获的请求

**期望**: 所有功能正常工作

### 常见问题排查

#### ❌ Service Worker没有日志
**解决**:
1. 检查是否点击了Service Worker链接
2. 刷新扩展: 点击扩展卡片上的刷新图标
3. 查看是否有错误提示

#### ❌ Popup打不开
**解决**:
1. 右键图标 → "检查弹出内容"查看错误
2. 检查 `dist/popup/popup.html` 是否存在
3. 重新构建: `npm run build`

#### ❌ 没有捕获到请求
**解决**:
1. 确认已点击"启动捕获"
2. 检查URL过滤规则（默认`*://*/*`匹配所有）
3. 查看Service Worker是否有错误
4. 尝试访问 jsonplaceholder.typicode.com

#### ❌ 构建失败
**解决**:
```bash
# 检查Node.js版本
node --version  # 应该 >= 12

# 重新构建
rm -rf dist
node scripts/build.js
```

### 完整测试流程

使用测试页面进行全面测试:

1. **启动插件**
   - 启动捕获
   - 设置过滤规则: `*://*/*`

2. **打开测试页面**
```bash
open test/test-page.html
```

3. **执行测试**
   - GET请求 ✓
   - POST请求 (JSON) ✓
   - POST请求 (FormData) ✓
   - PUT请求 ✓
   - DELETE请求 ✓
   - PATCH请求 ✓
   - 错误处理 ✓
   - 批量请求 ✓

4. **验证结果**
   - 查看Service Worker日志
   - 在查看器中检查捕获的请求
   - 验证请求详情（URL、方法、状态码、请求头、响应头）

### 性能测试

1. **启动捕获**
2. **打开测试页面**
3. **点击"发送 20 个混合请求"**
4. **观察**:
   - ✅ 界面不卡顿
   - ✅ 所有请求都被捕获
   - ✅ Service Worker正常运行

### 导出/清空测试

1. **导出数据**
   - 在查看器点击"导出"
   - 验证下载的JSON文件

2. **清空数据**
   - 点击"清空数据"
   - 确认对话框
   - 验证请求列表清空

## 🎯 核心功能检查表

- [ ] 插件成功加载
- [ ] Service Worker运行正常
- [ ] Popup界面显示正常
- [ ] 可以启动/停止捕获
- [ ] 捕获HTTP请求（GET、POST等）
- [ ] URL过滤工作正常
- [ ] 请求查看器显示请求列表
- [ ] 可以查看请求详情
- [ ] 搜索和过滤功能正常
- [ ] 可以导出数据
- [ ] 可以清空数据
- [ ] 配置保存和加载正常

## 📊 测试结果

全部通过 ✅ 表示插件可以正常使用！

## 🔧 调试技巧

### 查看所有日志
1. **Service Worker日志**: `chrome://extensions/` → Service Worker
2. **Popup日志**: 右键图标 → 检查弹出内容
3. **Viewer日志**: F12打开开发者工具
4. **测试页面日志**: F12打开开发者工具

### 手动测试请求
在任意页面的控制台执行:
```javascript
// GET请求
fetch('https://jsonplaceholder.typicode.com/posts/1')
  .then(r => r.json())
  .then(console.log);

// POST请求
fetch('https://jsonplaceholder.typicode.com/posts', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({title: 'test', body: 'test', userId: 1})
})
  .then(r => r.json())
  .then(console.log);
```

---

**如果所有测试通过，恭喜！插件已经可以正常使用了！** 🎉
