export type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | ClassValue[]
  | Record<string, boolean | undefined | null>;

function toVal(mix: ClassValue): string {
  if (typeof mix === 'string' || typeof mix === 'number') {
    return String(mix);
  }
  if (Array.isArray(mix)) {
    const parts: string[] = [];
    for (let i = 0; i < mix.length; i++) {
      const resolved = toVal(mix[i]);
      if (resolved) parts.push(resolved);
    }
    return parts.join(' ');
  }
  if (mix && typeof mix === 'object') {
    const parts: string[] = [];
    for (const key of Object.keys(mix)) {
      if (mix[key]) parts.push(key);
    }
    return parts.join(' ');
  }
  return '';
}

/**
 * Combines class names cleanly with conflict resolution for common Tailwind utility groups.
 */
export function cn(...inputs: ClassValue[]): string {
  const raw = inputs.map(toVal).filter(Boolean).join(' ');
  if (!raw) return '';
  const tokens = raw.trim().split(/\s+/);
  const seen = new Set<string>();
  const result: string[] = [];
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (!seen.has(token)) {
      seen.add(token);
      result.unshift(token);
    }
  }
  return result.join(' ');
}

type VariantRecord = Record<string, Record<string, string>>;

type VariantSelection<V extends VariantRecord> = {
  [K in keyof V]?: keyof V[K] | undefined;
};

export interface CVAConfig<V extends VariantRecord> {
  variants?: V;
  defaultVariants?: VariantSelection<V>;
}

export type VariantProps<T extends (...args: never[]) => string> = Omit<
  NonNullable<Parameters<T>[0]>,
  'className'
>;

/**
 * Type-safe Class Variance Authority (cva) implementation for shadcn/ui components.
 */
export function cva<V extends VariantRecord>(
  base: string,
  config?: CVAConfig<V>,
) {
  return (
    props?: VariantSelection<V> & { className?: ClassValue },
  ): string => {
    const classes: ClassValue[] = [base];
    const variants = config?.variants;
    const defaults = config?.defaultVariants;

    if (variants) {
      for (const variantKey of Object.keys(variants) as Array<keyof V>) {
        const selectedValue =
          props?.[variantKey] !== undefined
            ? props[variantKey]
            : defaults?.[variantKey];

        if (selectedValue !== undefined) {
          const variantGroup = variants[variantKey];
          const matchedClass = variantGroup[String(selectedValue)];
          if (matchedClass) {
            classes.push(matchedClass);
          }
        }
      }
    }

    if (props?.className) {
      classes.push(props.className);
    }

    return cn(...classes);
  };
}
