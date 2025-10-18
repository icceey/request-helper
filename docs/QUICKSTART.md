# RequestHelper - 快速开始

## 🎯 当前状态

✅ 项目框架已搭建完成  
✅ 基础UI界面已创建  
⏳ 核心抓包功能待实现  

## 📦 已完成

### 1. 项目结构
- ✅ Git环境初始化
- ✅ 目录结构创建
- ✅ 配置文件 (manifest.json, package.json)

### 2. 模块骨架
- ✅ Background Service Worker
- ✅ Storage Manager
- ✅ Request Capture (骨架)
- ✅ Popup UI
- ✅ Options Page
- ✅ 工具函数 (filter, formatter)

### 3. 构建系统
- ✅ 简单构建脚本
- ✅ dist目录输出

## 🚀 如何使用

### 安装和构建
```bash
# 构建项目
npm run build

# 输出到 dist/ 目录
```

### 在Chrome中加载
详细步骤请查看: [docs/LOADING.md](docs/LOADING.md)

简要步骤：
1. 打开 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `dist` 目录

### 测试界面
1. 点击工具栏图标 → 打开Popup
2. 点击"设置" → 打开Options页面
3. 查看Service Worker控制台 → 验证后台运行

## 📝 下一步开发计划

### 阶段1: 基础抓包功能 (优先级：高)
- [ ] 实现Chrome webRequest API集成
- [ ] 捕获请求头和响应头
- [ ] 实现URL过滤功能
- [ ] 基础数据存储

### 阶段2: 完整数据捕获 (优先级：高)
- [ ] 捕获请求体 (POST/PUT数据)
- [ ] 捕获响应体
- [ ] 处理不同内容类型 (JSON, Form, Binary等)
- [ ] 大数据处理优化

### 阶段3: UI和交互 (优先级：中)
- [ ] 请求列表展示页面
- [ ] 请求详情查看
- [ ] 搜索和过滤功能
- [ ] 导出数据功能

### 阶段4: 高级功能 (优先级：低)
- [ ] 请求重放
- [ ] 请求/响应修改
- [ ] 性能分析
- [ ] 告警规则

## 🔧 开发提示

### 调试
```bash
# 查看Service Worker日志
chrome://extensions/ → RequestHelper → Service Worker

# 查看Popup日志
右键扩展图标 → 检查弹出内容
```

### 修改后重新加载
```bash
npm run build
# 然后在chrome://extensions/页面点击刷新图标
```

### 文件结构
```
request-helper/
├── background/      # 后台逻辑（抓包核心）
├── popup/          # 快速操作界面
├── options/        # 详细配置页面
├── utils/          # 工具函数
└── dist/           # 构建输出（加载此目录）
```

## 📚 相关文档

- [Chrome Extension API](https://developer.chrome.com/docs/extensions/)
- [webRequest API](https://developer.chrome.com/docs/extensions/reference/webRequest/)
- [Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)

## 💡 开发建议

1. **从简单开始**: 先实现基础的请求捕获，再逐步添加功能
2. **频繁测试**: 每实现一个小功能就在Chrome中测试
3. **查看日志**: 利用console.log()和Chrome DevTools调试
4. **参考文档**: Chrome Extension API文档非常详细

---

现在你可以：
1. 在Chrome中加载插件，测试基础UI
2. 开始实现核心抓包功能
3. 完善存储和过滤逻辑
