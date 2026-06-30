// resources/js/Features/Assistant/mock/agencies.ts
//
// Date demo de agenții pentru MockTransport. Forma respectă AgencyCard din ../types.

import type { AgencyCard } from '../types';

export const MOCK_AGENCIES: AgencyCard[] = [
  {
    id: 'ag-imobil-prim',
    name: 'Imobil Prim',
    city: 'Chișinău',
    specializations: ['Apartamente', 'Blocuri noi'],
    publicListingsCount: 34,
    url: '/agencies/ag-imobil-prim',
  },
  {
    id: 'ag-casa-verde',
    name: 'Casa Verde',
    city: 'Chișinău',
    specializations: ['Case', 'Terenuri'],
    publicListingsCount: 18,
    url: '/agencies/ag-casa-verde',
  },
  {
    id: 'ag-prime-estate',
    name: 'Prime Estate',
    city: 'Chișinău',
    specializations: ['Comercial', 'Birouri'],
    publicListingsCount: 22,
    url: '/agencies/ag-prime-estate',
  },
];

export interface AgencyFilters {
  city?: string;
  specialization?: string;
}

/** Filtrare simplă: orice câmp `undefined` e ignorat. */
export function filterAgencies(filters: AgencyFilters = {}): AgencyCard[] {
  const { city, specialization } = filters;
  return MOCK_AGENCIES.filter(
    (a) =>
      (city === undefined || a.city === city) &&
      (specialization === undefined || a.specializations.includes(specialization)),
  );
}
