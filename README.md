# The Last Hunt 产品监控系统

一个自动化监控 The Last Hunt 网站产品数量变化的系统，支持钉钉通知功能。

## 功能特性

- 🔍 **自动监控**: 每隔10分钟自动访问指定网址，解析产品数量
- 📊 **数据存储**: 为每个监控网址创建独立的JSON文件存储数据
- 🔔 **智能通知**: 仅当产品数量发生变化时发送钉钉通知
- 🔄 **异常处理**: 网络请求失败时自动重试3次
- 📋 **完整日志**: 记录所有操作和错误信息
- 🛠️ **手动控制**: 支持手动刷新和测试通知功能
- ⚙️ **配置灵活**: 通过配置文件管理监控网址，易于扩展

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置监控网址

编辑 `config.json` 文件，添加或修改监控网址：

```json
{
  "monitoring_urls": [
    {
      "name": "Patagonia Products",
      "url": "https://www.thelasthunt.com/search?query=patagonia"
    },
    {
      "name": "Icebreaker Products", 
      "url": "https://www.thelasthunt.com/search?query=icebreaker"
    }
  ],
  "monitoring_interval_minutes": 10,
  "max_retries": 3,
  "retry_delay_seconds": 5,
  "dingtalk_webhook": "https://oapi.dingtalk.com/robot/send?access_token=YOUR_ACCESS_TOKEN"
}
```

### 3. 运行系统测试

```bash
npm run test
```

### 4. 启动监控

```bash
npm start
```

## 可用命令

- `npm start` - 启动监控系统
- `npm run dev` - 开发模式启动（同start）
- `npm run test` - 运行系统测试
- `npm run refresh` - 手动刷新所有监控网址

## 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Scraper   │───▶│  Data Storage   │───▶│ DingTalk Notify │
│   (爬虫模块)     │    │   (数据存储)     │    │   (钉钉通知)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Monitor Manager│    │   JSON Files    │    │   DingTalk App  │
│   (监控管理器)   │    │   (数据文件)    │    │   (钉钉应用)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 数据文件格式

每个监控网址对应一个JSON文件，文件名是网址的MD5哈希值：

```json
{
  "timestamp": "2024-01-15 14:30:25",
  "product_count": 123,
  "url": "https://www.thelasthunt.com/search?query=patagonia"
}
```

## 通知格式

当产品数量发生变化时，系统会发送如下格式的钉钉通知：

---

## 🚨 产品数量变化通知

**监控网址：** Patagonia Products  
**URL：** https://www.thelasthunt.com/search?query=patagonia  

**变更详情：**
- 变更前数量：100
- 变更后数量：105
- 变化类型：增加 5
- 变更时间：2024-01-15 14:30:25

**当前状态：**
- ✅ 最新产品数量：105

---
*本通知由自动化监控系统发送* 📊

## 扩展功能

### 添加新的监控网址

只需在 `config.json` 中添加新的网址配置：

```json
{
  "name": "New Brand Products",
  "url": "https://www.thelasthunt.com/search?query=newbrand"
}
```

### 调整监控频率

修改 `config.json` 中的 `monitoring_interval_minutes` 参数：

```json
"monitoring_interval_minutes": 5  // 每5分钟检查一次
```

### 自定义重试设置

```json
"max_retries": 5,           // 最多重试5次
"retry_delay_seconds": 10   // 重试间隔10秒
```

## 日志文件

系统会生成以下日志文件：

- `logs/combined.log` - 所有日志信息
- `logs/error.log` - 仅错误日志

## 故障排除

### 常见问题

1. **网络请求失败**
   - 检查网络连接
   - 验证目标网址是否可访问
   - 查看重试机制是否生效

2. **钉钉通知未收到**
   - 检查webhook地址是否正确
   - 验证钉钉机器人配置
   - 查看日志中的通知发送记录

3. **数据文件未生成**
   - 检查数据目录权限
   - 验证磁盘空间
   - 查看日志中的存储操作记录

### 调试模式

查看详细日志：
```bash
tail -f logs/combined.log
```

## 系统要求

- Node.js >= 14.0.0
- npm >= 6.0.0
- 网络连接（用于访问目标网站和发送通知）

## 许可证

MIT License