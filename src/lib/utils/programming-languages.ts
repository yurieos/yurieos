/**
 * Programming language to file extension mapping
 * Used by both AI chat codeblocks and Notes editor codeblocks
 */

interface LanguageMap {
  [key: string]: string | undefined
}

export const programmingLanguages: LanguageMap = {
  plaintext: '.txt',
  javascript: '.js',
  python: '.py',
  java: '.java',
  c: '.c',
  cpp: '.cpp',
  'c++': '.cpp',
  'c#': '.cs',
  ruby: '.rb',
  php: '.php',
  swift: '.swift',
  'objective-c': '.m',
  kotlin: '.kt',
  typescript: '.ts',
  go: '.go',
  perl: '.pl',
  rust: '.rs',
  scala: '.scala',
  haskell: '.hs',
  lua: '.lua',
  shell: '.sh',
  bash: '.sh',
  sql: '.sql',
  html: '.html',
  css: '.css',
  json: '.json',
  yaml: '.yaml',
  xml: '.xml',
  markdown: '.md'
}
