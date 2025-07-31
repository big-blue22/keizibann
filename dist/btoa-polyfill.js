/**
 * Global btoa polyfill for UTF-8 support
 * Prevents InvalidCharacterError when browser extensions process Japanese content
 */
(function() {
  'use strict';
  
  // 安全なBase64エンコーディング関数を作成
  function createSafeBtoa(originalBtoa) {
    return function safeBtoa(str) {
      // 引数の検証
      if (typeof str !== 'string') {
        str = String(str);
      }
      
      try {
        // まず標準のbtoaを試行
        return originalBtoa(str);
      } catch (error) {
        if (error.name === 'InvalidCharacterError') {
          // UTF-8文字列を安全にLatin1範囲に変換してからBase64エンコード
          try {
            const encoded = encodeURIComponent(str);
            const latin1String = encoded.replace(/%([0-9A-F]{2})/g, function(match, hex) {
              return String.fromCharCode(parseInt(hex, 16));
            });
            return originalBtoa(latin1String);
          } catch (fallbackError) {
            console.warn('btoa polyfill: UTF-8 encoding failed for string:', str, fallbackError);
            // 最後の手段として空文字を返す
            return '';
          }
        }
        // その他のエラーはそのまま投げる
        throw error;
      }
    };
  }
  
  // 利用可能なすべてのグローバルスコープでbtoaをオーバーライド
  const contexts = [];
  
  // window (メインスレッド)
  if (typeof window !== 'undefined' && window.btoa) {
    contexts.push({ name: 'window', obj: window, original: window.btoa });
  }
  
  // self (Service Worker, Web Worker)
  if (typeof self !== 'undefined' && self.btoa && self !== window) {
    contexts.push({ name: 'self', obj: self, original: self.btoa });
  }
  
  // globalThis (最新の標準)
  if (typeof globalThis !== 'undefined' && globalThis.btoa) {
    contexts.push({ name: 'globalThis', obj: globalThis, original: globalThis.btoa });
  }
  
  // global (Node.js環境、一般的ではないがカバレッジのため)
  if (typeof global !== 'undefined' && global.btoa) {
    contexts.push({ name: 'global', obj: global, original: global.btoa });
  }
  
  // 各コンテキストでbtoaをオーバーライド
  contexts.forEach(function(ctx) {
    try {
      const safeBtoa = createSafeBtoa(ctx.original);
      ctx.obj.btoa = safeBtoa;
      console.log('btoa polyfill: Successfully overridden btoa in', ctx.name, 'context');
    } catch (error) {
      console.warn('btoa polyfill: Failed to override btoa in', ctx.name, 'context:', error);
    }
  });
  
  // デバッグ用: オーバーライドされたbtoaの動作確認
  if (typeof window !== 'undefined' && window.console && window.console.log) {
    try {
      const testString = 'テスト文字列';
      const result = (window.btoa || self.btoa || globalThis.btoa)(testString);
      console.log('btoa polyfill: Test encoding successful for Japanese text:', testString, '->', result);
    } catch (error) {
      console.error('btoa polyfill: Test encoding failed:', error);
    }
  }
})();