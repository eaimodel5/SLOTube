import * as cheerio from 'cheerio';
fetch('https://html.duckduckgo.com/html/?q=wiskunde+onderwijs', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } })
  .then(res => res.text())
  .then(html => {
     const $ = cheerio.load(html);
     const results = [];
     $('.result').each((i, el) => {
        const title = $(el).find('.result__title').text().trim();
        const snippet = $(el).find('.result__snippet').text().trim();
        let url = $(el).find('.result__a').attr('href');
        if (url && url.startsWith('//')) url = 'https:' + url;
        if(title) results.push({title, snippet, url});
     });
     console.log(results.slice(0, 3));
  })
  .catch(console.error);
