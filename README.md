# Property website template

A scroll-driven 3D website for a residential tower: you dive through the clouds, glide over the
neighbourhood, watch the tower rise, and open any level's floor plan to see each residence's size,
view, price and availability. Visitors can enquire by email or WhatsApp.

**Everything you can change lives in one file: [`site.config.js`](site.config.js).**
Every word, your contact details, the floor plans, prices and availability are all in it.
GitHub rebuilds and republishes the website by itself every time that file changes.

The included project, *Oriel Residence*, is fictional and is published in demo mode.

---

## Your website address

`https://chryscazales16.github.io/oriel-residence/`

Changes show up there about a minute after you save them, while the repository is public
(see *Private or public* below).

## One-time setup

1. On github.com, open this repository → **Settings** → **Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

That's all. From then on, every saved change publishes itself.

## Private or public

On a free GitHub account, the website can only be online while this repository is **public**.

- **While it's private**, nobody else can see the code or the website. Your edits are still
  checked: each run in the **Actions** tab gets a green ✓ and a note saying the website is offline.
- **To put the website online:**
  1. **Settings** → scroll down to **Danger Zone** → **Change visibility** → **Public**.
  2. **Settings** → **Pages** → set **Source** to **GitHub Actions**.
  3. **Actions** tab → open the latest run → **Re-run all jobs** (or save any change).
- In a public repository anyone can read every file, including `site.config.js`. Only put
  things there that you'd be happy to show on the website itself.

## Change something from an iPad

1. Open `site.config.js` in this repository.
2. Tap the **pencil** icon (Edit this file).
3. Change the text between the quotes, or a number.
4. Tap **Commit changes…** and then **Commit changes** again.
5. Wait about a minute, then refresh your website.

Common edits:

| To… | Find this in `site.config.js` | Example |
| --- | --- | --- |
| Mark a residence as sold | its line under `residences` | `"07-05": { status: "sold", price: 1145000 },` |
| Change a price | the same line | `price: 1195000` (no commas or spaces) |
| Show "Price on request" | the same line | `price: null` |
| Change your WhatsApp number | `contact` → `whatsapp` | `"+1 514 555 0123"` |
| Change a heading or paragraph | section 3, "Words on the page" | any text between quotes |

Rules that keep the file working: keep the quotes around text and the comma at the end of each
line, and write numbers without commas.

## If something goes wrong

If the file has a typing mistake, **the live website doesn't break**. It keeps showing the last
good version. Open the **Actions** tab: the failed run has a red ✗, and its message says what
to fix (for example *"Residence 07-05: status must be available, reserved or sold"*). Fix the
line, commit again, and it turns green.

If the message says **Publishing is switched off**, do the one-time setup above, then open
that run and tap **Re-run all jobs**.

## Enquiries

- **Email:** the form sends each enquiry to your inbox through [Web3Forms](https://web3forms.com)
  (free plan: 250 enquiries a month). Put your access key in `form` → `accessKey`.
  Until a key is there, the form asks visitors to use WhatsApp instead.
- **WhatsApp:** buttons open a chat with your number and a message already written,
  including the residence the visitor was looking at. Leave `contact` → `whatsapp` empty to hide them.
- After publishing, send yourself a test enquiry to check that it arrives.

## Using it for a real client

1. Make a copy for the client (see *Reuse as a template* below).
2. In their copy's `site.config.js`:
   - set `demo: false` (removes the demo labels and lets Google list the site),
   - replace the project name, texts, contact details and owner,
   - list every residence's real status and price under `residences`,
   - adjust the floor plans in section 5 to match the client's brochure.
3. Get the client to approve the content before you share the link. Prices, sizes and dates
   must come from them.
4. Check the privacy notice (`privacy.html`, generated from `owner` in the settings). It's a
   plain-language starting point, not legal advice. Have the client confirm it fits their
   situation, especially if they collect enquiries in Québec, the EU or the UAE.

The 3D tower is a generic 20-storey design. `building.levels` changes how many floors it has
(4 to 45). Its shape, the neighbourhood and the sky are drawn in code, not taken from the client's renders.

## Reuse as a template

1. **Settings** → **General** → tick **Template repository**.
2. For each new client: open this repository → **Use this template** → **Create a new repository**.
3. In the new copy, do the one-time Pages setup above and update `siteUrl` in its settings.

## Use your own domain

1. Buy a domain (for example from Porkbun, Namecheap or Cloudflare).
2. In `site.config.js`, set `customDomain: "www.example.com"`.
3. On GitHub: **Settings** → **Pages** → **Custom domain** → enter the same domain → **Save**.
4. At your domain company, add a **CNAME** record: name `www`, value `chryscazales16.github.io`.
   For the bare domain (without www), add four **A** records pointing to
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`.
5. Back in **Settings** → **Pages**, tick **Enforce HTTPS** once it becomes available.

## What's inside

| Path | What it is |
| --- | --- |
| `site.config.js` | All content and settings (the only file you need to edit) |
| `src/app.js` | The 3D scene, scroll story, floor plans and enquiry form |
| `src/model.js` | Turns the settings into levels, residences, sizes and prices |
| `src/pages.mjs` | Page templates (home, privacy notice, 404) |
| `src/styles.css` | Design |
| `src/assets/` | Icons, link-preview image, self-hosted fonts |
| `src/vendor/` | three.js, the 3D library |
| `build.mjs` | Checks the settings and builds the site into `dist/` |
| `.github/workflows/publish.yml` | Runs the build and publishes to GitHub Pages |

To build on a computer: `node build.mjs` (Node.js 20 or newer, nothing to install), then open
`dist/` with any local web server.

## Credits

- 3D: [three.js](https://threejs.org) (MIT licence, see `src/vendor/LICENSE-three.txt`)
- Fonts: Bellefair and Archivo (SIL Open Font License, see `src/assets/fonts/`)
