// Static hierarchical location data for Moldova used by the filter sidebars.
// Shape: raion / municipiu → { sectors?: string[], localities: string[] }.
// Only Chișinău currently exposes urban sectors.
//
// Source: the canonical list provided by the product owner. Diacritics must
// match the data here exactly — backend filters do `LIKE '%name%'` so any
// stray transliteration breaks results silently. Do NOT invent localities.

export const CHISINAU_SECTORS = [
    'Botanica', 'Centru', 'Ciocana', 'Buiucani', 'Râșcani',
    'Telecentru', 'Poșta Veche', 'Sculeni', 'Aeroport',
];

export const MOLDOVA_LOCATIONS = {
    'Chișinău mun.': {
        sectors: CHISINAU_SECTORS,
        localities: [
            'Chișinău', 'Bacioi', 'Brăila', 'Bubuieci', 'Budești', 'Buneți', 'Bîc',
            'Ceroborta', 'Cheltuitori', 'Ciorescu', 'Codru', 'Colonița', 'Condrița',
            'Cricova', 'Cruzești', 'Dobrogea', 'Dumbrava', 'Durlești', 'Frumușica',
            'Făurești', 'Ghidighici', 'Goian', 'Goianul Nou', 'Grătiești', 'Hulboaca',
            'Humulești', 'Revaca', 'Străisteni', 'Stăuceni', 'Sîngera', 'Tohatin',
            'Trușeni', 'Vadul lui Vodă', 'Vatra', 'Văduleni',
        ],
    },
    'Tiraspol mun.': { localities: ['Tiraspol'] },
    'Anenii Noi':    { localities: ['Anenii Noi'] },
    'Basarabeasca':  {
        localities: [
            'Abaclia', 'Basarabeasca', 'Bașcalia', 'Bogdanovca', 'Carabetovca',
            'Carabiber', 'Iordanovca', 'Iserlia', 'Ivanovca', 'Sadaclia',
        ],
    },
    'Bender mun.':   { localities: ['Bender/Tighina', 'Proteagailovca'] },
    'Briceni':       {
        localities: [
            'Balasinești', 'Beleavinți', 'Berlinți', 'Bezeda', 'Bocicăuți', 'Bogdănești',
            'Briceni', 'Bulboaca', 'Bălcăuți', 'Caracușenii Noi', 'Caracușenii Vechi',
            'Chirilovca', 'Colicăuți', 'Corjeuți', 'Coteala', 'Cotiujeni', 'Criva',
            'Drepcăuți', 'Grimești', 'Grimăncăuți', 'Groznița', 'Halahora de Jos',
            'Halahora de Sus', 'Hlina', 'Larga', 'Lipcani', 'Marcăuți', 'Medveja',
            'Mihăileni', 'Măcărești', 'Mărcăuții Noi', 'Pavlovca', 'Pererita',
            'Slobozia-Medveja', 'Slobozia-Șirăuți', 'Tabani', 'Tețcani', 'Trebisăuți',
            'Trestieni', 'Șirăuți',
        ],
    },
    'Bălți mun.':    { localities: ['Bălți', 'Elizaveta', 'Sadovoe'] },
    'Cahul':         {
        localities: [
            'Alexanderfeld', 'Alexandru Ioan Cuza', 'Andrușul de Jos', 'Andrușul de Sus',
            'Badicul Moldovenesc', 'Baurci-Moldoveni', 'Borceag', 'Brînza', 'Bucuria',
            'Burlacu', 'Burlăceni', 'Cahul', 'Chioselia Mare', 'Chircani', 'Colibași',
            'Cotihana', 'Crihana Veche', 'Cucoara', 'Cîșlița-Prut', 'Doina', 'Frumușica',
            'Giurgiulești', 'Greceni', 'Găvănoasa', 'Huluboaia', 'Hutulu', 'Iasnaia Poleana',
            'Iujnoe', 'Larga Nouă', 'Larga Veche', 'Lebedenco', 'Lopațica', 'Lucești',
            'Manta', 'Moscovei', 'Nicolaevca', 'Paicu', 'Pașcani', 'Pelinei', 'Roșu',
            'Rumeanțev', 'Slobozia Mare', 'Spicoasa', 'Sătuc', 'Taraclia de Salcie',
            'Tartaul de Salcie', 'Tretești', 'Trifeştii Noi', 'Tudorești', 'Tătărești',
            'Ursoaia', 'Vadul lui Isac', 'Vladimirovca', 'Văleni', 'Zîrnești',
        ],
    },
    'Camenca':       { localities: ['Camenca'] },
    'Cantemir':      {
        localities: [
            'Acui', 'Alexandrovca', 'Antonești', 'Baimaclia', 'Bobocica', 'Cania',
            'Cantemir', 'Capaclia', 'Chioselia', 'Ciobalaccia', 'Cociulia', 'Constantineşti',
            'Coștangalia', 'Crăciun', 'Cîietu', 'Cîrpești', 'Cîșla', 'Dimitrova', 'Enichioi',
            'Flocoasa', 'Floricica', 'Ghioltosu', 'Gotești', 'Haragîș', 'Hîrtop', 'Hănăseni',
            'Iepureni', 'Leca', 'Lingura', 'Lărguța', 'Pleșeni', 'Plopi', 'Popovca',
            'Porumbești', 'Sadîc', 'Stoianovca', 'Suhat', 'Taraclia', 'Tartaul', 'Toceni',
            'Tătărășeni', 'Victorovca', 'Vișniovca', 'Vîlcele', 'Șamalia', 'Șofranovca',
            'Țiganca', 'Țiganca Nouă', 'Țolica', 'Țărăncuța',
        ],
    },
};

/**
 * Flat list of every locality with its raion attached, suitable as Combobox
 * options. Sorted alphabetically by locality name to keep the dropdown stable.
 * Shape: { value, label, sub }.
 */
export function allLocalities() {
    const out = [];
    for (const [raion, data] of Object.entries(MOLDOVA_LOCATIONS)) {
        (data.localities || []).forEach(loc => {
            out.push({ value: loc, label: loc, sub: raion });
        });
    }
    out.sort((a, b) => a.label.localeCompare(b.label, 'ro'));
    return out;
}

/**
 * Sectors for a given city name. Currently only Chișinău has sectors;
 * everything else returns an empty array so the UI hides the sector picker.
 * Matches both diacritic forms.
 */
export function sectorsFor(cityName) {
    if (!cityName) return [];
    const c = cityName.trim().toLowerCase();
    if (c.startsWith('chișinău') || c.startsWith('chisinau')) return CHISINAU_SECTORS;
    return [];
}
