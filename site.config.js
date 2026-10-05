/* =========================================================================
   SITE SETTINGS
   Everything you can change about the website lives in this one file:
   every word, your contact details, the floor plans, prices and availability.

   How to edit it on an iPad:
     1. Open this file on github.com and tap the pencil icon (Edit).
     2. Change only the text between quotes "like this", or numbers.
     3. Tap "Commit changes". The website updates about a minute later.
   If you make a typing mistake, the website keeps showing the last good
   version, and the Actions tab on GitHub shows a red mark with a message
   saying which line to fix.

   Small rules that keep the file working:
     - Keep the quotes around text, and the comma at the end of each line.
     - Write numbers without spaces or commas: 1450000, not 1,450,000.
     - Lines that start with // are notes for you; the website ignores them.
   Words in {curly brackets} are filled in automatically, for example
   {project} becomes the project name and {levels} the number of floors.
   ========================================================================= */

window.SITE = {

  /* -----------------------------------------------------------------------
     1. BASICS
     ----------------------------------------------------------------------- */

  // true while the project is fictional (shows "Concept demo" labels and
  // hides the site from Google). Set to false for a real, approved project.
  demo: true,

  // Language of the page, for browsers and screen readers ("en", "fr"...).
  language: "en",

  // The public address of the website, ending with a slash.
  siteUrl: "https://chryscazales16.github.io/oriel-residence/",

  // If you buy a domain, put it here without https:// (example: "www.orielresidence.com").
  // Leave empty to use the github.io address above.
  customDomain: "",

  // Who runs this website. Shown in the privacy notice.
  owner: {
    name: "Ckrys",
    email: "",
    // How long enquiries are kept before being deleted (privacy notice).
    retention: "24 months",
  },

  project: {
    name: "Oriel Residence",
    shortName: "Oriel",                     // top-left of every page
    titleLines: ["Oriel", "Residence"],     // the big title, one item per line
    tagline: "Twenty floors of offset terraces in Al Waha Circle, Dubai",
    // One or two sentences for Google results and link previews.
    description: "A twenty-storey tower of offset terraces in Al Waha Circle, Dubai. Explore every level in 3D, then open its floor plan to see sizes, views and availability.",
    city: "Dubai",
    community: "Al Waha Circle",
    developer: { name: "SABLIER", subline: "Developments" },
  },

  /* -----------------------------------------------------------------------
     2. CONTACT AND ENQUIRIES
     ----------------------------------------------------------------------- */

  contact: {
    // WhatsApp number in international format, example "+1 514 555 0123".
    // Leave empty "" to hide every WhatsApp button.
    whatsapp: "",
    whatsappMessage: "Hi, I'm interested in {project}.",
    whatsappUnitMessage: "Hi, I'm interested in residence {unit} ({type}) at {project}.",
    // Optional: shown as plain text in the enquiry section. Leave "" to hide.
    phone: "",
    email: "",
  },

  form: {
    // "web3forms" sends each enquiry to your inbox (free account at web3forms.com).
    // "none" hides the form and keeps only WhatsApp.
    provider: "web3forms",
    accessKey: "",                          // your Web3Forms access key
    subject: "New enquiry: {project}",      // subject line of the email you receive
  },

  /* -----------------------------------------------------------------------
     3. WORDS ON THE PAGE (in the order visitors see them)
     ----------------------------------------------------------------------- */

  nav: {
    location: "Location",
    architecture: "Architecture",
    residences: "Residences",
    register: "Register interest",
    registerShort: "Enquire",           // used on phones, where space is tight
  },

  hero: {
    scrollCue: "Scroll to descend",
    loading: "Preparing the scene",
  },

  // The five chapters shown bottom-left while scrolling.
  chapters: ["Arrival", "Location", "The rise", "Architecture", "Residences"],

  location: {
    eyebrow: "Location",
    title: "Al Waha Circle",
    text: "A ring of garden villas around a 25-acre central park, with Oriel at its centre. It is the only tower inside the circle, so its views stay open.",
    facts: [
      { value: "18 min", label: "Downtown Dubai" },
      { value: "15 min", label: "Dubai Marina" },
      { value: "25 min", label: "DXB Airport" },
    ],
  },

  // The black title card between the aerial view and the rising tower.
  rise: {
    title: ["Ready", "to rise."],
    line: "{project} · G+2P+{levels} · Handover Q4 2028",
  },

  why: {
    eyebrow: "The case for Dubai",
    title: "Why Dubai?",
    text: "A dollar-pegged currency, freehold title for international buyers, and a city built for people who plan to stay.",
    facts: [
      { value: "0%", label: "Personal income tax" },
      { value: "10 yrs", label: "Golden Visa for qualifying property investors" },
      { value: "100%", label: "Freehold ownership in designated zones" },
    ],
  },

  architecture: {
    eyebrow: "Architecture",
    title: "Every floor steps out.",
    text: "Each terrace has a four-metre break that jumps across the facade from one floor to the next. Part of every balcony gets a double-height void above it, with more sky and more evening light for the rooms behind.",
    chips: ["{levels} residential levels", "{residences} residences", "Studios to penthouses"],
  },

  explore: {
    eyebrow: "Residences",
    title: "Explore residences",
    hintMouse: "Hover over the tower to pick a level, then click to open its floor plan.",
    hintTouch: "Tap the tower to pick a level, then open its floor plan.",
    hintNo3D: "Step through the levels with the arrows or the level list, then open a floor plan.",
  },

  register: {
    eyebrow: "Sales gallery",
    title: "Register your interest",
    text: "Leave your details and a sales consultant will send floor plans, the payment plan and current availability.",
    facts: [
      { label: "Handover", value: "Q4 2028" },
      { label: "Payment plan", value: "60 / 40", note: "60% during construction, 40% on handover" },
      { label: "Residences from", value: "{fromPrice}" },
      { label: "Configuration", value: "G+2P+{levels}", note: "{residences} residences, studios to penthouses" },
    ],
    // Line under the send button. The demo version is used while demo is true.
    formNote: "We reply within one working day.",
    demoFormNote: "{project} is a demo project. Enquiries sent here reach {owner}, who built this website, not a sales team.",
  },

  footer: {
    text: "© {year} {project}. Visuals are artist's impressions. Prices and availability can change without notice.",
    demoText: "{project} and {developer} are fictional. This demo shows a scroll-driven 3D sales website, and its prices, availability and dates are illustrative. The tower, the city and the sky are rendered live in your browser.",
  },

  // Small words used by buttons, the level panel and the floor plans.
  labels: {
    demoBadge: "Concept demo",
    level: "Level",
    openPlan: "Open level {level} plan",
    plateLine: "{plate} · {count} residences",
    availability: "{available} available · {reserved} reserved · {sold} sold",
    from: "From {price}",
    soldOut: "This level is sold out",
    tagAvailable: "Level {level} · {available} available",
    tagSoldOut: "Level {level} · Sold out",
    backToBuilding: "Back to building",
    sharedWith: "Floorplate shared with levels {levels}",
    uniquePlate: "This floorplate is unique to level {level}",
    typicalPlan: "Typical floor plan of levels {levels}",
    planOf: "Floor plan of level {level}",
    and: "&",
    residence: "Residence {id}",
    interior: "Interior",
    terrace: "Terrace",
    total: "Total",
    view: "View",
    price: "Price",
    priceOnRequest: "Price on request",
    enquire: "Enquire",
    whatsapp: "WhatsApp",
    chatWhatsapp: "Chat on WhatsApp",
    speakToSales: "Speak to sales",
    planHint: "Hover over a residence on the plan to see its size, view and price.",
    prevLevel: "Previous level",
    nextLevel: "Next level",
    status: { available: "Available", reserved: "Reserved", sold: "Sold" },
    // Colour groups used in the floor-plan legend.
    groups: { studio: "Studio", "1br": "1 bedroom", "2br": "2 bedrooms", "3br": "3 bedrooms", ph: "Penthouse" },
    plan: { corridor: "Corridor", lobby: "Lobby", lifts: "Lifts" },
    form: {
      name: "Full name",
      email: "Email",
      phone: "Phone",
      type: "Residence type",
      typeAny: "Any",
      unit: "Residence of interest",
      unitPlaceholder: "For example 07-05",
      message: "Message",
      consent: "I agree to be contacted about {project} and I have read the privacy notice.",
      privacyLink: "privacy notice",
      submit: "Register interest",
      sending: "Sending…",
      success: "Thank you, {name}. Your enquiry has been sent, and we'll reply by email soon.",
      error: "Your enquiry didn't go through. Check your connection and try again, or message us on WhatsApp.",
      nameError: "Add your name so we know who to reply to.",
      emailError: "Check the email address. It should look like name@example.com.",
      consentError: "Tick the box to agree to be contacted.",
      notReady: "The enquiry form isn't connected yet. Please use WhatsApp, or try again later.",
    },
    notFound: { title: "This page doesn't exist", text: "The link may be old or mistyped.", back: "Back to {project}" },
  },

  /* -----------------------------------------------------------------------
     4. MONEY AND MEASUREMENTS
     ----------------------------------------------------------------------- */

  money: {
    currency: "AED",            // shown before prices
    locale: "en-US",            // number style: "en-US" gives 1,450,000
    showSoldPrices: false,      // false shows "Sold" instead of a sold residence's price
  },

  // "sqft" for square feet, "m2" for square metres.
  area: "sqft",

  /* -----------------------------------------------------------------------
     5. BUILDING AND FLOOR PLANS (advanced)
     Coordinates are in metres, seen from above: x runs from -17 (west) to
     17 (east) and y from -10 (north) to 10 (south). The lift core sits at
     the north middle (x -4.5 to 4.5, y -10 to -1.2). Each residence has an
     outline ("shape") and one or more zones; a zone lists its rooms along the
     window wall ("front") and along the corridor side ("back"), with each
     room's share of the width in percent.
     ----------------------------------------------------------------------- */

  building: {
    levels: 20,

    // Which colour group each residence type uses in the floor plans.
    unitTypes: {
      "Studio": "studio",
      "1 BHK": "1br",
      "1 BHK + Study": "1br",
      "2 BHK": "2br",
      "2 BHK + Maid": "2br",
      "3 BHK + Maid": "3br",
      "4 BHK Penthouse": "ph",
    },

    // Words printed around the floor plans.
    orientation: {
      north: "North · Skyline view",
      south: "South · Waha Park",
      west: "West · Community green",
      east: "East · Boulevard",
    },

    floorplates: [
      {
        id: "A", name: "Floorplate A", levels: [1, 9],
        corridor: [-10, -1.2, 10, 1.2],
        units: [
          { no: "01", type: "2 BHK + Maid", view: "Community green",
            shape: [[-17, -10], [-10, -10], [-10, 10], [-17, 10]],
            zones: [{ area: [-17, -10, -10, 10], windows: "west",
              front: [["Bedroom 2", 27], ["Living", 46], ["Bedroom 1", 27]],
              back: [["Bath", 17], ["Maid", 15], ["Kitchen", 31], ["Entry", 20], ["Bath", 17]] }] },
          { no: "02", type: "Studio", view: "Skyline",
            shape: [[-10, -10], [-4.5, -10], [-4.5, -1.2], [-10, -1.2]],
            zones: [{ area: [-10, -10, -4.5, -1.2], windows: "north",
              front: [["Studio", 100]],
              back: [["Kitchen", 55], ["Bath", 45]] }] },
          { no: "03", mirrorOf: "02", view: "Skyline" },
          { no: "04", mirrorOf: "01", view: "Boulevard" },
          { no: "05", type: "1 BHK", view: "Waha Park",
            shape: [[-10, 1.2], [-3.3, 1.2], [-3.3, 10], [-10, 10]],
            zones: [{ area: [-10, 1.2, -3.3, 10], windows: "south",
              front: [["Bedroom", 45], ["Living", 55]],
              back: [["Bath", 32], ["Kitchen", 40], ["Entry", 28]] }] },
          { no: "06", type: "1 BHK + Study", view: "Waha Park",
            shape: [[-3.3, 1.2], [3.3, 1.2], [3.3, 10], [-3.3, 10]],
            zones: [{ area: [-3.3, 1.2, 3.3, 10], windows: "south",
              front: [["Bedroom", 42], ["Living", 58]],
              back: [["Bath", 30], ["Study", 36], ["Kitchen", 34]] }] },
          { no: "07", mirrorOf: "05", view: "Waha Park" },
        ],
      },
      {
        id: "B", name: "Floorplate B", levels: [10, 18],
        corridor: [-10, -1.2, 10, 1.2],
        units: [
          { no: "01", type: "3 BHK + Maid", view: "Community green & skyline",
            shape: [[-17, -10], [-4.5, -10], [-4.5, -1.2], [-10, -1.2], [-10, 10], [-17, 10]],
            zones: [
              { area: [-17, -10, -10, 10], windows: "west",
                front: [["Bedroom 2", 27], ["Living", 46], ["Master", 27]],
                back: [["Bath", 18], ["Kitchen", 32], ["Maid", 15], ["Entry", 17], ["Bath", 18]] },
              { area: [-10, -10, -4.5, -1.2], windows: "north",
                front: [["Bedroom 3", 100]],
                back: [["Bath", 50], ["Laundry", 50]] },
            ] },
          { no: "02", mirrorOf: "01", view: "Boulevard & skyline" },
          { no: "03", type: "2 BHK", view: "Waha Park",
            shape: [[-10, 1.2], [0, 1.2], [0, 10], [-10, 10]],
            zones: [{ area: [-10, 1.2, 0, 10], windows: "south",
              front: [["Bedroom 2", 30], ["Living", 42], ["Master", 28]],
              back: [["Bath", 22], ["Kitchen", 34], ["Entry", 22], ["Bath", 22]] }] },
          { no: "04", mirrorOf: "03", view: "Waha Park" },
        ],
      },
      {
        id: "P", name: "Penthouse level", levels: [19, 20],
        corridor: [-4.5, -1.2, 4.5, 1.2],
        units: [
          { no: "01", type: "4 BHK Penthouse", view: "Park & skyline",
            shape: [[-17, -10], [-4.5, -10], [-4.5, 1.2], [0, 1.2], [0, 10], [-17, 10]],
            zones: [
              { area: [-17, -10, -4.5, 1.2], windows: "north",
                front: [["Bedroom 3", 36], ["Bedroom 4", 30], ["Family", 34]],
                back: [["Bath", 30], ["Bath", 30], ["Laundry", 40]] },
              { area: [-17, 1.2, 0, 10], windows: "south",
                front: [["Master", 32], ["Living", 44], ["Dining", 24]],
                back: [["Dressing", 20], ["Bath", 18], ["Kitchen", 30], ["Maid", 16], ["Entry", 16]] },
            ] },
          { no: "02", mirrorOf: "01", view: "Park & skyline" },
        ],
      },
    ],
  },

  /* -----------------------------------------------------------------------
     6. PRICES AND AVAILABILITY
     One line per residence: "level-number". status is "available",
     "reserved" or "sold". price is a number, or null for "Price on request".
     Optional: add interior: 1505, terrace: 390 to override the sizes worked
     out from the floor plan (in the area unit chosen above).
     ----------------------------------------------------------------------- */

  residences: {
    "01-01": { status: "reserved", price: 2440000 },
    "01-02": { status: "sold", price: 730000 },
    "01-03": { status: "sold", price: 875000 },
    "01-04": { status: "sold", price: 2440000 },
    "01-05": { status: "available", price: 1050000 },
    "01-06": { status: "sold", price: 1035000 },
    "01-07": { status: "sold", price: 905000 },
    "02-01": { status: "available", price: 2475000 },
    "02-02": { status: "sold", price: 890000 },
    "02-03": { status: "available", price: 740000 },
    "02-04": { status: "sold", price: 2475000 },
    "02-05": { status: "available", price: 920000 },
    "02-06": { status: "sold", price: 1050000 },
    "02-07": { status: "available", price: 1065000 },
    "03-01": { status: "sold", price: 2510000 },
    "03-02": { status: "sold", price: 750000 },
    "03-03": { status: "reserved", price: 905000 },
    "03-04": { status: "available", price: 2510000 },
    "03-05": { status: "sold", price: 1085000 },
    "03-06": { status: "sold", price: 1065000 },
    "03-07": { status: "sold", price: 930000 },
    "04-01": { status: "sold", price: 2545000 },
    "04-02": { status: "available", price: 915000 },
    "04-03": { status: "sold", price: 760000 },
    "04-04": { status: "available", price: 2545000 },
    "04-05": { status: "sold", price: 945000 },
    "04-06": { status: "reserved", price: 1080000 },
    "04-07": { status: "available", price: 1100000 },
    "05-01": { status: "sold", price: 2580000 },
    "05-02": { status: "available", price: 770000 },
    "05-03": { status: "sold", price: 930000 },
    "05-04": { status: "reserved", price: 2580000 },
    "05-05": { status: "available", price: 1115000 },
    "05-06": { status: "sold", price: 1095000 },
    "05-07": { status: "reserved", price: 960000 },
    "06-01": { status: "sold", price: 2615000 },
    "06-02": { status: "sold", price: 940000 },
    "06-03": { status: "sold", price: 780000 },
    "06-04": { status: "sold", price: 2615000 },
    "06-05": { status: "available", price: 970000 },
    "06-06": { status: "sold", price: 1110000 },
    "06-07": { status: "sold", price: 1130000 },
    "07-01": { status: "available", price: 2655000 },
    "07-02": { status: "sold", price: 790000 },
    "07-03": { status: "sold", price: 955000 },
    "07-04": { status: "sold", price: 2655000 },
    "07-05": { status: "sold", price: 1145000 },
    "07-06": { status: "available", price: 1125000 },
    "07-07": { status: "sold", price: 985000 },
    "08-01": { status: "sold", price: 2690000 },
    "08-02": { status: "sold", price: 965000 },
    "08-03": { status: "sold", price: 800000 },
    "08-04": { status: "sold", price: 2690000 },
    "08-05": { status: "sold", price: 995000 },
    "08-06": { status: "available", price: 1140000 },
    "08-07": { status: "available", price: 1160000 },
    "09-01": { status: "sold", price: 2725000 },
    "09-02": { status: "sold", price: 815000 },
    "09-03": { status: "sold", price: 980000 },
    "09-04": { status: "available", price: 2725000 },
    "09-05": { status: "sold", price: 1175000 },
    "09-06": { status: "available", price: 1155000 },
    "09-07": { status: "reserved", price: 1010000 },
    "10-01": { status: "available", price: 3935000 },
    "10-02": { status: "sold", price: 3770000 },
    "10-03": { status: "available", price: 1610000 },
    "10-04": { status: "available", price: 1765000 },
    "11-01": { status: "sold", price: 3815000 },
    "11-02": { status: "available", price: 3985000 },
    "11-03": { status: "sold", price: 1790000 },
    "11-04": { status: "available", price: 1630000 },
    "12-01": { status: "available", price: 4040000 },
    "12-02": { status: "sold", price: 3865000 },
    "12-03": { status: "sold", price: 1650000 },
    "12-04": { status: "sold", price: 1810000 },
    "13-01": { status: "sold", price: 3915000 },
    "13-02": { status: "reserved", price: 4090000 },
    "13-03": { status: "available", price: 1835000 },
    "13-04": { status: "available", price: 1670000 },
    "14-01": { status: "available", price: 4140000 },
    "14-02": { status: "sold", price: 3960000 },
    "14-03": { status: "reserved", price: 1690000 },
    "14-04": { status: "sold", price: 1855000 },
    "15-01": { status: "available", price: 4010000 },
    "15-02": { status: "available", price: 4190000 },
    "15-03": { status: "sold", price: 1880000 },
    "15-04": { status: "available", price: 1710000 },
    "16-01": { status: "available", price: 4240000 },
    "16-02": { status: "sold", price: 4060000 },
    "16-03": { status: "sold", price: 1730000 },
    "16-04": { status: "reserved", price: 1905000 },
    "17-01": { status: "available", price: 4110000 },
    "17-02": { status: "available", price: 4290000 },
    "17-03": { status: "available", price: 1925000 },
    "17-04": { status: "available", price: 1755000 },
    "18-01": { status: "sold", price: 4340000 },
    "18-02": { status: "sold", price: 4155000 },
    "18-03": { status: "available", price: 1775000 },
    "18-04": { status: "available", price: 1950000 },
    "19-01": { status: "reserved", price: 8075000 },
    "19-02": { status: "available", price: 8075000 },
    "20-01": { status: "available", price: 8170000 },
    "20-02": { status: "sold", price: 8170000 },
  },
};
