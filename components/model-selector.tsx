'use client'

import { useEffect, useRef, useState } from 'react'

import { Check, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

import { DEFAULT_MODEL_ID } from '@/lib/config/models'
import { Model } from '@/lib/types'

import { createModelId } from '../lib/utils'

import { Button } from './ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from './ui/command'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

const setCookie = (name: string, value: string, days = 30) => {
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/;SameSite=Lax`
}

const getCookie = (name: string): string | null => {
  for (const c of document.cookie.split(';')) {
    const [n, v] = c.trim().split('=')
    if (n === name) return v
  }
  return null
}

const groupByProvider = (models: Model[]) =>
  models
    .filter(m => m.enabled)
    .reduce(
      (g, m) => {
        ;(g[m.provider] ??= []).push(m)
        return g
      },
      {} as Record<string, Model[]>
    )

// Initialize value from cookie (runs once on mount)
function getInitialValue(): string {
  if (typeof document === 'undefined') return ''
  const saved = getCookie('selectedModel')
  if (saved) {
    try {
      return createModelId(JSON.parse(saved))
    } catch {
      return ''
    }
  }
  return ''
}

export function ModelSelector() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(getInitialValue)
  const [models, setModels] = useState<Model[]>([])
  const hasInitialized = useRef(false)

  useEffect(() => {
    // Only fetch models once on mount
    if (hasInitialized.current) return
    hasInitialized.current = true

    fetch('/api/config/models')
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch models')
        return r.json()
      })
      .then(d => {
        if (d.models) {
          setModels(d.models)
          // Set default model if no cookie value exists
          const currentValue = getInitialValue()
          if (!currentValue && d.models.length) {
            const def =
              d.models.find((m: Model) => m.id === DEFAULT_MODEL_ID) ||
              d.models[0]
            const modelId = createModelId(def)
            setValue(modelId)
            setCookie('selectedModel', JSON.stringify(def))
          }
        }
      })
      .catch(error => {
        console.error('Failed to load models:', error)
        toast.error('Failed to load available models')
      })
  }, [])

  const handleSelect = (id: string) => {
    const newVal = id === value ? '' : id
    setValue(newVal)
    const model = models.find(m => createModelId(m) === newVal)
    setCookie('selectedModel', model ? JSON.stringify(model) : '')
    setOpen(false)
  }

  const selected = models.find(m => createModelId(m) === value)
  const grouped = groupByProvider(models)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-fit gap-1 px-2 text-sm font-semibold text-foreground/70 hover:text-foreground focus:ring-0"
        >
          {selected?.name || 'Select model'}
          <ChevronDown className="size-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command value={value}>
          <CommandInput placeholder="Search models..." />
          <CommandList>
            <CommandEmpty>No model found.</CommandEmpty>
            {Object.entries(grouped).map(([provider, list]) => (
              <CommandGroup key={provider} heading={provider}>
                {list.map(m => {
                  const id = createModelId(m)
                  return (
                    <CommandItem
                      key={id}
                      value={id}
                      onSelect={handleSelect}
                      className="flex justify-between cursor-pointer"
                    >
                      <span className="text-xs font-medium">{m.name}</span>
                      <Check
                        className={`size-4 ${value === id ? 'opacity-100' : 'opacity-0'}`}
                      />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
