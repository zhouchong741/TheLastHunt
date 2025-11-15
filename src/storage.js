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

  generateFileName(url) {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    return `${hash}.json`;
  }

  async saveData(url, productCount) {
    try {
      const fileName = this.generateFileName(url);
      const filePath = path.join(this.dataDirectory, fileName);
      
      const data = {
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        product_count: productCount,
        url: url
      };

      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      logger.info(`Saved data to ${filePath}: ${JSON.stringify(data)}`);
      return data;
    } catch (error) {
      logger.error(`Error saving data for ${url}: ${error.message}`);
      throw error;
    }
  }

  async loadData(url) {
    try {
      const fileName = this.generateFileName(url);
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

  async deleteData(url) {
    try {
      const fileName = this.generateFileName(url);
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