'use client';

import {
  Arrow,
  Content,
  Portal,
  Provider,
  Root,
  Trigger,
} from '@radix-ui/react-tooltip';
import type { ComponentProps } from 'react';
import { memo } from 'react';
import { cn } from '@/lib/utils';

function TooltipProvider({
  delayDuration = 200,
  skipDelayDuration = 250,
  ...props
}: ComponentProps<typeof Provider>) {
  return (
    <Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    />
  );
}

const Tooltip = memo((props: ComponentProps<typeof Root>) => {
  return <Root data-slot="tooltip" {...props} />;
});
Tooltip.displayName = 'Tooltip';

const TooltipTrigger = memo((props: ComponentProps<typeof Trigger>) => {
  return <Trigger data-slot="tooltip-trigger" {...props} />;
});
TooltipTrigger.displayName = 'TooltipTrigger';

const TooltipContent = memo(
  ({
    className,
    sideOffset = 0,
    children,
    ...props
  }: ComponentProps<typeof Content>) => {
    return (
      <Portal>
        <Content
          className={cn(
            'fade-in-0 zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit animate-in text-balance rounded-md bg-popover px-3 py-1.5 font-medium text-popover-foreground text-xs data-[state=closed]:animate-out',
            className
          )}
          data-slot="tooltip-content"
          sideOffset={sideOffset}
          {...props}
        >
          {children}
          <Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-popover fill-popover" />
        </Content>
      </Portal>
    );
  }
);
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
