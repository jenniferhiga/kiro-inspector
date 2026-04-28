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

### 3. Set your editor in vite.config.ts

The inspector uses Vite's built-in `/__open-in-editor` endpoint. Add this at the top of your config:

```ts
// vite.config.ts
if (!process.env.EDITOR) {
  process.env.EDITOR = 'kiro'  // or 'code' for VS Code, 'cursor' for Cursor
}
```

### 4. Add to your root component

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

### 5. Peer dependencies

- `react` (>=18)
- `lucide-react`
- Tailwind CSS

---

## How It Works

### Source Location Tracking

Kiro Inspector uses a two-stage approach to map rendered DOM elements back to their source code:

**Stage 1: Build-time injection (Babel plugin)**

The `babel-plugin-source-attr.cjs` file is a Babel visitor plugin that runs during Vite's JSX transform step. For every `JSXOpeningElement` it encounters, it:

1. Reads the current filename from Babel's `state.filename`
2. Reads the line number from the AST node's `loc.start.line`
3. Makes the path relative to the project root (works with any structure: `src/`, `app/`, `pages/`, etc.)
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

The "Open in Kiro IDE" button calls Vite's built-in `/__open-in-editor` endpoint with the relative source path (e.g. `src/pages/home.tsx`). Vite resolves this from the project root on the server side and launches the editor configured via `process.env.EDITOR` in your `vite.config.ts`. This means:

- No hardcoded absolute paths — works on any machine
- The editor is configured once in `vite.config.ts`, not per-user
- Supports any editor: `kiro`, `code`, `cursor`, `webstorm`, etc.

---

## FAQ

### Does this only work with Kiro IDE?

No. The editor is configured in `vite.config.ts` via `process.env.EDITOR`. Set it to whatever editor you use:

| Editor | Value |
|--------|-------|
| Kiro | `kiro` |
| VS Code | `code` |
| Cursor | `cursor` |
| WebStorm | `webstorm` |

The "Copy prompt for Kiro" button works with any editor since it just copies text to your clipboard.

### Do I need the IDE open already?

**Yes.** Vite launches the editor as a subprocess. If the editor isn't installed or not in your PATH, you'll get an error. The editor doesn't need to already be running — Vite will launch it if needed.

### Do I need the project folder open in the IDE?

**No, but it helps.** Vite opens the file by its path relative to the project root. If the IDE is already open with the project, the file opens in that window. If not, the editor may open a new window.

### Does the Babel plugin modify my source files?

**No.** The plugin runs entirely in Vite's in-memory transform pipeline. Your `.tsx` files on disk are never touched. The `data-source` attributes only exist in the compiled JavaScript that Vite serves to the browser — the same way JSX is transformed to `createElement` calls without modifying your source. Zero impact on your files, zero git diffs, zero maintenance. It runs automatically as part of Vite's normal dev server startup.

### Does the Babel plugin affect production builds?

The `<KiroInspector>` component automatically returns `null` in production builds, so it won't render. However, the `data-source` attributes will still be present in production HTML unless you also disable the Babel plugin:

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

This keeps your production HTML clean and slightly smaller.

### Does this work with Next.js / Remix / other frameworks?

It works with any framework that uses `@vitejs/plugin-react` with Babel. For non-Vite setups (like Next.js with SWC), you'd need to port the Babel plugin to an SWC plugin or use a different injection approach.

### What about performance?

The Babel plugin adds a small string attribute to each JSX element. In practice this is negligible — a few KB of extra HTML. The runtime DOM walking on click is O(depth) where depth is typically 5-15 nodes, so it's instant.

### Can I customize the prompt format?

Yes — edit the `copyToClipboard` function in `KiroInspector.tsx`. The prompt is a template string you can restructure however you want.

---

## Updating

Pull the latest files from this repo and replace your local copies. The component is self-contained — just `KiroInspector.tsx` and `babel-plugin-source-attr.cjs`.
