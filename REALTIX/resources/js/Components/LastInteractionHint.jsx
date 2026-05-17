const OUTCOME_ICONS = {
    viewed:    '👁',
    called:    '📞',
    no_answer: '⏳',
    refused:   '❌',
};

const OUTCOME_LABELS = {
    viewed:    'Văzut',
    called:    'Sunat',
    no_answer: 'Nu a răspuns',
    refused:   'Refuz',
};

export default function LastInteractionHint({ hint }) {
    if (!hint) return null;

    const dt = hint.at ? new Date(hint.at) : null;
    const time = dt ? dt.toLocaleTimeString('ro', { hour: '2-digit', minute: '2-digit' }) : '';
    const day = dt ? dt.toLocaleDateString('ro', { day: 'numeric', month: 'short' }) : '';

    return (
        <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
            <span>{OUTCOME_ICONS[hint.outcome] ?? '·'}</span>
            <span className="font-medium text-slate-500">{hint.agent_name ?? '—'}</span>
            <span>· {OUTCOME_LABELS[hint.outcome] ?? hint.outcome}</span>
            <span>· {day} {time}</span>
        </span>
    );
}
