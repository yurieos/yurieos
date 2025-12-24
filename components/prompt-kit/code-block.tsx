'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

type CodeBlockProps = {
  children?: React.ReactNode;
  className?: string;
} & React.HTMLProps<HTMLDivElement>;

function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  return (
    <div
      className={cn(
        'not-prose flex w-full flex-col overflow-clip border',
        '[&_.shiki]:!bg-transparent rounded-xl border-border bg-card text-card-foreground',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type CodeBlockCodeProps = {
  code: string;
  language?: string;
  theme?: string;
  className?: string;
} & React.HTMLProps<HTMLDivElement>;

function CodeBlockCode({
  code,
  language = 'tsx',
  theme = 'github-light',
  className,
  ...props
}: CodeBlockCodeProps) {
  const { theme: appTheme } = useTheme();
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

  // Ensure code and language are always valid strings
  const safeCode = typeof code === 'string' ? code : '';
  const safeLanguage =
    typeof language === 'string' && language ? language : 'tsx';

  useEffect(() => {
    if (!appTheme) {
      return;
    }
    // Only highlight if code and language are valid
    if (typeof safeCode !== 'string' || !safeLanguage) {
      setHighlightedHtml(null);
      return;
    }
    async function highlight() {
      const html = await codeToHtml(safeCode, {
        lang: safeLanguage,
        theme: appTheme === 'dark' ? 'github-dark' : 'github-light',
      });
      setHighlightedHtml(html);
    }
    highlight();
  }, [safeCode, safeLanguage, appTheme]);

  const classNames = cn(
    'w-full overflow-x-auto text-[13px] [&>pre]:px-4 [&>pre]:py-4',
    className
  );

  // SSR fallback: render plain code if not hydrated yet
  return highlightedHtml ? (
    <div
      className={classNames}
      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      {...props}
    />
  ) : (
    <div className={classNames} {...props}>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

type CodeBlockGroupProps = React.HTMLAttributes<HTMLDivElement>;

function CodeBlockGroup({
  children,
  className,
  ...props
}: CodeBlockGroupProps) {
  return (
    <div
      className={cn('flex items-center justify-between', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { CodeBlockGroup, CodeBlockCode, CodeBlock };
