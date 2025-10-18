# RequestHelper

English | [中文](./README_zh-CN.md)

A powerful Chrome Manifest V3 extension for silent network request capturing and analysis. It uses a **dual-layer interception architecture** to bypass webRequest API limitations and capture complete request/response bodies.

> **🤖 Note: This project is entirely AI-generated**

## ✨ Features

- **Complete Request/Response Capture**
  - Captures full request and response bodies (including XMLHttpRequest and Fetch API)
  - Automatic parsing of JSON, HTML, XML, and text formats
  - Protection against large response bodies (default 5MB limit)

- **Dual-Layer Interception Architecture**
  - Page context interceptor for full data access
  - Content script bridge for Chrome extension communication
  - Bypasses Manifest V3 webRequest API limitations

- **Advanced Filtering**
  - Filter by URL patterns (wildcard support: `*api.example.com*`)
  - Filter by HTTP methods (GET, POST, PUT, DELETE, etc.)
  - Filter by status codes (2xx, 3xx, 4xx, 5xx)
  - Exclude static resources (images, CSS, JS, fonts)

- **Rich Request Analysis**
  - View request/response headers
  - Inspect request/response bodies
  - Track request timing and duration
  - Export captured data as JSON

- **User-Friendly Interface**
  - Quick control popup
  - Detailed request viewer with search and filters
  - Configurable settings page
  - Multi-language support (English, 简体中文)

## 🚀 Installation

### From Source

1. Clone this repository:

   ```bash
   git clone https://github.com/yourusername/request-helper.git
   cd request-helper
   ```

2. Build the extension:

   ```bash
   npm run build
   ```

3. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder

## 📖 Usage

### Quick Start

1. Click the RequestHelper icon in Chrome toolbar
2. Click "Start Capture" to begin capturing requests
3. Browse any website or trigger network requests
4. Click "View Requests" to inspect captured data
5. Click "Stop Capture" when done

### Filtering Requests

In the **Settings** page, you can configure:

- **URL Patterns**: Only capture URLs matching patterns (e.g., `*api.example.com*`, `*/graphql`)
- **Excluded Patterns**: Exclude URLs matching patterns
- **Static Resources**: Toggle capturing of images, CSS, JS, fonts, and media files

### Viewing Request Details

The **Request Viewer** provides:

- Search bar for URL filtering
- Method and status code filters
- Detailed request/response inspection
- JSON syntax highlighting
- Export functionality

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Guidelines

- Follow existing code style and patterns
- Run `npm run build` after making changes
- Test manually using test pages
- Update relevant documentation

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

Built with modern Chrome Extension Manifest V3 APIs and best practices for network request interception.

## 📮 Support

If you encounter any issues or have questions, please [open an issue](https://github.com/yourusername/request-helper/issues) on GitHub.

---

**Note**: This extension requires Chrome 88+ for full Manifest V3 support.
