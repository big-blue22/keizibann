# btoa UTF-8 Polyfill Documentation

## Problem
Browser extensions were encountering `InvalidCharacterError: Failed to execute 'btoa' on 'WorkerGlobalScope': The string to be encoded contains characters outside of the Latin1 range` when processing Japanese content from this website.

## Root Cause
- The native `btoa()` function only supports Latin1 characters (0-255 range)
- Japanese characters (and other Unicode) exceed this range
- Browser extensions running in isolated contexts couldn't access website-level btoa overrides

## Solution
Implemented a comprehensive multi-layer btoa polyfill:

### 1. Global Polyfill File (`/btoa-polyfill.js`)
- Standalone JavaScript file that overrides btoa across multiple contexts
- Supports: `window`, `self`, `globalThis`, `global` scopes
- UTF-8 safe encoding using `encodeURIComponent` + Latin1 conversion
- Comprehensive error handling and logging

### 2. Service Worker Integration
- btoa override in Service Worker global scope (`WorkerGlobalScope`)
- Handles cases where browser extensions interact with SW context
- Includes the polyfill in cached resources

### 3. Early HTML Override
- Inline script in HTML `<head>` section
- Executes before any other scripts or extensions can access content
- Multiple fallback attempts across different global objects

### 4. Metadata Signals
- Added `content-encoding: utf-8` and `language: ja-JP` meta tags
- Helps signal to browser extensions that page contains Unicode content

## Technical Implementation

### UTF-8 to Latin1 Conversion Process:
1. Use `encodeURIComponent()` to convert UTF-8 to percent-encoded form
2. Convert percent-encoded bytes to Latin1 characters
3. Apply standard `btoa()` to the Latin1 string
4. Result is Base64 that can be safely decoded

```javascript
// Example conversion
"テスト" → "&#37;E3&#37;83&#37;86&#37;E3&#37;82&#37;B9&#37;E3&#37;83&#37;88" → Base64
```

## Testing
- Test page available at `/test-btoa.html`
- Covers various Japanese text scenarios
- Validates encoding/decoding roundtrip accuracy

## Browser Extension Compatibility
- Works with download managers, ad blockers, and content processors
- Prevents crashes when extensions try to encode Japanese content
- Maintains backward compatibility with Latin1 content

## Files Modified
- `public/btoa-polyfill.js` - Main polyfill implementation
- `public/sw.js` - Service Worker btoa override
- `index.html` & `public/index.html` - Early override scripts
- Meta tags for content signaling