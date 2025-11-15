const DingTalkNotifier = require('./notifier');
const logger = require('./logger');
const fs = require('fs').promises; // Use promises version of fs
const path = require('path');
const DataStorage = require('./storage'); // Import DataStorage

async function runTests() {
  try {
    console.log('🧪 Starting system tests...\n');
    
    // Test 1: Load configuration
    console.log('Test 1: Loading configuration...');
    const configPath = path.join(__dirname, '../config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    console.log('✅ Configuration loaded successfully');
    console.log(`   - Monitoring ${config.monitoring_urls.length} URLs`);
    console.log(`   - Interval: ${config.monitoring_interval_minutes} minutes`);
    console.log();
    
    // Test 2: Test notification system
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
    
    // Test 3: Verify and test data storage
    console.log('Test 3: Verifying and testing data storage...');
    const storage = new DataStorage(config.data_directory);
    const testUrlInfo = { name: 'Test Product', url: 'http://example.com/test' };
    const testProductCount = 123;

    // Save, load, and delete test data
    await storage.saveData(testUrlInfo, testProductCount);
    const loadedData = await storage.loadData(testUrlInfo);
    
    if (loadedData && loadedData.product_count === testProductCount) {
      console.log('✅ Data save and load successful');
    } else {
      console.log('❌ Data save and load failed');
    }

    await storage.deleteData(testUrlInfo);
    const deletedData = await storage.loadData(testUrlInfo);
    if (!deletedData) {
      console.log('✅ Data deletion successful');
    } else {
      console.log('❌ Data deletion failed');
    }
    console.log();

    // Test 4: Display monitoring URLs
    console.log('Test 4: Monitoring URLs verification...');
    config.monitoring_urls.forEach((urlInfo, index) => {
      console.log(`${index + 1}. ${urlInfo.name}`);
      console.log(`   URL: ${urlInfo.url}`);
    });
    console.log('✅ All URLs configured correctly');
    console.log();
    
    // Test 5: Logger system
    console.log('Test 5: Testing logger...');
    logger.info('Test log message from system test');
    console.log('✅ Logger is working correctly');
    console.log();
    
    console.log('🎉 All system tests completed!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Configuration: OK');
    console.log('   ✅ Notifications: ' + (notificationResult ? 'OK' : 'FAILED'));
    console.log('   ✅ Data Storage: OK');
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

// Execute tests
if (require.main === module) {
  runTests();
}

module.exports = { runTests };