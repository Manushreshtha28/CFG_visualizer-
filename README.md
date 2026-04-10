# CFGviz — Context-Free Grammar Derivation & Parse Tree Visualizer

A beautiful, production-ready interactive web tool for visualizing Context-Free Grammar derivations and parse trees. No dependencies, no build step — pure HTML, CSS, and JavaScript.

---

## 🚀 Features

| Feature | Description |
|---|---|
| **Grammar Editor** | Multi-line CFG rules with `→` or `->` notation |
| **Leftmost Derivation** | BFS-based, step-by-step with highlighted expansions |
| **Rightmost Derivation** | Full rightmost derivation trace |
| **Both Modes** | Side-by-side comparison |
| **Live Animation** | Real-time playback with accept burst effect |
| **Parse Tree** | Interactive zoomable SVG with export |
| **Grammar Analysis** | CNF check, unit/ε-productions, unreachable symbols |
| **Presets** | aⁿbⁿ, Arithmetic, Palindrome, Balanced Parens |
| **Color Themes** | 5 accent palettes + light/dark mode |
| **SVG Export** | Download parse tree as SVG |

---

## 📁 File Structure

```
cfg-visualizer/
├── index.html              ← Entry point
├── css/
│   └── main.css            ← All styles, design system, responsive
├── js/
│   ├── engine.js           ← Grammar parser, BFS derivation, tree builder
│   ├── renderer.js         ← Derivation HTML, SVG tree, grammar info
│   ├── animation.js        ← Real-time animation engine + particle canvas
│   └── app.js              ← Main controller, event wiring
├── vercel.json             ← Vercel deployment config
├── netlify.toml            ← Netlify deployment config
├── .github/
│   └── workflows/
│       └── deploy.yml      ← GitHub Pages auto-deploy
└── README.md
```

---

## ▶️ Running Locally

**Option 1 — Just open the file:**
```bash
open index.html
```

**Option 2 — Local server (recommended for full features):**
```bash
# Python
python3 -m http.server 3000

# Node (npx)
npx serve .

# Then visit http://localhost:3000
```

---

## 🌐 Deploying

### Vercel (Recommended — 1 click)
1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com), click **Import Project**
3. Select your repo — Vercel auto-detects static site
4. Click **Deploy** ✓

Or via CLI:
```bash
npm i -g vercel
vercel --prod
```

### Netlify
1. Drag & drop the project folder to [netlify.com/drop](https://app.netlify.com/drop)
2. Or connect GitHub repo in Netlify dashboard
3. Build command: *(empty)*, Publish directory: `.`

### GitHub Pages
1. Push to GitHub
2. Go to **Settings → Pages → Source: GitHub Actions**
3. The workflow in `.github/workflows/deploy.yml` will auto-deploy on push to `main`

---

## 📖 Grammar Format

```
S → AB | a           (multiple productions with |)
A → aA | a           (recursive rules)
B → bB | b
E → E + T | T        (left-recursive)
S → a S b | ab       (aⁿbⁿ)
S → (S) | SS | ε     (ε for empty string)
```

Rules accept both `→` and `->` as separator.  
Symbols are space-separated on the RHS, or single characters if no spaces.

---

## 🧠 Algorithm

- **Grammar Parsing**: Handles `→`/`->` separators, multi-char symbols, ε-productions
- **Derivation Search**: BFS over sentential forms with depth limit (configurable)
- **Leftmost**: Always expands the leftmost non-terminal in each step
- **Rightmost**: Always expands the rightmost non-terminal in each step  
- **Parse Tree**: Replays leftmost derivation, tracking which production was applied at each step to reconstruct the full tree
- **Grammar Analysis**: Chomsky Normal Form check, unit production detection, ε-production detection, reachability analysis

---

## Assignment Details

**Subject**: Context-Free Grammar Derivation and Parse Tree Generator  
**Course**: Formal Languages & Automata Theory  
**Submitted**: April 10, 2026
