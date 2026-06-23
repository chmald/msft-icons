# Microsoft Icons → draw.io Shape Libraries

Generate ready-to-use [draw.io / diagrams.net](https://www.drawio.com/) shape
libraries from the **official Microsoft product SVG icon sets** — Azure, Microsoft
Fabric, Dynamics 365, Power Platform, Microsoft 365, and Entra/Security.

The generator turns folders/zips of SVGs into **one `.xml` library per product
family** that you can import locally or load by URL.

```
Azure                  azure.xml
Microsoft Fabric       fabric.xml
Dynamics 365           dynamics365.xml
Power Platform         power-platform.xml
Microsoft 365          microsoft-365.xml
Entra & Security       entra-security.xml
```

> ℹ️ The raw Microsoft SVGs are **not** committed to this repo (see
> [icon usage terms](NOTICE.md)). You download them yourself, drop them in
> `downloads/`, and run the generator. Only the generated `libraries/*.xml`
> are committed.

---

## Quick start

```bash
# 1. Install dev/runtime dependencies (Node.js 18+)
npm install

# 2. Put official Microsoft icon ZIPs (or extracted folders) in ./downloads
#    e.g. downloads/azure-icons.zip, downloads/fabric/, downloads/microsoft-365.zip

# 3. Generate the libraries
npm run generate

# 4. Validate the output
npm run validate
```

Generated files land in `./libraries/<family>.xml`.

### Useful flags

```bash
npm run generate -- --family azure,fabric   # only specific families
npm run generate -- --report                # classify only; write nothing
npm run generate -- --size 64               # override icon size (px)
npm run generate -- --input path/to/icons   # alternate input dir
npm run generate -- --verbose               # show per-source counts
```

---

## Where to get the official icons

Download these and place the ZIPs/folders under `downloads/`. **Honor Microsoft's
[terms of use](NOTICE.md)** — do not crop, flip, rotate, or distort the icons, and
do not use them to represent non-Microsoft products.

| Family | Official download page | Bundled `downloads/` file (example) |
| --- | --- | --- |
| Azure | <https://learn.microsoft.com/en-us/azure/architecture/icons/> | `Azure_Public_Service_Icons_V*.zip` |
| Microsoft 365 / Office | <https://learn.microsoft.com/en-us/previous-versions/microsoft-365/solutions/architecture-icons-templates> | `*microsoft-365-content-icons.zip` |
| Microsoft Fabric | <https://learn.microsoft.com/en-us/fabric/fundamentals/icons> | `Microsoft-Fabric-Icons.zip` |
| Power Platform | <https://learn.microsoft.com/en-us/power-platform/guidance/icons> | `Power-Platform-icons-scalable.zip` |
| Entra / Security | <https://learn.microsoft.com/en-us/entra/architecture/architecture-icons> (plus the identity/security categories of the Azure set) | `Microsoft Entra architecture icons*.zip` |
| Dynamics 365 | <https://learn.microsoft.com/en-us/dynamics365/get-started/icons> | `Dynamics-365-icons-scalable.zip` |

The generator classifies each SVG into a family using the **source root** (the zip
basename or top-level folder name) and optional path filters — see
[Configuration](#configuration).

---

## Using the libraries in draw.io

### A) Local import (`.xml` file)

1. Open <https://app.diagrams.net/> (or draw.io Desktop).
2. **File → Open Library from → Device…**
3. Select e.g. `libraries/azure.xml`. The shapes appear in the left **Shapes** panel.

### B) Load by URL (`?clibs=`) — public web app

Load libraries straight from the raw GitHub URL. Prefix each URL with `U` (for
*URL*); separate multiple libraries with `;`:

```
https://app.diagrams.net/?clibs=Uhttps://raw.githubusercontent.com/chmald/msft-icons/main/libraries/azure.xml
```

Multiple families at once:

```
https://app.diagrams.net/?clibs=Uhttps://raw.githubusercontent.com/chmald/msft-icons/main/libraries/azure.xml;Uhttps://raw.githubusercontent.com/chmald/msft-icons/main/libraries/fabric.xml
```

A small **[URL builder](docs/index.html)** assembles these links for you.

### C) draw.io plugin — load ALL families at once (Desktop / self-hosted)

The plugin [`plugin/msft-icons.js`](plugin/msft-icons.js) registers **one sidebar
palette per family** (all 1233 shapes) in a single install — no per-file import, no
long URL. It is self-contained (icons embedded, works offline).

- **draw.io Desktop:** copy `plugin/msft-icons.js` into the app's plugins folder, or
  use **Extras → Plugins → Add… → (path to the file)**, then restart.
  - Plugins folder: Windows `%AppData%\draw.io\plugins`, macOS
    `~/Library/Application Support/draw.io/plugins`, Linux `~/.config/draw.io/plugins`.
- **Self-hosted draw.io:** serve the file and add it to the `PLUGINS` /
  `?p=` allow-list, or load via `?p=<url-or-id>` per your deployment's plugin config.
- **Public app.diagrams.net:** custom external plugins are **blocked for security** —
  use options **A** or **B** there instead.

Regenerate the plugin after rebuilding libraries with `npm run plugin`.

---

## Configuration

Families and classification rules live in [`config/families.json`](config/families.json):

```jsonc
{
  "iconSizePx": 48,             // longer edge scaled to this; aspect preserved
  "families": [
    {
      "id": "fabric",          // -> libraries/fabric.xml
      "name": "Microsoft Fabric",

      // `match` is one rule, or a list of rules OR'd together. A rule matches
      // when its `sources` AND `pathIncludes` match and no `pathExcludes` match.
      "match": { "sources": ["fabric"] },   // matched against the zip/folder name

      "stripTokens": [],        // leading brand prefixes removed from titles
      "dropTokens": [           // noise tokens removed anywhere (sizes/styles)
        "16", "24", "48", "filled", "regular", "color"
      ],
      "collapseVariants": true, // collapse size/style variants to ONE entry per name
      "preferTokens": ["_color", "_48_"]  // which variant wins (priority order)
    }
  ]
}
```

- Families are evaluated **in order**; the first match wins. Put the most specific
  families first (e.g. `entra-security` before `azure`).
- Use a **list of rules** to combine signals — e.g. a standalone Entra zip plus a
  path-based carve-out of the identity/security folders from the Azure set.
- `collapseVariants` + `preferTokens` turn multi-size/multi-style sets (Fabric,
  Microsoft 365, Entra) into one clean shape per icon.
- Run `npm run generate -- --report` to see how files are classified and which SVGs
  were **unclassified** — then tune the rules.

> **Microsoft Foundry / AI Foundry** icons ship inside the **Azure** architecture set
> (AI category), so they land in `azure.xml` — there is no separate Foundry library.

### Titles

Titles are derived from filenames: numeric IDs and `icon-service-` prefixes are
stripped, separators become spaces, and common acronyms (AI, SQL, VM, …) are
upper-cased. Remove brand prefixes with `stripTokens` and size/style noise with
`dropTokens`.

---

## How it works

```
downloads/ (zips + folders)
   │  acquire   → extract zips, walk for .svg
   ▼
SvgSource[]  → classify (config/families.json) → grouped by family
   │  svg      → parse size (viewBox/width/height), base64-encode (no artwork edits)
   ▼
library     → <mxlibrary>[{ data, w, h, title, aspect:"fixed" }]</mxlibrary>
   ▼
libraries/<family>.xml   → validate → commit
   ▼
plugin/msft-icons.js     → (npm run plugin) one-install plugin with all palettes
```

Only non-distorting cleanup is applied to the SVGs (XML declaration/DOCTYPE removal),
so the artwork is never modified.

---

## Project layout

```
config/families.json     Family definitions + classification rules
src/                     TypeScript generator
  index.ts               CLI (build)
  validate.ts            Library validator
  plugin.ts              draw.io plugin generator
  acquire.ts             Zip/folder/SVG discovery
  classify.ts            SVG → family assignment
  svg.ts                 Size parsing + data-URI encoding
  library.ts             mxlibrary assembly + writer
  config.ts              Config loader/validator
  util/                  logging, fs walk, title derivation
downloads/               (git-ignored) input icon zips/folders
libraries/               Committed generated .xml libraries
plugin/                  Committed draw.io plugin (all families)
docs/                    URL builder page
```

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run generate` | Build libraries from `downloads/` into `libraries/` |
| `npm run validate` | Validate the generated `libraries/*.xml` |
| `npm run plugin` | Build the all-in-one draw.io plugin (`plugin/msft-icons.js`) |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run build` | Compile TypeScript to `dist/` |

---

## License & icon terms

- The **generator code** in this repository is licensed under the [MIT License](LICENSE).
- The **Microsoft icons** remain the property of Microsoft and are subject to
  Microsoft's terms of use. See **[NOTICE.md](NOTICE.md)** before generating,
  redistributing, or using the libraries.
