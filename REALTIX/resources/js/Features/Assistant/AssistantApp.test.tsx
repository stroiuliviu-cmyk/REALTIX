// resources/js/Features/Assistant/AssistantApp.test.tsx
//
// Smoke test pe ecrane: fiecare ecran se randează, iar fluxul chat→rezultate→
// detaliu→poartă de contact funcționează cu un transport sincron injectat.

import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AssistantApp from './AssistantApp';
import type { ChatTransport, SendOptions } from './transport';
import type { ListingCard } from './types';

const demoCard: ListingCard = {
  id: 'rt-x', source: 'internal', title: 'Apartament demo', dealType: 'sale',
  propertyType: 'apartment', price: 60000, currency: 'EUR', city: 'Chișinău',
  district: 'Buiucani', rooms: 2, area: 60, photoUrl: '', url: '/properties/rt-x', isExternal: false,
};

const syncTransport: ChatTransport = {
  send: ({ onEvent, conversationId }: SendOptions): Promise<void> => {
    onEvent({ type: 'tool_running', tool: 'search_listings' });
    onEvent({ type: 'cards', listings: [demoCard] });
    onEvent({ type: 'token', text: 'Am ' });
    onEvent({ type: 'token', text: 'găsit ' });
    onEvent({ type: 'token', text: '1 obiect' });
    onEvent({ type: 'done', conversationId: conversationId ?? 'c1' });
    return Promise.resolve();
  },
};

function renderApp() {
  return render(<AssistantApp initialTheme="light" initialLanguage="ro" transport={syncTransport} />);
}

describe('AssistantApp (ecrane)', () => {
  beforeEach(() => window.localStorage.clear());

  it('randează ecranul gol cu eyebrow, titlu și sugestii', () => {
    renderApp();
    expect(screen.getByText('Asistent imobiliar AI')).toBeTruthy();
    expect(screen.getByText('Caută-ți locuința prin conversație')).toBeTruthy();
    expect(screen.getByText('Casă de închiriat lângă Chișinău')).toBeTruthy();
  });

  it('chat → rezultate → detaliu → poartă de contact', async () => {
    renderApp();
    const input = screen.getByPlaceholderText('Scrie ce cauți…');
    fireEvent.change(input, { target: { value: 'apartament în Buiucani' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // rezultate: cardul apare
    await waitFor(() => expect(screen.getByText('Apartament demo')).toBeTruthy());

    // deschide detaliul
    fireEvent.click(screen.getByText('Apartament demo'));
    expect(screen.getByText('Contactează')).toBeTruthy();

    // deschide poarta de contact
    fireEvent.click(screen.getByText('Contactează'));
    expect(screen.getByText('Creează un cont ca să contactezi')).toBeTruthy();
  });

  it('ecranul Favorite (gol) se randează', () => {
    renderApp();
    fireEvent.click(screen.getByLabelText('Favorite'));
    expect(screen.getByText('Încă n-ai salvat nimic')).toBeTruthy();
  });

  it('ecranul Conversații se randează', () => {
    renderApp();
    fireEvent.click(screen.getByLabelText('Conversațiile mele'));
    expect(screen.getByText('Conversație nouă')).toBeTruthy();
  });

  it('comutarea RO→RU schimbă textele', () => {
    renderApp();
    fireEvent.click(screen.getByText('RU'));
    expect(screen.getByText('Найди жильё через диалог')).toBeTruthy();
  });
});
