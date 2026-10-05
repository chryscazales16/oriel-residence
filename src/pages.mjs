/* =========================================================================
   Page templates. build.mjs fills them from site.config.js, so the words
   people (and search engines) see always come from the settings file.
   ========================================================================= */
import { pad } from './model.js';

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const ICON_UP = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M7 12V2M3 6l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
const ICON_DOWN = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M7 2v10M3 8l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
const ICON_ARROW = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 7h10M8 3l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
const ICON_BACK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M14 8H2M6 4L2 8l4 4" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
const ICON_CHAT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 8.5h8M8 11.5h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
export const ICON_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2a8.8 8.8 0 0 0-7.6 13.2L3.2 20.8l4.5-1.2A8.8 8.8 0 1 0 12 3.2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 8.6c.2-.4.5-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.3 0 .5-.1.7l-.5.6c.6 1.1 1.5 2 2.6 2.6l.6-.5c.2-.2.5-.2.7-.1l1.6.7c.3.1.4.3.4.5v.5c0 .3-.1.6-.5.8-.6.4-1.6.6-2.9 0-1.8-.8-3.3-2.3-4.1-4.1-.6-1.3-.4-2.3 0-2.9z" fill="currentColor"/></svg>';
const BRAND_MARK = '<svg class="brand-mark" viewBox="0 0 26 26" aria-hidden="true"><g fill="currentColor"><rect x="2" y="3" width="15" height="2.2"/><rect x="9" y="8.6" width="15" height="2.2"/><rect x="2" y="14.2" width="15" height="2.2"/><rect x="9" y="19.8" width="15" height="2.2"/></g></svg>';

/* the address visitors use, always ending with "/" */
export function publicUrl(S) {
  return S.customDomain ? `https://${S.customDomain.replace(/\/+$/, '')}/` : S.siteUrl;
}
export function basePath(S) {
  try { return new URL(publicUrl(S)).pathname || '/'; } catch (e) { return '/'; }
}
export function waLink(S, msg) {
  const n = String(S.contact?.whatsapp || '').replace(/\D/g, '');
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(msg)}` : '';
}

function head(S, M, { title, description, path = '', robots, extra = '', v }) {
  const url = publicUrl(S) + path;
  const og = publicUrl(S) + 'assets/og-image.jpg';
  return `<!doctype html>
<html lang="${esc(S.language || 'en')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${robots ? `<meta name="robots" content="${robots}">\n` : ''}<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="#0a1019">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(S.project.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(og)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(S.project.name)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="assets/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
<link rel="preload" href="assets/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/bellefair-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="styles.css?v=${v}">
${extra}</head>`;
}

function facts(list, cls = 'facts') {
  return `<dl class="${cls}">\n${(list || []).map((f) => `      <div><dt>${esc(f.value)}</dt><dd>${esc(f.label)}</dd></div>`).join('\n')}\n    </dl>`;
}

export function renderIndex(S, M, v) {
  const t = (x) => esc(M.t(x));
  const L = M.labels;
  const demo = !!S.demo;
  const name = S.project.name;
  const titleTag = M.t(S.project.tagline ? `${name} · {tagline}` : name, { tagline: S.project.tagline });
  const wa = waLink(S, M.t(S.contact?.whatsappMessage || ''));
  const formOn = (S.form?.provider || 'web3forms') !== 'none';
  const dev = S.project.developer || {};
  const ld = demo ? '' : `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'ApartmentComplex', name, description: S.project.description,
    url: publicUrl(S), image: publicUrl(S) + 'assets/og-image.jpg',
    address: { '@type': 'PostalAddress', addressLocality: S.project.city || undefined },
    numberOfAccommodationUnits: M.all.length,
  }).replace(/</g, '\\u003c')}</script>\n`;
  const extra = `<link rel="modulepreload" href="vendor/three.module.min.js">\n${ld}`;

  const typeOptions = M.types.map((ty) => `          <option>${esc(ty)}</option>`).join('\n');
  const consentText = esc(M.t(L.form.consent));
  const linkWords = esc(L.form.privacyLink);
  const consentHTML = consentText.includes(linkWords)
    ? consentText.replace(linkWords, `<a href="privacy.html">${linkWords}</a>`)
    : `${consentText} <a href="privacy.html">${linkWords}</a>`;

  const contactBits = [];
  if (wa) contactBits.push(`<a class="btn ghost wa" href="${esc(wa)}" target="_blank" rel="noopener">${ICON_WA}<span>${esc(L.chatWhatsapp)}</span></a>`);
  if (S.contact?.phone) contactBits.push(`<p class="contact-line"><span class="label">${esc(L.form.phone)}</span><a href="tel:${esc(String(S.contact.phone).replace(/[^\d+]/g, ''))}">${esc(S.contact.phone)}</a></p>`);
  if (S.contact?.email) contactBits.push(`<p class="contact-line"><span class="label">${esc(L.form.email)}</span><a href="mailto:${esc(S.contact.email)}">${esc(S.contact.email)}</a></p>`);

  const form = formOn ? `
    <form class="reg-form" id="regForm" novalidate>
      <label for="fName">${esc(L.form.name)}<input id="fName" name="name" autocomplete="name" required></label>
      <label for="fEmail">${esc(L.form.email)}<input id="fEmail" name="email" type="email" autocomplete="email" required></label>
      <label for="fPhone">${esc(L.form.phone)}<input id="fPhone" name="phone" type="tel" autocomplete="tel"></label>
      <label for="fType">${esc(L.form.type)}
        <select id="fType" name="type">
          <option value="">${esc(L.form.typeAny)}</option>
${typeOptions}
        </select>
      </label>
      <label class="wide" for="fUnit">${esc(L.form.unit)}<input id="fUnit" name="unit" placeholder="${esc(L.form.unitPlaceholder)}"></label>
      <label class="wide" for="fMsg">${esc(L.form.message)}<textarea id="fMsg" name="message" rows="3"></textarea></label>
      <label class="consent wide" for="fConsent"><input type="checkbox" id="fConsent" name="consent" required><span>${consentHTML}</span></label>
      <input class="hp" type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true">
      <p class="form-err wide" id="formErr" role="alert" hidden></p>
      <button class="btn amber wide" type="submit">${esc(L.form.submit)}</button>
      <p class="form-note wide">${t(demo ? S.register.demoFormNote : S.register.formNote)}</p>
      <div class="form-done wide" id="formDone" tabindex="-1" role="status" hidden></div>
    </form>` : '';

  const fab = wa
    ? `<a class="fab" id="fab" href="${esc(wa)}" target="_blank" rel="noopener" aria-label="${esc(L.chatWhatsapp)}">${ICON_WA}<span class="fab-label">${esc(L.chatWhatsapp)}</span></a>`
    : `<a class="fab" id="fab" href="#register" data-go="register" aria-label="${esc(L.speakToSales)}">${ICON_CHAT}<span class="fab-label">${esc(L.speakToSales)}</span></a>`;

  const desc = M.t(S.project.description || S.project.tagline || name);
  return `${head(S, M, { title: titleTag, description: desc, robots: demo ? 'noindex' : '', extra, v })}
<body>
<div class="backdrop" aria-hidden="true"></div>
<canvas id="stage" aria-hidden="true"></canvas>
<div class="scrim" id="scrim" aria-hidden="true"></div>

<div class="veil" id="veil" aria-hidden="true">
  <div>
    <p class="veil-title">${(S.rise?.title || []).map(t).join('<br>')}</p>
    <p class="label">${t(S.rise?.line || '')}</p>
  </div>
</div>

<header class="topbar">
  <a class="brand" href="#top" id="brandLink" aria-label="${esc(name)}">
    ${BRAND_MARK}
    <span class="brand-name">${esc(S.project.shortName || name)}</span>
    ${demo ? `<span class="demo-badge">${esc(L.demoBadge)}</span>` : ''}
  </a>
  <nav class="nav" aria-label="Sections">
    <a href="#location" data-go="location">${esc(S.nav.location)}</a>
    <a href="#architecture" data-go="architecture">${esc(S.nav.architecture)}</a>
    <a href="#residences" data-go="residences">${esc(S.nav.residences)}</a>
    <a href="#register" class="nav-cta" data-go="register"><span class="cta-long">${esc(S.nav.register)}</span><span class="cta-short">${esc(S.nav.registerShort || S.nav.register)}</span></a>
  </nav>
</header>

<main class="overlay" id="overlay">
  <section class="ov hero" id="ovHero" aria-label="${esc(name)}">
    <h1 class="hero-title">${(S.project.titleLines || [name]).map(esc).join('<br>')}</h1>
    <p class="label hero-sub">${t(S.project.tagline)}</p>
  </section>

  <div class="ov scroll-cue" id="ovCue" aria-hidden="true"><span class="label">${t(S.hero?.scrollCue)}</span><i></i></div>

  <section class="ov copy" id="ovLocation" aria-labelledby="locTitle">
    <p class="label eyebrow">${t(S.location.eyebrow)}</p>
    <h2 id="locTitle">${t(S.location.title)}</h2>
    <p class="lede">${t(S.location.text)}</p>
    ${facts(S.location.facts)}
  </section>

  <section class="ov copy" id="ovWhy" aria-labelledby="whyTitle">
    <p class="label eyebrow">${t(S.why.eyebrow)}</p>
    <h2 id="whyTitle">${t(S.why.title)}</h2>
    <p class="lede">${t(S.why.text)}</p>
    ${facts(S.why.facts)}
  </section>

  <section class="ov copy" id="ovArch" aria-labelledby="archTitle">
    <p class="label eyebrow">${t(S.architecture.eyebrow)}</p>
    <h2 id="archTitle">${t(S.architecture.title)}</h2>
    <p class="lede">${t(S.architecture.text)}</p>
    <ul class="spec-row">
${(S.architecture.chips || []).map((c) => `      <li>${t(c)}</li>`).join('\n')}
    </ul>
  </section>

  <section class="ov copy explore" id="ovExplore" aria-labelledby="exploreTitle">
    <p class="label eyebrow">${t(S.explore.eyebrow)}</p>
    <h2 id="exploreTitle">${t(S.explore.title)}</h2>
    <p class="hint" id="exploreHint">${t(S.explore.hintMouse)}</p>
    <div class="level-card">
      <div class="lc-top">
        <p class="lc-level"><span class="label">${esc(L.level)}</span><strong id="lcNum">${pad(Math.min(7, M.LEVELS))}</strong></p>
        <div class="steps">
          <button class="step" id="lvDown" type="button" aria-label="${esc(L.prevLevel)}">${ICON_DOWN}</button>
          <button class="step" id="lvUp" type="button" aria-label="${esc(L.nextLevel)}">${ICON_UP}</button>
        </div>
      </div>
      <p class="lc-fp" id="lcFp"></p>
      <p class="lc-mix" id="lcMix"></p>
      <div class="avail-bar" id="lcBar" aria-hidden="true"><i class="a"></i><i class="r"></i><i class="s"></i></div>
      <p class="lc-avail" id="lcAvail"></p>
      <p class="lc-from" id="lcFrom"></p>
      <button class="btn" id="openPlanBtn" type="button">${esc(M.t(L.openPlan, { level: pad(Math.min(7, M.LEVELS)) }))} ${ICON_ARROW}</button>
    </div>
  </section>

  <nav class="ov ruler" id="ruler" aria-label="${esc(L.level)}"></nav>
  <div class="level-line" id="levelLine" aria-hidden="true"><span class="level-tag" id="levelTag"></span></div>

  <div class="ov chapter-index" id="chapterIndex" aria-hidden="true">
    <span class="label ch-num" id="chNum">01 / 05</span><span class="ch-bar"><i id="chBar"></i></span><span class="label" id="chName">${esc((S.chapters || [])[0] || '')}</span>
  </div>
  <div class="ov dev-mark" id="devMark" aria-label="${esc([dev.name, dev.subline].filter(Boolean).join(' '))}">
    <b><svg width="10" height="14" viewBox="0 0 10 14" aria-hidden="true"><path d="M1 1h8L5 7l4 6H1l4-6z" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>${esc(dev.name || '')}</b>
    <small>${esc(dev.subline || '')}</small>
  </div>
</main>

<div id="track" aria-hidden="true"></div>

<section class="plan" id="plan" hidden role="dialog" aria-modal="true" aria-labelledby="planLevel">
  <div class="plan-head">
    <button class="back" id="planBack" type="button">${ICON_BACK}${esc(L.backToBuilding)}</button>
    <p class="label eyebrow" id="planEyebrow"></p>
    <div class="plan-level-row">
      <h2 id="planLevel"></h2>
      <div class="steps">
        <button class="step" id="planDown" type="button" aria-label="${esc(L.prevLevel)}">${ICON_DOWN}</button>
        <button class="step" id="planUp" type="button" aria-label="${esc(L.nextLevel)}">${ICON_UP}</button>
      </div>
    </div>
    <p class="plan-mix" id="planMix"></p>
    <p class="plan-shared" id="planShared"></p>
    <p class="plan-avail" id="planAvail"></p>
  </div>
  <div class="plan-stage" id="planStage"><div class="plan-sheet" id="planSheet"></div></div>
  <nav class="ruler plan-ruler" id="planRuler" aria-label="${esc(L.level)}"></nav>
  <aside class="unit-card" id="unitCard" aria-live="polite"></aside>
  <div class="plan-foot">
    <p class="label plan-caption" id="planCaption"></p>
    <ul class="legend" id="legend"></ul>
  </div>
</section>

<section class="register" id="register" aria-labelledby="regTitle">
  <div class="reg-inner">
    <div class="reg-copy">
      <p class="label eyebrow">${t(S.register.eyebrow)}</p>
      <h2 id="regTitle">${t(S.register.title)}</h2>
      <p>${t(S.register.text)}</p>
      <dl class="reg-facts">
${(S.register.facts || []).map((f) => `        <div><dt>${t(f.label)}</dt><dd>${t(f.value)}</dd>${f.note ? `<dd class="sub">${t(f.note)}</dd>` : ''}</div>`).join('\n')}
      </dl>
${contactBits.length ? `      <div class="contact-row">\n        ${contactBits.join('\n        ')}\n      </div>` : ''}
    </div>${form}
  </div>
</section>

<footer class="foot">
  <span class="brand-name">${esc(name)}</span>
  <p>${t(demo ? S.footer.demoText : S.footer.text)}</p>
  <a class="foot-link" href="privacy.html">${esc(L.form.privacyLink.charAt(0).toUpperCase() + L.form.privacyLink.slice(1))}</a>
</footer>

${fab}

<div class="loader" id="loader" role="status"><span class="label" id="loaderText">${t(S.hero?.loading || '')}</span><span class="bar"><i id="loaderBar"></i></span></div>

<script src="site.config.js?v=${v}"></script>
<script type="importmap">{"imports":{"three":"./vendor/three.module.min.js","three/addons/":"./vendor/addons/"}}</script>
<script type="module" src="app.js?v=${v}"></script>
<script>
  /* if the 3D module can't load (very old browser), say so instead of waiting forever */
  setTimeout(function () {
    if (window.__oriel) return;
    document.body.classList.add('no-module');
    var t = document.getElementById('loaderText');
    if (t) t.textContent = ${JSON.stringify(M.t('{project}'))};
  }, 15000);
</script>
</body>
</html>
`;
}

export function renderPrivacy(S, M, v) {
  const o = S.owner || {};
  const name = S.project.name;
  const L = M.labels;
  const wa = !!String(S.contact?.whatsapp || '').replace(/\D/g, '');
  const formOn = (S.form?.provider || 'web3forms') !== 'none';
  const mail = o.email ? `<a href="mailto:${esc(o.email)}">${esc(o.email)}</a>` : '[add your email address in site.config.js]';
  const title = `${L.form.privacyLink.charAt(0).toUpperCase() + L.form.privacyLink.slice(1)} · ${name}`;
  return `${head(S, M, { title, description: `How ${name} handles the information you send through this website.`, path: 'privacy.html', robots: 'noindex', v })}
<body class="doc">
<main class="doc-main">
  <a class="doc-back" href="./">← ${esc(name)}</a>
  <h1>Privacy notice</h1>
  <p>This website is run by ${esc(o.name || '[owner name]')} ("we"). This notice explains what happens to the information you send us through this website${wa ? ' or WhatsApp' : ''}.</p>

  <h2>What we collect</h2>
  <p>${formOn ? 'When you send an enquiry, we receive the details you type into the form: your name, email address, phone number if you add one, the type of residence and the residence you are interested in, and your message.' : 'This website has no enquiry form.'}${wa ? ' If you contact us on WhatsApp, WhatsApp shares your phone number and the messages you send with us, under WhatsApp\'s own privacy policy.' : ''}</p>

  ${formOn ? `<h2>How the form reaches us</h2>
  <p>The form is delivered to our email inbox by Web3Forms, a form-processing service. Web3Forms handles your submission only to deliver it to us.</p>` : ''}

  <h2>Why we use it</h2>
  <p>We use your details only to answer your enquiry and send you the information you asked for about ${esc(name)}. We don't sell your information, and we don't add you to marketing lists without asking.</p>

  <h2>How long we keep it</h2>
  <p>We keep enquiries for as long as we need them to reply and follow up, and for no longer than ${esc(o.retention || '24 months')} after our last contact with you.</p>

  <h2>Your choices</h2>
  <p>You can ask us at any time to see the information we hold about you, to correct it, or to delete it, and you can withdraw your consent to be contacted. Write to ${mail}.</p>

  <h2>Cookies and tracking</h2>
  <p>This website doesn't use cookies, analytics or advertising trackers. Its fonts and code are served from this website itself.</p>

  <h2>Who is responsible</h2>
  <p>The person responsible for protecting your personal information is ${esc(o.name || '[owner name]')}, reachable at ${mail}.</p>
</main>
</body>
</html>
`;
}

export function render404(S, M) {
  const base = basePath(S);
  const L = M.labels;
  return `<!doctype html>
<html lang="${esc(S.language || 'en')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(L.notFound.title)} · ${esc(S.project.name)}</title>
<meta name="robots" content="noindex">
<link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml">
<style>
  @font-face { font-family: "Bellefair"; src: url(${base}assets/fonts/bellefair-latin.woff2) format("woff2"); font-display: swap; }
  :root { color-scheme: dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; box-sizing: border-box;
    background: linear-gradient(180deg, #0e1830 0%, #433d66 60%, #d9845a 100%); color: #f2eee7;
    font: 16px/1.5 "Helvetica Neue", Arial, sans-serif; text-align: center; }
  h1 { font: 400 clamp(2.4rem, 6vw, 4rem)/1 "Bellefair", Georgia, serif; margin: 0 0 .6rem; }
  p { margin: 0 0 1.6rem; color: rgba(242,238,231,.8); }
  a { display: inline-block; padding: 13px 22px; border-radius: 999px; background: #f2eee7; color: #0a1019; text-decoration: none;
    font-size: .75rem; letter-spacing: .18em; text-transform: uppercase; font-weight: 600; }
  a:focus-visible { outline: 2px solid #f0bf78; outline-offset: 3px; }
</style>
</head>
<body>
<main>
  <h1>${esc(L.notFound.title)}</h1>
  <p>${esc(L.notFound.text)}</p>
  <a href="${base}">${esc(M.t(L.notFound.back))}</a>
</main>
</body>
</html>
`;
}
