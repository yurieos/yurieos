'use client'

import { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react'

import {
  DefaultReactSuggestionItem,
  SuggestionMenuProps
} from '@blocknote/react'

import { cn } from '@/lib/utils'

// ============================================
// Custom Slash Menu Component
// Clean, minimal design matching app aesthetics
// ============================================

interface SlashMenuProps extends SuggestionMenuProps<DefaultReactSuggestionItem> {}

export const SlashMenu = forwardRef<HTMLDivElement, SlashMenuProps>(
  function SlashMenu({ items, selectedIndex, onItemClick }, ref) {
    const menuRef = useRef<HTMLDivElement>(null)
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

    // Group items by their group property
    const groupedItems = useMemo(() => {
      const groups: Record<string, DefaultReactSuggestionItem[]> = {}

      items.forEach(item => {
        const groupName = item.group || 'Other'
        if (!groups[groupName]) {
          groups[groupName] = []
        }
        groups[groupName].push(item)
      })

      return groups
    }, [items])

    // Scroll selected item into view
    useEffect(() => {
      if (selectedIndex === undefined) return
      const selectedItem = itemRefs.current[selectedIndex]
      if (selectedItem && menuRef.current) {
        selectedItem.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        })
      }
    }, [selectedIndex])

    // Calculate flat index for an item
    const getFlatIndex = useCallback(
      (groupName: string, itemIndex: number) => {
        let flatIndex = 0
        for (const [name, groupItems] of Object.entries(groupedItems)) {
          if (name === groupName) {
            return flatIndex + itemIndex
          }
          flatIndex += groupItems.length
        }
        return flatIndex
      },
      [groupedItems]
    )

    if (items.length === 0) {
      return (
        <div
          ref={ref}
          className="slash-menu-container bg-popover border border-border rounded-lg p-2 min-w-[220px]"
        >
          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
            No results found
          </div>
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className="slash-menu-container bg-popover border border-border rounded-lg overflow-hidden min-w-[220px] max-w-[280px]"
      >
        <div
          ref={menuRef}
          className="max-h-[min(320px,45vh)] overflow-y-auto overflow-x-hidden py-1"
        >
          {Object.entries(groupedItems).map(
            ([groupName, groupItems], groupIndex) => (
              <div key={groupName}>
                {/* Group Divider (except first group) */}
                {groupIndex > 0 && (
                  <div className="mx-2 my-1 h-px bg-border/50" />
                )}

                {/* Group Header */}
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide">
                    {groupName}
                  </span>
                </div>

                {/* Group Items */}
                <div className="px-1">
                  {groupItems.map((item, index) => {
                    const flatIndex = getFlatIndex(groupName, index)
                    const isSelected = flatIndex === selectedIndex

                    return (
                      <SlashMenuItem
                        key={item.title}
                        ref={el => {
                          itemRefs.current[flatIndex] = el
                        }}
                        item={item}
                        isSelected={isSelected}
                        onClick={() => onItemClick?.(item)}
                      />
                    )
                  })}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    )
  }
)

// ============================================
// Individual Menu Item Component
// ============================================

interface SlashMenuItemProps {
  item: DefaultReactSuggestionItem
  isSelected: boolean
  onClick: () => void
}

const SlashMenuItem = forwardRef<HTMLButtonElement, SlashMenuItemProps>(
  function SlashMenuItem({ item, isSelected, onClick }, ref) {
    // Get icon from item - can be a React component or JSX element
    const Icon = item.icon

    return (
      <button
        ref={ref}
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left',
          'transition-colors duration-75',
          'focus:outline-none',
          isSelected
            ? 'bg-accent text-accent-foreground'
            : 'text-popover-foreground hover:bg-accent/60'
        )}
        data-selected={isSelected}
      >
        {/* Icon */}
        {Icon && (
          <span
            className={cn(
              'flex items-center justify-center size-5 rounded flex-shrink-0',
              'text-muted-foreground',
              isSelected && 'text-accent-foreground'
            )}
          >
            <span className="text-sm leading-none [&>svg]:size-4">{Icon}</span>
          </span>
        )}

        {/* Title */}
        <span className="flex-1 text-[13px] truncate">{item.title}</span>
      </button>
    )
  }
)

SlashMenuItem.displayName = 'SlashMenuItem'
