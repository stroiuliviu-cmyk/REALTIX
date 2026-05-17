import { useEffect, useRef, useState } from 'react';

/**
 * White-styled combobox: input + filtered options list shown on focus/click.
 * Looks identical to a plain text input but opens a styled dropdown.
 */
export default function Combobox({
    value,
    onChange,
    onCommit,
    options = [],
    placeholder = '',
    className = '',
}) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        const onDocClick = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    const q = (value ?? '').trim().toLowerCase();
    const filtered = q
        ? options.filter(o => o.toLowerCase().includes(q))
        : options;

    const select = (opt) => {
        onChange(opt);
        setOpen(false);
        onCommit?.(opt);
    };

    return (
        <div ref={wrapRef} className="relative">
            <input
                type="text"
                value={value ?? ''}
                onChange={e => { onChange(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onBlur={() => onCommit?.(value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); setOpen(false); onCommit?.(value); }
                    if (e.key === 'Escape') setOpen(false);
                }}
                placeholder={placeholder}
                className={`w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500 ${className}`}
            />
            {open && filtered.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {filtered.map(opt => (
                        <button
                            key={opt}
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => select(opt)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${value === opt ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'}`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
