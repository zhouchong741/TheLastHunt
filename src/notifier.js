const axios = require('axios');
const logger = require('./logger');

const DEFAULT_FEISHU_WEBHOOK = 'https://open.feishu.cn/open-apis/bot/v2/hook/e6938e11-3931-4c18-94b1-3658335c5f92';

class FeishuNotifier {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl || DEFAULT_FEISHU_WEBHOOK;
  }

  buildCardMessage({ title, template, tagText, tagColor, markdownLines, url }) {
    const elements = [
      { tag: 'markdown', content: markdownLines.join('\n') }
    ];
    if (url) {
      elements.push({ tag: 'hr' });
      elements.push({
        tag: 'button',
        text: { tag: 'plain_text', content: '点击查看' },
        type: 'primary',
        behaviors: [{ type: 'open_url', default_url: url }]
      });
    }
    return {
      msg_type: 'interactive',
      card: {
        schema: '2.0',
        config: { wide_screen_mode: true },
        header: {
          title: { tag: 'plain_text', content: title },
          template,
          text_tag_list: [
            {
              tag: 'text_tag',
              text: { tag: 'plain_text', content: tagText },
              color: tagColor
            }
          ]
        },
        body: { elements }
      }
    };
  }

  formatCard(urlData) {
    const { url, name, oldCount, newCount, timestamp } = urlData;
    const diff = newCount - oldCount;
    const diffStr = diff > 0 ? `+${diff}` : `${diff}`;

    const template = 'purple';
    const tagColor = 'purple';
    let fontColor = 'grey';
    if (diff > 0) {
      fontColor = 'green';
    } else if (diff < 0) {
      fontColor = 'red';
    }

    return this.buildCardMessage({
      title: `${name} 产品数量变化通知`,
      template,
      tagText: 'TLH',
      tagColor,
      markdownLines: [
        `**时间**：${timestamp}`,
        `**变化**：${oldCount} -> ${newCount} <font color='${fontColor}'>(${diffStr})</font>`
      ],
      url
    });
  }

  formatErrorCard(url, error) {
    const errTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    return this.buildCardMessage({
      title: '监控错误通知',
      template: 'red',
      tagText: '异常',
      tagColor: 'red',
      markdownLines: [
        `**监控网址：** ${url}`,
        `**错误时间：** ${errTime}`,
        '**错误信息：**',
        '```',
        error.message,
        '```',
        '请检查系统状态并手动验证网址是否正常访问。'
      ],
      url
    });
  }

  async sendNotification(urlData) {
    try {
      const payload = this.formatCard(urlData);
      const response = await axios.post(this.webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      const resData = response.data || {};
      if (resData.code === 0 || resData.StatusCode === 0) {
        logger.info(`Feishu notification sent successfully for ${urlData.url}`);
        return true;
      }
      logger.error(`Failed to send Feishu notification: ${resData.msg || resData.StatusMessage || JSON.stringify(resData)}`);
      return false;
    } catch (error) {
      logger.error(`Error sending Feishu notification: ${error.message}`);
      return false;
    }
  }

  async sendTestNotification() {
    const testData = {
      url: 'https://example.com/test',
      name: '测试网址',
      oldCount: 100,
      newCount: 105,
      timestamp: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    };
    logger.info('Sending test notification...');
    return await this.sendNotification(testData);
  }

  async sendErrorNotification(url, error) {
    try {
      const payload = this.formatErrorCard(url, error);
      const response = await axios.post(this.webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      const resData = response.data || {};
      if (resData.code === 0 || resData.StatusCode === 0) {
        logger.info(`Feishu error notification sent successfully for ${url}`);
        return true;
      }
      logger.error(`Failed to send Feishu error notification: ${resData.msg || resData.StatusMessage || JSON.stringify(resData)}`);
      return false;
    } catch (notificationError) {
      logger.error(`Error sending Feishu error notification: ${notificationError.message}`);
      return false;
    }
  }
}

module.exports = FeishuNotifier;
