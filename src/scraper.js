const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('./logger');

class WebScraper {
  constructor(config = {}) {
    this.config = config;
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    // Algolia 配置（The Last Hunt 官方只读凭据）
    this.algolia = {
      appId: process.env.ALGOLIA_APP_ID || config.algolia_app_id || '2YG4O6L95L',
      apiKey: process.env.ALGOLIA_API_KEY || config.algolia_api_key || 'e8b31524fd0d708f603240f2bfaec48a',
      indexName: process.env.ALGOLIA_INDEX || config.algolia_index || 'PRODUCTS_TLH_en-CA'
    };
  }

  buildAlgoliaParams(url) {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname;
      const searchParams = parsed.searchParams;

      const filters = [];
      const facetFilters = [];

      // 1. 处理分类路径，如 /c/patagonia 或 /c/all
      const categoryMatch = pathname.match(/\/c\/([^/?#]+)/);
      if (categoryMatch) {
        filters.push(`categories: ${categoryMatch[1]}`);
      }

      // 2. 处理 search?query=...
      const query = searchParams.get('query') || '';

      // 3. 处理品牌筛选 brand_name=icebreaker%2CPatagonia
      const brandParam = searchParams.get('brand_name');
      if (brandParam) {
        const brands = brandParam.split(',').map(b => decodeURIComponent(b).trim()).filter(Boolean);
        if (brands.length > 0) {
          facetFilters.push(brands.map(b => `attributes.brand_name: ${b}`));
        }
      }

      // 4. 处理尺码筛选 size_1=S%2CM%2CL
      const sizeParam = searchParams.get('size_1');
      if (sizeParam) {
        const sizes = sizeParam.split(',').map(s => decodeURIComponent(s).trim()).filter(Boolean);
        if (sizes.length > 0) {
          facetFilters.push(sizes.map(s => `attributes.size_1: ${s}`));
        }
      }

      // 5. 处理折扣率 discounted_percent=50%3A 或 50:
      const discountParam = searchParams.get('discounted_percent');
      if (discountParam) {
        const discMatch = discountParam.match(/(\d+)/);
        if (discMatch) {
          filters.push(`discounted_percent>=${discMatch[1]}`);
        }
      }

      const params = new URLSearchParams({
        hitsPerPage: '0',
        analytics: 'false',
        clickAnalytics: 'false'
      });

      if (query) {
        params.set('query', query);
      }
      if (filters.length > 0) {
        params.set('filters', filters.join(' AND '));
      }
      if (facetFilters.length > 0) {
        params.set('facetFilters', JSON.stringify(facetFilters));
      }

      return params.toString();
    } catch (e) {
      logger.warn(`Failed to parse Algolia params from URL ${url}: ${e.message}`);
      return null;
    }
  }

  async scrapeWithAlgolia(url) {
    const params = this.buildAlgoliaParams(url);
    if (!params) {
      throw new Error(`Cannot construct Algolia query for ${url}`);
    }

    const endpoint = `https://${this.algolia.appId.toLowerCase()}-dsn.algolia.net/1/indexes/*/queries`;
    const response = await axios.post(
      endpoint,
      {
        requests: [
          {
            indexName: this.algolia.indexName,
            params: params
          }
        ]
      },
      {
        headers: {
          'X-Algolia-Application-Id': this.algolia.appId,
          'X-Algolia-API-Key': this.algolia.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const result = response.data?.results?.[0];
    if (result && typeof result.nbHits === 'number') {
      logger.info(`[Algolia] Found product count for ${url}: ${result.nbHits}`);
      return result.nbHits;
    }

    throw new Error('Algolia did not return a valid nbHits count');
  }

  async scrapeProductCount(urlInfo, maxRetries = 3, retryDelay = 5000) {
    const { url } = urlInfo;

    // 优先尝试 Algolia API 极速查询
    try {
      return await this.scrapeWithAlgolia(url);
    } catch (algoliaError) {
      logger.warn(`Algolia direct query failed for ${url}: ${algoliaError.message}; falling back to HTML fetch...`);
    }

    // Algolia 失败时的备用兜底逻辑：抓取网页并解析 Next.js 数据
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`[Fallback HTML] Scraping URL: ${url} (Attempt ${attempt}/${maxRetries})`);

        const response = await axios.get(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
          },
          timeout: 30000
        });

        const nextDataCount = this.extractFromNextData(response.data);
        if (typeof nextDataCount === 'number' && nextDataCount >= 0) {
          return nextDataCount;
        }

        const cheerioCount = this.extractWithCheerio(response.data);
        return cheerioCount;
      } catch (error) {
        lastError = error;
        logger.error(`Error scraping ${url} on attempt ${attempt}: ${error.message}`);
        if (attempt < maxRetries) {
          await this.sleep(retryDelay);
        }
      }
    }

    logger.error(`Failed to scrape ${url} after ${maxRetries} attempts: ${lastError.message}`);
    throw lastError;
  }

  extractFromNextData(html) {
    try {
      const idx = html.indexOf('{"props":');
      if (idx === -1) return null;
      const endIdx = html.indexOf('</script>', idx);
      if (endIdx === -1) return null;

      const data = JSON.parse(html.substring(idx, endIdx));
      const initResults = data?.props?.pageProps?.serverState?.initialResults || {};
      const productKey = Object.keys(initResults).find(k => k.includes('PRODUCTS'));
      if (productKey && initResults[productKey]) {
        const prod = initResults[productKey];
        if (typeof prod.nbHits === 'number') return prod.nbHits;
        if (Array.isArray(prod.results) && prod.results[0] && typeof prod.results[0].nbHits === 'number') {
          return prod.results[0].nbHits;
        }
      }
      return null;
    } catch (e) {
      logger.warn(`Next.js JSON parse failed: ${e.message}`);
      return null;
    }
  }

  extractWithCheerio(html) {
    const $ = cheerio.load(html);
    let count = 0;
    $('h1, span, div, p').each((_, el) => {
      const text = $(el).text().trim();
      if (/(\d+)\s*(results?|products?)/i.test(text)) {
        const match = text.match(/(\d+)/);
        if (match) {
          count = parseInt(match[1], 10);
          return false;
        }
      }
    });
    return count;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = WebScraper;
