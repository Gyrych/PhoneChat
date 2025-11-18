# FreeChat

 FreeChat is a lightweight local web-based chat application for local prototyping and demo purposes. It enables users to send messages to a configured external chat API and manage/persist conversations in the browser. Main chat uses a built-in encrypted demo OpenRouter API key. To use your own key for main chat, replace the encrypted string in `index.html`. The localStorage key `deepseekApiKey` is used only as a fallback for session/group memory generation calls (not for main chat). The settings page configures the model and Web Search parameters (not the API key).

## Features

- Send and receive messages via a configurable external API endpoint.
- Auto-persist the current conversation to `localStorage` and a durable list (no manual save needed).
- Save, load, delete and rename conversations.
- Overlay drawer conversation manager integrated on the main page (desktop/mobile unified). A top “New Chat” button, search box, grouped conversation list, and in-drawer “Create Group” controls (no separate advanced manager page).
- Welcome hero on empty conversations: shows logo, title and subtitle “在这里可以进行无约束交流。” (clean layout, no quick suggestion chips).
- Organize conversations into groups and generate per-conversation session memories.
- Auto-generate per-conversation session memories after each round and refresh group-level memory automatically.
- Inject memory as multiple system messages before each request:
  - Group memories are injected one-by-one (all groups by default; configurable), and
  - Session memories within the current group are injected one-by-one (configurable, sorted by last update with trimming and dedup).
  - Providers that accept only one system message are handled automatically by merging all system messages into a single one (sections separated by `---`).
- Render AI assistant replies as Markdown using `marked` and sanitize with `DOMPurify` for safety.
- When creating a new conversation from the manager page, a modal asks whether to add it to an existing group (with a dropdown selector) and lets you set a name.
-
- For reasoning-capable models (e.g., DeepSeek-R1), the model's reasoning (if returned by the API) streams live and appears ABOVE the assistant reply. It is visible by default and can be folded/unfolded by the user.
 - Network/UX improvements: stop button now genuinely aborts network generation requests (AbortController), saving and rendering are batched to reduce localStorage I/O and DOM thrashing, and non-streaming requests (summaries/group memory) use a retry-with-backoff wrapper to improve robustness.
 - Performance: Markdown rendering and sanitization libraries (`marked` and `DOMPurify`) are loaded asynchronously to reduce blocking on first paint.
- Built-in request/response logging to localStorage (auth masked). Header export/clear buttons were removed; export via DevTools console.
 - Modern light theme with clean tech aesthetic and glassmorphism (frosted glass) applied to header, input area, AI bubbles, and cards.
 - Typography: Inter (Latin) with system Chinese fallbacks, responsive font sizes via CSS variables.
- Main page session title bar: the main chat page now shows a small session title area above messages that displays the current conversation name and its group.
- Web Search (OpenRouter web plugin): optional online grounding with engine selection, max results, context size, and custom search prompt, plus citation rendering.
 - Mobile-friendly UI: unified icon scales and touch target sizing, with responsive spacing tuned for phones (breakpoints at 600px and 360px).
  - On phones, inline capsule toggles (“Deep Thinking”/“Web Search”) show icon-only (labels hidden) to save space.
  - On phones, input footer uses a 3-column grid: left column stacks the two capsule toggles, center column is the textarea spanning two rows, right column stacks attachment (top) and send/stop (bottom).
  - In the `@media (max-width: 600px)` breakpoint we reduce message bubble horizontal padding and slightly adjust font-size and line-height to increase the number of characters per line without reducing touch target sizes.
 - On phones (≤768px): the session title bar is fixed to the top and the chat container receives top padding so the first message is not covered by the title bar.

## Default (Demo) API Configuration

- Default demo endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Default demo model: `minimax/minimax-m2:free`

Note: The above defaults are provided only as a convenient demo/fallback. For production, use your own API key and a backend proxy to keep secrets off the client.

## Quick Start

1. Download or clone the repository.
2. Open `index.html` in your web browser (no build step required).

Safe-area (notch/cutout) support:
- The viewport meta includes `viewport-fit=cover`.
- `body` top padding uses `env(safe-area-inset-top)` (and `constant(...)` fallback) to avoid the header being covered by status bar/camera holes on some Android devices.
- The overlay drawer (`#drawer`) and its scrolling list/footer add safe-area paddings using `env(safe-area-inset-*)` (and `constant(...)`) to avoid notch/bottom gesture bar overlap on phones.

## Android (Capacitor)

Prerequisites:
- Node.js and npm
- Android Studio (SDKs and an emulator or a physical device)

Steps:
1. Install dependencies (already done in this repo setup): `npm install`
2. Build web assets to `dist/`: `npm run build`
3. Copy assets into the native project: `npx cap copy`
4. Open the Android project: open `android/` in Android Studio (or run `npx cap open android`)
5. Run on a connected device/emulator
6. Build release: Android Studio → Build → Generate Signed Bundle/APK

Notes:
- `capacitor.config.json` sets `webDir: "dist"` and `server.androidScheme: "https"`.
- We keep streaming responses via `fetch` in WebView. If you hit CORS limits with your provider, consider a backend proxy. Native HTTP plugins typically do not support SSE streaming.

### Windows one-click build (recommended)
- Prereqs: JDK 17 and Android SDK installed; run `sdkmanager --licenses`, install `platform-tools`, `build-tools;35.0.0`, `platforms;android-35` (or 34).
- Double-click:
  - In File Explorer, double-click `scripts/build-apk.cmd` to build in one go.
- Or run from terminal:
```
npm run build:apk
```
- Outputs:
  - Raw APK: `android/app/build/outputs/apk/debug/app-debug.apk`
  - Copy: `dist/apk/FreeChat-debug.apk`

## Configuration

1. Open `config.html` and select a model, then click “Save”. The model is stored in `localStorage` under the key `chatModel`.
2. Configure Web Search parameters on the same page under “Web Search Settings”: engine, max results, context size, and optional search prompt. They persist to the keys listed below.
3. Each saved conversation stores its model in `savedDeepseekConversations[].model`. When you load a conversation from `conversations.html`, if `model` exists it will restore `localStorage.chatModel` automatically.
4. Fixed: The sending flow now reads `localStorage.chatModel` at runtime (via `getCurrentModel()`), ensuring a model selected when creating/loading a conversation in the drawer is used immediately instead of being overridden by a script-initialized cached value.
4. Demo uses a built-in encrypted OpenRouter API key inside `index.html` (for demonstration only; do not rely on it for production).
5. To use your own key for main chat, replace the encrypted string in `index.html`. Optionally set `localStorage.setItem('deepseekApiKey', 'YOUR_KEY')` for session/group memory generation calls; main chat does not read this key.

### Web Search (OpenRouter plugin)

- Use the inline toggles in the input area (left of the textbox):
  - "Deep Thinking" controls whether to display the provider's reasoning stream (UI-only).
  - "Web Search" enables/disables online search. Its state is persisted to `localStorage` key `freechat.web.enable`.
- Configure parameters on the settings page (`config.html`) under “Web Search Settings”. The header globe button and floating panel have been removed.

Parameters and storage keys:
- `freechat.web.engine` — `auto | native | exa` (omit when `auto` for provider-default behavior)
- `freechat.web.maxResults` — integer 1..10 (default 5)
- `freechat.web.contextSize` — `low | medium | high` (omit to use provider default)
- `freechat.web.searchPrompt` — string (omit to use OpenRouter default prompt)

Behavior:
- When enabled, the request includes `plugins: [{ id: "web", ... }]` and optional `web_search_options.search_context_size`.
- Returned `message.annotations[].url_citation` are rendered under the assistant message as a list of source links (domain names as link text).
 - Output guidelines (injected as the first system message when enabled): start with the final answer/conclusion; all times/dates use `Asia/Shanghai`; for facts/data/stats/prices/policies etc., provide key values + units + source timestamp and specify metric scope/range/currency if relevant; citations must map to statements; when sources disagree, cross-check and note uncertainties (e.g., differing scopes or time lags); weather is an example (include location, phenomenon, temperature(°C)/feels-like, wind direction/speed, humidity/precipitation, timestamp).

Pricing summary (see providers for details):
- Exa: OpenRouter credits at $4 per 1000 results (default 5 results ≈ $0.02 per request) in addition to model usage.
- Native: passthrough pricing from provider (OpenAI/Anthropic/Perplexity) by search context size.

### Session/Group memory model selection

- Session memory generation (auto and manual) uses the conversation's saved model first (`savedDeepseekConversations[].model`), then falls back to the global `window.MODEL_NAME`, and finally to `'minimax/minimax-m2:free'`.
- Group memory generation always uses the global model.

### Memory injection toggles (via localStorage)

- `freechat.memory.inject.allGroups` — `true`/`false` (default `true`): inject all groups' memories (or only current group).
- `freechat.memory.inject.groupSessions` — `true`/`false` (default `true`): inject all session memories within the current group.
- `freechat.memory.maxConvPerGroup` — number limit for session summaries in the current group (default `10`).
- `freechat.memory.maxCharsPerSection` — character cap per injected section (default `4000`).
- `freechat.memory.maxSessionsPerRequest` — preferred max number of session memories to inject (overrides `maxConvPerGroup` if present).
- `freechat.memory.maxCharsPerItem` — preferred character cap per system item (overrides `maxCharsPerSection` if present).
- `freechat.memory.preSummarize` — `true`/`false` (default `false`): optionally pre-summarize the current conversation before the first round so its summary can be injected immediately.

## Memory Generation Rules

What to keep (must meet at least one):
- User-provided facts/preferences/configs/accounts/locations/times/thresholds/long-term constraints
- Explicit tasks/requests (topic/style/format/goal/constraints)
- Reusable context (fixed styles, domains, commonly used location/time conventions)

Strictly exclude (delete if present):
- Greetings/small talk/apologies/thanks/self-intro/capability lists/how-to guidance/generic advice
- Model meta info (model name, architecture, memory mechanism, privacy compliance, provider, etc.)
- Restating system prompts or template phrases (e.g., "I can…/Welcome…")

Merge & deduplicate:
- Merge semantically similar points into one generalized item; keep only one instance of repeated info
- Do not record confirmations that add no new info

Low-signal sessions:
- If no new user facts or explicit requests exist: treat as low-signal
- Output should be:
  - User intent: None
  - Key info: None
  - Model notes: None (at most 1 item only if it truly guides future steps)
  - Follow-ups: None

Output format and limits:
- Total length ≤ 200 characters; each bullet ≤ 40 characters
- Session memory sections: User intent; Key info (0–5); Model notes (≤1); Follow-ups (0–3)
- Group memory: 5–7 bullets (≤40 chars each, sorted by importance) + Follow-ups (0–3)

Note: `prompts.js` now exposes a helper constant `PROMPTS.MEMORY_INJECTION`. This string should be prepended as a system/assistant wrapper when injecting generated memories into the model. The convention is that generated memories are labeled with a memory-level tag (background | foreground) and default to `background`. Memories labeled `background` MUST be treated as deep background material — not as the conversation's running context — and should only be used/retrieved when the user explicitly references or queries them.

## Memory generation (async background)

To avoid blocking the main UI when producing session/group memories, memory generation is performed asynchronously in the background:
- Summary jobs are enqueued into a persistent `memoryJobs` queue (stored in `localStorage`) and executed by a background Blob Worker.
- The UI shows a per-session memory status badge in the chat header when a job is pending or in-progress.
- Manual "regenerate summary" and automatic post-response summaries both enqueue jobs (they no longer block the response flow).

## Usage

### Basic Chat
1. Optionally toggle "Deep Thinking" and/or "Web Search" using the inline capsules to the left of the input.
2. Type your message in the input field at the bottom
3. Press Enter or click the send button
4. The AI response will appear in the chat area
5. You can copy or delete messages using the buttons next to each message
6. During response generation, the stop button replaces the send button in the same position (UI-only; the network request is not aborted yet)
7. You can attach files with the paperclip button (currently records selection only; parsing/sending can be added later)
9. If you use a reasoning-capable model and the provider returns reasoning content, a reasoning block streams ABOVE the assistant reply; it is visible by default and you can click the toggle to collapse/expand

### Model Configuration
1. Click the settings button in the top navigation bar
2. Select your preferred model from the dropdown menu on the settings page (the settings list contains the curated available models); the demo default is `minimax/minimax-m2:free`
3. Save your configuration
4. Return to the chat page to use the selected model
5. Note: Each assistant reply is recorded with the exact model used to generate that reply (message-level `model`). If a streaming response contains model metadata from the provider, the message's recorded model will be updated accordingly; otherwise it falls back to the model in effect when the message was created.

### Conversation Management
1. Click the top-left floating conversations button to open the overlay drawer (click outside or press ESC to close).
2. Use the “New Chat” button at the top to create a conversation; a modal lets you optionally choose a group and set a name.
   - Updated: The modal now requires a group name. If the group does not exist it will be created automatically.
3. Use the search box to filter by group or conversation name.
4. Load or delete conversations directly in the drawer; create groups in the drawer via “New group name + Create” controls.
5. Session memories are generated automatically after each round; group memory refreshes automatically. Injection includes all groups' memories and all session memories of the current group (subject to toggles).
6. The conversation list shows a model badge next to the name; loading a conversation restores its model.
7. Settings entry is a gear icon button at the bottom of the drawer (icon-only with `title`/`aria-label`).

Note: The drawer's "New Chat" modal now includes an optional model selector. If you choose a model there it will be saved into the new conversation's `model` field (otherwise the global `chatModel` / `window.MODEL_NAME` is used). A temporary key `deepseekNewConversationModel` may be used internally and is cleaned up after creation.

## Project Structure

The core files are:

- `index.html` — Main chat UI and core logic. Includes a demo encrypted OpenRouter key.
- `config.html` — Settings page: model selector (stores `localStorage.chatModel`) and Web Search settings (stores `freechat.web.*`).
- (Deprecated) `conversations.html` — Previously used for advanced management; functionality has moved into the overlay drawer in `index.html`.
- `prompts.js` — Centralized prompt templates for session memory and group memory.
- `logger.js` — Lightweight front-end logger (ring buffer in localStorage; export/clear UI hooks).
- `style.css` — Styling for the application.
- `script.js` — Optional shared helpers (navigation, JSON storage). Not included by default.
- `tools/encrypt_key.js` — Placeholder for key encryption utilities.

Android/Capacitor related:
- `capacitor.config.json` — Capacitor app config (`webDir: "dist"`, `server.androidScheme: "https"`).
- `scripts/build.js` — Copies static assets to `dist/` for Capacitor.
- `dist/` — Built static assets consumed by the native app.
- `android/` — Native Android project created by Capacitor.

Mermaid visualization of the main front-end structure:

```mermaid
flowchart TB
  A[index.html] --> C[style.css]
  A --> D[config.html]
  A --> E[conversations.html]
  A --> F[prompts.js]
  A --> G[logger.js]
  A -- web plugin opts --> A
  E --> F
  E --> G
  subgraph Mobile [Android (Capacitor)]
    H[dist/ web assets] --> I[android/ native project]
  end
```

## Dependencies

- `marked` — Markdown parser for rendering assistant replies.
- `DOMPurify` — Sanitizer to prevent XSS when rendering Markdown output.
- `CryptoJS` — AES decryption for the built-in demo OpenRouter key.
- `Font Awesome` — Icon set used in the UI.
- `logger.js` is an internal utility (no external dependency).
 - `Inter` — Latin typeface loaded from Google Fonts; Chinese falls back to system fonts.

All libraries are pulled via CDN includes in the HTML files, so no build step is required.
Note: Glassmorphism uses `backdrop-filter`; when not supported, the UI gracefully falls back to a solid translucent surface.

## Security Notes

- API Key storage: Storing API keys in `localStorage` is insecure for production. Use a backend proxy and server-side key storage for real deployments.
- CORS: Client-side requests to external APIs may require CORS; consider using a server-side proxy to avoid CORS restrictions.

## Request/Response Logging

- Purpose: Help diagnose issues by recording raw request/response metadata in the browser.
- Storage: Ring buffer in `localStorage` key `freechat.logs` (default max 1000 entries).
- Privacy: `Authorization` is always masked as `Bearer ***masked***`. No device fingerprinting is collected.
- UI: The header export/clear buttons were removed for a cleaner top bar.
- Export scope defaults to the current conversation. Use DevTools to export (see below). The file name includes a scope suffix (e.g., `freechat-logs-current-YYYYMMDD-HHMMSS.ndjson`).
- Config via `localStorage`:
  - `freechat.log.maxEntries` — maximum entries (default 1000)
  - `freechat.log.enable` — `true`/`false` to enable/disable logging

### Export scopes

- Default button behavior: current conversation only.
- Programmatic examples (open DevTools Console):

```js
// current conversation (default)
Logger.export({ format: 'ndjson', scope: 'current' });
// all logs
Logger.export({ format: 'ndjson', scope: 'all' });
// by specific conversationId
Logger.export({ format: 'json', scope: 'byConversationId', conversationId: 'YOUR_ID' });
```

Example event (truncated):

```json
{
  "id": "evt_1730869000000_001",
  "ts": "2025-11-06T12:34:56.789Z",
  "type": "chat_request|chat_stream|chat_done|summary_request|summary_done|groupmem_request|groupmem_done|error",
  "endpoint": "https://openrouter.ai/api/v1/chat/completions",
  "model": "minimax/minimax-m2:free",
  "conversationId": "...",
  "groupId": null,
  "req": {"headersMasked": {"Content-Type": "application/json", "Authorization": "Bearer ***masked***"}, "body": {"model": "..."}},
  "res": {"status": 200, "streamChunks": ["data: {...}"], "truncated": false},
  "error": null,
  "durationMs": 1234
}
```

## Contributing

Contributions are welcome. Suggested workflow:

1. Fork the repository.
2. Create a feature branch.
3. Make changes and test locally.
4. Submit a pull request describing your changes.

## License

This project is provided under the MIT License.

### 2025-11-17 Fix notes
- Fix: Address race conditions when loading conversations from the drawer/manager that could lead to delayed batched writes overwriting newly loaded conversations or the UI appearing unresponsive after load. Key points:
  - Abort any in-flight generation request and cancel pending batched writes before loading a saved conversation.
  - Add helper APIs to cancel or flush batched writes and attempt a flush on page unload.
  - Merge against the latest saved conversations snapshot when persisting to reduce the chance of overwriting newer changes from concurrent tabs or background tasks.