import axios from 'axios';
import * as cheerio from 'cheerio';
import { lookup } from 'dns/promises';
import ipaddr from 'ipaddr.js';

const AXIOS_OPTIONS = {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  },
  timeout: 5000, // 5秒でタイムアウト
};

export async function isSafeUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== 'http:' && protocol !== 'https:') {
      console.warn(`[SSRF] 不正なプロトコル: ${protocol}`);
      return false;
    }
    const { address } = await lookup(hostname);
    const ip = ipaddr.parse(address);
    const range = ip.range();
    if (range !== 'unicast') {
      console.warn(`[SSRF] プライベートIP範囲へのアクセス試行: ${hostname} (${address})`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[SSRF] URL検証中にエラーが発生: ${error.message}`);
    return false;
  }
}

export async function fetchPreviewData(url) {
  if (!(await isSafeUrl(url))) {
    throw new Error('無効または安全でないURLが指定されました。');
  }

  try {
    const { data: html } = await axios.get(url, AXIOS_OPTIONS);
    const $ = cheerio.load(html);

    const getMetatag = (name) => $(`meta[property='${name}']`).attr('content') || $(`meta[name='${name}']`).attr('content');

    const description = (getMetatag('twitter:description') || getMetatag('og:description') || '説明なし').substring(0, 200);

    const previewData = {
      title: getMetatag('og:title') || $('title').text() || 'タイトルなし',
      description: description,
      image: getMetatag('og:image'),
      siteName: getMetatag('og:site_name') || new URL(url).hostname,
      url: url,
    };

    if (previewData.image && previewData.image.startsWith('/')) {
      const siteUrl = new URL(url);
      previewData.image = `${siteUrl.protocol}//${siteUrl.hostname}${previewData.image}`;
    }

    return previewData;
  } catch (error) {
    console.error(`プレビューの取得に失敗しました: ${url}`, error.message);
    let errorMessage = 'プレビューを生成できませんでした。';
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'ページの読み込みがタイムアウトしました。';
    } else if (error.response) {
      errorMessage = `サイトからエラーが返されました (ステータス: ${error.response.status})。`;
    }
    throw new Error(errorMessage);
  }
}
