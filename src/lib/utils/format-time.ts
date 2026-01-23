/**
 * Time formatting utilities
 * Shared across notes and chat features for consistent time display
 */

// ============================================
// Relative Time Formatting
// ============================================

/**
 * Format a date as a relative time string (e.g., "Just now", "5m ago", "2h ago")
 * Used in note lists, chat history, and timestamps
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const diff = now.getTime() - targetDate.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return targetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: targetDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

/**
 * Format a date as a short relative time (for compact displays)
 * More granular for recent times
 */
export function formatRelativeTimeShort(date: Date | string): string {
  const now = new Date()
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const diff = now.getTime() - targetDate.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (seconds < 10) return 'Just now'
  if (seconds < 60) return `${seconds}s ago`
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return targetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: targetDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

/**
 * Format a date with time for detailed display
 */
export function formatDateTime(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date

  return targetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

// ============================================
// Date Grouping
// ============================================

export type DateGroup = 'today' | 'yesterday' | 'previousWeek' | 'older'

export interface GroupedItems<T> {
  today: T[]
  yesterday: T[]
  previousWeek: T[]
  older: T[]
}

/**
 * Get the date group for a given date
 */
export function getDateGroup(date: Date | string): DateGroup {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  const targetDate = typeof date === 'string' ? new Date(date) : date

  if (targetDate >= today) return 'today'
  if (targetDate >= yesterday) return 'yesterday'
  if (targetDate >= weekAgo) return 'previousWeek'
  return 'older'
}

/**
 * Group items by date using a date accessor function
 * Matches the pattern from chat history grouping
 */
export function groupByDate<T>(
  items: T[],
  getDate: (item: T) => Date | string
): GroupedItems<T> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  const groups: GroupedItems<T> = {
    today: [],
    yesterday: [],
    previousWeek: [],
    older: []
  }

  for (const item of items) {
    const dateValue = getDate(item)
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue

    if (date >= today) {
      groups.today.push(item)
    } else if (date >= yesterday) {
      groups.yesterday.push(item)
    } else if (date >= weekAgo) {
      groups.previousWeek.push(item)
    } else {
      groups.older.push(item)
    }
  }

  return groups
}

/**
 * Get display label for a date group
 */
export function getDateGroupLabel(group: DateGroup): string {
  switch (group) {
    case 'today':
      return 'Today'
    case 'yesterday':
      return 'Yesterday'
    case 'previousWeek':
      return 'Previous 7 Days'
    case 'older':
      return 'Older'
  }
}

/**
 * Check if any items exist in any group
 */
export function hasGroupedItems<T>(groups: GroupedItems<T>): boolean {
  return (
    groups.today.length > 0 ||
    groups.yesterday.length > 0 ||
    groups.previousWeek.length > 0 ||
    groups.older.length > 0
  )
}

/**
 * Get all non-empty groups as an array for iteration
 */
export function getNonEmptyGroups<T>(
  groups: GroupedItems<T>
): Array<{ key: DateGroup; label: string; items: T[] }> {
  const result: Array<{ key: DateGroup; label: string; items: T[] }> = []

  if (groups.today.length > 0) {
    result.push({ key: 'today', label: 'Today', items: groups.today })
  }
  if (groups.yesterday.length > 0) {
    result.push({
      key: 'yesterday',
      label: 'Yesterday',
      items: groups.yesterday
    })
  }
  if (groups.previousWeek.length > 0) {
    result.push({
      key: 'previousWeek',
      label: 'Previous 7 Days',
      items: groups.previousWeek
    })
  }
  if (groups.older.length > 0) {
    result.push({ key: 'older', label: 'Older', items: groups.older })
  }

  return result
}
