'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { ringClass } from '@/components/ball';
import { boxNumbers, isBall, parseNumbers, splitPasted, splitRun } from '@/lib/mark6';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  /** Names a hidden field holding the numbers separated by spaces, so a plain form can submit them. */
  name?: string;
  defaultValue?: string;
  /** Exact starting text for each circle (wins over defaultValue); used to show what was typed after a failed save. */
  defaultCells?: string[];
  /** Gives each circle its own form field name (n1, n2, ...) instead of one joined hidden field. */
  fieldNames?: string[];
  /** "gold" is the extra number. */
  variant?: 'default' | 'gold';
  className?: string;
  count?: number;
  /** Called on every change with what is typed in each circle. */
  onChange?: (cells: string[]) => void;
};

/**
 * One number per circle. No separators to type, so it works with a phone's digits-only keypad:
 * a number that cannot take a second digit (5 to 9) moves on by itself, 1 to 4 move on after a short pause,
 * the keypad's "Next" key moves on, and pasting "3 12 25 31 40 49" fills every circle.
 */
export function NumberBoxes({ label, name, defaultValue = '', defaultCells, fieldNames, variant = 'default', className, count = 6, onChange }: Props) {
  const [cells, setCells] = useState<string[]>(() => {
    if (defaultCells) return Array.from({ length: count }, (_, i) => defaultCells[i] ?? '');
    const start = parseNumbers(defaultValue).slice(0, count).map(String);
    return [...start, ...Array<string>(count - start.length).fill('')];
  });
  // Keystrokes can arrive faster than React re-renders, so the live values are kept here, not read from the last render.
  const live = useRef(cells);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const pause = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(pause.current), []);

  const commit = (next: string[]) => {
    live.current = next;
    setCells(next);
    onChange?.(next);
  };
  const focus = (i: number) => {
    const el = refs.current[i];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const typed = (i: number, raw: string) => {
    const all = raw.replace(/\D/g, '');
    const before = live.current[i];
    // Several digits at once (dictation, autofill): spread them over this circle and the next ones.
    if (all.length > 2 && !(all.length === before.length + 1 && all.startsWith(before))) {
      const parts = splitRun(all);
      const filled = [...live.current];
      parts.forEach((part, k) => {
        if (i + k < count) filled[i + k] = part;
      });
      clearTimeout(pause.current);
      commit(filled);
      focus(Math.min(i + parts.length, count - 1));
      return;
    }
    // One more digit typed after a full circle: it replaces the number instead of being lost.
    const digits = all.length > 2 ? all.slice(-1) : all;
    const next = [...live.current];
    next[i] = digits;
    commit(next);
    // 5 to 9 cannot take a second digit (50+ is not a number), and a typed space or comma also means "next".
    const done = digits.length === 2 || (digits.length === 1 && Number(digits) >= 5) || (digits !== '' && /\D/.test(raw));
    clearTimeout(pause.current);
    if (done && i < count - 1) focus(i + 1);
    else if (digits.length === 1 && Number(digits) >= 1 && i < count - 1) {
      // 1 to 4 could still become 10 to 49, so wait a moment for a second digit before moving on.
      pause.current = setTimeout(() => {
        if (document.activeElement === refs.current[i]) focus(i + 1);
      }, 900);
    }
  };

  const keys = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && live.current[i] === '' && i > 0) {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === 'ArrowRight' && i < count - 1) {
      e.preventDefault();
      focus(i + 1);
    } else if (e.key === 'Enter' && i < count - 1 && live.current[i] !== '') {
      e.preventDefault(); // the keypad's "Next" key; on the last circle Enter submits the form
      focus(i + 1);
    }
  };

  const paste = (e: ClipboardEvent<HTMLDivElement>) => {
    const parts = splitPasted(e.clipboardData.getData('text'));
    if (parts.length < 2) return; // a single number pastes normally
    e.preventDefault();
    const next = Array<string>(count).fill('');
    parts.slice(0, count).forEach((p, i) => (next[i] = p));
    commit(next);
    focus(Math.min(parts.length, count - 1));
  };

  const valid = boxNumbers(cells);
  const seen = new Set<number>();
  const state = cells.map((c) => {
    if (c === '') return 'empty';
    const n = parseInt(c, 10);
    if (!isBall(n) || seen.has(n)) return 'bad';
    seen.add(n);
    return 'ok';
  });

  return (
    <div role="group" aria-label={label} onPaste={paste} style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }} className={cn('grid gap-1.5 sm:gap-2', className ?? 'max-w-sm')}>
      {cells.map((c, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          name={fieldNames?.[i]}
          value={c}
          onChange={(e) => typed(i, e.target.value)}
          onKeyDown={(e) => keys(i, e)}
          onFocus={(e) => e.currentTarget.select()}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={3}
          autoComplete="off"
          enterKeyHint={i < count - 1 ? 'next' : 'done'}
          aria-label={`Number ${i + 1} of ${count}`}
          aria-invalid={state[i] === 'bad'}
          className={cn(
            'aspect-square w-full min-w-0 text-center text-base',
            variant === 'gold' && state[i] !== 'bad'
              ? 'rounded-full border-2 border-gold-bright bg-night font-mono font-bold tabular-nums text-gold-bright'
              : state[i] === 'ok'
                ? ringClass(parseInt(c, 10))
                : 'rounded-full border-2 bg-night font-mono font-bold tabular-nums text-ivory',
            state[i] === 'empty' && variant !== 'gold' && 'border-line',
            state[i] === 'bad' && 'border-miss',
          )}
        />
      ))}
      {name && !fieldNames ? <input type="hidden" name={name} value={valid.join(' ')} /> : null}
    </div>
  );
}
