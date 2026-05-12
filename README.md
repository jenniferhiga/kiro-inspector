<p align="center">
  <img width="528.5" height="297.5" alt="Screenshot 2026-05-01 at 2 33 07 PM" src="https://github.com/user-attachments/assets/b4a4c30c-eb84-4f0e-b219-73968afebf25" />
</p>

# Kiro Inspector

Select any UI element in your prototype, see its source file and line, describe a change, and copy a structured prompt for Kiro IDE.

The tool will appear as a small bubble on the bottom right corner:
<img width="1920" height="1200" alt="Screenshot 2026-05-08 at 11 18 52 AM" src="https://github.com/user-attachments/assets/3e516463-d4bf-4c3c-beaa-6e6aac2c11fe" />

And once you select it, you can write your change request, copy prompt, and paste it into your Kiro CLI
<img width="1911" height="1132" alt="Screenshot 2026-05-08 at 11 21 03 AM" src="https://github.com/user-attachments/assets/db5d9efa-e0a0-4cb0-b24a-d95965c9bdc9" />

With that change, you can see it turned the background purple:
<img width="1920" height="1200" alt="Screenshot 2026-05-08 at 11 23 23 AM" src="https://github.com/user-attachments/assets/2c0219ec-37e4-4101-8656-b498564d93f4" />

## Installation

```bash
npm install kiro-inspector
```

## Updating

```bash
npm install kiro-inspector@latest
```

## Setup

### 1. Add the Babel plugin to your Vite config

```ts
// vite.config.ts
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['kiro-inspector/babel-plugin'],
      },
    }),
  ],
})
```

### 2. Add to your root component

```tsx
// App.tsx
import { KiroInspector } from 'kiro-inspector'

function App() {
  return (
    <>
      {/* your app */}
      <KiroInspector />
    </>
  )
}
```

### 3. Choose your editor (optional)

```tsx
<KiroInspector editor="kiro" />    // default
<KiroInspector editor="vscode" />
<KiroInspector editor="cursor" />
<KiroInspector editor="webstorm" />
```

## Peer Dependencies

- `react` (>=18)
- `react-dom` (>=18)

**No other dependencies required!** The component uses inline styles and inline SVG icons, so it works with any CSS framework (or none at all).

---

## Features

- **Works above modals** — Uses a React portal with max z-index to render above any modal, dialog, or overlay (including Radix UI, Headless UI, etc.)
- **Zero styling dependencies** — No Tailwind, no CSS files, no icon libraries. Just works.
- **Keyboard shortcut** — Press `⌘+Shift+I` (Mac) or `Ctrl+Shift+I` (Windows/Linux) to toggle
- **Draggable panel** — Drag the inspector panel anywhere on screen
- **Production safe** — Automatically disabled in production builds

---

## Demo

To try the inspector locally:

```bash
git clone https://github.com/jenniferhiga/kiro-inspector.git
cd kiro-inspector
npm install
npm run demo
```

---

## Manual Installation (without npm)

### 1. Copy files into your project

```
babel-plugin-source-attr.cjs  →  <your-project-root>/babel-plugin-source-attr.cjs
src/components/kiro-inspector/ →  <your-project>/src/components/kiro-inspector/
```

### 2. Add the Babel plugin to your Vite config

```ts
// vite.config.ts
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['./babel-plugin-source-attr.cjs'],
      },
    }),
  ],
})
```

### 3. Add to your root component

```tsx
// App.tsx
import KiroInspector from './components/kiro-inspector/KiroInspector'

function App() {
  return (
    <>
      {/* your app */}
      <KiroInspector />
    </>
  )
}
```

---

## How Kiro Inspector Works

Think of it like "Inspect Element" in Chrome DevTools, but instead of showing you CSS properties, it shows you exactly where that piece of UI lives in your code — and lets you tell Kiro what to change about it.

**Step 1: Invisible bookmarks (build time)**

When the dev server starts, a small plugin automatically adds an invisible bookmark to every UI element — like a sticky note that says "this button came from file X, line 42." These bookmarks only exist in the browser's memory. Your actual code files are never touched.

**Step 2: Click to find (runtime)**

When you click an element in the inspector, it reads that invisible bookmark to instantly know which file and line created it. No searching, no guessing.

**Step 3: Act on it**

From there you can:
- **Open in Kiro IDE** — jumps straight to that exact line in your editor
- **Copy a prompt** — generates a structured change request (with the file, line, and your description) that you paste into Kiro chat, and it knows exactly what to edit

**What it doesn't do:**
- Doesn't modify your source code
- Doesn't slow down the app
- Doesn't affect production builds

It's essentially a bridge between "I see something on screen I want to change" and "here's the exact code responsible for it."

---

## Technical Details & FAQ

### Source Location Tracking

Kiro Inspector uses a two-stage approach to map rendered DOM elements back to their source code:

**Stage 1: Build-time injection (Babel plugin)**

The `babel-plugin-source-attr.cjs` file is a Babel visitor plugin that runs during Vite's JSX transform step. For every `JSXOpeningElement` it encounters, it:

1. Reads the current filename from Babel's `state.filename`
2. Reads the line number from the AST node's `loc.start.line`
3. Strips the path to be relative from `src/` (e.g. `src/pages/home.tsx`)
4. Injects a `data-source="src/pages/home.tsx:42"` attribute onto the element

This means every JSX element in your compiled output carries its original source location. The plugin skips `node_modules` so only your project code is tagged.

**Stage 2: Runtime DOM walking**

When you click an element in the inspector, it walks up the DOM tree from the clicked element looking for the nearest `data-source` attribute. This is necessary because:

- Not every rendered DOM node maps 1:1 to a JSX element (text nodes, fragments, etc.)
- The clicked element might be a child of the component you actually care about
- Walking up ensures you always find the nearest meaningful source location

The attribute value is parsed into a file path and line number, which are then used for the "Open in Editor" and "Copy prompt" features.

### Why not React DevTools / `_debugSource`?

React's built-in `_debugSource` fiber property is the standard way to track JSX source locations. However:

- React 19 with the automatic JSX runtime doesn't reliably populate it in all Vite configurations
- It requires walking the React fiber tree at runtime, which is fragile across React versions
- The Babel plugin approach is simpler, more reliable, and framework-agnostic (works with any JSX)

### Opening Files in Your Editor

The "Open in Editor" button constructs a URI using the editor's protocol handler:

| Editor | Protocol | URI Format |
|--------|----------|------------|
| Kiro | `kiro://` | `kiro://file/<path>:<line>:<col>` |
| VS Code | `vscode://` | `vscode://file/<path>:<line>:<col>` |
| Cursor | `cursor://` | `cursor://file/<path>:<line>:<col>` |
| WebStorm | `webstorm://` | `webstorm://open?file=<path>&line=<line>` |

---

## FAQ

### Do I need the IDE open already?

**Yes.** The protocol handler is registered by the IDE when it's running. If the IDE isn't open, your OS won't know how to handle the URI.

### Do I need the project folder open in the IDE?

**No, but it helps.** The protocol handler opens the file by absolute path, so the IDE will open the file regardless. However, if the project folder is already open, the file opens in that workspace window with full context.

### Does the Babel plugin modify my source files?

**No.** The plugin runs entirely in Vite's in-memory transform pipeline. Your `.tsx` files on disk are never touched. The `data-source` attributes only exist in the compiled JavaScript that Vite serves to the browser.

### Does the Babel plugin affect production builds?

The `data-source` attributes will be present in production HTML. If you want to strip them:

```ts
// vite.config.ts
export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      babel: {
        plugins: mode === 'development' ? ['kiro-inspector/babel-plugin'] : [],
      },
    }),
  ],
}))
```

The `<KiroInspector>` component automatically returns `null` in production, so you don't need to conditionally render it.

### Does this work with Next.js / Remix / other frameworks?

It works with any framework that uses `@vitejs/plugin-react` with Babel. For non-Vite setups (like Next.js with SWC), you'd need to port the Babel plugin to an SWC plugin.

### What about performance?

The Babel plugin adds a small string attribute to each JSX element — negligible in practice. The runtime DOM walking on click is O(depth) where depth is typically 5-15 nodes, so it's instant.

### Can I customize the prompt format?

Yes — the prompt is generated in the `copyToClipboard` function. Fork the repo or copy the component locally to customize.

---

## Changelog

### 1.1.1
- Use React portal to ensure inspector renders above all modals (Radix UI, Headless UI, etc.)
- Add `react-dom` to peer dependencies

### 1.1.0
- Remove Tailwind CSS dependency — uses inline styles
- Remove lucide-react dependency — uses inline SVG icons
- Bump z-index to max (2147483647) for modal compatibility
- Add demo app (`npm run demo`)

### 1.0.1
- Fix keyboard shortcut to ⌘+Shift+I

### 1.0.0
- Initial release
