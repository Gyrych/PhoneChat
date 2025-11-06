# FreeChat

FreeChat is a lightweight local web-based chat application for local prototyping and demo purposes. It enables users to send messages to a configured external chat API, manage and persist conversations in the browser, and configure an API key via a settings page.

## Features

- Send and receive messages via a configurable external API endpoint.
- Auto-persist the current conversation to `localStorage` and a durable list (no manual save needed).
- Save, load, delete and rename conversations.
- Organize conversations into groups and generate per-conversation summaries.
- Auto-generate per-conversation summaries after each round and refresh group-level memory automatically.
- Inject memory as a single system message before each request:
  - All groups' group memories are injected (configurable), and
  - All session summaries within the current group are injected (configurable).
- Render AI assistant replies as Markdown using `marked` and sanitize with `DOMPurify` for safety.
- When creating a new conversation from the manager page, a modal asks whether to add it to an existing group (with a dropdown selector) and lets you set a name.
- Show the current model as a badge on the chat header.
- For reasoning-capable models (e.g., DeepSeek-R1), the model's reasoning (if returned by the API) streams live and appears ABOVE the assistant reply. It is visible by default and can be folded/unfolded by the user.
- Built-in request/response logging to localStorage (auth masked), with Export/Clear buttons.

## Default (Demo) API Configuration

- Default demo endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Default demo model: `minimax/minimax-m2:free`

Note: The above defaults are provided only as a convenient demo/fallback. For production, use your own API key and a backend proxy to keep secrets off the client.

## Quick Start

1. Download or clone the repository.
2. Open `index.html` in your web browser (no build step required).

## Configuration

1. Open `config.html` and select a model, then click “Save”. The model is stored in `localStorage` under the key `chatModel`.
2. Each saved conversation stores its model in `savedDeepseekConversations[].model`. When you load a conversation from `conversations.html`, if `model` exists it will restore `localStorage.chatModel` automatically.
3. Demo uses a built-in encrypted OpenRouter API key inside `index.html` (for demonstration only; do not rely on it for production).
4. To use your own key, either replace the encrypted string in `index.html` or set `localStorage.setItem('deepseekApiKey', 'YOUR_KEY')` via the browser DevTools; conversation summaries and group memory can read this value as an alternative.

### Memory injection toggles (via localStorage)

- `freechat.memory.inject.allGroups` — `true`/`false` (default `true`): inject all groups' memories (or only current group).
- `freechat.memory.inject.groupSessions` — `true`/`false` (default `true`): inject all session summaries within the current group.
- `freechat.memory.maxConvPerGroup` — number limit for session summaries in the current group (default `10`).
- `freechat.memory.maxCharsPerSection` — character cap per injected section (default `4000`).
- `freechat.memory.preSummarize` — `true`/`false` (default `false`): optionally pre-summarize the current conversation before the first round so its summary can be injected immediately.

## Usage

### Basic Chat
1. Type your message in the input field at the bottom
2. Press Enter or click the send button
3. The AI response will appear in the chat area
4. You can copy or delete messages using the buttons next to each message
5. During response generation, a stop button appears that allows you to terminate the response early
6. The current model is shown as a badge in the top header
7. If you use a reasoning-capable model and the provider returns reasoning content, a reasoning block streams ABOVE the assistant reply; it is visible by default and you can click the toggle to collapse/expand

### Model Configuration
1. Click the settings button in the top navigation bar
2. Select your preferred model from the dropdown menu (options include minimax, deepseek, glm, and more)
3. Save your configuration
4. Return to the chat page to use the selected model

### Conversation Management
1. Click the conversations button in the top navigation bar
2. View all your chat histories organized by date
3. Create conversation groups for better organization
4. Summaries are generated automatically after each assistant reply finishes
5. Group memory is automatically refreshed when conversation summaries update; injection includes all groups' memories and all session summaries of the current group (subject to the toggles above)
6. Load previous conversations or create new ones
7. When creating a new conversation, you'll be prompted to choose a group via dropdown (optional) and set a conversation name (optional)
7. The conversation list shows a model badge next to the name; loading a conversation restores its model

## Project Structure

The core files are:

- `index.html` — Main chat UI and core logic. Includes a demo encrypted OpenRouter key.
- `config.html` — Model selector (stores to `localStorage` key `chatModel`).
- `conversations.html` — Conversation manager (save/load/delete), group management and summaries.
- `prompts.js` — Centralized prompt templates for session summary and group memory.
- `logger.js` — Lightweight front-end logger (ring buffer in localStorage; export/clear UI hooks).
- `style.css` — Styling for the application.
- `script.js` — Optional shared helpers (navigation, JSON storage). Not included by default.
- `tools/encrypt_key.js` — Placeholder for key encryption utilities.

Mermaid visualization of the main front-end structure:

```mermaid
flowchart TB
  A[index.html] --> C[style.css]
  A --> D[config.html]
  A --> E[conversations.html]
  A --> F[prompts.js]
  A --> G[logger.js]
  E --> F
  E --> G
```

## Dependencies

- `marked` — Markdown parser for rendering assistant replies.
- `DOMPurify` — Sanitizer to prevent XSS when rendering Markdown output.
- `CryptoJS` — AES decryption for the built-in demo OpenRouter key.
- `Font Awesome` — Icon set used in the UI.
- `logger.js` is an internal utility (no external dependency).

All libraries are pulled via CDN includes in the HTML files, so no build step is required.

## Security Notes

- API Key storage: Storing API keys in `localStorage` is insecure for production. Use a backend proxy and server-side key storage for real deployments.
- CORS: Client-side requests to external APIs may require CORS; consider using a server-side proxy to avoid CORS restrictions.

## Request/Response Logging

- Purpose: Help diagnose issues by recording raw request/response metadata in the browser.
- Storage: Ring buffer in `localStorage` key `freechat.logs` (default max 1000 entries).
- Privacy: `Authorization` is always masked as `Bearer ***masked***`. No device fingerprinting is collected.
- UI:
  - On `index.html` and `conversations.html`, use the top-right buttons:
    - Export logs (choose JSON or NDJSON)
    - Clear logs (irreversible)
- Config via `localStorage`:
  - `freechat.log.maxEntries` — maximum entries (default 1000)
  - `freechat.log.enable` — `true`/`false` to enable/disable logging

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
