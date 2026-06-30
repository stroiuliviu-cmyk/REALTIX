// resources/js/Features/Assistant/mock/listings.ts
//
// Date demo de obiecte pentru MockTransport. Forma respectă ListingCard din ../types.
// La Faza C, sursa reală vine din backend prin SseTransport; aici doar simulăm.

import type { DealType, ListingCard, OwnerType, PropertyType } from '../types';

const img = (id: string): string =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;

/** preț pe m² rotunjit, doar când area > 0 */
const perM2 = (price: number, area?: number): number | undefined =>
  area && area > 0 ? Math.round(price / area) : undefined;

interface Seed {
  id: string;
  source: 'internal' | 'external';
  title: string;
  dealType: DealType;
  propertyType: PropertyType;
  price: number;
  district: string;
  rooms?: number;
  area?: number;
  ownerType: OwnerType;
  rent?: boolean;
  gallery: string[]; // id-uri unsplash (prima = poza principală)
  sourceSite?: ListingCard['sourceSite'];
  unavailable?: boolean;
  postedAt: string;
}

const SEEDS: Seed[] = [
  { id: 'rt-101', source: 'internal', title: 'Apartament luminos, 2 camere', dealType: 'sale', propertyType: 'apartment', price: 58500, district: 'Buiucani', rooms: 2, area: 64, ownerType: 'owner', gallery: ['1502672260266-1c1ef2d93688', '1493809842364-78817add7ffb', '1556909114-f6e7ad7d3136'], postedAt: '2026-06-21' },
  { id: 'rt-102', source: 'internal', title: 'Apartament spațios, 3 camere', dealType: 'sale', propertyType: 'apartment', price: 89000, district: 'Centru', rooms: 3, area: 82, ownerType: 'agency', gallery: ['1493809842364-78817add7ffb', '1502005229762-cf1b2da7c5d6', '1522708323590-d24dbb6b0267'], postedAt: '2026-06-19' },
  { id: 'rt-103', source: 'internal', title: 'Casă cu teren, 4 camere', dealType: 'sale', propertyType: 'house', price: 145000, district: 'Durlești', rooms: 4, area: 160, ownerType: 'agency', gallery: ['1568605114967-8130f3a36994', '1512917774080-9991f1c4c750', '1505691938895-1758d7feb511'], postedAt: '2026-06-15' },
  { id: 'rt-104', source: 'internal', title: 'Apartament premium cu terasă', dealType: 'sale', propertyType: 'apartment', price: 120000, district: 'Telecentru', rooms: 3, area: 110, ownerType: 'agency', gallery: ['1522708323590-d24dbb6b0267', '1493809842364-78817add7ffb', '1502005229762-cf1b2da7c5d6'], postedAt: '2026-06-22' },
  { id: 'rt-105', source: 'internal', title: 'Apartament 2 camere, preț bun', dealType: 'sale', propertyType: 'apartment', price: 47000, district: 'Ciocana', rooms: 2, area: 54, ownerType: 'agency', gallery: ['1484154218962-a197022b5858', '1560448204-e02f11c3d0e2', '1493663284031-b7e3aefcae8e'], postedAt: '2026-06-18' },
  { id: 'rt-110', source: 'internal', title: 'Apartament 2 camere de închiriat', dealType: 'rent', propertyType: 'apartment', price: 450, district: 'Buiucani', rooms: 2, area: 60, ownerType: 'agency', rent: true, gallery: ['1556909114-f6e7ad7d3136', '1502672260266-1c1ef2d93688', '1554995207-c18c203602cb'], postedAt: '2026-06-25' },
  { id: 'rt-111', source: 'internal', title: 'Garsonieră de închiriat, Centru', dealType: 'rent', propertyType: 'apartment', price: 350, district: 'Centru', rooms: 1, area: 34, ownerType: 'owner', rent: true, gallery: ['1505691938895-1758d7feb511', '1493663284031-b7e3aefcae8e'], postedAt: '2026-06-24' },
  { id: 'rt-113', source: 'internal', title: 'Casă de închiriat lângă oraș', dealType: 'rent', propertyType: 'house', price: 800, district: 'Durlești', rooms: 4, area: 150, ownerType: 'agency', rent: true, gallery: ['1512917774080-9991f1c4c750', '1568605114967-8130f3a36994', '1505691938895-1758d7feb511'], postedAt: '2026-06-23' },
  { id: 'ext-201', source: 'external', title: 'Apartament 1 cameră, gata de mutat', dealType: 'sale', propertyType: 'apartment', price: 41000, district: 'Botanica', rooms: 1, area: 38, ownerType: 'owner', gallery: ['1560448204-e02f11c3d0e2', '1484154218962-a197022b5858', '1493663284031-b7e3aefcae8e'], sourceSite: 'imobiliare.md', postedAt: '2026-06-12' },
  { id: 'ext-202', source: 'external', title: 'Apartament 2 camere, bloc nou', dealType: 'sale', propertyType: 'apartment', price: 52000, district: 'Râșcani', rooms: 2, area: 58, ownerType: 'owner', gallery: ['1554995207-c18c203602cb', '1556909114-f6e7ad7d3136', '1502672260266-1c1ef2d93688'], sourceSite: '999.md', postedAt: '2026-06-10' },
  { id: 'ext-203', source: 'external', title: 'Garsonieră în Centru', dealType: 'sale', propertyType: 'apartment', price: 39000, district: 'Centru', rooms: 1, area: 32, ownerType: 'owner', gallery: ['1505691938895-1758d7feb511'], sourceSite: 'piata.md', unavailable: true, postedAt: '2026-05-28' },
];

export const MOCK_LISTINGS: ListingCard[] = SEEDS.map((s) => {
  const isExternal = s.source === 'external';
  const photos = s.gallery.map(img);
  const card: ListingCard = {
    id: s.id,
    source: s.source,
    title: s.title,
    dealType: s.dealType,
    propertyType: s.propertyType,
    price: s.price,
    currency: 'EUR',
    city: 'Chișinău',
    district: s.district,
    rooms: s.rooms,
    area: s.area,
    pricePerM2: perM2(s.price, s.area),
    ownerType: s.ownerType,
    photoCount: photos.length,
    photoUrl: photos[0],
    photos,
    url: `/properties/${s.id}`,
    isExternal,
  };
  if (s.rent) card.rentPeriod = 'month';
  if (isExternal) {
    card.sourceSite = s.sourceSite;
    card.externalUrl = `https://${s.sourceSite ?? '999.md'}/ro/${s.id}`;
  }
  if (s.unavailable) card.unavailable = true;
  card.postedAt = new Date(`${s.postedAt}T09:00:00Z`).toISOString();
  return card;
});

export interface ListingFilters {
  dealType?: DealType;
  district?: string;
  rooms?: number;
  ownerType?: OwnerType;
  propertyType?: PropertyType;
}

/** Filtrare simplă: orice câmp `undefined` e ignorat. */
export function filterListings(filters: ListingFilters = {}): ListingCard[] {
  const { dealType, district, rooms, ownerType, propertyType } = filters;
  return MOCK_LISTINGS.filter(
    (l) =>
      (dealType === undefined || l.dealType === dealType) &&
      (district === undefined || l.district === district) &&
      (rooms === undefined || l.rooms === rooms) &&
      (ownerType === undefined || l.ownerType === ownerType) &&
      (propertyType === undefined || l.propertyType === propertyType),
  );
}
