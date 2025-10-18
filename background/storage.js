/**
 * StorageManager
 * 管理数据存储和读取
 */

export class StorageManager {
  static STORAGE_KEY = 'requests';
  static CONFIG_KEY = 'config';
  static MAX_REQUESTS = 1000;

  /**
   * 保存捕获的请求数据
   */
  static async saveRequest(requestData) {
    try {
      // 获取现有请求列表
      const requests = await this.getRequests();

      // 添加新请求到列表开头
      requests.unshift(requestData);

      // 限制存储数量
      const config = await this.getConfig();
      const maxRequests = config.maxRequests || this.MAX_REQUESTS;
      if (requests.length > maxRequests) {
        requests.splice(maxRequests);
      }

      // 保存到存储
      await chrome.storage.local.set({
        [this.STORAGE_KEY]: requests
      });

      console.log('Request saved:', requestData.id, 'Total:', requests.length);

      // 通知UI更新
      this.notifyUpdate(requests.length);
    } catch (error) {
      console.error('Failed to save request:', error);
    }
  }

  /**
   * 获取捕获的请求列表
   */
  static async getRequests(filters = {}) {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      let requests = result[this.STORAGE_KEY] || [];

      // 应用过滤器
      if (filters.url) {
        requests = requests.filter(req => 
          req.url.includes(filters.url)
        );
      }

      if (filters.method) {
        requests = requests.filter(req => 
          req.method === filters.method
        );
      }

      if (filters.status) {
        requests = requests.filter(req => 
          req.statusCode === filters.status
        );
      }

      console.log('Getting requests with filters:', filters, 'Found:', requests.length);
      return requests;
    } catch (error) {
      console.error('Failed to get requests:', error);
      return [];
    }
  }

  /**
   * 根据ID获取单个请求
   */
  static async getRequestById(id) {
    try {
      const requests = await this.getRequests();
      return requests.find(req => req.id === id);
    } catch (error) {
      console.error('Failed to get request by id:', error);
      return null;
    }
  }

  /**
   * 更新已有请求
   */
  static async updateRequest(requestData) {
    try {
      const requests = await this.getRequests();
      const index = requests.findIndex(req => req.id === requestData.id);
      
      if (index !== -1) {
        requests[index] = requestData;
        await chrome.storage.local.set({
          [this.STORAGE_KEY]: requests
        });
        console.log('Request updated:', requestData.id);
      } else {
        console.warn('Request not found for update:', requestData.id);
      }
    } catch (error) {
      console.error('Failed to update request:', error);
    }
  }

  /**
   * 获取最近的请求
   */
  static async getRecentRequests(count = 10) {
    try {
      const requests = await this.getRequests();
      return requests.slice(0, count);
    } catch (error) {
      console.error('Failed to get recent requests:', error);
      return [];
    }
  }

  /**
   * 获取请求统计信息
   */
  static async getStats() {
    try {
      const requests = await this.getRequests();
      
      return {
        total: requests.length,
        methods: this.countByMethod(requests),
        statuses: this.countByStatus(requests),
        types: this.countByType(requests)
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return { total: 0 };
    }
  }

  /**
   * 按方法统计
   */
  static countByMethod(requests) {
    const counts = {};
    requests.forEach(req => {
      counts[req.method] = (counts[req.method] || 0) + 1;
    });
    return counts;
  }

  /**
   * 按状态码统计
   */
  static countByStatus(requests) {
    const counts = {};
    requests.forEach(req => {
      if (req.statusCode) {
        const statusGroup = Math.floor(req.statusCode / 100) * 100;
        counts[statusGroup] = (counts[statusGroup] || 0) + 1;
      }
    });
    return counts;
  }

  /**
   * 按类型统计
   */
  static countByType(requests) {
    const counts = {};
    requests.forEach(req => {
      counts[req.type] = (counts[req.type] || 0) + 1;
    });
    return counts;
  }

  /**
   * 清除所有捕获的请求
   */
  static async clearRequests() {
    try {
      await chrome.storage.local.set({
        [this.STORAGE_KEY]: []
      });
      console.log('All requests cleared');
      this.notifyUpdate(0);
    } catch (error) {
      console.error('Failed to clear requests:', error);
    }
  }

  /**
   * 保存配置
   */
  static async saveConfig(config) {
    try {
      await chrome.storage.local.set({
        [this.CONFIG_KEY]: config
      });
      console.log('Config saved:', config);
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  /**
   * 获取配置
   */
  static async getConfig() {
    try {
      const result = await chrome.storage.local.get(this.CONFIG_KEY);
      const config = result[this.CONFIG_KEY] || {
        urlPatterns: ['*://*/*'],
        enabled: false,
        autoStart: false,
        maxRequests: this.MAX_REQUESTS
      };
      console.log('Config loaded:', config);
      return config;
    } catch (error) {
      console.error('Failed to get config:', error);
      return {
        urlPatterns: ['*://*/*'],
        enabled: false,
        autoStart: false,
        maxRequests: this.MAX_REQUESTS
      };
    }
  }

  /**
   * 通知UI更新
   */
  static notifyUpdate(count) {
    // 发送消息到所有连接的页面
    chrome.runtime.sendMessage({
      type: 'REQUESTS_UPDATED',
      count: count
    }).catch(() => {
      // 忽略错误（可能没有接收者）
    });
  }

  /**
   * 导出请求数据为JSON
   */
  static async exportRequests() {
    try {
      const requests = await this.getRequests();
      return JSON.stringify(requests, null, 2);
    } catch (error) {
      console.error('Failed to export requests:', error);
      return null;
    }
  }

  /**
   * 导入请求数据
   */
  static async importRequests(jsonData) {
    try {
      const requests = JSON.parse(jsonData);
      await chrome.storage.local.set({
        [this.STORAGE_KEY]: requests
      });
      console.log('Requests imported:', requests.length);
      this.notifyUpdate(requests.length);
      return true;
    } catch (error) {
      console.error('Failed to import requests:', error);
      return false;
    }
  }
}
