/**
 * Kiro Inspector — select any UI element, see its source, describe a change, and copy a prompt for Kiro.
 *
 * Usage:
 *   import { KiroInspector } from 'kiro-inspector'
 *   // Add at the root of your app (e.g. App.tsx):
 *   <KiroInspector />
 *
 * Requires:
 *   - babel-plugin-source-attr.cjs wired into vite.config.ts
 *
 * Keyboard shortcut: ⌘+Shift+I to toggle select mode
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

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

// Inline SVG icons to avoid lucide-react dependency
const IconPointer = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/>
  </svg>
)
const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18"/><path d="M6 6l12 12"/>
  </svg>
)
const IconCopy = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
)
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5"/>
  </svg>
)
const IconGrip = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
  </svg>
)

const Z_TOP = 2147483647
const Z_OVERLAY = 2147483646

const styles = {
  fab: {
    position: 'fixed' as const,
    bottom: 16,
    right: 16,
    zIndex: Z_TOP,
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  fabInactive: {
    background: '#fff',
    color: '#374151',
  },
  fabActive: {
    background: '#2563eb',
    color: '#fff',
  },
  toast: {
    position: 'fixed' as const,
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: Z_TOP,
    background: '#2563eb',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: 24,
    fontSize: 14,
    fontWeight: 500,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  highlight: {
    position: 'fixed' as const,
    pointerEvents: 'none' as const,
    zIndex: Z_OVERLAY,
    border: '2px solid #3b82f6',
    background: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 4,
  },
  highlightLabel: {
    position: 'absolute' as const,
    top: -24,
    left: 0,
    background: '#2563eb',
    color: '#fff',
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    whiteSpace: 'nowrap' as const,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  panel: {
    position: 'fixed' as const,
    zIndex: Z_TOP,
    width: 380,
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    cursor: 'move',
    userSelect: 'none' as const,
  },
  panelTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
    color: '#111827',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    padding: 4,
    borderRadius: 4,
    display: 'flex',
  },
  detailsToggle: {
    padding: '8px 16px',
    borderBottom: '1px solid #f3f4f6',
  },
  detailsBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: '#6b7280',
    padding: 0,
  },
  detailsContent: {
    padding: '12px 16px',
    fontSize: 12,
    maxHeight: 180,
    overflowY: 'auto' as const,
  },
  detailRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 6,
  },
  detailLabel: {
    color: '#9ca3af',
    width: 56,
    flexShrink: 0,
  },
  detailCode: {
    fontFamily: 'ui-monospace, monospace',
    wordBreak: 'break-all' as const,
  },
  pre: {
    background: '#f3f4f6',
    padding: 8,
    borderRadius: 6,
    fontSize: 11,
    overflow: 'auto',
    maxHeight: 64,
    margin: '8px 0 0',
    fontFamily: 'ui-monospace, monospace',
    color: '#6b7280',
  },
  inputSection: {
    padding: '12px 16px',
    borderTop: '1px solid #f3f4f6',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 8,
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    resize: 'none' as const,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  actions: {
    padding: '12px 16px',
    background: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  btnPrimary: {
    width: '100%',
    padding: '10px 16px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnSecondary: {
    width: '100%',
    padding: '10px 16px',
    background: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
}

export default function KiroInspector({ editor = 'kiro' }: KiroInspectorProps) {
  if (import.meta.env.PROD) return null

  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const [active, setActive] = useState(false)
  const [hoveredElement, setHoveredElement] = useState<ElementInfo | null>(null)
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const [changeDescription, setChangeDescription] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null)
  const [fabHover, setFabHover] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  // Create portal container at the very end of body to ensure it's above all other portals
  useEffect(() => {
    const container = document.createElement('div')
    container.id = 'kiro-inspector-portal'
    document.body.appendChild(container)
    setPortalContainer(container)
    return () => { container.remove() }
  }, [])

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
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'I') { e.preventDefault(); setActive(a => !a); setSelectedElement(null) }
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

  const panelPosition = panelPos
    ? { left: panelPos.x, top: panelPos.y }
    : { bottom: 80, right: 16 }

  const editorLabel = editor === 'vscode' ? 'VS Code' : editor === 'webstorm' ? 'WebStorm' : editor.charAt(0).toUpperCase() + editor.slice(1)

  if (!portalContainer) return null

  return createPortal(
    <>
      {/* FAB Button */}
      <button
        data-kiro-select
        onClick={() => { setActive(!active); setSelectedElement(null) }}
        onMouseEnter={() => setFabHover(true)}
        onMouseLeave={() => setFabHover(false)}
        style={{
          ...styles.fab,
          ...(active ? styles.fabActive : styles.fabInactive),
          transform: fabHover ? 'scale(1.1)' : 'scale(1)',
          boxShadow: fabHover ? '0 6px 20px rgba(0,0,0,0.2)' : styles.fab.boxShadow,
        }}
        title="Kiro Inspector (⌘+Shift+I)"
      >
        <IconPointer />
      </button>

      {/* Active mode toast */}
      {active && (
        <div data-kiro-select style={styles.toast}>
          Click any element to inspect • ESC to cancel
        </div>
      )}

      {/* Hover highlight */}
      {active && hoveredElement && (
        <div
          data-kiro-select
          style={{
            ...styles.highlight,
            top: hoveredElement.rect.top,
            left: hoveredElement.rect.left,
            width: hoveredElement.rect.width,
            height: hoveredElement.rect.height,
          }}
        >
          <div style={styles.highlightLabel}>
            {hoveredElement.tagName}{hoveredElement.className ? `.${String(hoveredElement.className).split(' ')[0]}` : ''}
          </div>
        </div>
      )}

      {/* Selected element highlight */}
      {selectedElement && (
        <div
          data-kiro-select
          style={{
            ...styles.highlight,
            border: '2px solid #2563eb',
            top: selectedElement.rect.top,
            left: selectedElement.rect.left,
            width: selectedElement.rect.width,
            height: selectedElement.rect.height,
          }}
        />
      )}

      {/* Panel */}
      {selectedElement && (
        <div data-kiro-select data-kiro-panel style={{ ...styles.panel, ...panelPosition }}>
          <div style={styles.panelHeader} onMouseDown={onDragStart}>
            <div style={styles.panelTitle}>
              <span style={{ color: '#9ca3af' }}><IconGrip /></span>
              Kiro Inspector
            </div>
            <button style={styles.closeBtn} onClick={() => setSelectedElement(null)} onMouseDown={e => e.stopPropagation()}>
              <IconX />
            </button>
          </div>

          <div style={styles.detailsToggle}>
            <button style={styles.detailsBtn} onClick={() => setShowDetails(!showDetails)}>
              <span>{showDetails ? '▼' : '▶'}</span>
              <span style={{ fontWeight: 500 }}>Details</span>
            </button>
          </div>

          {showDetails && (
            <div style={styles.detailsContent}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Element</span>
                <code style={{ ...styles.detailCode, color: '#2563eb' }}>&lt;{selectedElement.tagName}&gt;</code>
              </div>
              {selectedElement.className && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Classes</span>
                  <code style={styles.detailCode}>{selectedElement.className.split(' ').slice(0, 4).join(' ')}</code>
                </div>
              )}
              {selectedElement.sourceFile && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Source</span>
                  <code style={{ ...styles.detailCode, color: '#16a34a' }}>{selectedElement.sourceFile}{selectedElement.sourceLine ? `:${selectedElement.sourceLine}` : ''}</code>
                </div>
              )}
              <pre style={styles.pre}>{selectedElement.outerHTML.replace(/\s*data-source="[^"]*"/g, '').slice(0, 200)}...</pre>
            </div>
          )}

          <div style={styles.inputSection}>
            <div style={styles.inputLabel}>What to change</div>
            <textarea
              value={changeDescription}
              onChange={e => setChangeDescription(e.target.value)}
              placeholder="Describe your change, e.g. Make the background lighter..."
              style={styles.textarea}
              rows={3}
            />
          </div>

          <div style={styles.actions}>
            <button style={styles.btnPrimary} onClick={copyToClipboard}>
              {copied ? <IconCheck /> : <IconCopy />}
              {copied ? 'Copied!' : 'Copy prompt for Kiro'}
            </button>
            <button style={styles.btnSecondary} onClick={openInEditor}>
              Open in {editorLabel}
            </button>
          </div>
        </div>
      )}
    </>,
    portalContainer
  )
}
