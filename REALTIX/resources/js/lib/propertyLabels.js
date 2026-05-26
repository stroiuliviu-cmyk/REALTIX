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

export const TYPE_OPTIONS = Object.keys(PROPERTY_TYPE_LABELS).map(key => ({
  value: key,
  label: PROPERTY_TYPE_LABELS[key],
}));

export const TRANSACTION_OPTIONS = Object.keys(TRANSACTION_LABELS).map(key => ({
  value: key,
  label: TRANSACTION_LABELS[key],
}));
