/* =====================================================
   animation.js — Real-time derivation animation engine
   ===================================================== */

window.CFGAnimation = (() => {
  let steps = null;
  let allNT = null;
  let currentStep = 0;
  let timer = null;
  let speed = 600;
  let isPlaying = false;

  const stage = () => document.getElementById('animStage');
  const progressFill = () => document.getElementById('animProgress');
  const stepInfo = () => document.getElementById('animStepInfo');

  function setSteps(newSteps, ntSet) {
    steps = newSteps;
    allNT = ntSet;
    currentStep = 0;
    isPlaying = false;
    clearTimeout(timer);
    renderStep(0, false);
    updateProgress();
  }

  function setSpeed(ms) { speed = ms; }

  function play() {
    if (!steps || currentStep >= steps.length - 1) {
      if (steps && currentStep >= steps.length - 1) { currentStep = 0; }
      if (!steps) return;
    }
    isPlaying = true;
    advance();
  }

  function pause() {
    isPlaying = false;
    clearTimeout(timer);
  }

  function reset() {
    pause();
    currentStep = 0;
    renderStep(0, false);
    updateProgress();
  }

  function advance() {
    if (!isPlaying || !steps) return;
    if (currentStep < steps.length - 1) {
      currentStep++;
      renderStep(currentStep, true);
      updateProgress();
      timer = setTimeout(advance, speed);
    } else {
      isPlaying = false;
      showAcceptBurst();
    }
  }

  function updateProgress() {
    if (!steps) return;
    const pct = steps.length <= 1 ? 100 : (currentStep / (steps.length - 1)) * 100;
    progressFill().style.width = pct + '%';
    stepInfo().textContent = `Step ${currentStep} / ${steps.length - 1}`;
  }

  function renderStep(idx, animate) {
    if (!steps || !stage()) return;
    const form = steps[idx];
    const isLast = idx === steps.length - 1;
    const prevForm = idx > 0 ? steps[idx - 1] : null;

    // Find which symbol is being expanded (leftmost NT in prev step)
    let expandedIdx = -1;
    if (prevForm) {
      expandedIdx = prevForm.findIndex(s => allNT.has(s));
    }

    // Figure out new symbols (the expanded production)
    let newSymStart = -1, newSymEnd = -1;
    if (prevForm && expandedIdx !== -1) {
      newSymStart = expandedIdx;
      newSymEnd = expandedIdx + (form.length - prevForm.length + 1);
    }

    // Build symbol elements
    let symsHTML = '';
    for (let i = 0; i < form.length; i++) {
      const sym = form[i];
      const isNT = allNT.has(sym);
      const isNew = animate && newSymStart !== -1 && i >= newSymStart && i < newSymEnd;

      let cls = isNT ? 'anim-sym nt' : 'anim-sym term';
      if (isLast) cls += ' accepted';
      if (isNew) cls += ' new-sym';

      symsHTML += `<span class="${cls}" style="animation-delay:${isNew ? (i - newSymStart) * 0.08 : 0}s">${CFGRenderer.esc(sym)}</span>`;
    }

    // Rule badge
    let ruleHTML = '';
    if (prevForm && expandedIdx !== -1) {
      const lhs = prevForm[expandedIdx];
      const prod = form.slice(newSymStart, newSymEnd).join(' ');
      ruleHTML = `<div class="anim-rule-badge">${lhs} → ${CFGRenderer.esc(prod)}</div>`;
    }

    // Accept banner
    let acceptHTML = '';
    if (isLast) {
      acceptHTML = `<div style="position:absolute;bottom:3.5rem;font-size:0.85rem;font-weight:700;color:var(--success);animation:fadeIn 0.5s ease both;letter-spacing:0.08em;text-transform:uppercase">String Accepted ✓</div>`;
    }

    stage().innerHTML = `
      <div class="accept-burst" id="acceptBurst"></div>
      <div class="anim-form-display">${symsHTML}</div>
      ${ruleHTML}
      ${acceptHTML}
      <div class="anim-step-label">Step ${idx} of ${steps.length - 1}</div>`;
  }

  function showAcceptBurst() {
    const burst = document.getElementById('acceptBurst');
    if (!burst) return;
    burst.classList.add('show');
    burst.innerHTML = `
      <div class="accept-ring" style="animation-delay:0s"></div>
      <div class="accept-ring" style="animation-delay:0.2s"></div>
      <div class="accept-ring" style="animation-delay:0.4s"></div>`;
    setTimeout(() => burst.classList.remove('show'), 1200);
  }

  // Particle canvas
  function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * 1000,
      y: Math.random() * 800,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.3,
      a: Math.random() * 0.5 + 0.1,
    }));

    let accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00d4ff';

    function draw() {
      ctx.clearRect(0, 0, W, H);
      accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00d4ff';
      for (const p of particles) {
        p.x = ((p.x + p.vx) % W + W) % W;
        p.y = ((p.y + p.vy) % H + H) % H;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.globalAlpha = p.a * 0.6;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Draw faint connections
      ctx.strokeStyle = accent;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 120) {
            ctx.globalAlpha = (1 - dist / 120) * 0.06;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
      requestAnimationFrame(draw);
    }
    draw();
  }

  return { setSteps, setSpeed, play, pause, reset, initParticles };
})();
