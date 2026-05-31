import { useEffect, useRef, useState } from 'react';
import { X as XIcon } from 'lucide-react';

// Normalize an option to the internal shape. Strings stay first-class so
// callers can pass simple `['Botanica', 'Centru']` without ceremony.
const norm = (opt) => typeof opt === 'string'
    ? { value: opt, label: opt, sub: null }
    : { value: opt.value ?? opt.label, label: opt.label ?? opt.value, sub: opt.sub ?? null };

/**
 * Multi-select combobox with checkbox dropdown + chip tags for selections.
 *
 * Props:
 *   values    — string[] of currently selected option values
 *   onChange  — (string[]) => void called with the new array
 *   options   — string[] | { value, label, sub? }[]
 *   placeholder, disabled — same semantics as <Combobox/>
 *
 * Closed state shows a text input with selected chips above. Filter narrows
 * by label OR sub (so typing the raion name surfaces all its localities).
 */
export default function MultiCombobox({
    values = [],
    onChange,
    options = [],
    placeholder = '',
    className = '',
    disabled = false,
}) {
    const [query, setQuery] = useState('');
    const [open, setOpen]   = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        const onDocClick = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    const normalized = options.map(norm);
    const q = query.trim().toLowerCase();
    const filtered = q
        ? normalized.filter(o =>
              o.label.toLowerCase().includes(q) ||
              (o.sub && o.sub.toLowerCase().includes(q))
          )
        : normalized;

    const toggle = (val) => {
        if (disabled) return;
        const next = values.includes(val)
            ? values.filter(v => v !== val)
            : [...values, val];
        onChange(next);
    };

    const remove = (val) => {
        if (disabled) return;
        onChange(values.filter(v => v !== val));
    };

    return (
        <div ref={wrapRef} className={`relative ${className}`}>
            <input
                type="text"
                value={query}
                disabled={disabled}
                onChange={e => { if (disabled) return; setQuery(e.target.value); setOpen(true); }}
                onFocus={() => { if (!disabled) setOpen(true); }}
                onKeyDown={e => {
                    if (disabled) return;
                    if (e.key === 'Escape') setOpen(false);
                }}
                placeholder={values.length === 0 ? placeholder : ''}
                className={`w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
            />

            {/* Selected chips — render BELOW the input so the text field stays usable for search */}
            {values.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                    {values.map(v => {
                        const opt = normalized.find(o => o.value === v);
                        const label = opt?.label ?? v;
                        return (
                            <span
                                key={v}
                                className="inline-flex items-center gap-1 rounded-md bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-semibold"
                            >
                                {label}
                                <button
                                    type="button"
                                    onClick={() => remove(v)}
                                    disabled={disabled}
                                    className="hover:text-blue-900 disabled:opacity-50"
                                    aria-label={`Elimină ${label}`}
                                >
                                    <XIcon className="w-3 h-3" />
                                </button>
                            </span>
                        );
                    })}
                </div>
            )}

            {open && !disabled && filtered.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {filtered.map(opt => {
                        const checked = values.includes(opt.value);
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => toggle(opt.value)}
                                className={`w-full text-left px-3 py-2 text-sm flex items-start gap-2.5 hover:bg-slate-50 ${checked ? 'bg-blue-50/40' : ''}`}
                            >
                                <span
                                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                        checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                                    }`}
                                >
                                    {checked && <span className="text-white" style={{ fontSize: 10 }}>✓</span>}
                                </span>
                                <div className="min-w-0">
                                    <div className={checked ? 'text-blue-700 font-semibold' : 'text-slate-700'}>{opt.label}</div>
                                    {opt.sub && <div className="text-xs text-slate-400 mt-0.5">{opt.sub}</div>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
