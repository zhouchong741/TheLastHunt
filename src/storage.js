const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');

class DataStorage {
  constructor(dataDirectory) {
    this.dataDirectory = dataDirectory;
    this.ensureDataDirectory();
  }

  async ensureDataDirectory() {
    try {
      await fs.access(this.dataDirectory);
    } catch {
      await fs.mkdir(this.dataDirectory, { recursive: true });
      logger.info(`Created data directory: ${this.dataDirectory}`);
    }
  }

  generateFileName(name) {
    // Sanitize the name to be used as a filename
    const sanitizedName = name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
    return `${sanitizedName}.json`;
  }

  async saveData(urlInfo, productCount) {
    const { name, url } = urlInfo;
    const fileName = this.generateFileName(name);
    const filePath = path.join(this.dataDirectory, fileName);
    const tempFilePath = filePath + '.tmp';

    try {
      const data = {
        timestamp: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
        product_count: productCount,
        url: url,
        name: name
      };

      await fs.writeFile(tempFilePath, JSON.stringify(data, null, 2), 'utf8');
      await fs.rename(tempFilePath, filePath);

      logger.info(`Saved data to ${filePath}: ${JSON.stringify(data)}`);
      return data;
    } catch (error) {
      logger.error(`Error saving data for ${url}: ${error.message}`);
      // Attempt to clean up the temporary file if an error occurs
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') {
          logger.warn(`Failed to clean up temporary file ${tempFilePath}: ${cleanupError.message}`);
        }
      }
      throw error;
    }
  }

  async loadData(urlInfo) {
    const { name, url } = urlInfo;
    try {
      const fileName = this.generateFileName(name);
      const filePath = path.join(this.dataDirectory, fileName);

      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info(`No existing data found for ${url}`);
        return null;
      }
      logger.error(`Error loading data for ${url}: ${error.message}`);
      return null;
    }
  }

  async getAllDataFiles() {
    try {
      const files = await fs.readdir(this.dataDirectory);
      return files.filter(file => file.endsWith('.json'));
    } catch (error) {
      logger.error(`Error reading data directory: ${error.message}`);
      return [];
    }
  }

  async loadAllData() {
    const dataFiles = await this.getAllDataFiles();
    const allData = {};

    for (const file of dataFiles) {
      try {
        const filePath = path.join(this.dataDirectory, file);
        const data = await fs.readFile(filePath, 'utf8');
        const parsedData = JSON.parse(data);
        allData[parsedData.url] = parsedData;
      } catch (error) {
        logger.error(`Error reading data file ${file}: ${error.message}`);
      }
    }

    return allData;
  }

  async deleteData(urlInfo) {
    const { name, url } = urlInfo;
    try {
      const fileName = this.generateFileName(name);
      const filePath = path.join(this.dataDirectory, fileName);
      await fs.unlink(filePath);
      logger.info(`Deleted data file for ${url}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error(`Error deleting data for ${url}: ${error.message}`);
      }
    }
  }
}

module.exports = DataStorage;