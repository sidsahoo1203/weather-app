// Small shared building blocks so repeated Tailwind class lists live in one place.
import { cn } from '../lib/cn.js';

// Bordered inner surface. Callers add their own corner radius.
export const CARD = 'border border-divider bg-surface';

/** 44px square icon button. `tone` sets its text colours (normal and pressed). */
export function IconButton({ className, pressed, tone = 'text-fg aria-pressed:text-accent', ...props }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        'inline-grid size-11 shrink-0 place-items-center rounded-[14px] transition duration-200 ease-soft',
        'hover:bg-surface-hover active:scale-95 disabled:opacity-60',
        tone,
        className,
      )}
      {...props}
    />
  );
}

const SEGMENT_SIZES = {
  md: { group: 'rounded-xl', button: 'h-[34px] min-w-10 rounded-[9px] px-2.5 text-[13px]' },
  sm: { group: 'rounded-[10px]', button: 'rounded-[7px] px-[9px] py-1 text-xs' },
};

/**
 * Pill-style toggle group, e.g. °C / °F or a sort order. With role="tablist" the
 * buttons act as tabs. `stretch` makes it fill its container with equal buttons.
 */
export function Segmented({ label, options, value, onChange, size = 'md', stretch = false, className, role = 'group' }) {
  const tabs = role === 'tablist';
  const sizes = SEGMENT_SIZES[size];
  return (
    <div
      role={role}
      aria-label={label}
      className={cn(stretch ? 'flex' : 'inline-flex', 'border border-divider bg-surface p-[3px]', sizes.group, className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role={tabs ? 'tab' : undefined}
            aria-selected={tabs ? active : undefined}
            aria-pressed={tabs ? undefined : active}
            onClick={() => onChange(option.value)}
            className={cn(
              'font-bold whitespace-nowrap transition-colors duration-200',
              sizes.button,
              stretch && 'flex-1',
              active ? 'bg-surface-hover text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' : 'text-muted',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Small uppercase heading. `flush` drops the bottom margin (when it sits in a row). */
export function SectionTitle({ icon: Icon, children, flush = false }) {
  return (
    <h2
      className={cn(
        'flex items-center gap-2 text-xs font-bold tracking-[0.08em] text-muted uppercase',
        !flush && 'mb-3',
      )}
    >
      {Icon && <Icon size={14} className="opacity-80" aria-hidden />}
      {children}
    </h2>
  );
}

export function Skeleton({ className, style }) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-lg bg-[linear-gradient(90deg,var(--skeleton)_0%,var(--surface-hover)_50%,var(--skeleton)_100%)] bg-size-[200%_100%]',
        className,
      )}
      style={style}
    />
  );
}
