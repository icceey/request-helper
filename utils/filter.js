/**
 * URL Filter Utilities
 * 处理URL匹配和过滤逻辑
 */

export class URLFilter {
  /**
   * 检查URL是否匹配任一模式
   * @param {string} url - 要检查的URL
   * @param {string[]} patterns - URL模式数组
   * @returns {boolean}
   */
  static matches(url, patterns) {
    if (!patterns || patterns.length === 0) {
      return true; // 没有过滤规则则全部匹配
    }

    return patterns.some(pattern => this.matchPattern(url, pattern));
  }

  /**
   * 单个模式匹配
   * @param {string} url - URL字符串
   * @param {string} pattern - 匹配模式（支持 * 通配符）
   * @returns {boolean}
   */
  static matchPattern(url, pattern) {
    // TODO: 实现完整的模式匹配逻辑
    // 支持 * 通配符
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
      .replace(/\*/g, '.*'); // * 转换为 .*
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(url);
  }

  /**
   * 验证URL模式是否有效
   * @param {string} pattern - URL模式
   * @returns {boolean}
   */
  static isValidPattern(pattern) {
    try {
      this.matchPattern('http://example.com', pattern);
      return true;
    } catch (error) {
      return false;
    }
  }
}
