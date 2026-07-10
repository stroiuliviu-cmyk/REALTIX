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

    // anonim → poarta cere login, cu link-uri către auth-ul REAL (returnTo=/assistant)
    fireEvent.click(screen.getByText('Contactează'));
    expect(screen.getByText('Creează un cont ca să contactezi')).toBeTruthy();
    const signup = screen.getByText('Înregistrează-te') as HTMLAnchorElement;
    const login = screen.getByText('Autentificare') as HTMLAnchorElement;
    expect(signup.getAttribute('href')).toBe('/assistant/register');
    expect(login.getAttribute('href')).toBe('/assistant/login');
  });

  it('utilizator autentificat: „Contactează" merge direct în canalul intern', async () => {
    render(<AssistantApp initialTheme="light" initialLanguage="ro" transport={syncTransport} authUser={{ id: 7 }} />);
    const input = screen.getByPlaceholderText('Scrie ce cauți…');
    fireEvent.change(input, { target: { value: 'apartament' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(screen.getByText('Apartament demo')).toBeTruthy());
    fireEvent.click(screen.getByText('Apartament demo'));
    fireEvent.click(screen.getByText('Contactează'));

    // autentificat → canalul intern, FĂRĂ poarta de login
    expect(screen.getByText('Conversație cu agenția')).toBeTruthy();
    expect(screen.queryByText('Creează un cont ca să contactezi')).toBeNull();
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

describe('price intelligence — badge marketDeltaPct (RO+RU, 3 praguri)', () => {
  beforeEach(() => window.localStorage.clear());

  function transportWithDelta(deltaPct: number): ChatTransport {
    return {
      send: ({ onEvent, conversationId }: SendOptions): Promise<void> => {
        onEvent({ type: 'tool_running', tool: 'search_listings' });
        onEvent({ type: 'cards', listings: [{ ...demoCard, marketDeltaPct: deltaPct }] });
        onEvent({ type: 'token', text: '1 obiect' });
        onEvent({ type: 'done', conversationId: conversationId ?? 'c1' });
        return Promise.resolve();
      },
    };
  }

  async function searchAndGetCard(deltaPct: number, lang: 'ro' | 'ru') {
    render(<AssistantApp initialTheme="light" initialLanguage={lang} transport={transportWithDelta(deltaPct)} />);
    const input = screen.getByPlaceholderText(lang === 'ru' ? 'Напишите, что ищете…' : 'Scrie ce cauți…');
    fireEvent.change(input, { target: { value: 'apartament' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(screen.getByText('Apartament demo')).toBeTruthy());
  }

  it('delta ≤ -5%: „sub media zonei" (RO), cu iconiță direcțională', async () => {
    await searchAndGetCard(-12, 'ro');
    const badge = screen.getByText('≈12% sub media zonei');
    expect(badge).toBeTruthy();
    // regula color-not-only: badge-ul trebuie să conțină și o iconiță, nu doar culoare
    expect(badge.parentElement?.querySelector('svg')).toBeTruthy();
  });

  it('delta ≤ -5%: „ниже средней цены за м² в районе" (RU)', async () => {
    await searchAndGetCard(-12, 'ru');
    expect(screen.getByText('≈12% ниже средней цены за м² в районе')).toBeTruthy();
  });

  it('delta între -5% și +5%: „la nivelul zonei", fără procent (RO)', async () => {
    await searchAndGetCard(2, 'ro');
    expect(screen.getByText('la nivelul zonei')).toBeTruthy();
  });

  it('delta între -5% și +5%: neutru, fără procent (RU)', async () => {
    await searchAndGetCard(-3, 'ru');
    expect(screen.getByText('на уровне средней цены за м² в районе')).toBeTruthy();
  });

  it('delta ≥ +5%: „peste media zonei" (RO), cu iconiță direcțională', async () => {
    await searchAndGetCard(18, 'ro');
    const badge = screen.getByText('≈18% peste media zonei');
    expect(badge).toBeTruthy();
    expect(badge.parentElement?.querySelector('svg')).toBeTruthy();
  });

  it('delta ≥ +5%: „выше средней цены за м² в районе" (RU)', async () => {
    await searchAndGetCard(9, 'ru');
    expect(screen.getByText('≈9% выше средней цены за м² в районе')).toBeTruthy();
  });

  it('fără marketDeltaPct → niciun badge randat', async () => {
    render(<AssistantApp initialTheme="light" initialLanguage="ro" transport={syncTransport} />);
    const input = screen.getByPlaceholderText('Scrie ce cauți…');
    fireEvent.change(input, { target: { value: 'apartament' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(screen.getByText('Apartament demo')).toBeTruthy());

    expect(screen.queryByText(/media zonei/)).toBeNull();
  });

  it('pagina de detaliu: badge + linie explicativă (RO)', async () => {
    await searchAndGetCard(-12, 'ro');
    fireEvent.click(screen.getByText('Apartament demo'));

    expect(screen.getByText('≈12% sub media zonei')).toBeTruthy();
    expect(screen.getByText(/verifică starea, etajul și anul construcției/)).toBeTruthy();
  });

  it('pagina de detaliu: badge + linie explicativă (RU)', async () => {
    await searchAndGetCard(18, 'ru');
    fireEvent.click(screen.getByText('Apartament demo'));

    expect(screen.getByText('≈18% выше средней цены за м² в районе')).toBeTruthy();
    expect(screen.getByText(/чем обоснована разница/)).toBeTruthy();
  });
});
