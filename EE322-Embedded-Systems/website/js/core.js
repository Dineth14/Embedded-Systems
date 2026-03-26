/* ============================================================================
   EE322 — Embedded Systems Design: Core JavaScript
   Module Navigator, Accordion, Code Highlighting, Math Rendering,
   Scroll Reveal, Progress Tracker, Theme Consistency
   ============================================================================ */

// ---- Module Navigator ----
class ModuleNavigator {
  constructor() {
    this.sidebar = document.querySelector('.module-sidebar__list');
    this.sections = [];
    this.links = [];
    this.observer = null;
    if (this.sidebar) this.init();
  }

  init() {
    this.links = Array.from(this.sidebar.querySelectorAll('a'));
    this.sections = this.links.map(link => {
      const id = link.getAttribute('href')?.replace('#', '');
      return id ? document.getElementById(id) : null;
    }).filter(Boolean);

    // IntersectionObserver for active section tracking
    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersect(entries),
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );
    this.sections.forEach(sec => this.observer.observe(sec));

    // Smooth scroll on click
    this.links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(link.getAttribute('href').replace('#', ''));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.replaceState(null, '', link.getAttribute('href'));
        }
      });
    });
  }

  handleIntersect(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.setActive(entry.target.id);
      }
    });
  }

  setActive(id) {
    this.links.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
    });
  }
}

// ---- Section Accordion ----
class SectionAccordion {
  constructor() {
    this.accordions = document.querySelectorAll('.section-accordion');
    this.accordions.forEach(acc => this.initAccordion(acc));
  }

  initAccordion(accordion) {
    const header = accordion.querySelector('.section-accordion__header');
    if (!header) return;

    // Open by default if marked
    if (accordion.dataset.defaultOpen === 'true') {
      accordion.classList.add('open');
    }

    header.addEventListener('click', () => {
      accordion.classList.toggle('open');
    });

    // Keyboard accessibility
    header.setAttribute('tabindex', '0');
    header.setAttribute('role', 'button');
    header.setAttribute('aria-expanded', accordion.classList.contains('open'));
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        accordion.classList.toggle('open');
        header.setAttribute('aria-expanded', accordion.classList.contains('open'));
      }
    });
  }
}

// ---- Code Highlight ----
class CodeHighlight {
  constructor() {
    if (typeof hljs !== 'undefined') {
      this.init();
    }
  }

  init() {
    document.querySelectorAll('pre code').forEach(block => {
      hljs.highlightElement(block);
    });

    // Add copy button to code blocks
    document.querySelectorAll('pre').forEach(pre => {
      const btn = document.createElement('button');
      btn.className = 'btn btn--small code-copy-btn';
      btn.textContent = 'Copy';
      btn.style.cssText = 'position:absolute;top:8px;right:8px;opacity:0;transition:opacity 150ms ease;';
      pre.style.position = 'relative';
      pre.appendChild(btn);

      pre.addEventListener('mouseenter', () => btn.style.opacity = '1');
      pre.addEventListener('mouseleave', () => btn.style.opacity = '0');

      btn.addEventListener('click', () => {
        const code = pre.querySelector('code');
        if (code) {
          navigator.clipboard.writeText(code.textContent).then(() => {
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = 'Copy', 1500);
          });
        }
      });
    });
  }
}

// ---- Math Renderer ----
class MathRenderer {
  constructor() {
    if (typeof katex !== 'undefined' && typeof renderMathInElement !== 'undefined') {
      this.init();
    }
  }

  init() {
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true }
      ],
      throwOnError: false,
      strict: false
    });
  }
}

// ---- Scroll Reveal ----
class ScrollReveal {
  constructor() {
    this.elements = document.querySelectorAll('.reveal');
    if (this.elements.length > 0) this.init();
  }

  init() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    this.elements.forEach(el => observer.observe(el));
  }
}

// ---- Progress Tracker ----
class ProgressTracker {
  constructor() {
    this.bar = document.querySelector('.progress-bar__fill');
    if (this.bar) this.init();
  }

  init() {
    window.addEventListener('scroll', () => this.update(), { passive: true });
    this.update();
  }

  update() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
    this.bar.style.width = `${progress}%`;
  }
}

// ---- Theme Consistency ----
class ThemeConsistency {
  constructor() {
    // Ensure CSS variables are available
    this.root = document.documentElement;
    this.applyMetaTheme();
  }

  applyMetaTheme() {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = getComputedStyle(this.root).getPropertyValue('--bg-primary').trim() || '#0D1117';
  }
}

// ---- Simulation Base Class ----
class SimulationBase {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.canvas = this.container.querySelector('.sim-container__canvas');
    this.running = false;
    this.animationId = null;
    this.speed = 1;

    this.bindControls();
  }

  bindControls() {
    const playBtn = this.container.querySelector('[data-action="play"]');
    const pauseBtn = this.container.querySelector('[data-action="pause"]');
    const resetBtn = this.container.querySelector('[data-action="reset"]');
    const stepBtn = this.container.querySelector('[data-action="step"]');
    const speedSlider = this.container.querySelector('[data-control="speed"]');

    if (playBtn) playBtn.addEventListener('click', () => this.play());
    if (pauseBtn) pauseBtn.addEventListener('click', () => this.pause());
    if (resetBtn) resetBtn.addEventListener('click', () => this.reset());
    if (stepBtn) stepBtn.addEventListener('click', () => this.step());
    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        this.speed = parseFloat(e.target.value);
        const display = this.container.querySelector('.speed-display');
        if (display) display.textContent = `${this.speed}x`;
      });
    }
  }

  play() {
    if (this.running) return;
    this.running = true;
    this.animate();
  }

  pause() {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  reset() {
    this.pause();
    this.doReset();
    this.render();
  }

  step() {
    this.pause();
    this.doStep();
    this.render();
  }

  animate() {
    if (!this.running) return;
    this.doStep();
    this.render();
    this.animationId = requestAnimationFrame(() => {
      setTimeout(() => this.animate(), Math.max(50, 500 / this.speed));
    });
  }

  // Override in subclasses
  doStep() {}
  doReset() {}
  render() {}
}

// ---- Tooltip Helper ----
class SimTooltip {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'sim-tooltip';
    document.body.appendChild(this.el);
  }

  show(x, y, html) {
    this.el.innerHTML = html;
    this.el.style.left = `${x + 12}px`;
    this.el.style.top = `${y - 8}px`;
    this.el.classList.add('visible');
  }

  hide() {
    this.el.classList.remove('visible');
  }
}

// ---- Log Helper ----
class SimLog {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.maxEntries = 100;
  }

  add(message, type = 'info') {
    if (!this.container) return;
    const entry = document.createElement('div');
    entry.className = `sim-log__entry sim-log__entry--${type}`;
    const ts = document.createElement('span');
    ts.className = 'sim-log__timestamp';
    ts.textContent = new Date().toLocaleTimeString();
    entry.appendChild(ts);
    entry.appendChild(document.createTextNode(message));
    this.container.appendChild(entry);

    // Trim old entries
    while (this.container.children.length > this.maxEntries) {
      this.container.removeChild(this.container.firstChild);
    }

    this.container.scrollTop = this.container.scrollHeight;
  }

  clear() {
    if (this.container) this.container.innerHTML = '';
  }
}

// ---- Initialize all on DOMContentLoaded ----
document.addEventListener('DOMContentLoaded', () => {
  window.ee322 = {
    navigator: new ModuleNavigator(),
    accordion: new SectionAccordion(),
    codeHighlight: new CodeHighlight(),
    math: new MathRenderer(),
    scrollReveal: new ScrollReveal(),
    progress: new ProgressTracker(),
    theme: new ThemeConsistency(),
    tooltip: new SimTooltip()
  };
});
