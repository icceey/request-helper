# RequestHelper 测试指南

## 🧪 测试步骤

### 1. 准备工作

确保已构建项目：
```bash
npm run build
```

检查 `dist` 目录是否包含以下内容：
- manifest.json
- background/
- popup/
- options/
- viewer/
- utils/

### 2. 加载插件到Chrome

1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目的 `dist` 目录
6. 确认插件出现在列表中

**预期结果**：
- ✅ 插件成功加载，显示名称"RequestHelper"
- ✅ 工具栏出现插件图标
- ✅ 没有错误提示

### 3. 测试Service Worker

1. 在扩展管理页面找到RequestHelper
2. 点击"Service Worker"链接
3. 查看控制台输出

**预期输出**：
```
RequestHelper Service Worker loaded
Initializing RequestHelper...
Config loaded: {urlPatterns: Array(1), enabled: false, autoStart: false, maxRequests: 1000}
WebRequest listeners registered
RequestHelper initialized successfully
Service Worker setup complete
```

**如果出现错误**：
- 检查background/service-worker.js是否正确复制
- 查看具体错误信息

### 4. 测试Popup界面

1. 点击工具栏中的RequestHelper图标
2. 检查界面元素

**预期显示**：
- ✅ 标题"RequestHelper"
- ✅ 状态显示"已停止"
- ✅ "启动捕获"按钮
- ✅ 请求计数显示"0"
- ✅ "查看请求"、"清空数据"、"设置"按钮

3. 右键点击图标 → "检查弹出内容"
4. 查看控制台

**预期输出**：
```
Popup initialized
```

### 5. 测试启动/停止捕获

1. 在Popup中点击"启动捕获"按钮

**预期结果**：
- ✅ 按钮文本变为"停止捕获"
- ✅ 按钮颜色变为红色
- ✅ 状态显示"正在捕获"

2. 查看Service Worker控制台

**预期输出**：
```
Message received: {type: 'START_CAPTURE'}
Starting capture...
Starting capture with config: {urlPatterns: Array(1), enabled: true, ...}
```

3. 打开任意网站（如 https://www.example.com）

**预期**：
- Service Worker控制台显示捕获的请求
```
Request started: <requestId> https://www.example.com/
Request completed: <requestId> {id: ..., url: ..., method: 'GET', ...}
```

4. 点击"停止捕获"

**预期**：
- ✅ 按钮恢复正常样式
- ✅ 状态显示"已停止"

### 6. 测试Options配置页面

1. 在Popup中点击"设置"按钮
2. 或在扩展管理页面点击"扩展程序选项"

**预期显示**：
- ✅ 配置页面标题
- ✅ "自动启动捕获"复选框
- ✅ URL过滤规则文本框（默认值：*://*/*）
- ✅ 最大存储请求数输入框（默认值：1000）
- ✅ "保存设置"和"恢复默认"按钮

3. 修改URL过滤规则：
```
https://api.github.com/*
https://jsonplaceholder.typicode.com/*
```

4. 点击"保存设置"

**预期**：
- ✅ 显示"设置已保存"消息
- ✅ Service Worker控制台显示配置更新

5. 刷新页面，确认配置已保存

### 7. 测试请求捕获和过滤

1. 在Options中设置过滤规则：
```
https://jsonplaceholder.typicode.com/*
```

2. 保存并启动捕获

3. 在新标签页打开浏览器控制台，执行：
```javascript
fetch('https://jsonplaceholder.typicode.com/posts/1')
  .then(res => res.json())
  .then(data => console.log(data));
```

**预期**：
- ✅ Service Worker捕获到请求
- ✅ Popup中的请求计数增加

4. 执行不匹配的请求：
```javascript
fetch('https://www.example.com/')
```

**预期**：
- ✅ 此请求不应被捕获（因为不匹配过滤规则）

### 8. 测试请求查看器

1. 在Popup中点击"查看请求"

**预期**：
- ✅ 打开新标签页显示查看器
- ✅ 左侧显示请求列表
- ✅ 如果有请求，显示请求卡片

2. 点击一个请求

**预期**：
- ✅ 请求卡片高亮显示
- ✅ 右侧显示请求详情
- ✅ 包含：URL、方法、状态码、请求头、响应头等

3. 测试搜索功能
- 在搜索框输入URL关键字

**预期**：
- ✅ 列表只显示匹配的请求

4. 测试方法过滤
- 选择"GET"

**预期**：
- ✅ 只显示GET请求

### 9. 测试导出功能

1. 在查看器页面点击"导出"按钮

**预期**：
- ✅ 下载JSON文件（requests-export.json）
- ✅ 文件包含所有捕获的请求数据

2. 打开文件验证格式

**预期结构**：
```json
[
  {
    "id": "...",
    "url": "...",
    "method": "GET",
    "statusCode": 200,
    "timestamp": 1234567890,
    "requestHeaders": {...},
    "responseHeaders": {...},
    ...
  }
]
```

### 10. 测试清空功能

1. 在Popup或查看器中点击"清空数据"
2. 确认提示

**预期**：
- ✅ 显示确认对话框
- ✅ 确认后请求计数归零
- ✅ 查看器列表清空

### 11. 压力测试

1. 设置过滤规则：`*://*/*`
2. 启动捕获
3. 访问内容丰富的网站（如新闻网站）

**预期**：
- ✅ 捕获大量请求
- ✅ 界面不卡顿
- ✅ 数据正确显示

4. 检查是否达到最大存储限制

**预期**：
- ✅ 超过限制时自动删除最早的请求

### 12. 错误处理测试

1. 访问不存在的URL
```javascript
fetch('https://this-domain-does-not-exist-123456.com/')
  .catch(err => console.error(err));
```

**预期**：
- ✅ 捕获到请求
- ✅ 标记为错误
- ✅ 显示错误信息

## ✅ 测试检查清单

基础功能：
- [ ] 插件成功加载
- [ ] Service Worker正常运行
- [ ] Popup界面正常显示
- [ ] Options页面正常显示
- [ ] Viewer页面正常显示

核心功能：
- [ ] 启动/停止捕获正常工作
- [ ] 捕获HTTP请求（GET、POST等）
- [ ] 捕获请求头
- [ ] 捕获响应头
- [ ] 捕获请求体
- [ ] URL过滤正常工作
- [ ] 配置保存和加载正常

数据管理：
- [ ] 请求正确保存到存储
- [ ] 请求列表正确显示
- [ ] 搜索功能正常
- [ ] 过滤功能正常
- [ ] 导出功能正常
- [ ] 清空功能正常

性能：
- [ ] 大量请求时不卡顿
- [ ] 存储限制正常工作
- [ ] 没有内存泄漏

## 🐛 已知问题

1. **响应体捕获限制**
   - webRequest API无法直接获取响应体内容
   - 当前只记录响应体大小
   - 解决方案：后续通过Content Script实现

2. **请求体格式**
   - 某些复杂格式的请求体可能显示不完整
   - 二进制数据只显示占位符

## 📊 测试报告模板

测试日期：________
测试人员：________
Chrome版本：________

| 测试项 | 状态 | 备注 |
|--------|------|------|
| 插件加载 | ☐ 通过 ☐ 失败 | |
| Service Worker | ☐ 通过 ☐ 失败 | |
| Popup界面 | ☐ 通过 ☐ 失败 | |
| Options页面 | ☐ 通过 ☐ 失败 | |
| Viewer页面 | ☐ 通过 ☐ 失败 | |
| 请求捕获 | ☐ 通过 ☐ 失败 | |
| URL过滤 | ☐ 通过 ☐ 失败 | |
| 数据导出 | ☐ 通过 ☐ 失败 | |
| 数据清空 | ☐ 通过 ☐ 失败 | |

总体评价：☐ 通过 ☐ 需要修复

---

Happy Testing! 🎉
