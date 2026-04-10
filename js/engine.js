/* =====================================================
   engine.js — CFG Parser, Derivation Engine, Tree Builder
   ===================================================== */

window.CFGEngine = (() => {

  // ── Grammar Parser ──────────────────────────────────
  function parseGrammar(rulesText, startSymbol) {
    const grammar = {};      // lhs → [[sym,...], ...]
    const allNT = new Set();
    const allT = new Set();
    const lines = rulesText.split('\n').map(l => l.trim()).filter(l => l);

    for (const line of lines) {
      const sep = line.includes('→') ? '→' : line.includes('->') ? '->' : ':=';
      const idx = line.indexOf(sep);
      if (idx < 0) continue;
      const lhs = line.slice(0, idx).trim();
      const rhs = line.slice(idx + sep.length);
      if (!lhs) continue;
      allNT.add(lhs);
      grammar[lhs] = grammar[lhs] || [];
      const alts = rhs.split('|').map(a => a.trim()).filter(a => a !== '');
      for (const alt of alts) {
        if (alt === 'ε' || alt === 'eps' || alt === 'epsilon') {
          grammar[lhs].push(['ε']);
        } else {
          const syms = alt.includes(' ') ? alt.split(/\s+/).filter(Boolean) : alt.split('');
          grammar[lhs].push(syms);
        }
      }
    }

    // classify terminals
    for (const [, prods] of Object.entries(grammar)) {
      for (const prod of prods) {
        for (const sym of prod) {
          if (sym !== 'ε' && !allNT.has(sym)) allT.add(sym);
        }
      }
    }

    return { grammar, allNT, allT, start: startSymbol };
  }

  // ── Sentential form → terminal string ───────────────
  function formToStr(form) {
    return form.filter(s => s !== 'ε').join('');
  }

  // ── BFS Leftmost Derivation ──────────────────────────
  function deriveLeftmost(grammar, allNT, start, target, maxSteps) {
    const queue = [{ form: [start], path: [[start]] }];
    const visited = new Set();
    while (queue.length > 0) {
      const { form, path } = queue.shift();
      if (path.length > maxSteps + 1) continue;
      const key = form.join('\x00');
      if (visited.has(key)) continue;
      visited.add(key);

      const str = formToStr(form);
      const hasNT = form.some(s => allNT.has(s));
      if (str === target && !hasNT) return path;
      if (!hasNT) continue;

      const idx = form.findIndex(s => allNT.has(s));
      const sym = form[idx];
      const prods = grammar[sym] || [];
      for (const prod of prods) {
        const newForm = [...form.slice(0, idx), ...prod, ...form.slice(idx + 1)];
        queue.push({ form: newForm, path: [...path, newForm] });
      }
    }
    return null;
  }

  // ── BFS Rightmost Derivation ─────────────────────────
  function deriveRightmost(grammar, allNT, start, target, maxSteps) {
    const queue = [{ form: [start], path: [[start]] }];
    const visited = new Set();
    while (queue.length > 0) {
      const { form, path } = queue.shift();
      if (path.length > maxSteps + 1) continue;
      const key = form.join('\x00');
      if (visited.has(key)) continue;
      visited.add(key);

      const str = formToStr(form);
      const hasNT = form.some(s => allNT.has(s));
      if (str === target && !hasNT) return path;
      if (!hasNT) continue;

      let idx = -1;
      for (let i = form.length - 1; i >= 0; i--) {
        if (allNT.has(form[i])) { idx = i; break; }
      }
      if (idx === -1) continue;

      const sym = form[idx];
      const prods = grammar[sym] || [];
      for (const prod of prods) {
        const newForm = [...form.slice(0, idx), ...prod, ...form.slice(idx + 1)];
        queue.push({ form: newForm, path: [...path, newForm] });
      }
    }
    return null;
  }

  // ── Build Parse Tree from Leftmost Derivation Path ───
  function buildParseTree(grammar, allNT, start, steps) {
    if (!steps || steps.length < 1) return null;

    function mkNode(sym) { return { sym, children: [] }; }

    const root = mkNode(start);
    let leaves = [root];

    for (let i = 1; i < steps.length; i++) {
      const step = steps[i];
      const ntLeafIdx = leaves.findIndex(n => allNT.has(n.sym));
      if (ntLeafIdx === -1) break;
      const ntLeaf = leaves[ntLeafIdx];

      // find which production was applied
      const prevForm = steps[i - 1];
      const lIdx = prevForm.findIndex(s => allNT.has(s));
      let usedProd = null;
      for (const p of (grammar[ntLeaf.sym] || [])) {
        const testForm = [...prevForm.slice(0, lIdx), ...p, ...prevForm.slice(lIdx + 1)];
        if (testForm.join('\x00') === step.join('\x00')) { usedProd = p; break; }
      }
      if (!usedProd) continue;

      for (const childSym of usedProd) {
        const child = mkNode(childSym);
        ntLeaf.children.push(child);
      }

      const newLeaves = [
        ...leaves.slice(0, ntLeafIdx),
        ...ntLeaf.children,
        ...leaves.slice(ntLeafIdx + 1)
      ];
      leaves = newLeaves;
    }
    return root;
  }

  // ── Grammar Analysis ──────────────────────────────────
  function analyzeGrammar(grammar, allNT, allT, start) {
    const ntArr = [...allNT];
    const tArr = [...allT];
    let prodCount = 0, hasUnit = false, hasEps = false;
    let isCNF = true;

    for (const [lhs, prods] of Object.entries(grammar)) {
      prodCount += prods.length;
      for (const p of prods) {
        if (p.length === 1 && p[0] === 'ε') { hasEps = true; isCNF = false; continue; }
        if (p.length === 1 && allNT.has(p[0])) { hasUnit = true; isCNF = false; continue; }
        if (p.length === 1 && !allNT.has(p[0])) { /* terminal — ok for CNF */ continue; }
        if (p.length === 2 && allNT.has(p[0]) && allNT.has(p[1])) continue;
        if (p.length !== 1 && p.length !== 2) isCNF = false;
      }
    }

    // check reachability
    const reachable = new Set([start]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const nt of reachable) {
        for (const prod of (grammar[nt] || [])) {
          for (const sym of prod) {
            if (allNT.has(sym) && !reachable.has(sym)) { reachable.add(sym); changed = true; }
          }
        }
      }
    }
    const unreachable = ntArr.filter(nt => !reachable.has(nt));

    return { ntArr, tArr, prodCount, hasUnit, hasEps, isCNF, unreachable };
  }

  // ── Presets ───────────────────────────────────────────
  const PRESETS = {
    anbn: {
      start: 'S',
      rules: 'S → a S b | a b',
      input: 'aaabbb'
    },
    arithmetic: {
      start: 'E',
      rules: 'E → E + T | T\nT → T * F | F\nF → ( E ) | id',
      input: 'id + id * id'
    },
    palindrome: {
      start: 'S',
      rules: 'S → a S a | b S b | a | b | ε',
      input: 'abba'
    },
    balanced: {
      start: 'S',
      rules: 'S → ( S ) | S S | ε',
      input: '(())'
    }
  };

  return { parseGrammar, deriveLeftmost, deriveRightmost, buildParseTree, analyzeGrammar, PRESETS, formToStr };
})();
