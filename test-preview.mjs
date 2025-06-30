// URLプレビュー機能のテスト用スクリプト
// node test-preview.mjs で実行

import axios from 'axios';
import * as cheerio from 'cheerio';

const AXIOS_OPTIONS = {
  headers: {
    "User-Agent": "MyCustomPreviewBot/1.0 (https://github.com/big-blue22/keizibann)",
  },
  timeout: 5000,
};

async function testPreview(url) {
  console.log('Testing URL:', url);
  
  try {
    const { data: html } = await axios.get(url, AXIOS_OPTIONS);
    const $ = cheerio.load(html);
    
    const getMetatag = (name) => $(`meta[property='${name}']`).attr('content') || $(`meta[name='${name}']`).attr('content');
    
    const previewData = {
      title: getMetatag('og:title') || $('title').text() || 'タイトルなし',
      description: getMetatag('og:description') || '説明なし',
      image: getMetatag('og:image'),
      siteName: getMetatag('og:site_name') || new URL(url).hostname,
      url: url
    };
    
    console.log('Preview data:', JSON.stringify(previewData, null, 2));
    return previewData;
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

// テスト実行
const testUrls = [
  'https://github.com',
  'https://vercel.com',
  'https://nextjs.org'
];

for (const url of testUrls) {
  await testPreview(url);
  console.log('---');
}
