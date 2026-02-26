const fs = require('fs');
const path = require('path');
const MonitorManager = require('./monitor');
const logger = require('./logger');

async function manualRefresh() {
  try {
    logger.info('🔄 Executing manual refresh...');
    
    // 加载配置
    const configPath = path.join(__dirname, '../config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // 创建监控管理器
    const monitorManager = new MonitorManager(config);
    
    // 执行手动刷新
    const results = await monitorManager.manualRefresh();
    
    // 显示结果
    console.log('\n' + '='.repeat(60));
    console.log('🔄 MANUAL REFRESH RESULTS');
    console.log('='.repeat(60));
    
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.name || 'Unknown'}`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
      
      if (result.success) {
        console.log(`   Previous Count: ${result.previousCount}`);
        console.log(`   Current Count: ${result.currentCount}`);
        console.log(`   Discount > 50%: ${result.discountStats ? result.discountStats.discountOver50Count : 'N/A'}`);
        console.log(`   Changed: ${result.changed ? '✅ Yes' : '❌ No'}`);
        console.log(`   Duration: ${result.duration}ms`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    const changedCount = results.filter(r => r.success && r.changed).length;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total URLs: ${totalCount}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${totalCount - successCount}`);
    console.log(`Changed: ${changedCount}`);
    console.log('='.repeat(60));
    
    logger.info(`Manual refresh completed: ${successCount}/${totalCount} URLs refreshed successfully`);
    
  } catch (error) {
    logger.error(`Manual refresh failed: ${error.message}`);
    console.error('❌ Manual refresh failed:', error.message);
    process.exit(1);
  }
}

// 执行手动刷新
if (require.main === module) {
  manualRefresh();
}

module.exports = { manualRefresh };