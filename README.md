# RequestHelper

一个强大的Chrome浏览器开发工具插件，用于静默抓包和请求分析。

## 📖 项目简介

RequestHelper 是一个专为开发者设计的Chrome浏览器插件，它能够在后台静默地捕获HTTP请求，无需像DevTools那样必须打开才能工作。这对于需要长时间监控、调试特定请求或分析网页行为的开发场景非常有用。

## ✨ 核心功能

### 当前版本
- 🎯 **静默抓包**: 无需打开DevTools即可捕获网络请求
- 🔍 **URL过滤**: 支持配置需要抓包的请求URL模式
- 📦 **完整信息捕获**: 
  - 请求头 (Request Headers)
  - 请求体 (Request Body)
  - 响应头 (Response Headers)
  - 响应体 (Response Body)

### 规划中的功能
- 📊 数据导出与分析
- 🔄 请求重放
- 🎨 自定义规则引擎
- 📝 请求/响应修改
- 💾 历史记录管理
- 🔔 实时通知与告警

## 🏗️ 技术架构

### 设计原则
- **模块化设计**: 清晰的功能模块划分，便于扩展和维护
- **性能优先**: 最小化对浏览器性能的影响
- **数据安全**: 本地存储，确保敏感数据安全
- **用户友好**: 直观的配置界面和操作流程

### 核心模块
```
requestHelper/
├── manifest.json          # 插件配置文件
├── background/           # 后台服务（Service Worker）
│   ├── service-worker.js # 主要的抓包逻辑
│   └── storage.js        # 数据存储管理
├── popup/                # 弹出窗口界面
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/              # 配置页面
│   ├── options.html
│   ├── options.js
│   └── options.css
├── content/              # 内容脚本（如需要）
│   └── content.js
└── utils/                # 工具函数
    ├── filter.js         # URL过滤逻辑
    └── formatter.js      # 数据格式化
```

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 在Chrome中加载插件
1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目的 `dist` 目录

## 📋 开发计划

- [x] 项目初始化
- [ ] 基础架构搭建
- [ ] 实现静默抓包核心功能
- [ ] URL过滤配置
- [ ] 请求/响应数据完整捕获
- [ ] 基础UI界面
- [ ] 数据存储与管理
- [ ] 高级功能扩展

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 📮 联系方式

如有问题或建议，欢迎提Issue讨论。

---

**注意**: 本项目仅供开发和学习使用，请遵守相关法律法规，不要用于非法用途。
