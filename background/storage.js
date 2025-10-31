/**
 * StorageManager
 * 管理数据存储和读取
 */

import { updateBadge, getCapturingStatus } from './service-worker.js';

export class StorageManager {
  static STORAGE_KEY = 'requests';
  static CONFIG_KEY = 'config';
  static RULES_KEY = 'captureRules';
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
        maxRequests: this.MAX_REQUESTS,
        captureStaticResources: false // 默认不捕获静态资源
      };
      return config;
    } catch (error) {
      console.error('Failed to get config:', error);
      return {
        urlPatterns: ['*://*/*'],
        enabled: false,
        autoStart: false,
        maxRequests: this.MAX_REQUESTS,
        captureStaticResources: false // 默认不捕获静态资源
      };
    }
  }

  /**
   * 通知UI更新
   */
  static notifyUpdate(count) {
    // 更新角标
    const isCapturing = getCapturingStatus();
    updateBadge(isCapturing, count).catch(err => {
      console.error('Failed to update badge in notifyUpdate:', err);
    });
    
    // 发送消息到所有连接的页面
    chrome.runtime.sendMessage({
      type: 'REQUESTS_UPDATED',
      count: count
    }).catch(() => {
      // 忽略错误（可能没有接收者）
    });
  }

  /**
   * 保存捕获规则
   */
  static async saveRules(rules) {
    try {
      await chrome.storage.local.set({
        [this.RULES_KEY]: rules
      });
    } catch (error) {
      console.error('Failed to save capture rules:', error);
    }
  }

  /**
   * 获取捕获规则
   */
  static async getRules() {
    try {
      const result = await chrome.storage.local.get(this.RULES_KEY);
      const rules = result[this.RULES_KEY] || [];
      return rules;
    } catch (error) {
      console.error('Failed to get capture rules:', error);
      return [];
    }
  }

  /**
   * 添加捕获规则
   */
  static async addRule(rule, insertAtBeginning = false) {
    try {
      const rules = await this.getRules();
      if (insertAtBeginning) {
        rules.unshift(rule); // 插入到最前面，优先级最高
      } else {
        rules.push(rule); // 添加到最后
      }
      await this.saveRules(rules);
    } catch (error) {
      console.error('Failed to add rule:', error);
    }
  }

  /**
   * 更新捕获规则
   */
  static async updateRule(ruleId, updatedRule) {
    try {
      const rules = await this.getRules();
      const index = rules.findIndex(r => r.id === ruleId);
      if (index !== -1) {
        rules[index] = updatedRule;
        await this.saveRules(rules);
      }
    } catch (error) {
      console.error('Failed to update rule:', error);
    }
  }

  /**
   * 删除捕获规则
   */
  static async deleteRule(ruleId) {
    try {
      const rules = await this.getRules();
      const filtered = rules.filter(r => r.id !== ruleId);
      await this.saveRules(filtered);
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  }

  /**
   * 重新排序规则
   */
  static async reorderRules(rules) {
    try {
      await this.saveRules(rules);
    } catch (error) {
      console.error('Failed to reorder rules:', error);
    }
  }
}
