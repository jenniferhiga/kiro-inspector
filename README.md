# Kiro Inspector

Select any UI element in your prototype, see its source file and line, describe a change, and copy a structured prompt for Kiro IDE.

## Quick Start

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
      <KiroInspector projectRoot="/Users/you/your-project" />
    </>
  )
}
```

### 4. Peer dependencies

- `react` (>=18)
- `lucide-react`
- Tailwind CSS

---

## How Kiro Inspector Works
Think of it like "Inspect Element" in Chrome DevTools, but instead of showing you CSS properties, it shows you exactly where that piece of UI lives in your code — and lets you tell Kiro what to change about it.

Step 1: Invisible bookmarks (build time)
When the dev server starts, a small plugin automatically adds an invisible bookmark to every UI element — like a sticky note that says "this button came from file X, line 42." These bookmarks only exist in the browser's memory. Your actual code files are never touched.

Step 2: Click to find (runtime)
When you click an element in the inspector, it reads that invisible bookmark to instantly know which file and line created it. No searching, no guessing.

Step 3: Act on it
From there you can:

Open in Kiro IDE — jumps straight to that exact line in your editor
Copy a prompt — generates a structured change request (with the file, line, and your description) that you paste into Kiro chat, and it knows exactly what to edit

What it doesn't do:
Doesn't modify your source code
Doesn't slow down the app

Doesn't affect production builds (can be disabled for prod). It's essentially a bridge between "I see something on screen I want to change" and "here's the exact code responsible for it."

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

The "Open in Kiro IDE" button constructs a URI using the `kiro://` protocol handler:

```
kiro://file/<absolute-path>:<line>:<column>
```

The `projectRoot` prop you pass to `<KiroInspector>` is combined with the relative path from `data-source` to form the absolute path.

---

## FAQ

### Does this only work with Kiro IDE?

Currently the "Open in Editor" button uses the `kiro://` protocol. To support other editors, you'd change the protocol in `KiroInspector.tsx`:

| Editor | Protocol | URI Format |
|--------|----------|------------|
| Kiro | `kiro://` | `kiro://file/<path>:<line>:<col>` |
| VS Code | `vscode://` | `vscode://file/<path>:<line>:<col>` |
| Cursor | `cursor://` | `cursor://file/<path>:<line>:<col>` |
| WebStorm | `webstorm://` | `webstorm://open?file=<path>&line=<line>` |

To make it configurable, you could add an `editor` prop or read from `localStorage`. The "Copy prompt for Kiro" button works with any editor since it just copies text to your clipboard.

### Do I need the IDE open already?

**Yes.** The `kiro://` protocol handler is registered by the IDE when it's running. If Kiro isn't open, your OS won't know how to handle the URI and nothing will happen (or you'll get an "app not found" dialog). The same applies to VS Code's `vscode://` protocol.

### Do I need the project folder open in the IDE?

**No, but it helps.** The protocol handler opens the file by absolute path, so the IDE will open the file regardless. However:

- If the project folder is already open, the file opens in that workspace window
- If it's not open, the IDE may open the file in a new window without project context (no sidebar, no other files visible)

For the best experience, have your project folder open in the IDE before using "Open in Editor."

### Does the Babel plugin modify my source files?

**No.** The plugin runs entirely in Vite's in-memory transform pipeline. Your `.tsx` files on disk are never touched. The `data-source` attributes only exist in the compiled JavaScript that Vite serves to the browser — the same way JSX is transformed to `createElement` calls without modifying your source. Zero impact on your files, zero git diffs, zero maintenance. It runs automatically as part of Vite's normal dev server startup.

### Does the Babel plugin affect production builds?

The `data-source` attributes will be present in production HTML. If you want to strip them:

- Conditionally include the plugin only in dev:

```ts
// vite.config.ts
export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      babel: {
        plugins: mode === 'development' ? ['./babel-plugin-source-attr.cjs'] : [],
      },
    }),
  ],
}))
```

- Or strip the `<KiroInspector>` component entirely in production with a conditional render.

### Does this work with Next.js / Remix / other frameworks?

It works with any framework that uses `@vitejs/plugin-react` with Babel. For non-Vite setups (like Next.js with SWC), you'd need to port the Babel plugin to an SWC plugin or use a different injection approach.

### What about performance?

The Babel plugin adds a small string attribute to each JSX element. In practice this is negligible — a few KB of extra HTML. The runtime DOM walking on click is O(depth) where depth is typically 5-15 nodes, so it's instant.

### Can I customize the prompt format?

Yes — edit the `copyToClipboard` function in `KiroInspector.tsx`. The prompt is a template string you can restructure however you want.

---

## Updating

Pull the latest files from this repo and replace your local copies. The component is self-contained — just `KiroInspector.tsx` and `babel-plugin-source-attr.cjs`.
