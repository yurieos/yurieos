'use client'

import * as React from 'react'

interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode
}

function mergeRefs<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  return value => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(value)
      } else if (ref != null) {
        ;(ref as React.MutableRefObject<T | null>).current = value
      }
    }
  }
}

function mergeProps(
  slotProps: Record<string, unknown>,
  childProps: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...slotProps }

  for (const propName in childProps) {
    const slotPropValue = slotProps[propName]
    const childPropValue = childProps[propName]

    if (propName === 'style') {
      merged[propName] = {
        ...(slotPropValue as object),
        ...(childPropValue as object)
      }
    } else if (propName === 'className') {
      merged[propName] = [slotPropValue, childPropValue]
        .filter(Boolean)
        .join(' ')
    } else if (
      /^on[A-Z]/.test(propName) &&
      typeof slotPropValue === 'function' &&
      typeof childPropValue === 'function'
    ) {
      merged[propName] = (...args: unknown[]) => {
        childPropValue(...args)
        slotPropValue(...args)
      }
    } else if (childPropValue !== undefined) {
      merged[propName] = childPropValue
    }
  }

  return merged
}

const Slot = React.forwardRef<HTMLElement, SlotProps>(
  ({ children, ...slotProps }, forwardedRef) => {
    if (!React.isValidElement(children)) {
      return null
    }

    const childProps = children.props as Record<string, unknown>
    const childRef = (
      children as React.ReactElement & { ref?: React.Ref<HTMLElement> }
    ).ref

    return React.cloneElement(children, {
      ...mergeProps(slotProps, childProps),
      ref: forwardedRef ? mergeRefs(forwardedRef, childRef) : childRef
    } as React.Attributes)
  }
)
Slot.displayName = 'Slot'

export { Slot }
