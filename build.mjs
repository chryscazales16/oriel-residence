#!/usr/bin/env node
/* =========================================================================
   Builds the website into dist/ from site.config.js.
   GitHub runs this automatically every time a file changes (see
   .github/workflows/publish.yml). To run it yourself: node build.mjs
   No packages to install: it only uses what comes with Node.js.
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createModel, validate } from './src/model.js';
import { renderIndex, renderPrivacy, render404, publicUrl } from './src/pages.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, 'src');
const out = process.env.SITE_OUT ? path.resolve(process.env.SITE_OUT) : path.join(root, 'dist');
const onGitHub = !!process.env.GITHUB_ACTIONS;

const say = (msg) => console.log(msg);
const warn = (msg) => console.log(onGitHub ? `::warning title=Settings::${msg}` : `  ! ${msg}`);
function fail(msg) {
  console.log(onGitHub ? `::error title=Settings need a fix::${msg}` : `\n  ✗ ${msg}\n`);
  process.exit(1);
}

/* 1. read the settings file the same way a browser would */
const configPath = process.env.SITE_CONFIG ? path.resolve(process.env.SITE_CONFIG) : path.join(root, 'site.config.js');
const configCode = fs.readFileSync(configPath, 'utf8');
const sandbox = { window: {} };
try {
  vm.runInNewContext(configCode, sandbox, { filename: 'site.config.js', timeout: 2000 });
} catch (e) {
  const where = String(e.stack || '').split('\n').slice(0, 3).join(' | ');
  fail(`site.config.js has a typing mistake (often a missing comma or quote). ${e.message}. Look here: ${where}`);
}
const S = sandbox.window.SITE;

/* 2. check it */
const { errors, warnings } = validate(S);
if (errors.length) fail(errors.join(' · '));
for (const w of warnings) warn(w);
const M = createModel(S);

/* 3. assemble dist/ */
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const copyDir = (from, to) => fs.cpSync(from, to, { recursive: true });
copyDir(path.join(src, 'assets'), path.join(out, 'assets'));
copyDir(path.join(src, 'vendor'), path.join(out, 'vendor'));

const files = {
  'app.js': fs.readFileSync(path.join(src, 'app.js'), 'utf8'),
  'model.js': fs.readFileSync(path.join(src, 'model.js'), 'utf8'),
  'styles.css': fs.readFileSync(path.join(src, 'styles.css'), 'utf8'),
  'site.config.js': configCode,
};
const v = crypto.createHash('sha1').update(Object.values(files).join('\n')).digest('hex').slice(0, 10);
files['app.js'] = files['app.js'].replace("from './model.js'", `from './model.js?v=${v}'`);
for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(out, name), body);

fs.writeFileSync(path.join(out, 'index.html'), renderIndex(S, M, v));
fs.writeFileSync(path.join(out, 'privacy.html'), renderPrivacy(S, M, v));
fs.writeFileSync(path.join(out, '404.html'), render404(S, M));
fs.writeFileSync(path.join(out, '.nojekyll'), '');

const url = publicUrl(S);
if (S.demo) {
  fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
} else {
  fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${url}sitemap.xml\n`);
  fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${url}</loc></url>\n</urlset>\n`);
}
if (S.customDomain) fs.writeFileSync(path.join(out, 'CNAME'), `${S.customDomain.trim()}\n`);

say(`Built ${S.project.name}: ${M.LEVELS} levels, ${M.all.length} residences, ${M.all.filter((u) => u.status === 'available').length} available.`);
say(`Website address: ${url}${S.demo ? ' (demo mode: hidden from search engines)' : ''}`);
say(`Enquiries: ${S.form?.accessKey ? 'email form on' : 'email form not connected'}, ${S.contact?.whatsapp ? 'WhatsApp on' : 'WhatsApp off'}.`);
