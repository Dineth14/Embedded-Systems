/* ============================================================================
   EE322 — Task Scheduling Simulation (RMS / EDF)
   Generates Gantt charts for Rate-Monotonic and EDF scheduling.
   Container: #sched-sim  |  Module: m07.html
   ============================================================================ */
(function () {
  'use strict';

  const COLORS = ['#00FF9C', '#00BFFF', '#FFB300', '#FF4C4C', '#A78BFA'];
  const IDLE_COLOR = '#30363D';

  // Task set: {name, period (=deadline), wcet}
  const TASKSET = [
    { name: 'τ₁', period: 10, wcet: 3 },
    { name: 'τ₂', period: 15, wcet: 4 },
    { name: 'τ₃', period: 20, wcet: 5 },
  ];

  class SchedulingSim extends SimulationBase {
    constructor() {
      super('sched-sim');
      if (!this.container) return;

      this.algorithm = 'rms';
      this.time = 0;
      this.deadlineMisses = 0;
      this.preemptions = 0;
      this.lastRunning = -1;
      this.history = [];   // [{time, taskIdx}]  -1 = idle
      this.jobs = [];      // [{taskIdx, remaining, deadline, released}]

      this.svg = null;
      this.width = 0;
      this.height = 0;

      this.bindExtra();
      this.doReset();
      this.initCanvas();
      this.render();
    }

    bindExtra() {
      const select = this.container.querySelector('[data-control="algorithm"]');
      if (select) {
        select.addEventListener('change', (e) => {
          this.algorithm = e.target.value;
          this.doReset();
          this.render();
        });
      }
    }

    computeUtilisation() {
      return TASKSET.reduce((sum, t) => sum + t.wcet / t.period, 0);
    }

    doStep() {
      this.time++;

      // Release new jobs at their periods
      for (let i = 0; i < TASKSET.length; i++) {
        const task = TASKSET[i];
        if (this.time % task.period === 0) {
          // Check if previous job of same task missed deadline
          const prevJob = this.jobs.find(j => j.taskIdx === i && j.remaining > 0);
          if (prevJob) {
            this.deadlineMisses++;
          }
          // Remove completed/missed jobs for this task
          this.jobs = this.jobs.filter(j => !(j.taskIdx === i));
          // Release new job
          this.jobs.push({
            taskIdx: i,
            remaining: task.wcet,
            deadline: this.time + task.period,
            released: this.time
          });
        }
      }

      // Schedule: pick job to run
      let selected = null;

      if (this.algorithm === 'rms') {
        // Static priority: shorter period = higher priority
        const ready = this.jobs.filter(j => j.remaining > 0)
          .sort((a, b) => TASKSET[a.taskIdx].period - TASKSET[b.taskIdx].period);
        selected = ready.length > 0 ? ready[0] : null;
      } else {
        // EDF: earliest absolute deadline first
        const ready = this.jobs.filter(j => j.remaining > 0)
          .sort((a, b) => a.deadline - b.deadline);
        selected = ready.length > 0 ? ready[0] : null;
      }

      const runIdx = selected ? selected.taskIdx : -1;

      if (selected) {
        selected.remaining--;
      }

      // Track preemptions
      if (runIdx !== this.lastRunning && this.lastRunning >= 0 && runIdx >= 0) {
        // A different task started running while the previous wasn't done
        const prevJob = this.jobs.find(j => j.taskIdx === this.lastRunning && j.remaining > 0);
        if (prevJob) this.preemptions++;
      }
      this.lastRunning = runIdx;

      this.history.push({ time: this.time, task: runIdx });
      this.updateStats();
    }

    doReset() {
      this.time = 0;
      this.deadlineMisses = 0;
      this.preemptions = 0;
      this.lastRunning = -1;
      this.history = [];
      this.jobs = [];
      // Release all tasks at t=0
      for (let i = 0; i < TASKSET.length; i++) {
        this.jobs.push({
          taskIdx: i,
          remaining: TASKSET[i].wcet,
          deadline: TASKSET[i].period,
          released: 0
        });
      }
      this.updateStats();
    }

    updateStats() {
      const el = (id) => document.getElementById(id);
      if (el('sched-time'))    el('sched-time').textContent = this.time;
      if (el('sched-util'))    el('sched-util').textContent = (this.computeUtilisation() * 100).toFixed(1) + '%';
      if (el('sched-misses'))  el('sched-misses').textContent = this.deadlineMisses;
      if (el('sched-preempt')) el('sched-preempt').textContent = this.preemptions;
    }

    initCanvas() {
      if (!this.canvas) return;
      this.canvas.innerHTML = '';
      const rect = this.canvas.getBoundingClientRect();
      this.width = rect.width || 700;
      this.height = Math.max(280, rect.height);

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

      const margin = { top: 30, right: 20, bottom: 50, left: 60 };
      const w = this.width - margin.left - margin.right;
      const h = this.height - margin.top - margin.bottom;
      const g = this.svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const numTasks = TASKSET.length;
      const laneH = h / (numTasks + 1);
      const visibleWindow = Math.max(30, this.time + 5);
      const startT = Math.max(0, this.time - Math.floor(w / 12));
      const endT = startT + Math.floor(w / 12) + 5;
      const cellW = w / (endT - startT);

      // Title
      const algoName = this.algorithm === 'rms' ? 'Rate-Monotonic (RMS)' : 'Earliest Deadline First (EDF)';
      g.append('text').attr('x', w / 2).attr('y', -10)
        .attr('text-anchor', 'middle').attr('fill', '#C9D1D9')
        .attr('font-size', 13).attr('font-weight', 600)
        .text(algoName + ' Gantt Chart');

      // Task lane labels
      const labels = [...TASKSET.map(t => t.name), 'Idle'];
      labels.forEach((label, i) => {
        const y = i * laneH;
        const color = i < numTasks ? COLORS[i] : IDLE_COLOR;

        g.append('text')
          .attr('x', -10).attr('y', y + laneH / 2 + 4)
          .attr('text-anchor', 'end')
          .attr('fill', color).attr('font-size', 12).attr('font-weight', 500)
          .text(label);

        g.append('rect')
          .attr('x', 0).attr('y', y + 2)
          .attr('width', w).attr('height', laneH - 4)
          .attr('fill', '#0D1117').attr('rx', 3);
      });

      // History bars
      this.history.forEach(({ time: t, task }) => {
        if (t < startT || t > endT) return;
        const x = (t - startT) * cellW;
        const laneIdx = task >= 0 ? task : numTasks;
        const y = laneIdx * laneH;
        const color = task >= 0 ? COLORS[task] : IDLE_COLOR;

        g.append('rect')
          .attr('x', x).attr('y', y + 4)
          .attr('width', Math.max(cellW - 0.5, 1)).attr('height', laneH - 8)
          .attr('rx', 2).attr('fill', color).attr('opacity', 0.85);
      });

      // Deadline markers (small triangles)
      for (let i = 0; i < TASKSET.length; i++) {
        const task = TASKSET[i];
        for (let d = task.period; d <= endT; d += task.period) {
          if (d < startT) continue;
          const x = (d - startT) * cellW;
          const y = i * laneH + laneH - 4;

          g.append('polygon')
            .attr('points', `${x - 4},${y} ${x + 4},${y} ${x},${y - 6}`)
            .attr('fill', COLORS[i])
            .attr('opacity', 0.6);
        }
      }

      // Time axis
      const axisY = (numTasks + 1) * laneH + 5;
      g.append('line')
        .attr('x1', 0).attr('y1', axisY)
        .attr('x2', w).attr('y2', axisY)
        .attr('stroke', '#30363D');

      for (let t = startT; t <= endT; t++) {
        if (t % 5 === 0) {
          const x = (t - startT) * cellW;
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
      if (this.time > startT) {
        const cx = (this.time - startT) * cellW;
        g.append('line')
          .attr('x1', cx).attr('y1', 0)
          .attr('x2', cx).attr('y2', axisY)
          .attr('stroke', '#FFB300').attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '3,3');
      }

      // Legend
      const legendY = axisY + 25;
      TASKSET.forEach((t, i) => {
        const lx = i * 140;
        g.append('rect')
          .attr('x', lx).attr('y', legendY)
          .attr('width', 12).attr('height', 12)
          .attr('rx', 2).attr('fill', COLORS[i]);
        g.append('text')
          .attr('x', lx + 16).attr('y', legendY + 10)
          .attr('fill', '#8B949E').attr('font-size', 9)
          .text(`${t.name} (T=${t.period}, C=${t.wcet})`);
      });
      // Deadline triangle legend
      const dlx = TASKSET.length * 140;
      g.append('polygon')
        .attr('points', `${dlx},${legendY + 10} ${dlx + 8},${legendY + 10} ${dlx + 4},${legendY + 2}`)
        .attr('fill', '#8B949E');
      g.append('text')
        .attr('x', dlx + 14).attr('y', legendY + 10)
        .attr('fill', '#8B949E').attr('font-size', 9)
        .text('Deadline');
    }
  }

  function init() {
    if (typeof d3 !== 'undefined' && document.getElementById('sched-sim')) {
      new SchedulingSim();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
