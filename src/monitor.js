const WebScraper = require('./scraper');
const DataStorage = require('./storage');
const DingTalkNotifier = require('./notifier');
const logger = require('./logger');

class MonitorManager {
  constructor(config) {
    this.config = config;
    this.scraper = new WebScraper(config);
    this.storage = new DataStorage(config.data_directory);
    this.notifier = new DingTalkNotifier(config.dingtalk_webhook);
    this.isMonitoring = false;
    this.monitoringTasks = new Map();
  }

  async monitorUrl(urlInfo) {
    const { url, name } = urlInfo;
    const startTime = Date.now();
    
    try {
      logger.info(`Starting monitoring for: ${name} (${url})`);
      
      // 获取当前产品数量
      const currentCount = await this.scraper.scrapeProductCount(
        urlInfo, // 传递完整的urlInfo对象
        this.config.max_retries,
        this.config.retry_delay_seconds * 1000
      );
      
      // 获取之前的数据
      const previousData = await this.storage.loadData(url);
      const previousCount = previousData ? previousData.product_count : 0;
      
      // 保存新数据
      const newData = await this.storage.saveData(url, currentCount);
      
      // 检查是否有变化
      if (previousData && currentCount !== previousCount) {
        logger.info(`Product count changed for ${name}: ${previousCount} -> ${currentCount}`);
        
        // 发送通知
        const notificationData = {
          url,
          name,
          oldCount: previousCount,
          newCount: currentCount,
          timestamp: newData.timestamp
        };
        
        await this.notifier.sendNotification(notificationData);
      } else if (!previousData) {
        logger.info(`Initial data collected for ${name}: ${currentCount} products`);
      } else {
        logger.info(`No change detected for ${name}: ${currentCount} products`);
      }
      
      const duration = Date.now() - startTime;
      logger.info(`Completed monitoring for ${name} in ${duration}ms`);
      
      return {
        success: true,
        url,
        name,
        previousCount,
        currentCount,
        changed: currentCount !== previousCount,
        duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Error monitoring ${name} (${url}): ${error.message}`);
      
      // 发送错误通知
      await this.notifier.sendErrorNotification(url, error);
      
      return {
        success: false,
        url,
        name,
        error: error.message,
        duration
      };
    }
  }

  async monitorAllUrls() {
    logger.info('Starting monitoring cycle for all URLs');
    const results = [];
    
    // 并行监控所有URL
    const promises = this.config.monitoring_urls.map(urlInfo => 
      this.monitorUrl(urlInfo)
    );
    
    const monitorResults = await Promise.allSettled(promises);
    
    for (const result of monitorResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        logger.error(`Monitoring task failed: ${result.reason}`);
        results.push({
          success: false,
          error: result.reason.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    logger.info(`Monitoring cycle completed: ${successCount}/${totalCount} URLs monitored successfully`);
    return results;
  }

  startMonitoring() {
    if (this.isMonitoring) {
      logger.warn('Monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    logger.info('Starting continuous monitoring');
    
    // 立即执行一次监控
    this.monitorAllUrls();
    
    // 设置定时监控
    const intervalMs = this.config.monitoring_interval_minutes * 60 * 1000;
    const intervalId = setInterval(async () => {
      if (this.isMonitoring) {
        await this.monitorAllUrls();
      } else {
        clearInterval(intervalId);
      }
    }, intervalMs);
    
    this.monitoringTasks.set('main', intervalId);
    
    logger.info(`Monitoring started with ${this.config.monitoring_interval_minutes} minute intervals`);
  }

  stopMonitoring() {
    this.isMonitoring = false;
    
    // 清除所有定时任务
    for (const [taskName, intervalId] of this.monitoringTasks) {
      clearInterval(intervalId);
      logger.info(`Stopped monitoring task: ${taskName}`);
    }
    
    this.monitoringTasks.clear();
    logger.info('All monitoring stopped');
  }

  async manualRefresh() {
    logger.info('Executing manual refresh');
    return await this.monitorAllUrls();
  }

  async testNotification() {
    logger.info('Testing notification system');
    return await this.notifier.sendTestNotification();
  }

  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      monitoringUrls: this.config.monitoring_urls.length,
      intervalMinutes: this.config.monitoring_interval_minutes,
      activeTasks: this.monitoringTasks.size
    };
  }
}

module.exports = MonitorManager;