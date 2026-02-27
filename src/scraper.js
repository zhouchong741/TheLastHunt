const axios = require('axios');
const cheerio = require('cheerio');
const xpath = require('xpath');
const { DOMParser } = require('xmldom');
const logger = require('./logger');

class WebScraper {
  constructor(config) {
    this.config = config;
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  async scrapeProductCount(urlInfo, maxRetries = 3, retryDelay = 5000) {
    const { url, xpath: xpathQuery } = urlInfo;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Attempting to scrape URL: ${url} (Attempt ${attempt}/${maxRetries})`);

        const response = await axios.get(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          },
          timeout: 30000
        });

        // Try to extract from Next.js data first (more reliable for this site)
        const nextDataCount = this.extractFromNextData(response.data);
        if (nextDataCount > 0) {
          return nextDataCount;
        }

        if (xpathQuery) {
          return this.extractWithXPath(response.data, xpathQuery);
        } else {
          return this.extractWithCheerio(response.data);
        }

      } catch (error) {
        lastError = error;
        logger.error(`Error scraping ${url} on attempt ${attempt}: ${error.message}`);

        if (attempt < maxRetries) {
          logger.info(`Retrying in ${retryDelay / 1000} seconds...`);
          await this.sleep(retryDelay);
        }
      }
    }

    logger.error(`Failed to scrape ${url} after ${maxRetries} attempts: ${lastError.message}`);
    return 0; // 返回0表示获取失败
  }

  extractFromNextData(html) {
    try {
      const $ = cheerio.load(html);
      let jsonData = null;

      // Find the script containing Next.js props
      $('script').each((i, el) => {
        const content = $(el).html();
        if (content && content.includes('{"props":')) {
          const startIndex = content.indexOf('{"props":');
          const jsonStr = content.substring(startIndex);
          try {
            jsonData = JSON.parse(jsonStr);
            return false; // break loop
          } catch (e) {
            // ignore parsing errors
          }
        }
      });

      if (jsonData && jsonData.props && jsonData.props.pageProps && jsonData.props.pageProps.serverState) {
        const serverState = jsonData.props.pageProps.serverState;
        if (serverState.initialResults) {
          const results = serverState.initialResults;
          // Find the key that corresponds to PRODUCTS
          // Keys look like "PRODUCTS_TLH_en-CA" or similar
          const productKey = Object.keys(results).find(key => key.includes('PRODUCTS'));

          if (productKey && results[productKey]) {
            const resultData = results[productKey];
            // If resultData is an object with nbHits directly
            if (resultData.nbHits !== undefined) {
              logger.info(`Found product count from Next.js data: ${resultData.nbHits}`);
              return resultData.nbHits;
            }
            // If resultData has 'results' array (sometimes Algolia returns multiple queries)
            if (resultData.results && Array.isArray(resultData.results) && resultData.results.length > 0) {
              const hits = resultData.results[0].nbHits;
              if (hits !== undefined) {
                logger.info(`Found product count from Next.js data (nested): ${hits}`);
                return hits;
              }
            }
          }
        }
      }

      return 0;
    } catch (error) {
      logger.error(`Error extracting from Next.js data: ${error.message}`);
      return 0;
    }
  }

  extractWithXPath(html, query) {
    try {
      const doc = new DOMParser({ errorHandler: { warning: null, error: null } }).parseFromString(html);
      const nodes = xpath.select(query, doc);

      if (nodes && nodes.length > 0) {
        const rawText = (nodes[0].textContent || '').trim();
        const productCount = this.parseProductCount(rawText);
        logger.info(`Found product count using XPath: ${productCount}`);
        return productCount;
      } else {
        logger.warn(`XPath query "${query}" returned no results.`);
        return 0;
      }
    } catch (error) {
      logger.error(`Error during XPath extraction: ${error.message}`);
      return 0;
    }
  }

  extractWithCheerio(html) {
    const $ = cheerio.load(html);
    let productCount = 0;

    // Try to find the count in h1 (common for search results)
    $('h1').each((i, el) => {
      const text = $(el).text().trim();
      const count = this.parseProductCount(text);
      if (count > 0) {
        productCount = count;
        return false; // break loop
      }
    });

    // Fallback: search for text containing "results" or "products"
    if (productCount === 0) {
      $('span, div, p').each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('results') || text.includes('products')) {
          const count = this.parseProductCount(text);
          if (count > 0) {
            productCount = count;
            return false;
          }
        }
      });
    }

    logger.info(`Successfully scraped with Cheerio - Product count: ${productCount}`);
    return productCount;
  }

  parseProductCount(text) {
    if (!text) return 0;
    // Match numbers in parentheses like (24) or just numbers like "24 results"
    const match = text.replace(/[()]/g, '').match(/(\d+)/);
    return match ? parseInt(match[0], 10) : 0;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = WebScraper;