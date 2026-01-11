// Note Editor Components
export { NoteBreadcrumb } from './note-breadcrumb'
export {
  convertBlockNoteToNoteBlocks,
  getPlainTextFromBlocks,
  type NoteEditorHandle
} from './note-editor'
export {
  NoteEditorWrapper as NoteEditor,
  type NoteEditorHandle as NoteEditorRef
} from './note-editor-wrapper'
export { NoteHeader } from './note-header'

// Error Boundaries
export {
  EditorErrorBoundary,
  MinimalErrorBoundary,
  NotesErrorBoundary
} from './error-boundary'

// UI Components
export { QuickSwitcher } from './quick-switcher'
export { NoteIconPicker } from './ui/note-icon-picker'
