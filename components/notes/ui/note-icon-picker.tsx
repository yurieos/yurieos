'use client'

import { useState } from 'react'

import { Smile } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'

// ============================================
// Emoji Categories
// ============================================

const EMOJI_CATEGORIES = {
  recent: ['📝', '✅', '🎯', '💡', '⭐'],
  smileys: ['😀', '😊', '🥰', '😎', '🤔', '😴', '🤯', '🥳', '😤', '😭'],
  nature: ['🌸', '🌺', '🌻', '🌹', '🌷', '🌿', '🍀', '🌲', '🌴', '🌵'],
  food: ['🍕', '🍔', '🍟', '🌮', '🍜', '🍣', '🍰', '☕', '🍷', '🍺'],
  activities: ['⚽', '🏀', '🎾', '🎱', '🎮', '🎨', '🎭', '🎬', '🎤', '🎧'],
  travel: ['✈️', '🚗', '🚀', '🛸', '🏠', '🏢', '🏖️', '🏔️', '🌍', '🗺️'],
  objects: ['📱', '💻', '⌨️', '🖥️', '📷', '🔑', '💎', '💰', '📚', '📖'],
  symbols: ['❤️', '💔', '⭐', '✨', '🔥', '💥', '⚡', '🌟', '💫', '✅']
}

// ============================================
// Types
// ============================================

interface NoteIconPickerProps {
  value: string | null
  onChange: (icon: string | null) => void
  trigger?: React.ReactNode
}

// ============================================
// Note Icon Picker Component
// ============================================

export function NoteIconPicker({
  value,
  onChange,
  trigger
}: NoteIconPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] =
    useState<keyof typeof EMOJI_CATEGORIES>('recent')

  const handleSelect = (emoji: string) => {
    onChange(emoji)
    setOpen(false)
  }

  const handleRemove = () => {
    onChange(null)
    setOpen(false)
  }

  const categories = Object.keys(EMOJI_CATEGORIES) as Array<
    keyof typeof EMOJI_CATEGORIES
  >

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            {value ? (
              <span className="text-lg">{value}</span>
            ) : (
              <Smile className="size-4 text-muted-foreground" />
            )}
            <span className="sr-only">Pick icon</span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="flex flex-col gap-2">
          {/* Search */}
          <Input
            placeholder="Search emoji..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8"
          />

          {/* Category tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 capitalize"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Emojis grid */}
          <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
            {EMOJI_CATEGORIES[selectedCategory].map(emoji => (
              <button
                key={emoji}
                className="size-8 flex items-center justify-center text-lg hover:bg-accent rounded transition-colors"
                onClick={() => handleSelect(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Remove button */}
          {value && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-1"
              onClick={handleRemove}
            >
              Remove icon
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
