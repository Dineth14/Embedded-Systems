/* ============================================================================
   EE322 — UML / Stateflow Simulation
   Interactive traffic-light finite state machine with emergency event.
   Container: #uml-sim  |  Module: m09.html
   ============================================================================ */
(function () {
  'use strict';

  const STATES = {
    RED:       { color: '#FF4C4C', label: 'RED',       duration: 45, next: 'GREEN' },
    GREEN:     { color: '#00FF9C', label: 'GREEN',     duration: 30, next: 'YELLOW' },
    YELLOW:    { color: '#FFB300', label: 'YELLOW',    duration: 5,  next: 'RED' },
    RED_FLASH: { color: '#FF4C4C', label: 'RED FLASH', duration: -1, next: null } // manual exit
  };

  class UMLStateflowSim extends SimulationBase {
    constructor() {
      super('uml-sim');
      if (!this.container) return;

      this.state = 'RED';
      this.timer = 0;
      this.transitions = 0;
      this.events = 0;
      this.flashOn = true;
      this.history = []; // [{time, from, to, event}]

      this.svg = null;
      this.width = 0;
      this.height = 0;

      this.bindExtra();
      this.doReset();
      this.initCanvas();
      this.render();
    }

    bindExtra() {
      const emergBtn = document.getElementById('btn-emergency');
      const clearBtn = document.getElementById('btn-clear');

      if (emergBtn) {
        emergBtn.addEventListener('click', () => {
          if (this.state !== 'RED_FLASH') {
            const from = this.state;
            this.state = 'RED_FLASH';
            this.timer = 0;
            this.transitions++;
            this.events++;
            this.history.push({ time: this.events, from, to: 'RED_FLASH', event: 'emergency' });
            this.render();
            this.updateStats();
          }
        });
      }

      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          if (this.state === 'RED_FLASH') {
            this.state = 'RED';
            this.timer = 0;
            this.transitions++;
            this.events++;
            this.history.push({ time: this.events, from: 'RED_FLASH', to: 'RED', event: 'clear' });
            this.render();
            this.updateStats();
          }
        });
      }
    }

    doStep() {
      this.timer++;

      if (this.state === 'RED_FLASH') {
        this.flashOn = !this.flashOn;
        this.render();
        this.updateStats();
        return;
      }

      const current = STATES[this.state];
      if (this.timer >= current.duration) {
        const from = this.state;
        this.state = current.next;
        this.timer = 0;
        this.transitions++;
        this.events++;
        this.history.push({ time: this.events, from, to: this.state, event: 'timer_expired' });
      }

      this.updateStats();
    }

    doReset() {
      this.state = 'RED';
      this.timer = 0;
      this.transitions = 0;
      this.events = 0;
      this.flashOn = true;
      this.history = [];
      this.updateStats();
    }

    updateStats() {
      const el = (id) => document.getElementById(id);
      if (el('uml-state'))       el('uml-state').textContent = STATES[this.state].label;
      if (el('uml-timer'))       el('uml-timer').textContent = this.timer;
      if (el('uml-transitions')) el('uml-transitions').textContent = this.transitions;
      if (el('uml-events'))      el('uml-events').textContent = this.events;
    }

    initCanvas() {
      if (!this.canvas) return;
      this.canvas.innerHTML = '';
      const rect = this.canvas.getBoundingClientRect();
      this.width = rect.width || 700;
      this.height = Math.max(320, rect.height);

      this.svg = d3.select(this.canvas)
        .append('svg')
        .attr('width', '100%')
        .attr('height', this.height)
        .attr('viewBox', `0 0 ${this.width} ${this.height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');
    }

    render() {
      if (!this.svg) return;
      this.svg.selectAll('*').remove();

      const w = this.width;
      const h = this.height;
      const cx = w / 2;
      const cy = h / 2;
      const g = this.svg.append('g');

      // State positions (circle layout)
      const stateNames = ['RED', 'GREEN', 'YELLOW', 'RED_FLASH'];
      const positions = {
        RED:       { x: cx - 140, y: cy - 60 },
        GREEN:     { x: cx + 140, y: cy - 60 },
        YELLOW:    { x: cx + 140, y: cy + 80 },
        RED_FLASH: { x: cx - 140, y: cy + 80 }
      };

      const R = 38; // state circle radius

      // Draw transitions (arrows)
      const transitions = [
        { from: 'RED',       to: 'GREEN',     label: 'timer (45s)' },
        { from: 'GREEN',     to: 'YELLOW',    label: 'timer (30s)' },
        { from: 'YELLOW',    to: 'RED',       label: 'timer (5s)' },
        { from: 'RED_FLASH', to: 'RED',       label: 'clear' },
      ];

      // Arrow marker
      g.append('defs').append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 10).attr('refY', 5)
        .attr('markerWidth', 8).attr('markerHeight', 8)
        .attr('orient', 'auto-start-reverse')
        .append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .attr('fill', '#484F58');

      transitions.forEach(t => {
        const from = positions[t.from];
        const to = positions[t.to];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nx = dx / dist;
        const ny = dy / dist;

        const x1 = from.x + nx * (R + 2);
        const y1 = from.y + ny * (R + 2);
        const x2 = to.x - nx * (R + 8);
        const y2 = to.y - ny * (R + 8);

        // Slight curve for better visibility
        const mx = (x1 + x2) / 2 - ny * 15;
        const my = (y1 + y2) / 2 + nx * 15;

        const isActive = this.history.length > 0 &&
          this.history[this.history.length - 1].from === t.from &&
          this.history[this.history.length - 1].to === t.to;

        g.append('path')
          .attr('d', `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`)
          .attr('fill', 'none')
          .attr('stroke', isActive ? '#00FF9C' : '#484F58')
          .attr('stroke-width', isActive ? 2.5 : 1.5)
          .attr('marker-end', 'url(#arrow)');

        // Label
        const lx = mx;
        const ly = my - 6;
        g.append('text')
          .attr('x', lx).attr('y', ly)
          .attr('text-anchor', 'middle')
          .attr('fill', isActive ? '#00FF9C' : '#8B949E')
          .attr('font-size', 9)
          .text(t.label);
      });

      // Emergency transitions (from any normal state to RED_FLASH) — show dashed lines
      ['RED', 'GREEN', 'YELLOW'].forEach(s => {
        const from = positions[s];
        const to = positions['RED_FLASH'];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return; // skip self

        const nx = dx / dist;
        const ny = dy / dist;
        const x1 = from.x + nx * (R + 2);
        const y1 = from.y + ny * (R + 2);
        const x2 = to.x - nx * (R + 8);
        const y2 = to.y - ny * (R + 8);

        g.append('line')
          .attr('x1', x1).attr('y1', y1)
          .attr('x2', x2).attr('y2', y2)
          .attr('stroke', '#FF4C4C').attr('stroke-width', 1)
          .attr('stroke-dasharray', '4,4')
          .attr('opacity', 0.4);
      });

      // Emergency label
      g.append('text')
        .attr('x', cx).attr('y', cy + 30)
        .attr('text-anchor', 'middle')
        .attr('fill', '#FF4C4C').attr('font-size', 9).attr('opacity', 0.5)
        .text('emergency (from any)');

      // Draw state circles
      stateNames.forEach(name => {
        const pos = positions[name];
        const info = STATES[name];
        const isCurrent = this.state === name;
        const showFlash = name === 'RED_FLASH' && isCurrent && !this.flashOn;

        // Glow for current
        if (isCurrent) {
          g.append('circle')
            .attr('cx', pos.x).attr('cy', pos.y).attr('r', R + 6)
            .attr('fill', 'none')
            .attr('stroke', info.color)
            .attr('stroke-width', 2)
            .attr('opacity', 0.3);
        }

        // Circle
        g.append('circle')
          .attr('cx', pos.x).attr('cy', pos.y).attr('r', R)
          .attr('fill', isCurrent && !showFlash ? info.color + '33' : '#161B22')
          .attr('stroke', isCurrent ? info.color : '#30363D')
          .attr('stroke-width', isCurrent ? 2.5 : 1.5);

        // Label
        g.append('text')
          .attr('x', pos.x).attr('y', pos.y + 4)
          .attr('text-anchor', 'middle')
          .attr('fill', isCurrent ? info.color : '#8B949E')
          .attr('font-size', 12).attr('font-weight', isCurrent ? 700 : 400)
          .text(info.label);

        // Timer display
        if (isCurrent && name !== 'RED_FLASH') {
          const pct = this.timer / info.duration;
          // Arc around circle showing timer progress
          const startAngle = -Math.PI / 2;
          const endAngle = startAngle + pct * 2 * Math.PI;
          const arcR = R + 3;

          const path = d3.arc()({
            innerRadius: arcR - 2,
            outerRadius: arcR,
            startAngle: startAngle + Math.PI / 2,
            endAngle: endAngle + Math.PI / 2,
          });

          g.append('path')
            .attr('d', path)
            .attr('transform', `translate(${pos.x}, ${pos.y})`)
            .attr('fill', info.color)
            .attr('opacity', 0.7);
        }
      });

      // Initial state marker (small filled circle with arrow)
      const initPos = positions['RED'];
      g.append('circle')
        .attr('cx', initPos.x - R - 25).attr('cy', initPos.y)
        .attr('r', 5).attr('fill', '#C9D1D9');
      g.append('line')
        .attr('x1', initPos.x - R - 20).attr('y1', initPos.y)
        .attr('x2', initPos.x - R - 4).attr('y2', initPos.y)
        .attr('stroke', '#C9D1D9').attr('stroke-width', 2)
        .attr('marker-end', 'url(#arrow)');

      // Transition history (small log at bottom)
      const logY = h - 30;
      const recent = this.history.slice(-4);
      recent.forEach((entry, i) => {
        const lx = 20 + i * 170;
        g.append('text')
          .attr('x', lx).attr('y', logY)
          .attr('fill', '#484F58').attr('font-size', 9)
          .attr('font-family', 'JetBrains Mono, monospace')
          .text(`${entry.from} →[${entry.event}]→ ${entry.to}`);
      });
    }
  }

  function init() {
    if (typeof d3 !== 'undefined' && document.getElementById('uml-sim')) {
      new UMLStateflowSim();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
