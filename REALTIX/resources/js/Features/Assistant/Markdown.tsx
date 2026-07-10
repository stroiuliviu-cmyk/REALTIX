// resources/js/Features/Assistant/Markdown.tsx
//
// Renderer Markdown minimal, FĂRĂ dependențe, pentru bula asistentului.
// Suportă: **bold**, *italic* / _italic_, `cod`, [text](url), liste (- / * / 1.),
// paragrafe (separate de linie goală) și rânduri simple.
//
// Sigur prin construcție: construiește elemente React (niciun dangerouslySetInnerHTML),
// iar href-urile sunt verificate ca schemă (doar http/https sau relativ „/…"; restul,
// ex. javascript:, se randează ca text). Rezistent la streaming: un marcaj neînchis
// (ex. „**bold") rămâne text literal până sosește închiderea.

import type { CSSProperties, ReactNode } from 'react';

export interface MarkdownProps {
  text: string;
  /** culoarea link-urilor / accentelor (din paletă) */
  color: string;
  /** navigare SPA pentru link-uri interne („/…"); dacă lipsește → link normal */
  onInternalLink?: (href: string) => void;
}

type LinkKind = { kind: 'internal' | 'external'; href: string };

function safeHref(url: string): LinkKind | null {
  const u = url.trim();
  if (u.startsWith('/')) return { kind: 'internal', href: u };
  if (/^https?:\/\//i.test(u)) return { kind: 'external', href: u };
  return null; // schemă nepermisă → tratat ca text
}

// link, `cod`, **bold**, *italic*, _italic_ — în această ordine de prioritate.
// Fabrică (nu constantă globală): renderInline e recursiv, iar un regex /g cu
// lastIndex partajat între apeluri s-ar corupe → nou obiect regex per apel.
const inlineRe = (): RegExp => /(\[[^\]]+\]\([^)]+\))|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(_[^_\s][^_]*_)/g;

function renderInline(text: string, p: MarkdownProps, keyBase: string): ReactNode[] {
  const linkStyle: CSSProperties = { color: p.color, textDecoration: 'underline', fontWeight: 500 };
  const codeStyle: CSSProperties = { background: 'rgba(127,127,127,.15)', padding: '1px 5px', borderRadius: 5, fontSize: '0.92em', fontFamily: 'ui-monospace, monospace' };

  const re = inlineRe();
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyBase}-${i++}`;

    if (m[1]) {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok)!;
      const label = lm[1];
      const dest = safeHref(lm[2]);
      if (!dest) {
        nodes.push(label); // href nesigur → doar textul
      } else if (dest.kind === 'internal') {
        nodes.push(
          <a
            key={key}
            href={dest.href}
            style={linkStyle}
            onClick={(e) => {
              if (p.onInternalLink) {
                e.preventDefault();
                p.onInternalLink(dest.href);
              }
            }}
          >
            {label}
          </a>,
        );
      } else {
        nodes.push(
          <a key={key} href={dest.href} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            {label}
          </a>,
        );
      }
    } else if (m[2]) {
      nodes.push(<code key={key} style={codeStyle}>{tok.slice(1, -1)}</code>);
    } else if (m[3]) {
      nodes.push(<strong key={key}>{renderInline(tok.slice(2, -2), p, key)}</strong>);
    } else if (m[4]) {
      nodes.push(<em key={key}>{renderInline(tok.slice(1, -1), p, key)}</em>);
    } else if (m[5]) {
      nodes.push(<em key={key}>{renderInline(tok.slice(1, -1), p, key)}</em>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type Block =
  | { type: 'p'; lines: string[] }
  | { type: 'list'; ordered: boolean; items: string[] };

function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => { if (para.length) { blocks.push({ type: 'p', lines: para }); para = []; } };
  const flushList = () => { if (list) { blocks.push({ type: 'list', ...list }); list = null; } };

  for (const line of lines) {
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ul) {
      flushPara();
      if (!list || list.ordered) { flushList(); list = { ordered: false, items: [] }; }
      list.items.push(ul[1]);
    } else if (ol) {
      flushPara();
      if (!list || !list.ordered) { flushList(); list = { ordered: true, items: [] }; }
      list.items.push(ol[1]);
    } else if (line.trim() === '') {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

export function Markdown({ text, color, onInternalLink }: MarkdownProps): React.ReactElement {
  const props: MarkdownProps = { text, color, onInternalLink };
  const blocks = parseBlocks(text);

  return (
    <div>
      {blocks.map((block, bi) => {
        if (block.type === 'list') {
          const items = block.items.map((it, ii) => (
            <li key={`li-${bi}-${ii}`} style={{ margin: '2px 0' }}>{renderInline(it, props, `li-${bi}-${ii}`)}</li>
          ));
          const listStyle: CSSProperties = { margin: '6px 0', paddingLeft: 22 };
          return block.ordered
            ? <ol key={`b-${bi}`} style={listStyle}>{items}</ol>
            : <ul key={`b-${bi}`} style={listStyle}>{items}</ul>;
        }
        return (
          <p key={`b-${bi}`} style={{ margin: bi === 0 ? '0 0 8px' : '8px 0', ...(bi === blocks.length - 1 ? { marginBottom: 0 } : {}) }}>
            {block.lines.map((line, li) => (
              <span key={`ln-${bi}-${li}`}>
                {renderInline(line, props, `ln-${bi}-${li}`)}
                {li < block.lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
