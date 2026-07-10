// Teste pentru renderer-ul Markdown minimal: bold/link-uri, navigare SPA internă,
// respingerea href-urilor nesigure și rezistența la streaming (marcaj neînchis).

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  it('randează **bold** ca <strong>, fără sintaxă brută', () => {
    const { container } = render(<Markdown text="Am găsit **5 apartamente** în Buiucani." color="#2563eb" />);
    expect(container.querySelector('strong')?.textContent).toBe('5 apartamente');
    expect(container.textContent).not.toContain('**');
  });

  it('randează o listă cu elemente', () => {
    const { container } = render(<Markdown text={'- unu\n- doi'} color="#2563eb" />);
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.textContent).not.toContain('- ');
  });

  it('link extern → <a target=_blank rel=noopener>', () => {
    render(<Markdown text="Vezi [site](https://999.md)." color="#2563eb" />);
    const a = screen.getByText('site') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('https://999.md');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toContain('noopener');
  });

  it('link intern → navigare SPA (onInternalLink), fără reload', () => {
    const nav = vi.fn();
    render(<Markdown text="Deschide [anunțul](/assistant/listing/external/6654)." color="#2563eb" onInternalLink={nav} />);
    const a = screen.getByText('anunțul') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('/assistant/listing/external/6654');
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    a.dispatchEvent(ev);
    expect(nav).toHaveBeenCalledWith('/assistant/listing/external/6654');
    expect(ev.defaultPrevented).toBe(true); // preventDefault → fără reload
  });

  it('href nesigur (javascript:) → niciun <a>, doar text', () => {
    const { container } = render(<Markdown text="[click](javascript:alert(1))" color="#2563eb" />);
    expect(container.querySelector('a')).toBeNull();   // garanția de securitate
    expect(container.textContent).toContain('click');
    expect(container.textContent).not.toContain('javascript:');
  });

  it('streaming: marcaj neînchis rămâne literal, fără crash', () => {
    const { container } = render(<Markdown text="Am găsit **5 apart" color="#2563eb" />);
    expect(container.querySelector('strong')).toBeNull();
    expect(container.textContent).toContain('**5 apart');
  });
});
