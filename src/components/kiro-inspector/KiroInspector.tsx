/**
 * Kiro Inspector — select any UI element, see its source, describe a change, and copy a prompt for Kiro.
 *
 * Usage:
 *   import KiroInspector from './kiro-inspector/KiroInspector'
 *   // Add at the root of your app (e.g. App.tsx):
 *   <KiroInspector />
 *
 * Requires:
 *   - lucide-react (peer dependency)
 *   - babel-plugin-source-attr.cjs in your project root + wired into vite.config.ts
 *   - process.env.EDITOR set in vite.config.ts (e.g. 'kiro', 'code', 'cursor')
 *   - Tailwind CSS (uses utility classes)
 *
 * Keyboard shortcut: ⌘+Shift+K to toggle select mode
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, MousePointer2, Copy, Check, GripHorizontal } from 'lucide-react'

interface ElementInfo {
  tagName: string
  className: string
  id: string
  textContent: string
  rect: DOMRect
  outerHTML: string
  parentPath: string[]
  sourceFile?: string
  sourceLine?: number
}

export type EditorType = 'kiro' | 'vscode' | 'cursor' | 'webstorm'

export interface KiroInspectorProps {
  /** Which editor to open files in. Defaults to 'kiro'. */
  editor?: EditorType
}

export default function KiroInspector({ editor = 'kiro' }: KiroInspectorProps) {
  // Only render in development
  if (import.meta.env.PROD) return null

  const [active, setActive] = useState(false)
  const [hoveredElement, setHoveredElement] = useState<ElementInfo | null>(null)
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const [changeDescription, setChangeDescription] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const panel = (e.target as HTMLElement).closest('[data-kiro-panel]') as HTMLElement
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top }
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      setPanelPos({ x: dragRef.current.origX + (ev.clientX - dragRef.current.startX), y: dragRef.current.origY + (ev.clientY - dragRef.current.startY) })
    }
    const onUp = () => { dragRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  const findSourceInfo = (el: Element): { file?: string; line?: number } => {
    let current: Element | null = el
    while (current) {
      const attr = current.getAttribute('data-source')
      if (attr) {
        const i = attr.lastIndexOf(':')
        if (i > 0) return { file: attr.slice(0, i), line: parseInt(attr.slice(i + 1)) || undefined }
      }
      current = current.parentElement
    }
    return {}
  }

  const getElementInfo = (el: HTMLElement): ElementInfo => {
    const path: string[] = []
    let cur = el.parentElement
    let depth = 0
    const className = typeof el.className === 'string' ? el.className : (el.className as unknown as SVGAnimatedString)?.baseVal || ''
    while (cur && depth < 3) {
      const pc = typeof cur.className === 'string' ? cur.className : (cur.className as unknown as SVGAnimatedString)?.baseVal || ''
      path.unshift(cur.tagName.toLowerCase() + (pc ? `.${pc.split(' ')[0]}` : ''))
      cur = cur.parentElement; depth++
    }
    const src = findSourceInfo(el)
    return { tagName: el.tagName.toLowerCase(), className, id: el.id, textContent: el.textContent?.slice(0, 100) || '', rect: el.getBoundingClientRect(), outerHTML: el.outerHTML.slice(0, 500), parentPath: path, sourceFile: src.file, sourceLine: src.line }
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!active) return
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement
    if (el && !el.closest('[data-kiro-select]')) setHoveredElement(getElementInfo(el))
  }, [active])

  const handleClick = useCallback((e: MouseEvent) => {
    if (!active) return
    e.preventDefault(); e.stopPropagation()
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement
    if (el && !el.closest('[data-kiro-select]')) {
      setSelectedElement(getElementInfo(el)); setActive(false); setChangeDescription(''); setShowDetails(false); setPanelPos(null)
    }
  }, [active])

  useEffect(() => {
    if (active) { document.addEventListener('mousemove', handleMouseMove); document.addEventListener('click', handleClick, true); document.body.style.cursor = 'crosshair' }
    return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('click', handleClick, true); document.body.style.cursor = '' }
  }, [active, handleMouseMove, handleClick])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') { e.preventDefault(); setActive(a => !a); setSelectedElement(null) }
      if (e.key === 'Escape') { setActive(false); setSelectedElement(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const openInEditor = () => {
    if (!selectedElement?.sourceFile) return
    const line = selectedElement.sourceLine || 1
    const file = selectedElement.sourceFile
    
    const editorUrls: Record<EditorType, string> = {
      kiro: `kiro://file/${file}:${line}:1`,
      vscode: `vscode://file/${file}:${line}:1`,
      cursor: `cursor://file/${file}:${line}:1`,
      webstorm: `webstorm://open?file=${file}&line=${line}`,
    }
    
    window.open(editorUrls[editor], '_self')
  }

  const copyToClipboard = () => {
    if (!selectedElement) return
    const loc = selectedElement.sourceFile ? `${selectedElement.sourceFile}${selectedElement.sourceLine ? ':' + selectedElement.sourceLine : ''}` : null
    const html = selectedElement.outerHTML.replace(/\s*data-source="[^"]*"/g, '').slice(0, 400)
    const hint = selectedElement.textContent?.slice(0, 60).trim()
    const prompt = `## UI Change Request\n\n**File:** \`${loc || 'unknown'}\`\n**Element:** \`<${selectedElement.tagName}>\`${hint ? ` containing "${hint}"` : ''}\n**DOM path:** ${selectedElement.parentPath.join(' > ')} > ${selectedElement.tagName}\n${selectedElement.className ? `**Classes:** \`${selectedElement.className.split(' ').slice(0, 5).join(' ')}\`\n` : ''}\n### Current rendered HTML\n\`\`\`html\n${html}\n\`\`\`\n\n### What to change\n${changeDescription.trim() || '<!-- Describe what you want changed -->'}\n`
    navigator.clipboard.writeText(prompt)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const panelStyle = panelPos
    ? { position: 'fixed' as const, left: panelPos.x, top: panelPos.y, bottom: 'auto' as const, right: 'auto' as const }
    : { position: 'fixed' as const, bottom: 80, right: 16 }

  return (
    <>
      <button data-kiro-select onClick={() => { setActive(!active); setSelectedElement(null) }}
        className={`fixed bottom-4 right-4 z-[9999] p-3 rounded-full shadow-lg transition-all ${active ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
        title="Kiro Inspector (⌘+Shift+K)">
        <MousePointer2 className="w-5 h-5" />
      </button>

      {active && (
        <div data-kiro-select className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          Click any element to inspect • ESC to cancel
        </div>
      )}

      {active && hoveredElement && (
        <div data-kiro-select className="fixed pointer-events-none z-[9998] border-2 border-blue-500 bg-blue-500/10"
          style={{ top: hoveredElement.rect.top, left: hoveredElement.rect.left, width: hoveredElement.rect.width, height: hoveredElement.rect.height }}>
          <div className="absolute -top-6 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {hoveredElement.tagName}{hoveredElement.className ? `.${String(hoveredElement.className).split(' ')[0]}` : ''}
          </div>
        </div>
      )}

      {selectedElement && (
        <div data-kiro-select className="fixed pointer-events-none z-[9998] border-2 border-blue-600 bg-blue-500/10 rounded-sm"
          style={{ top: selectedElement.rect.top, left: selectedElement.rect.left, width: selectedElement.rect.width, height: selectedElement.rect.height }} />
      )}

      {selectedElement && (
        <div data-kiro-select data-kiro-panel className="z-[9999] w-96 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden" style={panelStyle}>
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b cursor-move select-none" onMouseDown={onDragStart}>
            <div className="flex items-center gap-2">
              <GripHorizontal className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-900 text-sm">Kiro Inspector</span>
            </div>
            <button onClick={() => setSelectedElement(null)} className="text-gray-400 hover:text-gray-600" onMouseDown={e => e.stopPropagation()}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 py-1.5 border-b border-gray-100">
            <button onClick={() => setShowDetails(!showDetails)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
              <span>{showDetails ? '▼' : '▶'}</span>
              <span className="font-medium">Details</span>
            </button>
          </div>
          {showDetails && (
            <div className="px-4 py-2 space-y-1.5 max-h-48 overflow-y-auto text-xs">
              <div className="flex gap-2"><span className="text-gray-400 w-14 shrink-0">Element</span><code className="text-blue-600">&lt;{selectedElement.tagName}&gt;</code></div>
              {selectedElement.className && <div className="flex gap-2"><span className="text-gray-400 w-14 shrink-0">Classes</span><code className="text-gray-700 break-all">{selectedElement.className.split(' ').slice(0, 4).join(' ')}</code></div>}
              {selectedElement.sourceFile && <div className="flex gap-2"><span className="text-gray-400 w-14 shrink-0">Source</span><code className="text-green-600 break-all">{selectedElement.sourceFile}{selectedElement.sourceLine ? `:${selectedElement.sourceLine}` : ''}</code></div>}
              <pre className="text-gray-500 bg-gray-100 p-2 rounded overflow-x-auto max-h-16 mt-1">{selectedElement.outerHTML.replace(/\s*data-source="[^"]*"/g, '').slice(0, 200)}...</pre>
            </div>
          )}

          <div className="px-4 py-2 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-600 mb-1.5">What to change</div>
            <textarea value={changeDescription} onChange={e => setChangeDescription(e.target.value)}
              placeholder="Describe your change, e.g. Make the background lighter, increase padding..."
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm" rows={3} />
          </div>

          <div className="px-4 py-3 border-t bg-gray-50 space-y-2">
            <button onClick={copyToClipboard} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied to clipboard!' : 'Copy prompt for Kiro'}
            </button>
            <button onClick={openInEditor} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300">Open in {editor === 'vscode' ? 'VS Code' : editor === 'webstorm' ? 'WebStorm' : editor.charAt(0).toUpperCase() + editor.slice(1)}</button>
          </div>
        </div>
      )}
    </>
  )
}
