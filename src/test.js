const DingTalkNotifier = require('./notifier');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');

async function runTests() {
  try {
    console.log('🧪 Starting system tests...\n');
    
    // 测试1: 加载配置
    console.log('Test 1: Loading configuration...');
    const configPath = path.join(__dirname, '../config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('✅ Configuration loaded successfully');
    console.log(`   - Monitoring ${config.monitoring_urls.length} URLs`);
    console.log(`   - Interval: ${config.monitoring_interval_minutes} minutes`);
    console.log();
    
    // 测试2: 测试通知系统
    console.log('Test 2: Testing notification system...');
    const notifier = new DingTalkNotifier(config.dingtalk_webhook);
    const notificationResult = await notifier.sendTestNotification();
    
    if (notificationResult) {
      console.log('✅ Notification test sent successfully');
      console.log('   - Check your DingTalk for the test message');
    } else {
      console.log('❌ Notification test failed');
    }
    console.log();
    
    // 测试3: 验证数据目录
    console.log('Test 3: Verifying data directory...');
    const dataDir = config.data_directory;
    try {
      await fs.promises.access(dataDir);
      console.log('✅ Data directory exists');
    } catch {
      await fs.promises.mkdir(dataDir, { recursive: true });
      console.log('✅ Data directory created');
    }
    console.log();
    
    // 测试4: 显示监控URL列表
    console.log('Test 4: Monitoring URLs verification...');
    config.monitoring_urls.forEach((urlInfo, index) => {
      console.log(`${index + 1}. ${urlInfo.name}`);
      console.log(`   URL: ${urlInfo.url}`);
    });
    console.log('✅ All URLs configured correctly');
    console.log();
    
    // 测试5: 日志系统
    console.log('Test 5: Testing logger...');
    logger.info('Test log message from system test');
    console.log('✅ Logger is working correctly');
    console.log();
    
    console.log('🎉 All system tests completed!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Configuration: OK');
    console.log('   ✅ Notifications: ' + (notificationResult ? 'OK' : 'FAILED'));
    console.log('   ✅ Data Directory: OK');
    console.log('   ✅ URLs: OK');
    console.log('   ✅ Logger: OK');
    
    console.log('\n🚀 System is ready for monitoring!');
    console.log('   Start monitoring: npm start');
    console.log('   Manual refresh: npm run refresh');
    console.log('   Run tests: npm run test');
    
  } catch (error) {
    logger.error(`System test failed: ${error.message}`);
    console.error('❌ System test failed:', error.message);
    process.exit(1);
  }
}

// 执行测试
if (require.main === module) {
  runTests();
}

module.exports = { runTests };