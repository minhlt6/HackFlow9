/**
 * Reusable Design System Tokens for the HackFlow Administration Interface.
 * Centralizes semantic color mappings, typography scales, spacing rhythm,
 * border/radius tokens, shadows, and accessible interaction states.
 */
export const designTokens = {
  colors: {
    brand: {
      primary: 'hsl(var(--primary))',
      primaryForeground: 'hsl(var(--primary-foreground))',
    },
    surface: {
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      card: 'hsl(var(--card))',
      popover: 'hsl(var(--popover))',
      muted: 'hsl(var(--muted))',
      mutedForeground: 'hsl(var(--muted-foreground))',
      accent: 'hsl(var(--accent))',
      border: 'hsl(var(--border))',
      input: 'hsl(var(--input))',
    },
    semantic: {
      success: 'hsl(var(--success))',
      warning: 'hsl(var(--warning))',
      destructive: 'hsl(var(--destructive))',
      info: 'hsl(var(--info))',
    },
  },
  typography: {
    fontFamily: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    },
    scale: {
      pageTitle: 'text-xl sm:text-2xl font-semibold tracking-tight text-foreground',
      sectionTitle: 'text-base font-semibold tracking-tight text-foreground',
      cardTitle: 'text-sm font-semibold text-foreground',
      tableHeader: 'text-xs font-semibold uppercase tracking-wider text-muted-foreground',
      body: 'text-sm text-foreground leading-relaxed',
      bodyCompact: 'text-xs text-foreground leading-normal',
      caption: 'text-xs text-muted-foreground',
      code: 'font-mono text-xs tabular-nums',
    },
  },
  spacing: {
    pageContainer: 'max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6',
    cardPadding: 'p-5',
    cardPaddingCompact: 'p-4',
    tableCell: 'px-4 py-3',
    tableCellCompact: 'px-3 py-2',
    sectionGap: 'gap-6',
    controlGap: 'gap-2.5',
  },
  borders: {
    hairline: 'border border-border',
    subtleDivider: 'divide-y divide-border',
    input: 'border border-input',
  },
  radii: {
    card: 'rounded-lg',      // 8px
    control: 'rounded-md',   // 6px
    badge: 'rounded',        // 4px
  },
  shadows: {
    card: 'shadow-xs',
    dropdown: 'shadow-elevated',
    dialog: 'shadow-xl',
  },
  interactions: {
    focusRing:
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
    disabled: 'disabled:pointer-events-none disabled:opacity-50',
    tableRowHover: 'hover:bg-muted/60 data-[state=selected]:bg-primary/5 transition-colors',
    interactiveTransition: 'transition-colors duration-150 ease-out',
  },
} as const;
