/* =====================================================
   app.js — Main application controller
   ===================================================== */

(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────
  let derivMode = 'leftmost';
  let animSpeed = 600;
  let treeZoom = 1.0;
  let lastLeftSteps = null;
  let lastRightSteps = null;
  let lastAllNT = null;

  // ── Boot ──────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    CFGAnimation.initParticles();
    wireSegControl();
    wireSpeedControl();
    wirePalette();
    wirePresets();
    wireTabs();
    wireNav();
    wireStringPreview();
    wireAnimButtons();
    wireGenerate();
    wireThemeToggle();
    wireExport();
    document.getElementById('inputString').addEventListener('input', updateStringTokens);
    updateStringTokens();
  });

  // ── String Tokens Preview ─────────────────────────────
  function updateStringTokens() {
    const val = document.getElementById('inputString').value.trim();
    const container = document.getElementById('stringTokens');
    if (!val) { container.innerHTML = '<span style="font-size:0.68rem;color:var(--text3)">empty string (ε)</span>'; return; }
    container.innerHTML = val.split('').map(c =>
      `<span class="s-token">${CFGRenderer.esc(c)}</span>`
    ).join('');
  }

  // ── Segmented Control ─────────────────────────────────
  function wireSegControl() {
    document.querySelectorAll('.seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        derivMode = btn.dataset.mode;
      });
    });
  }

  // ── Speed Control ─────────────────────────────────────
  function wireSpeedControl() {
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        animSpeed = parseInt(btn.dataset.speed);
        CFGAnimation.setSpeed(animSpeed);
      });
    });
  }

  // ── Palette ───────────────────────────────────────────
  function wirePalette() {
    document.querySelectorAll('.palette-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        document.querySelectorAll('.palette-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        document.body.dataset.palette = dot.dataset.palette;
      });
    });
  }

  // ── Presets ───────────────────────────────────────────
  function wirePresets() {
    document.querySelectorAll('.preset-card').forEach(card => {
      card.addEventListener('click', () => {
        const preset = CFGEngine.PRESETS[card.dataset.preset];
        if (!preset) return;
        document.getElementById('startSymbol').value = preset.start;
        document.getElementById('grammarRules').value = preset.rules;
        document.getElementById('inputString').value = preset.input;
        updateStringTokens();
        showError('');
      });
    });
  }

  // ── Tabs ──────────────────────────────────────────────
  function wireTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const id = tab.dataset.tab;
        document.querySelectorAll('.tab-pane').forEach(p => {
          p.classList.remove('active');
          p.classList.add('hidden');
        });
        const pane = document.getElementById('pane-' + id);
        if (pane) { pane.classList.remove('hidden'); pane.classList.add('active'); }
      });
    });
  }

  // ── Nav ───────────────────────────────────────────────
  function wireNav() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        const sec = link.dataset.section;
        document.getElementById('sectionMain')?.classList.add('hidden');
        document.getElementById('sectionHelp')?.classList.add('hidden');
        document.getElementById('sectionAbout')?.classList.add('hidden');
        if (sec === 'main') document.getElementById('sectionMain')?.classList.remove('hidden');
        else if (sec === 'help') document.getElementById('sectionHelp')?.classList.remove('hidden');
        else if (sec === 'about') document.getElementById('sectionAbout')?.classList.remove('hidden');
      });
    });
  }

  // ── Anim buttons ─────────────────────────────────────
  function wireAnimButtons() {
    document.getElementById('animPlay').addEventListener('click', () => CFGAnimation.play());
    document.getElementById('animPause').addEventListener('click', () => CFGAnimation.pause());
    document.getElementById('animReset').addEventListener('click', () => CFGAnimation.reset());
  }

  // ── Theme toggle ─────────────────────────────────────
  function wireThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const isLight = document.documentElement.dataset.theme === 'light';
      document.documentElement.dataset.theme = isLight ? '' : 'light';
    });
  }

  // ── Export SVG ───────────────────────────────────────
  function wireExport() {
    document.getElementById('exportBtn').addEventListener('click', () => {
      const svg = document.querySelector('#treeViewport svg');
      if (!svg) { alert('Generate a parse tree first.'); return; }
      const data = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([data], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'parse_tree.svg';
      a.click(); URL.revokeObjectURL(url);
    });
  }

  // ── Tree Zoom ─────────────────────────────────────────
  window.CFG = {
    zoomTree(factor) {
      treeZoom = Math.max(0.2, Math.min(4, treeZoom * factor));
      applyTreeZoom();
    },
    resetZoom() {
      treeZoom = 1.0;
      applyTreeZoom();
    }
  };

  function applyTreeZoom() {
    const svg = document.querySelector('#treeViewport svg');
    if (!svg) return;
    const w = parseFloat(svg.getAttribute('data-w') || svg.getAttribute('width'));
    const h = parseFloat(svg.getAttribute('data-h') || svg.getAttribute('height'));
    svg.setAttribute('width', (w * treeZoom) + 'px');
    svg.setAttribute('height', (h * treeZoom) + 'px');
    document.getElementById('zoomLabel').textContent = Math.round(treeZoom * 100) + '%';
  }

  // ── Error Display ─────────────────────────────────────
  function showError(msg) {
    const el = document.getElementById('errorMsg');
    if (!msg) { el.classList.add('hidden'); return; }
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  // ── GENERATE ──────────────────────────────────────────
  function wireGenerate() {
    document.getElementById('generateBtn').addEventListener('click', generate);
    document.getElementById('grammarRules').addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 'Enter') generate();
    });
  }

  function generate() {
    showError('');
    const startSymbol = document.getElementById('startSymbol').value.trim();
    const rulesText = document.getElementById('grammarRules').value.trim();
    const inputStr = document.getElementById('inputString').value.trim();
    const maxSteps = parseInt(document.getElementById('maxSteps').value);

    if (!startSymbol) { showError('Please enter a start symbol.'); return; }
    if (!rulesText) { showError('Please enter grammar rules.'); return; }

    const btn = document.getElementById('generateBtn');
    btn.classList.add('loading');
    btn.querySelector('.btn-generate-text').textContent = 'Computing';

    // Use setTimeout so UI updates before heavy computation
    setTimeout(() => {
      try {
        _doGenerate(startSymbol, rulesText, inputStr, maxSteps);
      } catch(err) {
        showError('Error: ' + err.message);
      } finally {
        btn.classList.remove('loading');
        btn.querySelector('.btn-generate-text').textContent = 'Visualize';
      }
    }, 30);
  }

  function _doGenerate(startSymbol, rulesText, inputStr, maxSteps) {
    const parsed = CFGEngine.parseGrammar(rulesText, startSymbol);
    const { grammar, allNT, allT } = parsed;

    if (!grammar[startSymbol]) {
      showError(`Start symbol "${startSymbol}" has no production rules.`);
      return;
    }

    lastAllNT = allNT;

    // Run derivations
    let leftSteps = null, rightSteps = null;
    if (derivMode === 'leftmost' || derivMode === 'both') {
      leftSteps = CFGEngine.deriveLeftmost(grammar, allNT, startSymbol, inputStr, maxSteps);
    }
    if (derivMode === 'rightmost' || derivMode === 'both') {
      rightSteps = CFGEngine.deriveRightmost(grammar, allNT, startSymbol, inputStr, maxSteps);
    }

    lastLeftSteps = leftSteps;
    lastRightSteps = rightSteps;

    const derived = !!(leftSteps || rightSteps);
    const primarySteps = leftSteps || rightSteps;

    // ── Result Banner ────────────────────────────────────
    const banner = document.getElementById('resultBanner');
    banner.className = 'result-banner ' + (derived ? 'success' : 'failure');
    const stepCount = primarySteps ? primarySteps.length - 1 : 0;
    banner.innerHTML = `
      <span class="banner-icon">${derived ? '✓' : '✗'}</span>
      <span class="banner-text">
        String <strong>"${CFGRenderer.esc(inputStr || 'ε')}"</strong>
        ${derived ? 'is <strong>accepted</strong> by the grammar' : 'is <strong>NOT</strong> in the language'}
      </span>
      ${derived ? `<span class="banner-steps">${stepCount} steps</span>` : ''}`;
    banner.classList.remove('hidden');

    // ── Derivation Steps ─────────────────────────────────
    let derivHTML = '';
    if (derived) {
      if (leftSteps) derivHTML += CFGRenderer.renderDerivationSteps(leftSteps, allNT, 'Leftmost Derivation');
      if (rightSteps) derivHTML += CFGRenderer.renderDerivationSteps(rightSteps, allNT, 'Rightmost Derivation');
    } else {
      derivHTML = `<div style="color:var(--text2);font-size:0.82rem;padding:1rem;background:var(--bg2);border:1px solid var(--border);border-radius:10px;line-height:1.7">
        The string could not be derived within <strong>${maxSteps}</strong> steps. Try increasing Max Steps, or check your grammar rules.
      </div>`;
    }
    document.getElementById('derivationContent').innerHTML = derivHTML;

    // ── Parse Tree ───────────────────────────────────────
    const treeVP = document.getElementById('treeViewport');
    if (primarySteps) {
      const root = CFGEngine.buildParseTree(grammar, allNT, startSymbol, primarySteps);
      if (root) {
        treeZoom = 1.0;
        const svgStr = CFGRenderer.renderTree(root, allNT);
        treeVP.innerHTML = svgStr;
        document.getElementById('zoomLabel').textContent = '100%';
      } else {
        treeVP.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠</div><p class="empty-title">Tree build failed</p><p class="empty-sub">Derivation found but tree could not be constructed.</p></div>`;
      }
    } else {
      treeVP.innerHTML = `<div class="empty-state"><div class="empty-icon">✗</div><p class="empty-title">No parse tree</p><p class="empty-sub">String is not in the language</p></div>`;
    }

    // ── Animation ────────────────────────────────────────
    if (primarySteps) {
      CFGAnimation.setSpeed(animSpeed);
      CFGAnimation.setSteps(primarySteps, allNT);
    } else {
      document.getElementById('animStage').innerHTML = `<div class="empty-state"><div class="empty-icon">✗</div><p class="empty-title">Nothing to animate</p><p class="empty-sub">String not derivable</p></div>`;
      document.getElementById('animProgress').style.width = '0%';
      document.getElementById('animStepInfo').textContent = 'Step 0 / 0';
    }

    // ── Grammar Info ─────────────────────────────────────
    const analysis = CFGEngine.analyzeGrammar(grammar, allNT, allT, startSymbol);
    document.getElementById('grammarInfoContent').innerHTML = CFGRenderer.renderGrammarInfo(
      grammar, analysis, startSymbol, derived,
      leftSteps ? leftSteps.length : null,
      rightSteps ? rightSteps.length : null
    );

    // Switch to derivation tab
    activateTab('derivation');
  }

  function activateTab(id) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const tab = document.querySelector(`.tab[data-tab="${id}"]`);
    if (tab) tab.classList.add('active');
    document.querySelectorAll('.tab-pane').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
    const pane = document.getElementById('pane-' + id);
    if (pane) { pane.classList.remove('hidden'); pane.classList.add('active'); }
  }

})();
