/* =====================================================
   renderer.js — Renders derivation steps, parse tree SVG, grammar info
   ===================================================== */

window.CFGRenderer = (() => {

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Render Derivation Steps ──────────────────────────
  function renderDerivationSteps(steps, allNT, modeLabel) {
    if (!steps || steps.length === 0) return '';
    let html = `<div class="deriv-mode-heading">${esc(modeLabel)}</div>`;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const isFirst = i === 0;
      const isLast = i === steps.length - 1;
      const cls = isLast ? 'step-card step-final' : isFirst ? 'step-card step-first' : 'step-card';

      // find which NT gets expanded in this step
      let expandIdx = -1;
      if (!isLast && steps[i + 1]) {
        expandIdx = step.findIndex(s => allNT.has(s));
      }

      // build highlighted string
      let strHTML = '';
      for (let j = 0; j < step.length; j++) {
        const sym = esc(step[j]);
        if (j === expandIdx) {
          strHTML += `<span class="hl">${sym}</span>`;
        } else if (!allNT.has(step[j]) && step[j] !== 'ε') {
          strHTML += `<span class="term">${sym}</span>`;
        } else {
          strHTML += sym;
        }
      }

      // rule label
      let ruleLabel = '';
      if (!isFirst && i > 0) {
        const prev = steps[i - 1];
        const ntIdx = prev.findIndex(s => allNT.has(s));
        if (ntIdx !== -1) {
          const lhs = prev[ntIdx];
          const expansion = step.slice(ntIdx, ntIdx + (step.length - prev.length + 1)).join(' ');
          ruleLabel = `${lhs} → ${expansion}`;
        }
      }

      html += `
        <div class="${cls}" style="animation-delay:${i * 0.035}s">
          <span class="step-num">${isFirst ? 'S₀' : `S${i}`}</span>
          <div class="step-body">
            <div class="step-string">${strHTML || 'ε'}</div>
            ${ruleLabel ? `<div class="step-rule">Applied: ${esc(ruleLabel)}</div>` : ''}
          </div>
          <span class="step-arrow">${isFirst ? 'start' : isLast ? '✓ derived' : `⇒`}</span>
        </div>`;
    }
    return html;
  }

  // ── Parse Tree SVG ────────────────────────────────────
  const NODE_R = 24;
  const LEVEL_H = 78;
  const H_PAD = 8;

  function measureNode(node) {
    if (!node.children || node.children.length === 0) {
      node.w = NODE_R * 2 + H_PAD * 2;
      return;
    }
    node.children.forEach(measureNode);
    node.w = node.children.reduce((s, c) => s + c.w, 0);
  }

  function layoutNode(node, x, y) {
    node.x = x + node.w / 2;
    node.y = y;
    let cx = x;
    for (const child of (node.children || [])) {
      layoutNode(child, cx, y + LEVEL_H);
      cx += child.w;
    }
  }

  function collectAll(node, nodes = [], edges = []) {
    nodes.push(node);
    for (const c of (node.children || [])) {
      edges.push({ x1: node.x, y1: node.y, x2: c.x, y2: c.y });
      collectAll(c, nodes, edges);
    }
    return { nodes, edges };
  }

  function renderTree(root, allNT) {
    if (!root) return '';
    measureNode(root);
    const PAD = 48;
    layoutNode(root, PAD, NODE_R + PAD);
    let maxY = 0;
    function getMaxY(n) { if (n.y > maxY) maxY = n.y; (n.children||[]).forEach(getMaxY); }
    getMaxY(root);
    const svgW = root.w + PAD * 2;
    const svgH = maxY + NODE_R + PAD * 2;
    const { nodes, edges } = collectAll(root);

    let svg = `<svg class="tree-svg" xmlns="http://www.w3.org/2000/svg"
      width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}"
      data-w="${svgW}" data-h="${svgH}"
      style="font-family:'Space Mono',monospace;overflow:visible">
      <defs>
        <filter id="nodeglow">
          <feGaussianBlur stdDeviation="4" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g class="tree-root">`;

    // Edges
    for (const e of edges) {
      svg += `<line class="edge" x1="${e.x1.toFixed(1)}" y1="${e.y1.toFixed(1)}" x2="${e.x2.toFixed(1)}" y2="${e.y2.toFixed(1)}"/>`;
    }

    // Nodes
    for (const node of nodes) {
      const isTerm = node.sym === 'ε' || !allNT.has(node.sym);
      const cls = isTerm ? 't-circle' : 'nt-circle';
      const lblCls = isTerm ? 't-label' : 'nt-label';
      svg += `
        <g class="tree-node" style="filter:url(#nodeglow)" transform="translate(${node.x.toFixed(1)},${node.y.toFixed(1)})">
          <circle class="${cls}" r="${NODE_R}" cx="0" cy="0"/>
          <text class="${lblCls}" x="0" y="0" text-anchor="middle" dominant-baseline="central"
            font-size="12" font-family="Space Mono,monospace">${esc(node.sym)}</text>
        </g>`;
    }

    svg += `</g></svg>`;
    return svg;
  }

  // ── Grammar Info HTML ─────────────────────────────────
  function renderGrammarInfo(grammar, analysis, start, derived, leftLen, rightLen) {
    const { ntArr, tArr, prodCount, hasUnit, hasEps, isCNF, unreachable } = analysis;

    let html = `
    <div class="info-card">
      <div class="info-card-title">Summary Statistics</div>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-val">${ntArr.length}</div>
          <div class="stat-lbl">Non-Terminals</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${tArr.length}</div>
          <div class="stat-lbl">Terminals</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${prodCount}</div>
          <div class="stat-lbl">Productions</div>
        </div>
        <div class="stat-box">
          <div class="stat-val ${derived ? 'ok' : 'err'}">${derived ? '✓' : '✗'}</div>
          <div class="stat-lbl">Accepted</div>
        </div>
        <div class="stat-box">
          <div class="stat-val ${isCNF ? 'ok' : 'warn'}">${isCNF ? 'Yes' : 'No'}</div>
          <div class="stat-lbl">CNF Form</div>
        </div>
        <div class="stat-box">
          <div class="stat-val ${unreachable.length === 0 ? 'ok' : 'warn'}">${unreachable.length === 0 ? '✓' : unreachable.length}</div>
          <div class="stat-lbl">Unreachable</div>
        </div>
      </div>
    </div>

    <div class="info-card">
      <div class="info-card-title">Symbol Sets</div>
      <div style="margin-bottom:0.6rem">
        <div style="font-size:0.68rem;color:var(--text3);margin-bottom:0.4rem;text-transform:uppercase;letter-spacing:0.08em">Non-Terminals N = { }</div>
        <div class="tag-list">${ntArr.map(nt => `<span class="tag nt">${esc(nt)}</span>`).join('')}</div>
      </div>
      <div>
        <div style="font-size:0.68rem;color:var(--text3);margin-bottom:0.4rem;text-transform:uppercase;letter-spacing:0.08em">Terminals Σ = { }</div>
        <div class="tag-list">${tArr.map(t => `<span class="tag t">${esc(t)}</span>`).join('')}</div>
      </div>
    </div>`;

    if (hasUnit || hasEps || unreachable.length > 0) {
      html += `<div class="info-card">
        <div class="info-card-title">Grammar Properties</div>
        <div style="display:flex;flex-direction:column;gap:0.4rem">
          ${hasEps ? `<div style="font-size:0.78rem;color:var(--warning);background:rgba(255,214,10,0.06);border:1px solid rgba(255,214,10,0.2);padding:0.45rem 0.75rem;border-radius:6px">⚠ Contains ε-productions</div>` : ''}
          ${hasUnit ? `<div style="font-size:0.78rem;color:var(--warning);background:rgba(255,214,10,0.06);border:1px solid rgba(255,214,10,0.2);padding:0.45rem 0.75rem;border-radius:6px">⚠ Contains unit productions</div>` : ''}
          ${unreachable.length > 0 ? `<div style="font-size:0.78rem;color:var(--error);background:rgba(255,91,110,0.06);border:1px solid rgba(255,91,110,0.2);padding:0.45rem 0.75rem;border-radius:6px">✗ Unreachable non-terminals: ${unreachable.map(esc).join(', ')}</div>` : ''}
        </div>
      </div>`;
    }

    if (leftLen !== null || rightLen !== null) {
      html += `<div class="info-card">
        <div class="info-card-title">Derivation Info</div>
        <div style="display:flex;flex-direction:column;gap:0.35rem;font-size:0.78rem;color:var(--text2)">
          ${leftLen !== null ? `<div>Leftmost derivation: <strong style="color:var(--text)">${leftLen - 1} steps</strong></div>` : ''}
          ${rightLen !== null ? `<div>Rightmost derivation: <strong style="color:var(--text)">${rightLen - 1} steps</strong></div>` : ''}
        </div>
      </div>`;
    }

    html += `<div class="info-card">
      <div class="info-card-title">Production Rules</div>
      <div class="prod-list">`;
    for (const [lhs, prods] of Object.entries(grammar)) {
      const alts = prods.map(p => p.join(' ')).join(' | ');
      html += `<div class="prod-item">
        <span class="prod-lhs">${esc(lhs)}</span>
        <span class="prod-arr">→</span>
        <span>${esc(alts)}</span>
      </div>`;
    }
    html += `</div></div>`;
    return html;
  }

  return { renderDerivationSteps, renderTree, renderGrammarInfo, esc };
})();
