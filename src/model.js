/* =========================================================================
   Residences model: turns the settings (site.config.js) into levels,
   residences, sizes and prices. Shared by the browser (app.js) and the
   publishing step (build.mjs), so both always agree.
   ========================================================================= */

export const FLOOR_H = 3.4;      // metres from one floor to the next
export const PODIUM_H = 12;      // ground floor + two podium levels
export const BAL_D = 2.6;        // terrace depth in metres
export const SQFT = 10.7639;     // square feet per square metre
export const FOOTPRINT = { x0: -17, x1: 17, y0: -10, y1: 10 };

const WINDOWS = { north: 'N', south: 'S', east: 'E', west: 'W', n: 'N', s: 'S', e: 'E', w: 'W' };
const STATUSES = ['available', 'reserved', 'sold'];

export const DEFAULT_LABELS = {
  demoBadge: 'Concept demo',
  level: 'Level',
  openPlan: 'Open level {level} plan',
  plateLine: '{plate} · {count} residences',
  availability: '{available} available · {reserved} reserved · {sold} sold',
  from: 'From {price}',
  soldOut: 'This level is sold out',
  tagAvailable: 'Level {level} · {available} available',
  tagSoldOut: 'Level {level} · Sold out',
  backToBuilding: 'Back to building',
  sharedWith: 'Floorplate shared with levels {levels}',
  uniquePlate: 'This floorplate is unique to level {level}',
  typicalPlan: 'Typical floor plan of levels {levels}',
  planOf: 'Floor plan of level {level}',
  and: '&',
  residence: 'Residence {id}',
  interior: 'Interior',
  terrace: 'Terrace',
  total: 'Total',
  view: 'View',
  price: 'Price',
  priceOnRequest: 'Price on request',
  enquire: 'Enquire',
  whatsapp: 'WhatsApp',
  chatWhatsapp: 'Chat on WhatsApp',
  speakToSales: 'Speak to sales',
  planHint: 'Hover over a residence on the plan to see its size, view and price.',
  prevLevel: 'Previous level',
  nextLevel: 'Next level',
  status: { available: 'Available', reserved: 'Reserved', sold: 'Sold' },
  groups: { studio: 'Studio', '1br': '1 bedroom', '2br': '2 bedrooms', '3br': '3 bedrooms', ph: 'Penthouse' },
  plan: { corridor: 'Corridor', lobby: 'Lobby', lifts: 'Lifts' },
  form: {
    name: 'Full name', email: 'Email', phone: 'Phone', type: 'Residence type', typeAny: 'Any',
    unit: 'Residence of interest', unitPlaceholder: 'For example 07-05', message: 'Message',
    consent: 'I agree to be contacted about {project} and I have read the privacy notice.',
    privacyLink: 'privacy notice', submit: 'Register interest', sending: 'Sending…',
    success: "Thank you, {name}. Your enquiry has been sent, and we'll reply by email soon.",
    error: "Your enquiry didn't go through. Check your connection and try again, or message us on WhatsApp.",
    nameError: 'Add your name so we know who to reply to.',
    emailError: 'Check the email address. It should look like name@example.com.',
    consentError: 'Tick the box to agree to be contacted.',
    notReady: "The enquiry form isn't connected yet. Please use WhatsApp, or try again later.",
  },
  notFound: { title: "This page doesn't exist", text: 'The link may be old or mistyped.', back: 'Back to {project}' },
};

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
export function deepMerge(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over || {})) out[k] = isObj(v) && isObj(base[k]) ? deepMerge(base[k], v) : v;
  return out;
}

/* fill "{name}" placeholders; unknown names are left as they are */
export function fill(str, vars) {
  return String(str ?? '').replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m));
}

export const pad = (n) => String(n).padStart(2, '0');

export function polyArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}
function spansOn(poly, yEdge) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
    if (Math.abs(y1 - yEdge) < 1e-6 && Math.abs(y2 - yEdge) < 1e-6) out.push([Math.min(x1, x2), Math.max(x1, x2)]);
  }
  return out;
}
function overlaps(segs, spans) {
  const res = [];
  for (const [a, b] of segs) for (const [c, d] of spans) {
    const lo = Math.max(a, c), hi = Math.min(b, d);
    if (hi - lo > 0.05) res.push([lo, hi]);
  }
  return res;
}

/* the facade "zipper": terrace segments shift between odd and even levels */
export function balconies(n) {
  const even = n % 2 === 0;
  return {
    S: even ? [[-17, -8.5], [-4.5, 17]] : [[-17, 4.5], [8.5, 17]],
    N: even ? [[-17, 4.5], [8.5, 17]] : [[-17, -8.5], [-4.5, 17]],
  };
}

function normWeights(list) {
  const rows = (list || []).map(([name, w]) => [String(name), Math.max(0, Number(w) || 0)]);
  const sum = rows.reduce((s, [, w]) => s + w, 0) || 1;
  return rows.map(([name, w]) => [name, w / sum]);
}
function normalizeZone(z) {
  const f = WINDOWS[String(z.windows || z.f || '').toLowerCase()] || 'S';
  const [x0, y0, x1, y1] = z.area || z.r;
  return { r: [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)], f, front: normWeights(z.front), back: normWeights(z.back) };
}
function mirrorUnit(u, no, view) {
  const horiz = (f) => f === 'N' || f === 'S';
  return {
    no, type: u.type, view: view || u.view,
    shape: u.shape.map(([x, y]) => [-x, y]).reverse(),
    zones: u.zones.map((z) => ({
      r: [-z.r[2], z.r[1], -z.r[0], z.r[3]],
      f: z.f === 'W' ? 'E' : z.f === 'E' ? 'W' : z.f,
      front: horiz(z.f) ? [...z.front].reverse() : z.front,
      back: horiz(z.f) ? [...z.back].reverse() : z.back,
    })),
  };
}

export function createModel(S) {
  const labels = deepMerge(DEFAULT_LABELS, S.labels || {});
  const LEVELS = Math.max(4, Math.min(45, Math.round(Number(S.building?.levels) || 20)));
  const unitTypes = S.building?.unitTypes || {};
  const groupOf = (type) => unitTypes[type] || (/pent/i.test(type) ? 'ph' : /studio/i.test(type) ? 'studio' : /^\s*1/.test(type) ? '1br' : /^\s*2/.test(type) ? '2br' : /^\s*[3-9]/.test(type) ? '3br' : 'studio');

  const plates = (S.building?.floorplates || []).map((fp) => {
    // drawn residences first, then mirrored copies, kept in the order they're listed
    const drawn = new Map();
    for (const raw of fp.units || []) {
      if (raw.mirrorOf) continue;
      drawn.set(String(raw.no), {
        no: String(raw.no), type: String(raw.type || ''), view: String(raw.view || ''),
        shape: (raw.shape || []).map(([x, y]) => [Number(x), Number(y)]),
        zones: (raw.zones || []).map(normalizeZone),
      });
    }
    const units = [];
    for (const raw of fp.units || []) {
      if (!raw.mirrorOf) { units.push(drawn.get(String(raw.no))); continue; }
      const src = drawn.get(String(raw.mirrorOf));
      if (src) units.push(mirrorUnit(src, String(raw.no), raw.view));
    }
    const [from, to] = fp.levels || [1, LEVELS];
    return { id: String(fp.id), name: String(fp.name || `Floorplate ${fp.id}`), from: Number(from), to: Number(to), corridor: fp.corridor || [-10, -1.2, 10, 1.2], units };
  });
  const fpFor = (n) => plates.find((p) => n >= p.from && n <= p.to) || plates[plates.length - 1];

  const money = S.money || {};
  const locale = money.locale || 'en-US';
  const currency = money.currency || '';
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const fmtMoney = (v) => (v == null ? labels.priceOnRequest : `${currency} ${nf.format(v)}`.trim());
  const fmtMoneyShort = (v) => (v == null ? labels.priceOnRequest : v >= 1e6 ? `${currency} ${nf1.format(v / 1e6)}M`.trim() : `${currency} ${nf.format(Math.round(v / 1e3))}K`.trim());
  const sqft = (S.area || 'sqft') !== 'm2';
  const areaUnit = sqft ? 'sq ft' : 'm²';
  const toDisplayArea = (m2) => (sqft ? Math.round((m2 * SQFT) / 5) * 5 : Math.round(m2 * 2) / 2);
  const fmtArea = (v) => `${nf.format(v)} ${areaUnit}`;

  const residences = S.residences || {};
  const cache = new Map();
  function unitsForLevel(n) {
    if (cache.has(n)) return cache.get(n);
    const fp = fpFor(n), b = balconies(n);
    const units = (fp ? fp.units : []).map((u) => {
      const id = `${pad(n)}-${u.no}`;
      const bS = overlaps(b.S, spansOn(u.shape, 10)), bN = overlaps(b.N, spansOn(u.shape, -10));
      const balLen = [...bS, ...bN].reduce((s, [a, c]) => s + (c - a), 0);
      const rec = residences[id] || {};
      const interior = rec.interior != null ? Number(rec.interior) : toDisplayArea(polyArea(u.shape));
      const terrace = rec.terrace != null ? Number(rec.terrace) : toDisplayArea(balLen * BAL_D);
      const status = STATUSES.includes(rec.status) ? rec.status : 'available';
      const price = rec.price == null || rec.price === '' ? null : Number(rec.price);
      return { ...u, poly: u.shape, id, level: n, bS, bN, interior, terrace, total: interior + terrace, status, price, group: groupOf(u.type) };
    });
    cache.set(n, units);
    return units;
  }
  function levelInfo(n) {
    const fp = fpFor(n), units = unitsForLevel(n);
    const c = { available: 0, reserved: 0, sold: 0 };
    units.forEach((u) => c[u.status]++);
    const types = [...new Set(units.map((u) => u.type))];
    const shared = [];
    if (fp) for (let m = Math.max(1, fp.from); m <= Math.min(LEVELS, fp.to); m++) if (m % 2 === n % 2) shared.push(m);
    const open = units.filter((u) => u.status !== 'sold' && u.price != null);
    const minPrice = open.length ? Math.min(...open.map((u) => u.price)) : null;
    return { n, fp, units, c, types, shared, minPrice };
  }
  const all = [];
  for (let n = 1; n <= LEVELS; n++) all.push(...unitsForLevel(n));
  const open = all.filter((u) => u.status !== 'sold' && u.price != null);
  const fromPrice = open.length ? Math.min(...open.map((u) => u.price)) : null;
  const types = [...new Set(all.map((u) => u.type))];

  const vars = {
    project: S.project?.name || '', shortName: S.project?.shortName || '', levels: LEVELS, residences: all.length,
    fromPrice: fmtMoneyShort(fromPrice), city: S.project?.city || '', community: S.project?.community || '',
    developer: [S.project?.developer?.name, S.project?.developer?.subline].filter(Boolean).join(' '),
    owner: S.owner?.name || '', year: new Date().getFullYear(),
  };
  const t = (str, extra) => fill(str, extra ? { ...vars, ...extra } : vars);

  return { S, labels, LEVELS, plates, fpFor, balconies, unitsForLevel, levelInfo, all, fromPrice, types, groupOf, fmtMoney, fmtMoneyShort, fmtArea, areaUnit, vars, t };
}

/* Checks the settings and explains problems in plain words (used when publishing). */
export function validate(S) {
  const errors = [], warnings = [];
  const need = (cond, msg) => { if (!cond) errors.push(msg); };
  need(S && typeof S === 'object', 'The settings file must define window.SITE = { ... }.');
  if (!S || typeof S !== 'object') return { errors, warnings };
  need(S.project && S.project.name, 'project.name is missing.');
  need(Array.isArray(S.project?.titleLines) && S.project.titleLines.length, 'project.titleLines must be a list like ["Oriel", "Residence"].');
  need(/^https?:\/\/.+\/$/.test(S.siteUrl || ''), 'siteUrl must be a full address ending with a slash, like "https://name.github.io/site/".');
  if (S.customDomain) need(!/^https?:|\//.test(S.customDomain), 'customDomain is the domain only, without https:// or slashes (example: "www.example.com").');
  const levels = Number(S.building?.levels);
  need(Number.isInteger(levels) && levels >= 4 && levels <= 45, 'building.levels must be a whole number between 4 and 45.');
  const fps = S.building?.floorplates;
  need(Array.isArray(fps) && fps.length, 'building.floorplates needs at least one floorplate.');
  if (Array.isArray(fps) && Number.isInteger(levels)) {
    const owner = new Array(levels + 1).fill(null);
    for (const fp of fps) {
      const [a, b] = fp.levels || [];
      if (!(Number.isInteger(a) && Number.isInteger(b) && a <= b)) { errors.push(`Floorplate ${fp.id}: levels must look like [1, 9].`); continue; }
      for (let n = a; n <= b; n++) {
        if (n < 1 || n > levels) { errors.push(`Floorplate ${fp.id} covers level ${n}, but the building has ${levels} levels.`); break; }
        if (owner[n]) { errors.push(`Level ${n} is in both floorplate ${owner[n]} and ${fp.id}.`); break; }
        owner[n] = fp.id;
      }
      const nos = new Set();
      for (const u of fp.units || []) {
        if (nos.has(String(u.no))) errors.push(`Floorplate ${fp.id} has two residences numbered "${u.no}".`);
        nos.add(String(u.no));
        if (u.mirrorOf) { if (!(fp.units || []).some((x) => String(x.no) === String(u.mirrorOf) && !x.mirrorOf)) errors.push(`Floorplate ${fp.id}, residence ${u.no}: mirrorOf "${u.mirrorOf}" doesn't match a drawn residence on the same floorplate.`); continue; }
        if (!u.type) errors.push(`Floorplate ${fp.id}, residence ${u.no}: type is missing.`);
        if (!Array.isArray(u.shape) || u.shape.length < 3) errors.push(`Floorplate ${fp.id}, residence ${u.no}: shape needs at least 3 corner points.`);
        else if (u.shape.some((p) => !Array.isArray(p) || p.length !== 2 || p.some((v) => typeof v !== 'number' || v < -17.01 || v > 17.01 || Number.isNaN(v)))) errors.push(`Floorplate ${fp.id}, residence ${u.no}: every shape point must be [x, y] inside the 34 x 20 m footprint.`);
        for (const z of u.zones || []) {
          if (!Array.isArray(z.area) || z.area.length !== 4) errors.push(`Floorplate ${fp.id}, residence ${u.no}: each zone needs area: [x1, y1, x2, y2].`);
          if (!WINDOWS[String(z.windows || '').toLowerCase()]) errors.push(`Floorplate ${fp.id}, residence ${u.no}: windows must be "north", "south", "east" or "west".`);
        }
      }
    }
    for (let n = 1; n <= levels; n++) if (!owner[n]) { errors.push(`Level ${n} isn't covered by any floorplate.`); break; }
  }
  if (!errors.length) {
    const M = createModel(S);
    const ids = new Set(M.all.map((u) => u.id));
    for (const [id, rec] of Object.entries(S.residences || {})) {
      if (!ids.has(id)) warnings.push(`Residence "${id}" is listed in residences but doesn't exist in the building.`);
      if (rec && rec.status && !STATUSES.includes(rec.status)) errors.push(`Residence ${id}: status must be "available", "reserved" or "sold" (found "${rec.status}").`);
      if (rec && rec.price != null && !(typeof rec.price === 'number' && rec.price > 0)) errors.push(`Residence ${id}: price must be a number like 1450000, or null.`);
    }
    const missing = M.all.filter((u) => !(S.residences || {})[u.id]).map((u) => u.id);
    if (missing.length) warnings.push(`${missing.length} residence(s) have no price or status yet and will show as available with "Price on request": ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '…' : ''}`);
  }
  if (S.form?.provider === 'web3forms' && !S.form?.accessKey) warnings.push('form.accessKey is empty, so the enquiry form will ask visitors to use WhatsApp instead.');
  if (!S.contact?.whatsapp && (!S.form?.accessKey || S.form?.provider === 'none')) warnings.push('No WhatsApp number and no form key: visitors have no way to contact you yet.');
  if (S.contact?.whatsapp && String(S.contact.whatsapp).replace(/\D/g, '').length < 8) errors.push('contact.whatsapp should be a full international number, like "+1 514 555 0123".');
  if (S.owner && !S.owner.email) warnings.push('owner.email is empty. The privacy notice needs an address people can write to.');
  return { errors, warnings };
}
