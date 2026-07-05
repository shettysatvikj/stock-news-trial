const Parser = require('rss-parser');
const Groq = require('groq-sdk');
const fs = require('fs');
require('dotenv').config();

const parser = new Parser();

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const groq = new Groq({ apiKey: GROQ_API_KEY });

const FEEDS = [
  { name: 'Economic Times', url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms' },
  { name: 'LiveMint', url: 'https://www.livemint.com/rss/markets' },
];

const ITEMS_PER_FEED = 3;

async function rewriteHeadline(title, description) {
  const prompt = `Rewrite this stock market news item in simple, plain language for a beginner retail investor with no finance background. Explain the key facts and why it matters, in 4-5 sentences. Do not add information that isn't in the original.

Title: ${title}
Description: ${description}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
  });

  return response.choices[0].message.content;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAllNews() {
  const posts = [];

  for (const source of FEEDS) {
    console.log(`\n=== Fetching from ${source.name} ===`);

    try {
      const feed = await parser.parseURL(source.url);
      const items = feed.items.slice(0, ITEMS_PER_FEED);

      for (const item of items) {
        console.log(`Processing: ${item.title}`);

        try {
          const fullDescription = item.content || item.contentSnippet || '';
          const simplified = await rewriteHeadline(item.title, fullDescription);

          posts.push({
            source: source.name,
            originalTitle: item.title,
            simplifiedContent: simplified,
            sourceUrl: item.link,
            publishedAt: item.pubDate,
          });

          console.log('  -> Done');
        } catch (err) {
          console.log(`  -> Failed: ${err.message}`);
        }

        await delay(1000);
      }
    } catch (err) {
      console.log(`Could not fetch ${source.name}: ${err.message}`);
    }
  }

  fs.writeFileSync('posts.json', JSON.stringify(posts, null, 2));
  console.log(`\nSaved ${posts.length} total posts to posts.json`);
}

fetchAllNews();