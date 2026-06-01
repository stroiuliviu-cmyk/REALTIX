export const PROPERTY_TYPE_LABELS = {
  apartment:  'Apartament',
  house:      'Casă',
  cottage:    'Vilă',
  land:       'Teren',
  garage:     'Garaj',
  commercial: 'Comercial',
};

export const PROPERTY_TYPE_LABELS_RU = {
  apartment:  'Квартира',
  house:      'Дом',
  cottage:    'Вилла',
  land:       'Участок',
  garage:     'Гараж',
  commercial: 'Коммерческая',
};

export const TRANSACTION_LABELS = {
  sale:               'Vânzare',
  rent:               'Închiriere lunară',
  inchiriere_zilnica: 'Închiriere pe zi',
  new_build:          'Construcție nouă',
  exchange:           'Schimb',
  buy:                'Cumpăr',
};

export const TRANSACTION_LABELS_RU = {
  sale:               'Продажа',
  rent:               'Аренда',
  inchiriere_zilnica: 'Посуточно',
  new_build:          'Новостройка',
  exchange:           'Обмен',
  buy:                'Куплю',
};

export const getTypeLabel = (type, locale = 'ro') =>
  (locale === 'ru' ? PROPERTY_TYPE_LABELS_RU : PROPERTY_TYPE_LABELS)[type] ?? type;

export const getTransactionLabel = (txn, locale = 'ro') =>
  (locale === 'ru' ? TRANSACTION_LABELS_RU : TRANSACTION_LABELS)[txn] ?? txn;

// Surface unit per property type. Land parcels are quoted in ari (sotka)
// — 1 ar = 100 m² — every other type uses regular floor area in m².
export const areaUnit = (type) => type === 'land' ? 'ari' : 'm²';

// Subtype labels (RO) keyed by the raw `subtype` column value from
// scraped_listings / properties. Apartments use room-count buckets; commercial
// has sector-style facets; garage + land have their own taxonomies. Types not
// listed in SUBTYPES_BY_TYPE (house, cottage) render as plain checkboxes.
export const SUBTYPE_LABELS = {
    // apartments
    '1_camera':   '1 cameră',
    '2_camere':   '2 camere',
    '3_camere':   '3 camere',
    '4plus':      '4+ camere',
    // commercial
    'comercial':  'Spațiu comercial',
    'birou':      'Birou',
    'depozit':    'Depozit',
    'industrial': 'Industrial',
    // garage
    'garaj':      'Garaj',
    'subterana':  'Subterană',
    'loc_parcare':'Loc parcare',
    // land
    'constructii':'Pentru construcții',
    'agricol':    'Agricol',
    'lac':        'Lângă lac',
};

export const getSubtypeLabel = (s) => SUBTYPE_LABELS[s] ?? s;

// Type → ordered subtypes the UI exposes. Types missing here have no subtype
// drawer (house, cottage). Keep aligned with the scraper's bucketing logic.
export const SUBTYPES_BY_TYPE = {
    apartment:  ['1_camera', '2_camere', '3_camere', '4plus'],
    commercial: ['comercial', 'birou', 'depozit', 'industrial'],
    garage:     ['garaj', 'subterana', 'loc_parcare'],
    land:       ['constructii', 'agricol', 'lac'],
};

export const TYPE_OPTIONS = Object.keys(PROPERTY_TYPE_LABELS).map(key => ({
  value: key,
  label: PROPERTY_TYPE_LABELS[key],
}));

export const TRANSACTION_OPTIONS = Object.keys(TRANSACTION_LABELS).map(key => ({
  value: key,
  label: TRANSACTION_LABELS[key],
}));
