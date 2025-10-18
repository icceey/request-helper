# RequestHelper

[English](./README.md) | 中文

一个强大的 Chrome Manifest V3 扩展程序，用于静默捕获和分析网络请求。它使用**双层拦截架构**来绕过 webRequest API 的限制，捕获完整的请求/响应体。

> **🤖 注意：本项目完全由 AI 生成**

## ✨ 特性

- **完整的请求/响应捕获**
  - 捕获完整的请求和响应体（包括 XMLHttpRequest 和 Fetch API）
  - 自动解析 JSON、HTML、XML 和文本格式
  - 大型响应体保护（默认 5MB 限制）

- **双层拦截架构**
  - 页面上下文拦截器，可完全访问数据
  - Content Script 桥接，用于 Chrome 扩展通信
  - 绕过 Manifest V3 webRequest API 限制

- **高级过滤功能**
  - 按 URL 模式过滤（支持通配符：`*api.example.com*`）
  - 按 HTTP 方法过滤（GET、POST、PUT、DELETE 等）
  - 按状态码过滤（2xx、3xx、4xx、5xx）
  - 排除静态资源（图片、CSS、JS、字体）

- **丰富的请求分析**
  - 查看请求/响应头
  - 检查请求/响应体
  - 跟踪请求时间和持续时间
  - 导出捕获的数据为 JSON

- **友好的用户界面**
  - 快速控制面板
  - 带搜索和过滤的详细请求查看器
  - 可配置的设置页面
  - 多语言支持（English、简体中文）

## 🚀 安装

### 从源码安装

1. 克隆此仓库：

   ```bash
   git clone https://github.com/yourusername/request-helper.git
   cd request-helper
   ```

2. 构建扩展：

   ```bash
   npm run build
   ```

3. 在 Chrome 中加载：
   - 打开 `chrome://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `dist/` 文件夹

## 📖 使用方法

### 快速开始

1. 点击 Chrome 工具栏中的 RequestHelper 图标
2. 点击"开始捕获"开始捕获请求
3. 浏览任何网站或触发网络请求
4. 点击"查看请求"检查捕获的数据
5. 完成后点击"停止捕获"

### 过滤请求

在**设置**页面中，您可以配置：

- **URL 模式**：仅捕获匹配模式的 URL（例如：`*api.example.com*`、`*/graphql`）
- **排除模式**：排除匹配模式的 URL
- **静态资源**：切换是否捕获图片、CSS、JS、字体和媒体文件

### 查看请求详情

**请求查看器**提供：

- URL 过滤搜索栏
- 方法和状态码过滤器
- 详细的请求/响应检查
- JSON 语法高亮
- 导出功能

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

### 指南

- 遵循现有的代码风格和模式
- 更改后运行 `npm run build`
- 使用测试页面进行手动测试
- 更新相关文档

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🙏 致谢

使用现代 Chrome Extension Manifest V3 API 和网络请求拦截的最佳实践构建。

## 📮 支持

如果您遇到任何问题或有疑问，请在 GitHub 上[提交 issue](https://github.com/yourusername/request-helper/issues)。

---

**注意**：此扩展需要 Chrome 88+ 才能完全支持 Manifest V3。
