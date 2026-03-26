/* ============================================================================
   EE322 — Multitasking Simulation
   Visualises preemptive task switching on a single-core processor.
   Container: #multitask-sim  |  Module: m06.html
   ============================================================================ */
(function () {
  'use strict';

  const TASK_COLORS = ['#00FF9C', '#00BFFF', '#FFB300', '#FF4C4C'];
  const IDLE_COLOR  = '#30363D';

  // Task definitions: {name, period, execTime, priority (lower = higher)}
  const TASKS = [
    { name: 'Sensor',  period: 10, execTime: 2, priority: 1, color: TASK_COLORS[0] },
    { name: 'Control', period: 20, execTime: 5, priority: 2, color: TASK_COLORS[1] },
    { name: 'Display', period: 40, execTime: 3, priority: 3, color: TASK_COLORS[2] },
    { name: 'Logging', period: 50, execTime: 4, priority: 4, color: TASK_COLORS[3] },
  ];

  class MultitaskSim extends SimulationBase {
    constructor() {
      super('multitask-sim');
      if (!this.container) return;

      this.tick = 0;
      this.switches = 0;
      this.lastRunning = -1;
      this.history = [];       // [{tick, taskIndex}]  -1 = idle
      this.taskState = [];     // remaining exec time for current period

      this.svg = null;
      this.width = 0;
      this.height = 0;

      this.bindExtra();
      this.doReset();
      this.initCanvas();
      this.render();
    }

    bindExtra() {
      const slider = this.container.querySelector('[data-control="tick"]');
      if (slider) {
        slider.addEventListener('input', (e) => {
          this.speed = parseInt(e.target.value, 10);
          const display = this.container.querySelector('.tick-display');
          if (display) display.textContent = this.speed + ' ms';
        });
      }
    }

    doStep() {
      this.tick++;

      // Release tasks at their periods
      for (let i = 0; i < TASKS.length; i++) {
        if (this.tick % TASKS[i].period === 0) {
          this.taskState[i] = TASKS[i].execTime;
        }
      }

      // Fixed-priority preemptive scheduling: pick highest priority (lowest number) ready task
      let runIdx = -1;
      for (let i = 0; i < TASKS.length; i++) {
        if (this.taskState[i] > 0) {
          runIdx = i;
          break; // highest priority first
        }
      }

      // Execute
      if (runIdx >= 0) {
        this.taskState[runIdx]--;
      }

      // Track context switches
      if (runIdx !== this.lastRunning) {
        if (this.tick > 1) this.switches++;
        this.lastRunning = runIdx;
      }

      this.history.push({ tick: this.tick, task: runIdx });

      this.updateStats();
    }

    doReset() {
      this.tick = 0;
      this.switches = 0;
      this.lastRunning = -1;
      this.history = [];
      this.taskState = TASKS.map(() => 0);
      // Release all tasks at t=0
      for (let i = 0; i < TASKS.length; i++) {
        this.taskState[i] = TASKS[i].execTime;
      }
      this.updateStats();
    }

    updateStats() {
      const el = (id) => document.getElementById(id);
      if (el('mt-tick'))     el('mt-tick').textContent = this.tick;
      if (el('mt-switches')) el('mt-switches').textContent = this.switches;
      if (el('mt-running')) {
        const name = this.lastRunning >= 0 ? TASKS[this.lastRunning].name : 'Idle';
        el('mt-running').textContent = name;
      }
      if (el('mt-util')) {
        const busy = this.history.filter(h => h.task >= 0).length;
        const util = this.history.length > 0 ? ((busy / this.history.length) * 100).toFixed(0) + '%' : '0%';
        el('mt-util').textContent = util;
      }
    }

    initCanvas() {
      if (!this.canvas) return;
      this.canvas.innerHTML = '';
      const rect = this.canvas.getBoundingClientRect();
      this.width = rect.width || 700;
      this.height = Math.max(260, rect.height);

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

      const margin = { top: 30, right: 20, bottom: 40, left: 80 };
      const w = this.width - margin.left - margin.right;
      const h = this.height - margin.top - margin.bottom;
      const g = this.svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const numTasks = TASKS.length;
      const laneH = h / (numTasks + 1); // +1 for idle row
      const visibleTicks = Math.max(40, this.tick + 5);
      const startTick = Math.max(0, this.tick - Math.floor(w / 10));
      const endTick = startTick + Math.floor(w / 10) + 10;
      const cellW = w / (endTick - startTick);

      // Title
      g.append('text').attr('x', w / 2).attr('y', -10)
        .attr('text-anchor', 'middle').attr('fill', '#C9D1D9')
        .attr('font-size', 13).attr('font-weight', 600)
        .text('Fixed-Priority Preemptive Scheduling — Task Timeline');

      // Task labels (lanes)
      const labels = [...TASKS.map(t => t.name), 'Idle'];
      const colors = [...TASKS.map(t => t.color), IDLE_COLOR];

      labels.forEach((label, i) => {
        const y = i * laneH;
        g.append('text')
          .attr('x', -10).attr('y', y + laneH / 2 + 4)
          .attr('text-anchor', 'end')
          .attr('fill', colors[i]).attr('font-size', 11).attr('font-weight', 500)
          .text(label);

        // Lane background
        g.append('rect')
          .attr('x', 0).attr('y', y + 2)
          .attr('width', w).attr('height', laneH - 4)
          .attr('fill', '#0D1117').attr('rx', 3);
      });

      // Draw history bars
      this.history.forEach(({ tick: t, task }) => {
        if (t < startTick || t > endTick) return;
        const x = (t - startTick) * cellW;
        const laneIdx = task >= 0 ? task : numTasks; // idle lane
        const y = laneIdx * laneH;

        g.append('rect')
          .attr('x', x).attr('y', y + 4)
          .attr('width', Math.max(cellW - 0.5, 1)).attr('height', laneH - 8)
          .attr('rx', 2)
          .attr('fill', task >= 0 ? TASKS[task].color : IDLE_COLOR)
          .attr('opacity', 0.85);
      });

      // Time axis
      const axisY = (numTasks + 1) * laneH + 5;
      g.append('line')
        .attr('x1', 0).attr('y1', axisY)
        .attr('x2', w).attr('y2', axisY)
        .attr('stroke', '#30363D');

      // Tick marks
      for (let t = startTick; t <= endTick; t++) {
        if (t % 5 === 0) {
          const x = (t - startTick) * cellW;
          g.append('line')
            .attr('x1', x).attr('y1', axisY)
            .attr('x2', x).attr('y2', axisY + 5)
            .attr('stroke', '#484F58');
          g.append('text')
            .attr('x', x).attr('y', axisY + 16)
            .attr('text-anchor', 'middle')
            .attr('fill', '#484F58').attr('font-size', 9)
            .text(t);
        }
      }

      // Current time cursor
      if (this.tick > startTick) {
        const cx = (this.tick - startTick) * cellW;
        g.append('line')
          .attr('x1', cx).attr('y1', 0)
          .attr('x2', cx).attr('y2', axisY)
          .attr('stroke', '#FFB300').attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '3,3');
      }

      // Legend
      const legendY = axisY + 25;
      TASKS.forEach((t, i) => {
        const lx = i * 120;
        g.append('rect')
          .attr('x', lx).attr('y', legendY)
          .attr('width', 12).attr('height', 12)
          .attr('rx', 2).attr('fill', t.color);
        g.append('text')
          .attr('x', lx + 16).attr('y', legendY + 10)
          .attr('fill', '#8B949E').attr('font-size', 9)
          .text(`${t.name} (T=${t.period}, C=${t.execTime})`);
      });
    }
  }

  function init() {
    if (typeof d3 !== 'undefined' && document.getElementById('multitask-sim')) {
      new MultitaskSim();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
