// Per-type contextual filter config — shared between Properties/Index and
// WebOffers/Index sidebars. Keep aligned with PropertyController validation
// rules (`required_if` per type) so server + UI agree.
//
// Filter keys: 'rooms' (1/2/3/4/5+), 'floor' (which floor the unit is on),
// 'floors_total' (total floors in the building).
export const TYPE_CONTEXTUAL_FILTERS = {
    apartment:  ['rooms', 'floor'],
    house:      ['rooms', 'floors_total'],
    cottage:    ['rooms', 'floors_total'],
    land:       [],
    garage:     [],
    commercial: ['floor'],
};

export const CONTEXTUAL_FILTER_LABELS = {
    rooms:        'Camere',
    floor:        'Etaj',
    floors_total: 'Nr. etaje clădire',
};

/**
 * Union of contextual filter keys to expose for the given selected types.
 * If no type is selected, returns the full set so the user can still narrow
 * a mixed result by floor or room count.
 */
export function contextualFiltersForTypes(selectedTypes = []) {
    if (!selectedTypes.length) return ['rooms', 'floor', 'floors_total'];
    const set = new Set();
    selectedTypes.forEach(t => (TYPE_CONTEXTUAL_FILTERS[t] || []).forEach(f => set.add(f)));
    return [...set];
}
