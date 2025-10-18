/**
 * Data Formatter Utilities
 * 格式化和处理请求/响应数据
 */

export class DataFormatter {
  /**
   * 格式化请求数据
   * @param {Object} request - 原始请求数据
   * @returns {Object} 格式化后的请求数据
   */
  static formatRequest(request) {
    // TODO: 实现请求数据格式化
    return {
      id: this.generateId(),
      timestamp: Date.now(),
      url: request.url,
      method: request.method,
      headers: request.headers || {},
      body: request.body || null,
      ...request
    };
  }

  /**
   * 格式化响应数据
   * @param {Object} response - 原始响应数据
   * @returns {Object} 格式化后的响应数据
   */
  static formatResponse(response) {
    // TODO: 实现响应数据格式化
    return {
      timestamp: Date.now(),
      status: response.status,
      statusText: response.statusText,
      headers: response.headers || {},
      body: response.body || null,
      ...response
    };
  }

  /**
   * 生成唯一ID
   * @returns {string}
   */
  static generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 格式化时间戳
   * @param {number} timestamp - 时间戳
   * @returns {string}
   */
  static formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  }

  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string}
   */
  static formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
