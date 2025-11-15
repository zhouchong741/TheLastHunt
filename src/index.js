const fs = require('fs');
const path = require('path');
const MonitorManager = require('./monitor');
const logger = require('./logger');

class TheLastHuntMonitor {
  constructor() {
    this.config = null;
    this.monitorManager = null;
    this.loadConfig();
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, '../config.json');
      this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      logger.info('Configuration loaded successfully');
    } catch (error) {
      logger.error(`Failed to load configuration: ${error.message}`);
      process.exit(1);
    }
  }

  async start() {
    try {
      logger.info('🚀 Starting The Last Hunt Monitor System');
      
      // 创建监控管理器
      this.monitorManager = new MonitorManager(this.config);
      
      // 启动监控
      this.monitorManager.startMonitoring();
      
      // 设置进程信号处理
      this.setupSignalHandlers();
      
      logger.info('✅ Monitor system started successfully');
      logger.info(`📊 Monitoring ${this.config.monitoring_urls.length} URLs every ${this.config.monitoring_interval_minutes} minutes`);
      
      // 显示状态
      this.displayStatus();
      
    } catch (error) {
      logger.error(`Failed to start monitor system: ${error.message}`);
      process.exit(1);
    }
  }

  setupSignalHandlers() {
    // 优雅关闭
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      this.shutdown();
    });

    // 未捕获异常处理
    process.on('uncaughtException', (error) => {
      logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
      this.shutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
      this.shutdown();
    });
  }

  shutdown() {
    logger.info('🛑 Shutting down monitor system...');
    
    if (this.monitorManager) {
      this.monitorManager.stopMonitoring();
    }
    
    logger.info('✅ Monitor system stopped');
    process.exit(0);
  }

  displayStatus() {
    const status = this.monitorManager.getStatus();
    
    console.log('\n' + '='.repeat(50));
    console.log('📈 THE LAST HUNT MONITOR STATUS');
    console.log('='.repeat(50));
    console.log(`🔄 Monitoring Status: ${status.isMonitoring ? 'Active' : 'Inactive'}`);
    console.log(`🌐 URLs to Monitor: ${status.monitoringUrls}`);
    console.log(`⏰ Check Interval: ${status.intervalMinutes} minutes`);
    console.log(`📋 Active Tasks: ${status.activeTasks}`);
    console.log('='.repeat(50));
    
    console.log('\n🎯 Monitoring URLs:');
    this.config.monitoring_urls.forEach((urlInfo, index) => {
      console.log(`  ${index + 1}. ${urlInfo.name}`);
      console.log(`     ${urlInfo.url}`);
    });
    
    console.log('\n📋 Available Commands:');
    console.log('  • Ctrl+C: Graceful shutdown');
    console.log('  • View logs: tail -f logs/combined.log');
    console.log('  • Manual refresh: npm run refresh');
    console.log('  • Test notification: npm run test');
    console.log('='.repeat(50) + '\n');
  }
}

// 启动监控
if (require.main === module) {
  const monitor = new TheLastHuntMonitor();
  monitor.start();
}

module.exports = TheLastHuntMonitor;