const CACHE_NAME = 'ai-tech-hub-v1';
const OFFLINE_URL = '/';

// キャッシュするリソース
const urlsToCache = [
  '/',
  '/dist/output.css',
  '/manifest.json'
];

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
    
    // アクティブなクライアントに共有データを送信
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({
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
              });

            return response;
          })
          .catch(() => {
            // ネットワークエラーの場合、HTMLリクエストなら基本ページを返す
            if (event.request.destination === 'document') {
              return caches.match(OFFLINE_URL);
            }
          });
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