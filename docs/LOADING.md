# 如何在Chrome中加载RequestHelper插件

## 开发模式加载步骤

### 1. 构建项目
```bash
npm run build
```

### 2. 打开Chrome扩展页面
在Chrome浏览器地址栏输入：
```
chrome://extensions/
```

### 3. 启用开发者模式
在扩展页面右上角，打开"开发者模式"开关。

### 4. 加载扩展
1. 点击"加载已解压的扩展程序"按钮
2. 选择项目中的 `dist` 目录
3. 点击"选择"

### 5. 验证安装
- 在扩展列表中应该能看到 "RequestHelper"
- 工具栏会显示扩展图标
- 点击图标可以打开popup界面

## 测试功能

### 打开Popup
点击工具栏中的RequestHelper图标，应该看到：
- 状态显示
- 启动/停止捕获按钮
- 请求计数
- 操作按钮

### 打开设置页面
1. 在popup中点击"设置"按钮
2. 或者在扩展管理页面点击"详情" → "扩展程序选项"

### 查看控制台
1. 右键点击扩展图标 → "检查弹出内容"（查看popup的控制台）
2. 在扩展管理页面点击"Service Worker"链接（查看后台控制台）

## 调试提示

### 查看Service Worker日志
```
chrome://extensions/ → RequestHelper → Service Worker → 查看视图
```

### 重新加载扩展
修改代码后：
1. 运行 `npm run build` 重新构建
2. 在扩展页面点击刷新按钮 ↻
3. 或者使用快捷键：Ctrl+R (Windows) / Cmd+R (Mac)

### 常见问题

**Q: 扩展加载失败**
- 检查manifest.json格式是否正确
- 确保所有引用的文件都存在于dist目录中

**Q: Service Worker没有运行**
- 查看是否有JavaScript错误
- 检查控制台是否有报错信息

**Q: Popup打不开**
- 检查popup.html文件路径
- 查看popup的JavaScript是否有错误

## 下一步

成功加载后，可以：
1. 测试popup界面的各个按钮
2. 查看Service Worker的控制台输出
3. 配置URL过滤规则
4. 开始实现核心捕获功能
