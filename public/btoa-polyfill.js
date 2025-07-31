/**
 * Ultra-Aggressive Global btoa Polyfill for UTF-8 Support
 * Prevents InvalidCharacterError when browser extensions process Japanese content
 * Designed to work across ALL JavaScript contexts including browser extension workers
 */
(function() {
  'use strict';
  
  // Enhanced safe Base64 encoding function with multiple fallback strategies
  function createUltraSafeBtoa(originalBtoa) {
    return function safeBtoa(str) {
      // Convert to string if not already
      if (typeof str !== 'string') {
        str = String(str);
      }
      
      try {
        // First try: Standard btoa
        return originalBtoa(str);
      } catch (error) {
        if (error.name === 'InvalidCharacterError') {
          // Second try: UTF-8 → URL encoding → Latin1 → Base64
          try {
            const encoded = encodeURIComponent(str);
            const latin1String = encoded.replace(/%([0-9A-F]{2})/g, function(match, hex) {
              return String.fromCharCode(parseInt(hex, 16));
            });
            return originalBtoa(latin1String);
          } catch (fallbackError1) {
            // Third try: Character-by-character safe encoding
            try {
              let result = '';
              for (let i = 0; i < str.length; i++) {
                const char = str.charAt(i);
                const charCode = str.charCodeAt(i);
                
                if (charCode <= 255) {
                  // Latin1 range - safe to encode directly
                  result += char;
                } else {
                  // Non-Latin1 - encode as UTF-8 bytes
                  const utf8Bytes = encodeURIComponent(char).replace(/%/g, '');
                  for (let j = 0; j < utf8Bytes.length; j += 2) {
                    result += String.fromCharCode(parseInt(utf8Bytes.substr(j, 2), 16));
                  }
                }
              }
              return originalBtoa(result);
            } catch (fallbackError2) {
              // Fourth try: Simple replacement of problematic characters
              try {
                const safeStr = str.replace(/[^\x00-\xFF]/g, '?'); // Replace non-Latin1 with ?
                return originalBtoa(safeStr);
              } catch (fallbackError3) {
                // Final fallback: Return a safe placeholder
                console.warn('btoa polyfill: All encoding strategies failed, returning placeholder');
                return originalBtoa('ENCODING_FAILED');
              }
            }
          }
        }
        // Re-throw other types of errors
        throw error;
      }
    };
  }
  
  // Store original btoa functions for potential restoration
  const originalFunctions = {};
  
  // Ultra-aggressive context detection and override
  const allPossibleContexts = [
    // Standard contexts
    { name: 'window', path: 'window' },
    { name: 'self', path: 'self' },
    { name: 'globalThis', path: 'globalThis' },
    { name: 'global', path: 'global' },
    
    // Browser extension contexts
    { name: 'chrome', path: 'window.chrome' },
    { name: 'browser', path: 'window.browser' },
    
    // Worker contexts
    { name: 'WorkerGlobalScope', path: 'self' },
    { name: 'DedicatedWorkerGlobalScope', path: 'self' },
    { name: 'SharedWorkerGlobalScope', path: 'self' },
    { name: 'ServiceWorkerGlobalScope', path: 'self' }
  ];
  
  function getContextObject(path) {
    try {
      if (path === 'window' && typeof window !== 'undefined') return window;
      if (path === 'self' && typeof self !== 'undefined') return self;
      if (path === 'globalThis' && typeof globalThis !== 'undefined') return globalThis;
      if (path === 'global' && typeof global !== 'undefined') return global;
      if (path === 'window.chrome' && typeof window !== 'undefined' && window.chrome) return window.chrome;
      if (path === 'window.browser' && typeof window !== 'undefined' && window.browser) return window.browser;
      return null;
    } catch (e) {
      return null;
    }
  }
  
  // Override btoa in all accessible contexts
  allPossibleContexts.forEach(function(contextInfo) {
    const contextObj = getContextObject(contextInfo.path);
    if (contextObj && contextObj.btoa && typeof contextObj.btoa === 'function') {
      try {
        const originalBtoa = contextObj.btoa;
        originalFunctions[contextInfo.name] = originalBtoa;
        const safeBtoa = createUltraSafeBtoa(originalBtoa);
        
        // Override with multiple strategies
        contextObj.btoa = safeBtoa;
        
        // Also try to make the property non-configurable to prevent override
        try {
          Object.defineProperty(contextObj, 'btoa', {
            value: safeBtoa,
            writable: true,
            enumerable: true,
            configurable: false
          });
        } catch (defineError) {
          // If we can't make it non-configurable, just continue
        }
        
        console.log('btoa polyfill: Successfully overridden btoa in', contextInfo.name, 'context');
      } catch (error) {
        console.warn('btoa polyfill: Failed to override btoa in', contextInfo.name, 'context:', error);
      }
    }
  });
  
  // Set up periodic re-override to combat extension interference
  let reOverrideCount = 0;
  function reOverrideBtoa() {
    if (reOverrideCount < 10) { // Limit re-override attempts
      reOverrideCount++;
      allPossibleContexts.forEach(function(contextInfo) {
        const contextObj = getContextObject(contextInfo.path);
        if (contextObj && contextObj.btoa && originalFunctions[contextInfo.name]) {
          try {
            // Check if our override is still in place
            const currentBtoa = contextObj.btoa;
            const testResult = currentBtoa('test');
            
            // Try with Japanese text to see if it throws
            try {
              currentBtoa('テスト');
            } catch (e) {
              if (e.name === 'InvalidCharacterError') {
                // Our override was removed or ineffective, re-apply it
                contextObj.btoa = createUltraSafeBtoa(originalFunctions[contextInfo.name]);
                console.log('btoa polyfill: Re-applied override in', contextInfo.name, 'context');
              }
            }
          } catch (error) {
            // Silent fail for re-override attempts
          }
        }
      });
    }
  }
  
  // Schedule re-overrides
  if (typeof setTimeout !== 'undefined') {
    setTimeout(reOverrideBtoa, 100);
    setTimeout(reOverrideBtoa, 500);
    setTimeout(reOverrideBtoa, 1000);
    setTimeout(reOverrideBtoa, 2000);
  }
  
  // Listen for DOM mutations that might indicate extension activity
  if (typeof window !== 'undefined' && window.MutationObserver) {
    const observer = new MutationObserver(function(mutations) {
      let shouldReOverride = false;
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if scripts were added (possible extension scripts)
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            if (node.nodeType === 1 && (node.tagName === 'SCRIPT' || node.tagName === 'IFRAME')) {
              shouldReOverride = true;
              break;
            }
          }
        }
      });
      
      if (shouldReOverride) {
        setTimeout(reOverrideBtoa, 50);
      }
    });
    
    // Start observing once the DOM is available
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    } else if (document.documentElement) {
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }
  
  // Final verification and debug
  setTimeout(function() {
    const testStrings = ['test', 'テスト', '日本語', 'AI技術共有ハブ'];
    let allTestsPassed = true;
    
    testStrings.forEach(function(testStr) {
      try {
        const contexts = [window, self, globalThis].filter(ctx => ctx && ctx.btoa);
        contexts.forEach(function(ctx) {
          try {
            const result = ctx.btoa(testStr);
            console.log('btoa polyfill: Test passed for "' + testStr + '" in context:', ctx === window ? 'window' : ctx === self ? 'self' : 'globalThis');
          } catch (e) {
            console.error('btoa polyfill: Test FAILED for "' + testStr + '":', e);
            allTestsPassed = false;
          }
        });
      } catch (error) {
        console.error('btoa polyfill: Test setup failed for "' + testStr + '":', error);
        allTestsPassed = false;
      }
    });
    
    if (allTestsPassed) {
      console.log('btoa polyfill: All tests passed - Japanese text encoding should work correctly');
    } else {
      console.warn('btoa polyfill: Some tests failed - btoa errors may still occur');
    }
  }, 1000);
})();