const FORBIDDEN_TAGS = /<(?:script|foreignObject)\b/i
const SVG_ROOT = /^(?:\uFEFF|\s)*(?:<\?xml\b[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i

/** 地図 SVG の文字列検査。DOM が無いテストでも使える。 */
export function isTrustedMapSvgMarkup(markup: string): boolean {
  const trimmed = markup.trim()
  if (!trimmed || trimmed.length > 2_000_000) return false
  if (FORBIDDEN_TAGS.test(trimmed)) return false
  if (/<parsererror\b/i.test(trimmed)) return false
  return SVG_ROOT.test(trimmed)
}

/**
 * 同一オリジンの地図 SVG だけを host に入れる。
 * script / foreignObject / svg 以外の根は拒否し、importNode する。
 */
export function applyTrustedMapSvg(host: ParentNode, markup: string): boolean {
  if (!isTrustedMapSvgMarkup(markup)) return false
  if (typeof DOMParser === 'undefined') return false

  const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml')
  const root = parsed.documentElement
  if (!root || root.localName.toLowerCase() !== 'svg') return false
  if (root.querySelector('script, foreignObject, parsererror')) return false

  const imported = host.ownerDocument.importNode(root, true)
  while (host.firstChild) host.removeChild(host.firstChild)
  host.appendChild(imported)
  return true
}
