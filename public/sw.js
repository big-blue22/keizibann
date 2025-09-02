const CACHE_NAME = 'ai-tech-hub-v4'; // バージョンを更新してキャッシュをリフレッシュ
const OFFLINE_URL = '/';

// キャッシュするリソース
const urlsToCache = [
  '/',
  '/dist/output.css',
  '/manifest.json',
  '/btoa-polyfill.js',
  '/share-handler.html'
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

// 超強化Service Worker btoa オーバーライド（拡張機能WorkerGlobalScopeエラー完全対策）
(function() {
  'use strict';
  
  // 元のbtoaを保存
  const originalServiceWorkerBtoa = self.btoa;
  
  // 最強のbtoaラッパー関数
  function ultraSafeBtoa(str) {
    // 引数チェック
    if (typeof str !== 'string') {
      str = String(str);
    }
    
    try {
      // 第一段階: 標準のbtoaを試行
      return originalServiceWorkerBtoa(str);
    } catch (error) {
      if (error.name === 'InvalidCharacterError') {
        // 第二段階: UTF-8 → URLエンコード → Latin1 → Base64
        try {
          const encoded = encodeURIComponent(str);
          const latin1String = encoded.replace(/%([0-9A-F]{2})/g, function(match, hex) {
            return String.fromCharCode(parseInt(hex, 16));
          });
          return originalServiceWorkerBtoa(latin1String);
        } catch (fallbackError1) {
          // 第三段階: 文字単位での安全エンコーディング
          try {
            let safeString = '';
            for (let i = 0; i < str.length; i++) {
              const charCode = str.charCodeAt(i);
              if (charCode <= 255) {
                // Latin1範囲なのでそのまま
                safeString += str.charAt(i);
              } else {
                // Latin1範囲外の文字は置換マーカーに変換
                safeString += '?';
              }
            }
            return originalServiceWorkerBtoa(safeString);
          } catch (fallbackError2) {
            // 第四段階: 完全なフォールバック
            try {
              return originalServiceWorkerBtoa('NON_LATIN1_CONTENT_DETECTED');
            } catch (fallbackError3) {
              // 最終手段
              console.error('Service Worker btoa: All encoding strategies failed');
              return 'QklOQVJZX0NPTlRFTlQ='; // "BINARY_CONTENT" in Base64
            }
          }
        }
      }
      // InvalidCharacterError以外のエラーはそのまま投げる
      throw error;
    }
  }
  
  // Service Workerのselfスコープでbtoaをオーバーライド
  self.btoa = ultraSafeBtoa;
  
  // グローバルオブジェクトでも設定（WorkerGlobalScope対策）
  if (typeof WorkerGlobalScope !== 'undefined') {
    WorkerGlobalScope.prototype.btoa = ultraSafeBtoa;
  }
  
  // Serviceワーカー専用の追加対策
  try {
    Object.defineProperty(self, 'btoa', {
      value: ultraSafeBtoa,
      writable: false,
      enumerable: true,
      configurable: false
    });
  } catch (defineError) {
    // プロパティ定義に失敗してもオーバーライド自体は成功しているので続行
  }
  
  console.log('Service Worker: Ultra-safe btoa override applied');
})();

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
  // 注意: manifest.jsonでGETメソッドに変更したため、share-target.htmlが直接処理します
  // Service Workerでの特別な処理は不要

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

  // ナビゲーションリクエスト（HTMLページへのアクセス）の場合
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // ネットワークから正常に取得できたら、キャッシュを更新してレスポンスを返す
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // ネットワークエラーの場合はキャッシュからフォールバック
          return caches.match(event.request);
        })
    );
    return;
  }

  // その他のリソース（CSS, JS, 画像など）はキャッシュファーストで処理
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュにあればそれを返す
        if (response) {
          return response;
        }

        // キャッシュになければネットワークから取得
        return fetch(event.request).then((response) => {
          // レスポンスが有効な場合のみキャッシュに保存
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
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