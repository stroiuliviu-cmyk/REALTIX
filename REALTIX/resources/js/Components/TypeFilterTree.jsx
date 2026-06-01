import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
    TYPE_OPTIONS, SUBTYPES_BY_TYPE, getSubtypeLabel,
} from '@/lib/propertyLabels';

/**
 * Expandable property-type filter. Each type renders as a checkbox; types
 * that own a subtype taxonomy (apartment/commercial/garage/land) get an
 * accompanying chevron that toggles a nested checkbox group.
 *
 * Behaviour:
 *   - Ticking a type row → toggles the value in `values.types`.
 *   - Ticking a subtype  → toggles the value in `values.subtypes`.
 *   - Backend treats the two arrays as an OR group ("show me anything that's
 *     in any of these types OR any of these subtypes"), so it's fine to mix.
 *
 * Counts are best-effort: pass empty objects to render rows without numbers.
 */
export default function TypeFilterTree({
    label = 'Tip proprietate',
    types = [],
    subtypes = [],
    onTypesChange,
    onSubtypesChange,
    countsByType = {},
    countsBySubtype = {},
}) {
    const [expanded, setExpanded] = useState(() => new Set());

    const toggleExpand = (type) => {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(type) ? next.delete(type) : next.add(type);
            return next;
        });
    };

    const toggleType = (value) => {
        const checked = types.includes(value);
        onTypesChange(checked ? types.filter(x => x !== value) : [...types, value]);
    };

    const toggleSubtype = (value) => {
        const checked = subtypes.includes(value);
        onSubtypesChange(checked ? subtypes.filter(x => x !== value) : [...subtypes, value]);
    };

    return (
        <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{label}</div>
            <div className="space-y-1.5">
                {TYPE_OPTIONS.map(({ value: type, label: typeLabel }) => {
                    const typeChecked = types.includes(type);
                    const subs        = SUBTYPES_BY_TYPE[type] ?? [];
                    const hasSubs     = subs.length > 0;
                    const isOpen      = expanded.has(type);
                    const typeCount   = countsByType[type];

                    return (
                        <div key={type}>
                            <div className="flex items-center gap-2 group">
                                <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                    <div
                                        onClick={() => toggleType(type)}
                                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                            typeChecked ? 'bg-blue-600 border-blue-600' : 'border-slate-300 group-hover:border-blue-400'
                                        }`}
                                    >
                                        {typeChecked && <span className="text-white" style={{ fontSize: 10 }}>✓</span>}
                                    </div>
                                    <span className="text-sm text-slate-700 flex-1 truncate">{typeLabel}</span>
                                    {typeCount != null && (
                                        <span className="text-xs text-slate-400 font-mono">
                                            {typeCount.toLocaleString('ro')}
                                        </span>
                                    )}
                                </label>
                                {hasSubs && (
                                    <button
                                        type="button"
                                        onClick={() => toggleExpand(type)}
                                        className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                                        aria-label={isOpen ? 'Restrânge subtipuri' : 'Expandează subtipuri'}
                                        aria-expanded={isOpen}
                                    >
                                        {isOpen
                                            ? <ChevronDown className="w-3.5 h-3.5" />
                                            : <ChevronRight className="w-3.5 h-3.5" />}
                                    </button>
                                )}
                            </div>

                            {hasSubs && isOpen && (
                                <div className="mt-1.5 ml-6 pl-2 border-l border-slate-200/70 space-y-1.5">
                                    {subs.map(sub => {
                                        const checked = subtypes.includes(sub);
                                        const subCount = countsBySubtype[sub];
                                        return (
                                            <label key={sub} className="flex items-center gap-2 cursor-pointer group">
                                                <div
                                                    onClick={() => toggleSubtype(sub)}
                                                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                                        checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300 group-hover:border-blue-400'
                                                    }`}
                                                >
                                                    {checked && <span className="text-white" style={{ fontSize: 9 }}>✓</span>}
                                                </div>
                                                <span className="text-[13px] text-slate-600 flex-1 truncate">{getSubtypeLabel(sub)}</span>
                                                {subCount != null && (
                                                    <span className="text-[11px] text-slate-400 font-mono">
                                                        {subCount.toLocaleString('ro')}
                                                    </span>
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
