/**
 * Custom syntax highlighting themes for code blocks
 * Matches the vintage paper aesthetic of the application
 */

import type { CSSProperties } from 'react'

type SyntaxTheme = {
  [key: string]: CSSProperties
}

/**
 * Vintage Paper Light Theme
 * Warm brown and earth tones that complement the vintage paper background
 */
export const vintagePaperLight: SyntaxTheme = {
  'code[class*="language-"]': {
    color: '#4a4239',
    background: 'none',
    fontFamily: 'var(--font-mono)',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.5',
    tabSize: 2,
    hyphens: 'none'
  },
  'pre[class*="language-"]': {
    color: '#4a4239',
    background: 'transparent',
    fontFamily: 'var(--font-mono)',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.5',
    tabSize: 2,
    hyphens: 'none',
    padding: '1em',
    margin: '0',
    overflow: 'auto'
  },
  // Comments - muted olive/gray
  comment: {
    color: '#7a8b6e',
    fontStyle: 'italic'
  },
  prolog: {
    color: '#7a8b6e',
    fontStyle: 'italic'
  },
  doctype: {
    color: '#7a8b6e',
    fontStyle: 'italic'
  },
  cdata: {
    color: '#7a8b6e',
    fontStyle: 'italic'
  },
  // Punctuation - warm gray
  punctuation: {
    color: '#6b5d4d'
  },
  // Namespace - faded
  namespace: {
    opacity: 0.7
  },
  // Properties, tags, booleans, numbers - warm brown
  property: {
    color: '#8b5a2b'
  },
  tag: {
    color: '#8b5a2b'
  },
  boolean: {
    color: '#8b5a2b'
  },
  number: {
    color: '#8b5a2b'
  },
  constant: {
    color: '#8b5a2b'
  },
  symbol: {
    color: '#8b5a2b'
  },
  deleted: {
    color: '#8b5a2b'
  },
  // Selectors, strings, chars - forest green
  selector: {
    color: '#5a7a4d'
  },
  'attr-name': {
    color: '#5a7a4d'
  },
  string: {
    color: '#5a7a4d'
  },
  char: {
    color: '#5a7a4d'
  },
  builtin: {
    color: '#5a7a4d'
  },
  inserted: {
    color: '#5a7a4d'
  },
  // Operators, entities, URLs - darker brown
  operator: {
    color: '#6b4423'
  },
  entity: {
    color: '#6b4423',
    cursor: 'help'
  },
  url: {
    color: '#6b4423'
  },
  '.language-css .token.string': {
    color: '#6b4423'
  },
  '.style .token.string': {
    color: '#6b4423'
  },
  // Atrule, attr-value, keywords - rich brown
  atrule: {
    color: '#8b6914'
  },
  'attr-value': {
    color: '#8b6914'
  },
  keyword: {
    color: '#8b6914'
  },
  // Functions, class-names - terracotta
  function: {
    color: '#a0522d'
  },
  'class-name': {
    color: '#a0522d'
  },
  // Regex, important, variable - deep purple-brown
  regex: {
    color: '#7b5b6e'
  },
  important: {
    color: '#7b5b6e',
    fontWeight: 'bold'
  },
  variable: {
    color: '#7b5b6e'
  },
  // Bold and italic
  bold: {
    fontWeight: 'bold'
  },
  italic: {
    fontStyle: 'italic'
  },
  // Line numbers
  'line-number': {
    color: '#b8a892',
    userSelect: 'none'
  }
}

/**
 * Vintage Paper Dark Theme
 * Warm tones for dark mode that maintain the vintage feel
 * This is an alternative to coldarkDark that better matches our theme
 */
export const vintagePaperDark: SyntaxTheme = {
  'code[class*="language-"]': {
    color: '#e3dcd0',
    background: 'none',
    fontFamily: 'var(--font-mono)',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.5',
    tabSize: 2,
    hyphens: 'none'
  },
  'pre[class*="language-"]': {
    color: '#e3dcd0',
    background: 'transparent',
    fontFamily: 'var(--font-mono)',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.5',
    tabSize: 2,
    hyphens: 'none',
    padding: '1em',
    margin: '0',
    overflow: 'auto'
  },
  // Comments - soft sage
  comment: {
    color: '#9aab8e',
    fontStyle: 'italic'
  },
  prolog: {
    color: '#9aab8e',
    fontStyle: 'italic'
  },
  doctype: {
    color: '#9aab8e',
    fontStyle: 'italic'
  },
  cdata: {
    color: '#9aab8e',
    fontStyle: 'italic'
  },
  // Punctuation - warm gray
  punctuation: {
    color: '#b8a892'
  },
  // Namespace - faded
  namespace: {
    opacity: 0.7
  },
  // Properties, tags, booleans, numbers - warm gold
  property: {
    color: '#d4a574'
  },
  tag: {
    color: '#d4a574'
  },
  boolean: {
    color: '#d4a574'
  },
  number: {
    color: '#d4a574'
  },
  constant: {
    color: '#d4a574'
  },
  symbol: {
    color: '#d4a574'
  },
  deleted: {
    color: '#d4a574'
  },
  // Selectors, strings, chars - soft green
  selector: {
    color: '#98c379'
  },
  'attr-name': {
    color: '#98c379'
  },
  string: {
    color: '#98c379'
  },
  char: {
    color: '#98c379'
  },
  builtin: {
    color: '#98c379'
  },
  inserted: {
    color: '#98c379'
  },
  // Operators, entities, URLs - coral
  operator: {
    color: '#e6a07c'
  },
  entity: {
    color: '#e6a07c',
    cursor: 'help'
  },
  url: {
    color: '#e6a07c'
  },
  '.language-css .token.string': {
    color: '#e6a07c'
  },
  '.style .token.string': {
    color: '#e6a07c'
  },
  // Atrule, attr-value, keywords - golden
  atrule: {
    color: '#ecc94b'
  },
  'attr-value': {
    color: '#ecc94b'
  },
  keyword: {
    color: '#ecc94b'
  },
  // Functions, class-names - peach
  function: {
    color: '#f6ad55'
  },
  'class-name': {
    color: '#f6ad55'
  },
  // Regex, important, variable - lavender
  regex: {
    color: '#c9a0dc'
  },
  important: {
    color: '#c9a0dc',
    fontWeight: 'bold'
  },
  variable: {
    color: '#c9a0dc'
  },
  // Bold and italic
  bold: {
    fontWeight: 'bold'
  },
  italic: {
    fontStyle: 'italic'
  },
  // Line numbers
  'line-number': {
    color: '#6b5d4d',
    userSelect: 'none'
  }
}
