# RequestHelper - AI Coding Agent Instructions

## Project Overview
RequestHelper is a Chrome Manifest V3 extension for silent network request capturing and analysis. It uses a **dual-layer interception architecture** to bypass webRequest API limitations and capture complete request/response bodies.

**🤖 AI-ONLY Development Policy**: This project is entirely AI-generated. ALL contributions MUST be AI-generated code. Focus solely on implementation - never create documentation files like SUMMARY.md or CHANGES.md.

## Critical Architecture Patterns

### 1. Dual-Layer Network Interception
The core challenge: **webRequest API cannot capture response bodies in MV3**. Our solution:

```
Page Request → interceptor-injected.js (MAIN world) → CustomEvent 
  → interceptor.js (content script) → chrome.runtime.sendMessage 
  → background/capture.js → storage.js → viewer updates
```

**Key files:**
- `content/interceptor-injected.js`: Runs in page context, intercepts native XHR/Fetch, has full data access
- `content/interceptor.js`: Injects the above script, bridges CustomEvent → chrome.runtime
- `background/capture.js`: Merges data from webRequest API + content script using time-window matching (5s)

### 2. Module System & Chrome Extension APIs
- **All background scripts use ES6 modules** (`"type": "module"` in manifest.json)
- Import paths are relative: `import { StorageManager } from './storage.js'`
- UI scripts (popup, viewer, options) use `<script type="module">` in HTML
- Content scripts must be vanilla JS (no imports) or use bundlers

**Modular UI Architecture** (viewer and options):
```javascript
// viewer/modules/ structure:
state.js              // Global state management (allRequests, selectedRequest, etc.)
filter-manager.js     // Method/status/rule filters
request-list.js       // Request list rendering
request-details.js    // Request detail panel
utils.js              // Shared utilities (escapeHtml, getStatusClass, etc.)

// options/modules/ structure:
config-manager.js     // Configuration management
form-utils.js         // Reusable form helpers (key-value pairs, etc.)
rule-editor.js        // Rule CRUD operations
```

**Import pattern for UI modules:**
```javascript
// In viewer/viewer.js or options/options.js
import { state, updateAllRequests } from './modules/state.js';
import { updateMethodFilter } from './modules/filter-manager.js';
```

### 3. Storage Architecture
```javascript
// Storage keys in background/storage.js
STORAGE_KEY = 'requests'      // Array of captured requests
CONFIG_KEY = 'config'         // User configuration
RULES_KEY = 'captureRules'    // Capture/modification rules
MAX_REQUESTS = 1000           // Default limit
```

**Critical pattern:** Always use `chrome.storage.local`, never sync (large data volumes)
- Request matching uses `pendingRequests` Map with request IDs as keys
- Notifications via `chrome.runtime.sendMessage({ type: 'REQUESTS_UPDATED' })`
- Rules system: URL patterns + actions (capture, block, modify headers/body)

### 4. URL Filtering Pattern
Uses wildcard patterns in `utils/filter.js`:
```javascript
URLFilter.matches(url, patterns) // patterns like ["*api.example.com*", "*/graphql"]
```
Pattern conversion: `*` → `.*` regex, special chars escaped

## Development Workflows

### Build & Testing
```bash
npm run build          # Copies files to dist/
# OR directly:
node scripts/build.js  # Simple file copy, no compilation
```

**CRITICAL: Always build after changes**
- Run `node scripts/build.js` after EVERY code modification
- The extension loads from `dist/`, not source files
- Build failures must be fixed before considering work complete

**Manual testing:**
1. Load `dist/` folder in `chrome://extensions/` (developer mode)
2. Open `test/test-page.html` in browser
3. Click test buttons to trigger XHR/Fetch requests
4. Check popup for capture status, viewer for details

**Debugging:**
- Background logs: `chrome://extensions/` → Inspect service worker
- Content script logs: Page DevTools console (filter by "RequestHelper")
- Page interceptor logs: Look for emoji prefixes (🔍, ✅, ❌)

### Key Commands
No test suite exists. Testing is manual via:
- `test/test-page.html`: XHR/Fetch request triggers with various scenarios
- Browser DevTools network tab comparison

**Debugging emoji prefixes in console:**
- 🚀 Interceptor initialization
- 🔍 Request interception start
- ✅ Successful capture
- ❌ Error conditions
- 📋 Rules update

## Critical Rules

### 1. Documentation Policy
**NEVER generate summary or change or documentation files**
- Do NOT create files like `SUMMARY.md`, `CHANGES.md`, `UPDATE.md`, etc.
- Do NOT ask if documentation is needed
- Do NOT offer to document changes made
- Focus solely on code implementation

### 2. Build Requirement
**MUST run build after every change**
- Execute `node scripts/build.js` immediately after modifying any file
- Verify build completes successfully before considering work done
- Extension only loads from `dist/` directory, not source files

## Project-Specific Conventions

### 1. Request Data Structure
```javascript
{
  id: `${timestamp}-${Math.random()}`,
  url: string,
  method: 'GET'|'POST'|...,
  statusCode: number,
  timestamp: number,
  duration: number,
  requestHeaders: Object,
  requestBody: Object,
  responseHeaders: Object,
  responseBody: { type, data, parseError? },
  source: 'webRequest'|'contentScript'|'merged',
  // ... more fields in background/capture.js
}
```

### 2. Message Protocol
All `chrome.runtime.sendMessage` calls use `{ type: string, ...data }` pattern:
```javascript
// Types in background/service-worker.js handleMessage():
'GET_STATUS', 'START_CAPTURE', 'STOP_CAPTURE', 
'GET_REQUESTS', 'CLEAR_REQUESTS', 'EXPORT_REQUESTS',
'GET_CONFIG', 'SAVE_CONFIG', 'GET_STATS',
'GET_RULES', 'SAVE_RULES', 'ADD_RULE', 'UPDATE_RULE', 'DELETE_RULE',
'RESPONSE_BODY_CAPTURED',  // From content script
'HELPER_STARTED'           // To content scripts on capture start
```

### 3. UI State Management
- No framework used - vanilla JS with manual DOM updates
- **Viewer uses modular architecture** - state centralized in `viewer/modules/state.js`
- State variables exported: `allRequests`, `filteredRequests`, `selectedRequest`, `selectedStatusCodes`, `selectedMethods`, `selectedRules`, `showSlowRequestsOnly`, `searchScopes`
- Filtering logic split into `filter-manager.js` module - handles multiple criteria:
  - URL search (with configurable scopes: url, requestBody, responseBody)
  - HTTP method filter (multiple selection via Set)
  - Status code filter (uses Set for O(1) lookups: `selectedStatusCodes`)
  - Capture rule filter (filter by which rule matched)
  - Slow request filter (duration-based threshold)
- Request rendering separated into `request-list.js` and `request-details.js` modules

### 4. Style Patterns
- Status code colors: `.status-2xx` (green), `.status-3xx` (yellow), `.status-4xx` (orange), `.status-5xx` (red)
- Method badges: `.method-GET`, `.method-POST`, etc. with color coding
- Toast notifications: `.toast.success`, `.toast.error` with opacity transitions

### 5. Internationalization (i18n)
- Messages in `_locales/{locale}/messages.json` (en, zh_CN)
- Manifest uses `__MSG_key__` syntax: `"name": "__MSG_extName__"`
- UI files use `utils/i18n.js`: `getMessage('key')` and `translatePage()`
- All user-facing text should be externalized for multi-language support

## Common Tasks

### Adding New Filter to Viewer
1. Add filter UI in `viewer/viewer.html` toolbar
2. Add state variable in `viewer/viewer.js` (like `selectedStatusCodes`)
3. Update `handleFilter()` to apply new filter condition
4. Update `loadRequests()` or similar to refresh filter options
5. Add CSS for new UI elements in `viewer/viewer.css`
See recent status filter addition as reference.

### Capturing New Data Fields
1. Add field capture in `background/capture.js` onBeforeRequest/onCompleted hooks
2. Add field capture in `content/interceptor-injected.js` for XHR/Fetch data
3. Update merge logic in `RequestCapture.handleResponseBody()` - merges webRequest + content script data
4. Update viewer display in `viewer/viewer.js` renderRequestDetails()

### Adding Configuration Options
1. Add field to default config in `background/storage.js`
2. Add UI control in `options/options.html`
3. Add save/load logic in `options/options.js`
4. Use config in relevant module (usually `background/capture.js`)

## Known Limitations & Gotchas

- **webRequest listeners cannot be removed** once registered - use `isCapturing` flag instead
- **Content script injection timing**: Use `"run_at": "document_start"` to catch early requests
- **Response body size limit**: 5MB default in interceptor, truncate to prevent memory issues
- **Service worker lifecycle**: May terminate after 30s idle, use `chrome.storage` not in-memory state
- **CORS/CSP restrictions**: Page-injected script bypasses these, content script doesn't
- **Matching algorithm**: 5-second time window + URL + method matching (see `RequestCapture.findMatchingRequest()`)
  ```javascript
  // Matches if: same URL, same method, timestamp within 5000ms
  // First checks pendingRequests Map, then falls back to recent stored requests
  ```
- **Rules-based capture system**: Capture rules support pattern matching with actions
  - Capture rules: Selective URL pattern matching for what to capture
  - Block rules: Use declarativeNetRequest API (rule ID offset: 10000+) to block requests
  - Modify rules: Header modification and request/response body alteration
  - Rules stored in `RULES_KEY` and loaded at capture start
- **Service worker restarts**: Service worker may restart and lose in-memory state
  - On restart, `isCapturing` resets to false even if config.enabled was true
  - Initialize() detects this and updates config.enabled to match actual state
  - Use chrome.storage for persistent state, not class static variables

## File Organization
```
background/     - Service worker, storage, capture logic
content/        - Interceptor scripts (injected + bridge)
popup/          - Quick control panel UI
viewer/         - Main request inspection interface
options/        - Settings configuration page
utils/          - Shared utilities (filter, formatter)
test/           - Manual test pages (no automated tests)
scripts/        - Build tooling
```

When modifying UI files, remember each has its own CSS file and no shared component system.
