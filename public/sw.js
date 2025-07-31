const CACHE_NAME = 'ai-tech-hub-v1';
const OFFLINE_URL = '/';

// キャッシュするリソース
const urlsToCache = [
  '/',
  '/dist/output.css',
  '/manifest.json',
  '/btoa-polyfill.js'
];

// UTF-8対応のBase64エンコーディング関数（btoa の代替）
function safeBase64Encode(str) {
  try {
    // UTF-8バイト列に変換してからBase64エンコード
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt('0x' + p1));
    }));
  } catch (error) {
    console.warn('Base64 encoding failed, returning original string:', error);
    return str;
  }
}

// Service Worker内でbtoaをオーバーライド（拡張機能のエラー対策）
const originalServiceWorkerBtoa = self.btoa;
self.btoa = function(str) {
  try {
    return originalServiceWorkerBtoa(str);
  } catch (error) {
    if (error.name === 'InvalidCharacterError') {
      // UTF-8文字列を安全にBase64エンコード
      try {
        return originalServiceWorkerBtoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
          return String.fromCharCode(parseInt('0x' + p1));
        }));
      } catch (fallbackError) {
        console.warn('Service Worker Base64 encoding failed for:', str, fallbackError);
        return '';
      }
    }
    throw error;
  }
};

// データ送信時の安全な処理
function safePostMessage(client, data) {
  try {
    // 日本語文字列が含まれる可能性があるデータを安全に処理
    const safeData = JSON.parse(JSON.stringify(data));
    client.postMessage(safeData);
  } catch (error) {
    console.error('Safe postMessage failed:', error);
    // フォールバック: 安全なデータのみ送信
    client.postMessage({
      type: data.type || 'SHARED_CONTENT',
      data: {
        timestamp: new Date().toISOString(),
        error: 'Data encoding failed'
      }
    });
  }
}

// Web Share Target API のハンドリング関数
async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') || '';
    const text = formData.get('text') || '';
    const url = formData.get('url') || '';
    
    // ファイルデータを取得
    const files = formData.getAll('shared_files');
    const fileData = [];
    
    for (const file of files) {
      if (file && file.size > 0) {
        fileData.push({
          name: file.name,
          type: file.type,
          size: file.size
        });
      }
    }
    
    // 共有データをまとめる
    const sharedData = {
      title,
      text,
      url,
      files: fileData,
      timestamp: new Date().toISOString()
    };
    
    // アクティブなクライアントに共有データを送信（安全な方法で）
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of clients) {
      safePostMessage(client, {
        type: 'SHARED_CONTENT',
        data: sharedData
      });
    }
    
    console.log('Shared content processed:', sharedData);
    
    // ページのリロードを防ぐため、303リダイレクトで応答
    return Response.redirect('/', 303);
    
  } catch (error) {
    console.error('Error handling share target:', error);
    return Response.redirect('/', 303);
  }
}

// サービスワーカーのインストール
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// サービスワーカーのアクティベート
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// ネットワークリクエストの処理
self.addEventListener('fetch', (event) => {
  // Web Share Target API のハンドリング
  if (event.request.url.includes('/handle-share') && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
    return;
  }

  // 無効なURLや特殊なリクエストをフィルタリング
  try {
    const url = new URL(event.request.url);
    
    // 無効なURLやホストをチェック
    if (!url.hostname || url.hostname === 'ffffff' || url.protocol === 'data:') {
      console.log('Skipping invalid URL:', event.request.url);
      return;
    }
  } catch (e) {
    console.log('Skipping malformed URL:', event.request.url);
    return;
  }

  // APIリクエストは常にネットワークから取得（オフライン時は失敗させる）
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'オフラインモードです。インターネット接続を確認してください。' }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // その他のリソースはキャッシュファーストで処理
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュにあればそれを返す
        if (response) {
          return response;
        }

        // キャッシュになければネットワークから取得
        return fetch(event.request)
          .then((response) => {
            // レスポンスが有効でない場合はそのまま返す
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // レスポンスをクローンしてキャッシュに保存
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((cacheError) => {
                console.log('Cache put error:', cacheError);
              });

            return response;
          })
          .catch((fetchError) => {
            console.log('Fetch error:', fetchError);
            // ネットワークエラーの場合、HTMLリクエストなら基本ページを返す
            if (event.request.destination === 'document') {
              return caches.match(OFFLINE_URL);
            }
            // その他のリクエストは通常のネットワークエラーを返す
            throw fetchError;
          });
      })
      .catch((error) => {
        console.log('Cache match error:', error);
        // キャッシュエラーの場合はネットワークから直接取得を試行
        return fetch(event.request);
      })
  );
});

// プッシュ通知の処理（将来の拡張用）
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.svg',
      badge: '/icons/icon-192x192.svg',
      data: data.data
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// 通知クリックの処理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});