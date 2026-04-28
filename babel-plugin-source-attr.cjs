/**
 * Babel plugin that injects data-source="relative/path.tsx:line" on every
 * JSX element during development. This lets the Kiro selector open the
 * exact file and line in the editor.
 *
 * Works with any project structure (src/, app/, pages/, etc.)
 */
module.exports = function addSourceAttributes() {
  const t = require('@babel/types')
  const path = require('path')

  return {
    visitor: {
      JSXOpeningElement(nodePath, state) {
        const filename = state.filename
        if (!filename || filename.includes('node_modules')) return

        const line = nodePath.node.loc?.start?.line
        if (!line) return

        // Make path relative to project root (cwd)
        const cwd = state.cwd || process.cwd()
        let relPath = path.relative(cwd, filename)
        // Normalize to forward slashes for consistency
        relPath = relPath.replace(/\\/g, '/')

        // Skip if already tagged
        const alreadyHas = nodePath.node.attributes.some(
          a => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name, { name: 'data-source' })
        )
        if (alreadyHas) return

        nodePath.node.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier('data-source'),
            t.stringLiteral(relPath + ':' + line)
          )
        )
      },
    },
  }
}
