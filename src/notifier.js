const axios = require('axios');
const logger = require('./logger');

class DingTalkNotifier {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  async sendNotification(urlData) {
    try {
      const message = this.formatMessage(urlData);

      const response = await axios.post(this.webhookUrl, {
        msgtype: 'markdown',
        markdown: {
          title: `产品数量更新`,
          text: message
        }
      });

      if (response.data.errcode === 0) {
        logger.info(`Notification sent successfully for ${urlData.url}`);
        return true;
      } else {
        logger.error(`Failed to send notification: ${response.data.errmsg}`);
        return false;
      }
    } catch (error) {
      logger.error(`Error sending notification: ${error.message}`);
      return false;
    }
  }

  formatMessage(urlData) {
    const { url, name, oldCount, newCount, timestamp, discountStats } = urlData;
    const changeType = newCount > oldCount ? '+' : '-';
    const changeAmount = Math.abs(newCount - oldCount);
    
    let message = `### ${name} 产品数量变化通知
> **时间**：${timestamp}  
> **之前**：${oldCount} 现在：${newCount}  
> **变化**：(${changeType} ${changeAmount})  
`;

    if (discountStats && discountStats.discountOver50Count !== undefined) {
      message += `> **🔥 5折以上**：${discountStats.discountOver50Count}款  \n`;
    }

    message += `> [点击查看](${url})`;
    return message;
  }

  async sendTestNotification() {
    const testData = {
      url: 'https://example.com/test',
      name: '测试网址',
      oldCount: 100,
      newCount: 105,
      // 时间时区不对 差8小时 设置时区为东8区
      timestamp: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    };

    logger.info('Sending test notification...');
    return await this.sendNotification(testData);
  }

  async sendErrorNotification(url, error) {
    try {
      const message = `## ❌ 监控错误通知

**监控网址：** ${url}  
**错误时间：** ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}  

**错误信息：**
\`\`\`
${error.message}
\`\`\`

请检查系统状态并手动验证网址是否正常访问。

---
*本通知由自动化监控系统发送* ⚠️`;

      const response = await axios.post(this.webhookUrl, {
        msgtype: 'markdown',
        markdown: {
          title: '监控错误通知',
          text: message
        }
      });

      if (response.data.errcode === 0) {
        logger.info(`Error notification sent successfully for ${url}`);
        return true;
      } else {
        logger.error(`Failed to send error notification: ${response.data.errmsg}`);
        return false;
      }
    } catch (notificationError) {
      logger.error(`Error sending error notification: ${notificationError.message}`);
      return false;
    }
  }
}

module.exports = DingTalkNotifier;