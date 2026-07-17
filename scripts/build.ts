import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import * as opentype from 'opentype.js';
import type { Hue, StatsCore, StatsData } from './types.ts';

const ot = (opentype as unknown as { default?: typeof opentype }).default ?? opentype;

type Palette = {
  card: string;
  ink: string;
  sub: string;
  border: string;
  border2: string;
  rule: string;
  hatch: string;
  hatchOp: number;
  peach: string;
  rose: string;
  sage: string;
  caramel: string;
  gold: string;
  teal: string;
  blue: string;
  plum: string;
  track: string;
  shadowOp: number;
};

const loadFont = (p: string): opentype.Font => {
  const b = readFileSync(p);
  return ot.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};

const MOCK: StatsCore = {
  name: 'FeathBow',
  commits: 4820,
  prs: 312,
  issues: 89,
  reviews: 286,
  contributedTo: 41,
  currentStreak: 23,
  longestStreak: 117,
  contribYear: 1820,
  week: [
    { day: 'Thu', count: 2 },
    { day: 'Fri', count: 7 },
    { day: 'Sat', count: 13 },
    { day: 'Sun', count: 5 },
    { day: 'Mon', count: 207 },
    { day: 'Tue', count: 8 },
    { day: 'Wed', count: 28 },
  ],
  weekStart: 'Jun 19',
  weekEnd: 'Jun 25',
  langs: [
    { name: 'Python', pct: 87, hue: 'peach' },
    { name: 'JavaScript', pct: 3.2, hue: 'sage' },
    { name: 'TypeScript', pct: 2.8, hue: 'rose' },
    { name: 'C#', pct: 2.1, hue: 'gold' },
    { name: 'C++', pct: 1.9, hue: 'blue' },
    { name: 'Rust', pct: 1.4, hue: 'plum' },
    { name: 'HTML', pct: 0.6, hue: 'teal' },
    { name: 'C', pct: 0.4, hue: 'caramel' },
  ],
};
const DATA: StatsData | null = (() => {
  try {
    return JSON.parse(readFileSync('assets/stats-data.json', 'utf8')) as StatsData;
  } catch {
    return null;
  }
})();
const STATS: StatsCore = DATA ? { ...MOCK, ...DATA } : MOCK;
console.log(DATA ? 'stats: real data (assets/stats-data.json)' : 'stats: mock data (no stats-data.json)');

type IconKind = 'commit' | 'pr' | 'issue' | 'review' | 'repo';
const STAT_ROWS: [IconKind, string, number][] = [
  ['commit', 'Commits', STATS.commits],
  ['pr', 'Pull requests', STATS.prs],
  ['issue', 'Issues', STATS.issues],
  ['review', 'Reviews', STATS.reviews],
  ['repo', 'Contributed to', STATS.contributedTo],
];
const HUES: Hue[] = ['caramel', 'peach', 'rose', 'sage', 'gold'];

const EMAIL = { text: 'drop me an email' };

const PALETTES: Record<'light' | 'dark', Palette> = {
  light: {
    card: '#FFFBF4',
    ink: '#6E5A4E',
    sub: '#A68B79',
    border: '#ECB79C',
    border2: '#E7D7C6',
    rule: '#D8C0A6',
    hatch: '#6E5A4E',
    hatchOp: 0.05,
    peach: '#E8957A',
    rose: '#E0908C',
    sage: '#9FB892',
    caramel: '#D2A878',
    gold: '#EBC487',
    teal: '#7BAE9F',
    blue: '#8FA9C6',
    plum: '#BD97B6',
    track: '#6E5A4E',
    shadowOp: 0.14,
  },
  dark: {
    card: '#2B221C',
    ink: '#F2E6D6',
    sub: '#B8A492',
    border: '#E8957A',
    border2: '#3C2F27',
    rule: '#6A5747',
    hatch: '#FFFFFF',
    hatchOp: 0.05,
    peach: '#E8957A',
    rose: '#E0908C',
    sage: '#9FB892',
    caramel: '#D2A878',
    gold: '#EBC487',
    teal: '#7BAE9F',
    blue: '#8FA9C6',
    plum: '#BD97B6',
    track: '#FFFFFF',
    shadowOp: 0.5,
  },
};

const FACE: Record<string, opentype.Font> = {
  Kalam: loadFont('fonts/Kalam-Regular.ttf'),
};
const SAFETY = 1.05;
const textW = (s: string | number, fam: string, size: number): number =>
  Math.ceil(FACE[fam].getAdvanceWidth(String(s), size) * SAFETY);
const fmt = (n: number): string => n.toLocaleString('en-US');
const darken = (hex: string, f: number): string => {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};
const pctStr = (p: number): string => {
  const d = p.toFixed(1);
  return `${d === '0.0' ? '<0.1' : d.endsWith('.0') ? d.slice(0, -2) : d}%`;
};
const report: { name: string; ok: boolean; detail: string }[] = [];
const check = (name: string, ok: boolean, detail: string): void => {
  report.push({ name, ok, detail });
  if (!ok) throw new Error(`ASSERT FAILED · ${name} · ${detail}`);
};

function frame(W: number, H: number, P: Palette): string {
  return `<defs>
    <pattern id="pencil" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
      <line x1="0" y1="0" x2="0" y2="14" stroke="${P.hatch}" stroke-width="2" opacity="${P.hatchOp}"/>
      <line x1="7" y1="0" x2="7" y2="14" stroke="${P.hatch}" stroke-width="1.2" opacity="${P.hatchOp * 0.7}"/>
    </pattern>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="9" stdDeviation="11" flood-color="rgb(0,0,0)" flood-opacity="${P.shadowOp}"/></filter>
    <clipPath id="cardclip"><rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="28"/></clipPath>
  </defs>
  <g filter="url(#soft)"><rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="28" fill="${P.card}" stroke="${P.border}" stroke-width="3"/></g>
  <rect x="22" y="22" width="${W - 44}" height="${H - 44}" rx="24" fill="none" stroke="${P.border2}" stroke-width="2" stroke-dasharray="1 7" stroke-linecap="round" opacity="0.9"/>
  <rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="28" fill="url(#pencil)" clip-path="url(#cardclip)"/>`;
}
function statIcon(kind: string, x: number, y: number, c: string): string {
  const s = `transform="translate(${x} ${y})" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"`;
  switch (kind) {
    case 'review':
      return `<g ${s} fill="none"><circle cx="11" cy="11" r="8.5"/><path d="M7 11.2 L10 14.2 L15.6 7.6"/></g>`;
    case 'commit':
      return `<g ${s} fill="none"><circle cx="11" cy="11" r="4.4" fill="${c}" fill-opacity="0.18"/><path d="M0 11 H6.4 M15.6 11 H22"/></g>`;
    case 'pr':
      return `<g ${s} fill="none"><circle cx="4" cy="4" r="3"/><circle cx="4" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M4 7 V15 M18 15 V9 a4 4 0 0 0 -4 -4 H8"/></g>`;
    case 'issue':
      return `<g ${s} fill="none"><circle cx="11" cy="11" r="8.5"/><circle cx="11" cy="11" r="2.6" fill="${c}" fill-opacity="0.5" stroke="none"/></g>`;
    case 'repo':
      return `<g ${s} fill="none"><path d="M11 5.5 C9 4 6 4 4 4.6 V17.6 C6 17 9 17 11 18.5 C13 17 16 17 18 17.6 V4.6 C16 4 13 4 11 5.5 Z"/><path d="M11 5.5 V18.5"/></g>`;
    default:
      return '';
  }
}
function renderPNG(svg: string, W: number, name: string): void {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: W * 2 },
    font: { fontFiles: ['fonts/Kalam-Regular.ttf'], loadSystemFonts: false, defaultFontFamily: 'Kalam' },
  })
    .render()
    .asPng();
  writeFileSync(`assets/${name}.png`, png);
  console.log(`  ${name.padEnd(13)} ${(png.length / 1024).toFixed(1)} KB`);
}

const SW = 840,
  SH = 600;
const IN = { x: 34, y: 34, r: SW - 34, b: SH - 34 };
const HF = 'Kalam';
const FS = { hero: 52, body: 23, small: 18 };
const L = {
  title: { x: 44, nameY: 86, ulY: 98 },
  stat: { x: 46, y0: 150, step: 30, valDx: 290, labelDx: 38 },
  divX: 370,
  lang: { x: 405, headY: 90, ribY: 104, ribH: 13, ribW: 401, y0: 165, step: 30 },
  week: { x: 46, headY: 318, rowY0: 380, rowStep: 28, appleX: 100, appleS: 19, appleStep: 22 },
};
const GAP = 10;
const PLACE: [number, Hue][] = [
  [27, 'rose'],
  [9, 'peach'],
  [3, 'gold'],
  [1, 'sage'],
];
const base3 = (n: number): Hue[] => {
  const out: Hue[] = [];
  for (const [v, h] of PLACE) {
    const d = Math.floor(n / v);
    n -= d * v;
    for (let k = 0; k < d; k++) out.push(h);
  }
  return out;
};
const LAB = { threshold: 60, tag: 'experiment', pad: 10, overshoot: 14, flaskS: 20 };
const isLab = (n: number): boolean => n >= LAB.threshold;
const normalWeek = (): StatsCore['week'] => {
  const n = STATS.week.filter((d) => !isLab(d.count));
  return n.length ? n : STATS.week;
};
const wkMax = (): number => Math.max(...normalWeek().map((d) => d.count), 1);
const peakDay = (): string => normalWeek().reduce((b, d) => (d.count > b.count ? d : b), normalWeek()[0]).day;
const labTagW = (): number => LAB.pad * 2 + textW(LAB.tag, HF, FS.small);
const weekLineX0 = (): number => {
  const normals = STATS.week.filter((d) => !isLab(d.count));
  const maxApples = Math.max(...normals.map((d) => base3(d.count).length), 1);
  const labEnd = STATS.week.some((d) => isLab(d.count)) ? L.week.appleX + 17 + labTagW() : 0;
  return Math.max(L.week.appleX + maxApples * L.week.appleStep, labEnd) + 24;
};
function appleFruit(cx: number, cy: number, s: number, c: string): string {
  const r = s * 0.4,
    by = cy - r * 0.86,
    ty = by - s * 0.24;
  const w0 = s * 0.038,
    w1 = s * 0.072;
  const stem = `<path d="M ${(cx - w0 / 2).toFixed(1)} ${by.toFixed(1)} L ${(cx - w1 / 2).toFixed(1)} ${ty.toFixed(1)} Q ${cx.toFixed(1)} ${(ty - w1 * 0.7).toFixed(1)} ${(cx + w1 / 2).toFixed(1)} ${ty.toFixed(1)} L ${(cx + w0 / 2).toFixed(1)} ${by.toFixed(1)} Z" fill="url(#stemG)"/>`;
  const lL = s * 0.4,
    lW = s * 0.17,
    lx = cx + s * 0.03,
    ly = by - s * 0.012;
  const leaf = `<g transform="translate(${lx.toFixed(1)} ${ly.toFixed(1)}) rotate(-26)"><path d="M 0 0 Q ${(lL * 0.46).toFixed(1)} ${(-lW).toFixed(1)} ${lL.toFixed(1)} ${(-lW * 0.12).toFixed(1)} Q ${(lL * 0.5).toFixed(1)} ${(lW * 0.55).toFixed(1)} 0 0 Z" fill="url(#leafG)"/><path d="M ${(lL * 0.08).toFixed(1)} ${(-lW * 0.04).toFixed(1)} Q ${(lL * 0.5).toFixed(1)} ${(-lW * 0.36).toFixed(1)} ${(lL * 0.92).toFixed(1)} ${(-lW * 0.12).toFixed(1)}" stroke="#37551F" stroke-width="${(s * 0.016).toFixed(1)}" opacity="0.55" fill="none"/></g>`;
  const body = `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${c}"/><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="url(#aShade)"/><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="url(#aGloss)"/><ellipse cx="${(cx - r * 0.34).toFixed(1)}" cy="${(cy - r * 0.4).toFixed(1)}" rx="${(r * 0.2).toFixed(1)}" ry="${(r * 0.13).toFixed(1)}" fill="#fff" opacity="0.5"/>`;
  return body + stem + leaf;
}
function starPathD(cx: number, cy: number, r: number): string {
  const rn = r * 0.55;
  const push = 1.14;
  const O: [number, number][] = [];
  const N: [number, number][] = [];
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + ((2 * Math.PI) / 5) * k;
    O.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    const b = a + Math.PI / 5;
    N.push([cx + rn * Math.cos(b), cy + rn * Math.sin(b)]);
  }
  const ctrl = (p: [number, number], q: [number, number]): [number, number] => [
    cx + ((p[0] + q[0]) / 2 - cx) * push,
    cy + ((p[1] + q[1]) / 2 - cy) * push,
  ];
  let d = `M ${N[4][0].toFixed(1)} ${N[4][1].toFixed(1)} `;
  for (let k = 0; k < 5; k++) {
    const c1 = ctrl(N[(k + 4) % 5], O[k]);
    const c2 = ctrl(O[k], N[k]);
    d += `Q ${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${O[k][0].toFixed(1)} ${O[k][1].toFixed(1)} `;
    d += `Q ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${N[k][0].toFixed(1)} ${N[k][1].toFixed(1)} `;
  }
  d += 'Z';
  return d;
}
function star(cx: number, cy: number, r: number, fill: string): string {
  const d = starPathD(cx, cy, r);
  return `<path d="${d}" fill="${fill}"/><path d="${d}" fill="url(#aShade)"/><path d="${d}" fill="url(#aGloss)"/>`;
}
function ghostStar(cx: number, cy: number, r: number, c: string): string {
  const d = starPathD(cx, cy, r);
  return `<path d="${d}" fill="${c}" fill-opacity="0.14" stroke="${c}" stroke-width="2" stroke-dasharray="4 4.5" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function labFlask(cx: number, cy: number, s: number, c: string): string {
  const u = s / 20;
  const p = (x: number, y: number): string => `${(cx + x * u).toFixed(1)} ${(cy + y * u).toFixed(1)}`;
  const glass = `M ${p(-2.3, -9.5)} L ${p(-2.3, -2.5)} L ${p(-7.2, 6)} Q ${p(-8.2, 8.6)} ${p(-5.6, 8.6)} L ${p(5.6, 8.6)} Q ${p(8.2, 8.6)} ${p(7.2, 6)} L ${p(2.3, -2.5)} L ${p(2.3, -9.5)}`;
  const liquid = `M ${p(-4.9, 2)} Q ${p(0, 0.8)} ${p(4.9, 2)} L ${p(7.2, 6)} Q ${p(8.2, 8.6)} ${p(5.6, 8.6)} L ${p(-5.6, 8.6)} Q ${p(-8.2, 8.6)} ${p(-7.2, 6)} Z`;
  const bub = (x: number, y: number, r: number, o: number): string =>
    `<circle cx="${(cx + x * u).toFixed(1)}" cy="${(cy + y * u).toFixed(1)}" r="${(r * u).toFixed(1)}" fill="${c}" opacity="${o}"/>`;
  return (
    `<path d="${glass}" fill="${c}" fill-opacity="0.08"/>` +
    `<path d="${liquid}" fill="${c}"/><path d="${liquid}" fill="url(#aShade)"/><path d="${liquid}" fill="url(#aGloss)"/>` +
    `<ellipse cx="${(cx - 2.6 * u).toFixed(1)}" cy="${(cy + 3.3 * u).toFixed(1)}" rx="${(1.8 * u).toFixed(1)}" ry="${(0.6 * u).toFixed(1)}" fill="#fff" opacity="0.5"/>` +
    `<path d="M ${p(-4.7, 3.6)} L ${p(-6, 6.4)}" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity="0.45"/>` +
    bub(0.2, -0.6, 1.15, 0.7) +
    `<circle cx="${(cx - 0.2 * u).toFixed(1)}" cy="${(cy - 1 * u).toFixed(1)}" r="${(0.38 * u).toFixed(1)}" fill="#fff" opacity="0.7"/>` +
    bub(-1.3, -3.6, 0.85, 0.5) +
    bub(1.4, -5.9, 0.6, 0.35) +
    `<path d="${glass}" fill="url(#aGloss)"/>` +
    `<path d="${glass}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M ${p(-3.7, -9.5)} L ${p(3.7, -9.5)}" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>`
  );
}
function labTag(x: number, yMid: number, c: string): string {
  const w = labTagW();
  return `<rect x="${x}" y="${(yMid - 12).toFixed(1)}" width="${w}" height="24" rx="12" fill="${c}" fill-opacity="0.1" stroke="${c}" stroke-width="1.5" stroke-dasharray="1 5.5" stroke-linecap="round"/><text x="${x + LAB.pad}" y="${(yMid + 6).toFixed(1)}" font-family="${HF}" font-size="${FS.small}" fill="${c}">${LAB.tag}</text>`;
}
export function moon(cx: number, cy: number, r: number, fill: string, bg: string): string {
  return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}"/><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="url(#aShade)"/><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="url(#aGloss)"/><circle cx="${(cx + r * 0.36).toFixed(1)}" cy="${(cy - r * 0.14).toFixed(1)}" r="${(r * 0.92).toFixed(1)}" fill="${bg}"/>`;
}
function statsAsserts(): void {
  for (const [, label, val] of STAT_ROWS) {
    const labelRight = L.stat.x + L.stat.labelDx + textW(label, HF, FS.body);
    const valueLeft = L.stat.x + L.stat.valDx - textW(val, HF, FS.body);
    check(
      `stats:${label}`,
      labelRight + GAP <= valueLeft,
      `label ${labelRight.toFixed(0)} vs value ${valueLeft.toFixed(0)} ("${fmt(val)}")`,
    );
  }
  check('stats:lang-ribbon-fits', L.lang.x + L.lang.ribW <= IN.r, `ribbon right ${L.lang.x + L.lang.ribW} vs ${IN.r}`);
  check(
    'stats:lang-ribbon-gap',
    L.lang.y0 - 18 - (L.lang.ribY + L.lang.ribH) >= 12,
    `ribbon→legend gap ${(L.lang.y0 - 18 - (L.lang.ribY + L.lang.ribH)).toFixed(0)}`,
  );
  {
    const half = Math.ceil(STATS.langs.length / 2);
    const lw = (l: (typeof STATS.langs)[number]): number =>
      18 + textW(l.name, HF, FS.body) + GAP + textW(pctStr(l.pct), HF, FS.body);
    const col0W = Math.max(...STATS.langs.slice(0, half).map(lw));
    const col1W = Math.max(...STATS.langs.slice(half).map(lw), 0);
    check(
      'stats:lang-cols-gap',
      L.lang.x + col0W + 24 <= IN.r - col1W,
      `col0R ${L.lang.x + col0W} vs col1L ${IN.r - col1W}`,
    );
    check(
      'stats:lang-clears-week',
      L.week.headY - 19 >= L.lang.y0 + (half - 1) * L.lang.step + GAP,
      `langs end ${L.lang.y0 + (half - 1) * L.lang.step} vs week ${L.week.headY - 19}`,
    );
  }
  check(
    'stats:week-clears-kpis',
    L.week.headY - 19 >= L.stat.y0 + (STAT_ROWS.length - 1) * L.stat.step + GAP,
    `week head ${(L.week.headY - 19).toFixed(0)} vs last KPI ${L.stat.y0 + (STAT_ROWS.length - 1) * L.stat.step}`,
  );
  check(
    'stats:week-head',
    L.week.x + textW('This week', HF, FS.body) + GAP <= IN.r - textW(`most active · ${peakDay()}`, HF, FS.small),
    'This week head vs most-active overlap',
  );
  const lineX0 = weekLineX0();
  check('stats:week-line-room', lineX0 + 70 <= IN.r, `week left block pushes line too far: ${lineX0.toFixed(0)} vs ${IN.r}`);
  const labDays = STATS.week.filter((d) => isLab(d.count));
  const labMax = labDays.length ? Math.max(...labDays.map((d) => d.count)) : 0;
  check(
    'stats:week-lab-room',
    !labDays.length || IN.r - 70 + LAB.overshoot + 11 + GAP <= IN.r - textW(labMax, HF, FS.small),
    labDays.length ? `lab star edge vs count "${labMax}"` : 'no lab days',
  );
  const lastRow = L.week.rowY0 + (STATS.week.length - 1) * L.week.rowStep;
  check('stats:week-fits', lastRow + 12 <= IN.b, `last row ${lastRow.toFixed(0)} vs bottom ${IN.b}`);
}
function statsCard(P: Palette): string {
  const rows = STAT_ROWS.map(([k, label, val], i) => {
    const y = L.stat.y0 + i * L.stat.step;
    return `${statIcon(k, L.stat.x, y - 15, P[HUES[i]])}
    <text x="${L.stat.x + L.stat.labelDx}" y="${y}" font-family="${HF}" font-size="${FS.body}" fill="${P.ink}">${label}</text>
    <text x="${L.stat.x + L.stat.valDx}" y="${y}" text-anchor="end" font-family="${HF}" font-size="${FS.body}" font-weight="700" fill="${P.ink}">${fmt(val)}</text>`;
  }).join('');
  let acc = 0;
  const gapW = (i: number): number => 2 + ((i * 7) % 3);
  const segs = STATS.langs
    .map((l, i) => {
      const sl = L.lang.x + (acc / 100) * L.lang.ribW;
      acc += l.pct;
      const sr = L.lang.x + (acc / 100) * L.lang.ribW;
      const g = i < STATS.langs.length - 1 ? gapW(i) : 0;
      const w = Math.max(0, sr - sl - g);
      const dk = darken(P[l.hue], 0.62);
      let hx = sl - L.lang.ribH;
      let hi = 0;
      let lines = '';
      while (hx < sl + w) {
        lines += `<line x1="${hx.toFixed(1)}" y1="${L.lang.ribY + L.lang.ribH}" x2="${(hx + L.lang.ribH).toFixed(1)}" y2="${L.lang.ribY}" stroke="${dk}" stroke-width="1.4" opacity="0.5"/>`;
        hx += 4 + ((hi * 5) % 4) * 0.7;
        hi++;
      }
      return `<rect x="${sl.toFixed(1)}" y="${L.lang.ribY}" width="${w.toFixed(1)}" height="${L.lang.ribH}" fill="${P[l.hue]}" fill-opacity="0.95"/><clipPath id="seg${i}"><rect x="${sl.toFixed(1)}" y="${L.lang.ribY}" width="${w.toFixed(1)}" height="${L.lang.ribH}"/></clipPath><g clip-path="url(#seg${i})">${lines}</g>`;
    })
    .join('');
  const ribbon = `<defs><clipPath id="langrib"><rect x="${L.lang.x}" y="${L.lang.ribY}" width="${L.lang.ribW}" height="${L.lang.ribH}" rx="${L.lang.ribH / 2}"/></clipPath></defs>
    <g clip-path="url(#langrib)"><rect x="${L.lang.x}" y="${L.lang.ribY}" width="${L.lang.ribW}" height="${L.lang.ribH}" fill="${P.track}" fill-opacity="0.08"/>${segs}</g>`;
  const half = Math.ceil(STATS.langs.length / 2);
  const lw = (l: (typeof STATS.langs)[number]): number =>
    18 + textW(l.name, HF, FS.body) + GAP + textW(pctStr(l.pct), HF, FS.body);
  const col1W = Math.max(...STATS.langs.slice(half).map(lw), 0);
  const colX = [L.lang.x, IN.r - col1W];
  const langs =
    ribbon +
    STATS.langs
      .map((l, i) => {
        const c = i < half ? 0 : 1;
        const y = L.lang.y0 + (i < half ? i : i - half) * L.lang.step;
        const px = colX[c] + 18 + textW(l.name, HF, FS.body) + GAP;
        return `<circle cx="${colX[c] + 5}" cy="${y - 6}" r="4.2" fill="${P[l.hue]}"/>
    <text x="${colX[c] + 18}" y="${y}" font-family="${HF}" font-size="${FS.body}" fill="${P.ink}">${l.name}</text>
    <text x="${px.toFixed(0)}" y="${y}" font-family="${HF}" font-size="${FS.body}" font-weight="700" fill="${P.ink}">${pctStr(l.pct)}</text>`;
      })
      .join('');
  const wk = STATS.week;
  const mx = wkMax();
  const peak = peakDay();
  const W = L.week;
  const lineX0 = weekLineX0();
  const scale = (IN.r - 70 - lineX0) / mx;
  const cy = (i: number) => W.rowY0 + i * W.rowStep - 5;
  const pts = wk.map(
    (d, i) => [lineX0 + Math.min(d.count, mx) * scale + (isLab(d.count) ? LAB.overshoot : 0), cy(i)] as const,
  );
  const dayColor = (n: number): string => {
    if (isLab(n)) return P.plum;
    const hue = base3(n)[0];
    return hue ? P[hue] : P.sub;
  };
  const peakColor = dayColor(normalWeek().reduce((b, d) => (d.count > b.count ? d : b), normalWeek()[0]).count);
  const maxX = Math.max(...pts.map((p) => p[0]));
  const areaPath = `M ${lineX0.toFixed(1)} ${pts[0][1].toFixed(1)} ${pts.map((p) => `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')} L ${lineX0.toFixed(1)} ${pts[pts.length - 1][1].toFixed(1)} Z`;
  const proj =
    `<clipPath id="wkArea"><path d="${areaPath}"/></clipPath>` +
    wk
      .map(
        (d, i) =>
          `<rect x="${lineX0.toFixed(1)}" y="${(cy(i) - W.rowStep / 2).toFixed(1)}" width="${(maxX - lineX0).toFixed(1)}" height="${W.rowStep}" fill="${dayColor(d.count)}" opacity="${isLab(d.count) ? 0.35 : 0.5}" clip-path="url(#wkArea)"/>`,
      )
      .join('');
  const line = `M ${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')}`;
  const appleDefs =
    '<defs><radialGradient id="aGloss" cx="0.36" cy="0.3" r="0.72"><stop offset="0" stop-color="#fff" stop-opacity="0.40"/><stop offset="0.45" stop-color="#fff" stop-opacity="0.07"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><radialGradient id="aShade" cx="0.68" cy="0.78" r="0.85"><stop offset="0.4" stop-color="#2a1d14" stop-opacity="0"/><stop offset="1" stop-color="#2a1d14" stop-opacity="0.32"/></radialGradient><linearGradient id="stemG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6F4A2C"/><stop offset="0.5" stop-color="#B98C5E"/><stop offset="1" stop-color="#7A5232"/></linearGradient><linearGradient id="leafG" x1="0" y1="0" x2="1" y2="0.2"><stop offset="0" stop-color="#4E7233"/><stop offset="1" stop-color="#82A552"/></linearGradient></defs>';
  const LEG: [number, Hue][] = [
    [1, 'sage'],
    [3, 'gold'],
    [9, 'peach'],
    [27, 'rose'],
  ];
  const legLabel = 'base-3 · radix economy';
  const legW =
    textW(legLabel, HF, FS.small) + 12 + LEG.reduce((w, [v]) => w + 19 + textW(String(v), HF, FS.small) + 12, 0);
  let lgx = IN.r - legW + 12;
  let legend = `<text x="${lgx.toFixed(1)}" y="${W.headY + 28}" font-family="${HF}" font-size="${FS.small}" fill="${P.sub}">${legLabel}</text>`;
  lgx += textW(legLabel, HF, FS.small) + 12;
  for (const [v, h] of LEG) {
    legend +=
      appleFruit(lgx + 8, W.headY + 23, 15, P[h]) +
      `<text x="${(lgx + 19).toFixed(1)}" y="${W.headY + 28}" font-family="${HF}" font-size="${FS.small}" fill="${P.sub}">${v}</text>`;
    lgx += 19 + textW(String(v), HF, FS.small) + 12;
  }
  const weekRows = wk
    .map((d, i) => {
      const y = W.rowY0 + i * W.rowStep;
      const today = i === wk.length - 1;
      const left = isLab(d.count)
        ? labFlask(W.appleX + 1, cy(i) - 1, LAB.flaskS, P.plum) + labTag(W.appleX + 17, cy(i), P.plum)
        : base3(d.count)
            .map((h, a) => appleFruit(W.appleX + a * W.appleStep, cy(i), W.appleS, P[h]))
            .join('');
      const [vx, vy] = pts[i];
      const marker = isLab(d.count) ? ghostStar(vx, vy, 11, P.plum) : star(vx, vy, 11, dayColor(d.count));
      return `<text x="${W.x}" y="${y}" font-family="${HF}" font-size="${FS.small}" fill="${today ? P.ink : P.sub}"${today ? ' font-weight="700"' : ''}>${d.day}</text>${left}${marker}<text x="${IN.r}" y="${(vy + 5).toFixed(1)}" text-anchor="end" font-family="${HF}" font-size="${FS.small}" font-weight="700" fill="${dayColor(d.count)}">${d.count}</text>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}">${frame(SW, SH, P)}${appleDefs}
  <text x="${L.title.x}" y="${L.title.nameY}" font-family="Kalam" font-size="${FS.hero}" font-weight="700" fill="${P.ink}">${STATS.name}</text>
  <path d="M${L.title.x + 2} ${L.title.ulY} q120 -8 236 0" fill="none" stroke="${P.peach}" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 9" opacity="0.85"/>
  ${rows}
  <path d="M${L.divX} 136 V272" fill="none" stroke="${P.rule}" stroke-width="2.4" stroke-dasharray="1 7" stroke-linecap="round" opacity="0.9"/>
  <text x="${L.lang.x}" y="${L.lang.headY}" font-family="${HF}" font-size="${FS.body}" font-weight="700" fill="${P.ink}">${STATS.langs.length > 8 ? `Top ${STATS.langs.length} languages` : 'Top languages'}</text>
  ${langs}
  <text x="${W.x}" y="${W.headY}" font-family="${HF}" font-size="${FS.body}" font-weight="700" fill="${P.ink}">This week</text>
  <text x="${W.x}" y="${W.headY + 28}" font-family="${HF}" font-size="${FS.small}" fill="${P.sub}">${STATS.weekStart} – ${STATS.weekEnd} · UTC</text>
  <text x="${IN.r}" y="${W.headY}" text-anchor="end" font-family="${HF}" font-size="${FS.small}" fill="${P.sub}">most active · <tspan fill="${peakColor}">${peak}</tspan></text>
  ${legend}
  ${proj}
  <path d="${line}" fill="none" stroke="${P.sub}" stroke-width="2" stroke-dasharray="5 5" stroke-linejoin="round" stroke-linecap="round" opacity="0.6"/>
  ${weekRows}
</svg>`;
}

const EW = 360,
  EH = 72;
const EICON = 32,
  EGAP = 16;
function emailAsserts(): void {
  const total = EICON + EGAP + textW(EMAIL.text, 'Kalam', 26);
  check('email:fits', total <= EW - 40, `group ${total} vs ${EW - 40}`);
}
function emailButton(P: Palette): string {
  const total = EICON + EGAP + textW(EMAIL.text, 'Kalam', 26);
  const x0 = Math.round((EW - total) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${EW}" height="${EH}" viewBox="0 0 ${EW} ${EH}">${frame(EW, EH, P)}
  <g transform="translate(${x0} 25)" stroke="${P.peach}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <rect x="0" y="0" width="32" height="23" rx="4" fill="${P.peach}" fill-opacity="0.16"/><path d="M1 3 L16 14 L31 3"/>
  </g>
  <text x="${x0 + EICON + EGAP}" y="47" font-family="Kalam" font-size="26" font-weight="700" fill="${P.ink}">${EMAIL.text}</text>
</svg>`;
}

const DW = 760,
  DH = 70;
function dividerCard(P: Palette): string {
  const x0 = 120,
    x1 = DW - 120,
    mid = DW / 2,
    y = 40;
  const stemD = `M ${x0} ${y} q 130 -8 ${mid - x0} 0 t ${x1 - mid} 0`;
  const peachLt = '#F2B59E',
    sageLt = '#B7CDAA',
    sageDk = '#8FA982';
  type LeafSpec = {
    x: number;
    side: number;
    scale: number;
    useSage: boolean;
    rotationOffset: number;
  };
  const leaf = ({ x, side, scale, useSage, rotationOffset }: LeafSpec): string => {
    const ly = y + side * 2,
      rot = (side < 0 ? -28 : 208) + rotationOffset;
    return (
      `<g transform="translate(${x} ${ly}) rotate(${rot}) scale(${scale})">` +
      `<path d="M0 0 Q 4.6 -5 0 -11.5 Q -4.6 -5 0 0 Z" fill="url(#dvLeaf${useSage ? 'S' : 'P'})" stroke="${useSage ? sageDk : P.caramel}" stroke-width="0.5"/>` +
      `<path d="M0 -1.5 V-9.5" fill="none" stroke="${useSage ? sageDk : P.caramel}" stroke-width="0.5" opacity="0.55"/></g>`
    );
  };
  const LEAVES: LeafSpec[] = [
    { x: 206, side: -1, scale: 0.78, useSage: false, rotationOffset: -6 },
    { x: 252, side: 1, scale: 0.92, useSage: false, rotationOffset: 5 },
    { x: 300, side: -1, scale: 1.05, useSage: false, rotationOffset: -3 },
    { x: 342, side: 1, scale: 1.18, useSage: false, rotationOffset: 6 },
    { x: 380, side: -1, scale: 1.3, useSage: true, rotationOffset: 0 },
    { x: 420, side: 1, scale: 1.12, useSage: false, rotationOffset: -5 },
    { x: 470, side: -1, scale: 0.98, useSage: false, rotationOffset: 4 },
    { x: 520, side: 1, scale: 0.86, useSage: false, rotationOffset: -4 },
    { x: 560, side: -1, scale: 0.74, useSage: false, rotationOffset: 7 },
  ];
  const leaves = LEAVES.map((spec) => leaf(spec)).join('');
  const berries = `<circle cx="370" cy="40.5" r="2.7" fill="${P.caramel}"/><circle cx="389" cy="39" r="2.2" fill="${P.gold}"/>`;
  const buds = `<circle cx="${x0}" cy="${y}" r="2" fill="${P.peach}" opacity="0.7"/><circle cx="${x1}" cy="${y}" r="2" fill="${P.peach}" opacity="0.7"/>`;
  const stem =
    `<path d="${stemD}" transform="translate(0 1)" fill="none" stroke="${P.peach}" stroke-width="2.4" stroke-linecap="round" opacity="0.4"/>` +
    `<path d="${stemD}" fill="none" stroke="url(#dvStem)" stroke-width="2.2" stroke-linecap="round"/>`;
  const body = stem + leaves + berries + buds;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${DW}" height="${DH}" viewBox="0 0 ${DW} ${DH}">
  <defs>
    <linearGradient id="dvStem" x1="${x0}" y1="0" x2="${x1}" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${P.caramel}" stop-opacity="0"/><stop offset="0.1" stop-color="${P.caramel}" stop-opacity="1"/>
      <stop offset="0.9" stop-color="${P.caramel}" stop-opacity="1"/><stop offset="1" stop-color="${P.caramel}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="dvLeafP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${peachLt}"/><stop offset="1" stop-color="${P.caramel}"/></linearGradient>
    <linearGradient id="dvLeafS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sageLt}"/><stop offset="1" stop-color="${sageDk}"/></linearGradient>
    <filter id="dvBloom" x="-5%" y="-60%" width="110%" height="220%"><feGaussianBlur stdDeviation="1.6"/></filter>
  </defs>
  <g filter="url(#dvBloom)" opacity="0.22">${body}</g>
  ${body}
</svg>`;
}

statsAsserts();
emailAsserts();
console.log('— invariants —');
for (const r of report) console.log(`  ${r.ok ? 'ok  ' : 'FAIL'} ${r.name.padEnd(20)} ${r.detail}`);
console.log('— render (×2 retina) —');
for (const [mode, P] of Object.entries(PALETTES)) {
  renderPNG(statsCard(P), SW, `stats-${mode}`);
  renderPNG(emailButton(P), EW, `email-${mode}`);
  renderPNG(dividerCard(P), DW, `divider-${mode}`);
}
