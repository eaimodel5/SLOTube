import { SearchProvider, SearchGatewayParams, SearchResultCandidate } from "../searchTypes";
import { canonicalizeUrl } from "../../media/urlUtils";

export const legacyDuckDuckGoProvider: SearchProvider = {
  name: "duckduckgo",
  async search(params: SearchGatewayParams): Promise<SearchResultCandidate[]> {
    let siteOp = undefined;
    if (params.includeDomains && params.includeDomains.length === 1) {
      siteOp = params.includeDomains[0];
    } else if (params.includeDomains && params.includeDomains.length > 1) {
      siteOp = params.includeDomains.join(" OR site:");
    }

    const fullQuery = siteOp ? `site:${siteOp} ${params.query}` : params.query;
    
    try {
      const ddgRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(fullQuery)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
      });

      if (!ddgRes.ok) return [];

      const html = await ddgRes.text();
      const cheerio = await import('cheerio');
      const $ = cheerio.load(html);
      const results: SearchResultCandidate[] = [];

      $('.result').slice(0, params.limit || 5).each((i, el) => {
        const title = $(el).find('.result__title').text().trim();
        const snippet = $(el).find('.result__snippet').text().trim();
        let url = $(el).find('.result__url').attr('href');

        if (title && url && !url.includes('duckduckgo.com/y.js')) {
          if (url.startsWith('//')) url = 'https:' + url;
          
          if (url.includes('uddg=')) {
            const match = url.match(/uddg=([^&]+)/);
            if (match) url = decodeURIComponent(match[1]);
          }

          results.push({
            title,
            url,
            canonicalUrl: canonicalizeUrl(url),
            snippet,
            sourceId: "duckduckgo_web",
            sourceName: new URL(url).hostname || "Web",
            providerTrace: "duckduckgo"
          });
        }
      });

      return results;
    } catch (e) {
      console.error(`DDG Web search failed:`, e);
      return [];
    }
  }
};
