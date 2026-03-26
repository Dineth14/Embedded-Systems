/* ============================================================================
   EE322 — Fetch-Execute Pipeline Simulation (5-stage)
   Visualises IF → ID → EX → MEM → WB pipeline with hazard detection.
   Container: #pipeline-sim  |  Module: m02.html
   ============================================================================ */
(function () {
  'use strict';

  const STAGES = ['IF', 'ID', 'EX', 'MEM', 'WB'];
  const COLORS = ['#00FF9C', '#00BFFF', '#FFB300', '#FF4C4C', '#A78BFA'];

  // Simple instruction set for demo
  const PROGRAM = [
    { name: 'LDR R1, [R0]',   type: 'load' },
    { name: 'ADD R2, R1, #1',  type: 'alu',  dep: 0 },  // RAW hazard on R1
    { name: 'STR R2, [R3]',   type: 'store', dep: 1 },
    { name: 'SUB R4, R2, R5', type: 'alu',   dep: 1 },
    { name: 'MUL R6, R4, R1', type: 'alu',   dep: 3 },
    { name: 'CMP R6, #10',    type: 'alu',   dep: 4 },
    { name: 'BEQ label',      type: 'branch' },
    { name: 'AND R7, R1, R4', type: 'alu' },
    { name: 'ORR R8, R7, R6', type: 'alu',   dep: 7 },
    { name: 'NOP',             type: 'nop' },
  ];

  class PipelineSim extends SimulationBase {
    constructor() {
      super('pipeline-sim');
      if (!this.container) return;

      this.cycle = 0;
      this.completed = 0;
      this.stalls = 0;
      this.pipeline = [null, null, null, null, null]; // 5 stages
      this.history = [];   // [{instr index, stage, cycle}]
      this.nextInstr = 0;
      this.stallCycles = 0;

      this.svg = null;
      this.width = 0;
      this.height = 0;
      this.initCanvas();
      this.render();
    }

    initCanvas() {
      if (!this.canvas) return;
      this.canvas.innerHTML = '';
      const rect = this.canvas.getBoundingClientRect();
      this.width = rect.width || 700;
      this.height = Math.max(340, rect.height);

      this.svg = d3.select(this.canvas)
        .append('svg')
        .attr('width', '100%')
        .attr('height', this.height)
        .attr('viewBox', `0 0 ${this.width} ${this.height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');
    }

    doStep() {
      if (this.stallCycles > 0) {
        this.stallCycles--;
        this.stalls++;
        // Insert bubble: shift only stages after the stall point
        this.pipeline[4] = this.pipeline[3];
        this.pipeline[3] = this.pipeline[2];
        this.pipeline[2] = null; // bubble
        // stages 0,1 hold
      } else {
        // Advance pipeline
        if (this.pipeline[4] !== null) this.completed++;
        for (let i = 4; i > 0; i--) {
          this.pipeline[i] = this.pipeline[i - 1];
        }
        // Fetch next
        if (this.nextInstr < PROGRAM.length) {
          this.pipeline[0] = this.nextInstr;

          // Check for data hazard (RAW): instruction in ID depends on load in EX
          const instr = PROGRAM[this.nextInstr];
          if (instr.dep !== undefined) {
            const depIdx = instr.dep;
            // If dependent instruction is currently in EX and is a load → stall 1 cycle
            if (this.pipeline[2] === depIdx && PROGRAM[depIdx].type === 'load') {
              this.stallCycles = 1;
            }
          }

          this.nextInstr++;
        } else {
          this.pipeline[0] = null;
        }
      }

      this.cycle++;

      // Record history for Gantt
      for (let s = 0; s < 5; s++) {
        if (this.pipeline[s] !== null) {
          this.history.push({
            instr: this.pipeline[s],
            stage: s,
            cycle: this.cycle
          });
        }
      }

      this.updateStats();
    }

    doReset() {
      this.cycle = 0;
      this.completed = 0;
      this.stalls = 0;
      this.pipeline = [null, null, null, null, null];
      this.history = [];
      this.nextInstr = 0;
      this.stallCycles = 0;
      this.updateStats();
    }

    updateStats() {
      const el = (id) => document.getElementById(id);
      if (el('pipe-cycle'))     el('pipe-cycle').textContent = this.cycle;
      if (el('pipe-completed')) el('pipe-completed').textContent = this.completed;
      if (el('pipe-stalls'))    el('pipe-stalls').textContent = this.stalls;
      if (el('pipe-cpi')) {
        const cpi = this.completed > 0 ? (this.cycle / this.completed).toFixed(2) : '—';
        el('pipe-cpi').textContent = cpi;
      }
    }

    render() {
      if (!this.svg) return;
      this.svg.selectAll('*').remove();

      const margin = { top: 20, right: 20, bottom: 20, left: 120 };
      const w = this.width - margin.left - margin.right;
      const h = this.height - margin.top - margin.bottom;
      const g = this.svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // --- Current pipeline state (top) ---
      const stageW = w / 5;
      const stageH = 50;

      g.append('text').attr('x', -10).attr('y', stageH / 2 + 5)
        .attr('text-anchor', 'end').attr('fill', '#8B949E')
        .attr('font-size', 12).text('Pipeline:');

      for (let s = 0; s < 5; s++) {
        const x = s * stageW;
        const instrIdx = this.pipeline[s];
        const filled = instrIdx !== null;

        g.append('rect')
          .attr('x', x + 2).attr('y', 0)
          .attr('width', stageW - 4).attr('height', stageH)
          .attr('rx', 4)
          .attr('fill', filled ? COLORS[s] + '22' : '#161B22')
          .attr('stroke', filled ? COLORS[s] : '#30363D')
          .attr('stroke-width', filled ? 2 : 1);

        g.append('text')
          .attr('x', x + stageW / 2).attr('y', 16)
          .attr('text-anchor', 'middle')
          .attr('fill', COLORS[s]).attr('font-size', 11).attr('font-weight', 600)
          .text(STAGES[s]);

        if (filled) {
          g.append('text')
            .attr('x', x + stageW / 2).attr('y', 38)
            .attr('text-anchor', 'middle')
            .attr('fill', '#C9D1D9').attr('font-size', 10)
            .text(PROGRAM[instrIdx].name);
        }
      }

      // --- Gantt chart (bottom) ---
      const ganttTop = stageH + 30;
      const visibleCycles = Math.max(12, this.cycle + 2);
      const instrCount = Math.min(PROGRAM.length, 8);
      const cellW = Math.min(w / visibleCycles, 50);
      const cellH = Math.min((h - ganttTop) / instrCount, 28);

      // Instruction labels
      for (let i = 0; i < instrCount; i++) {
        g.append('text')
          .attr('x', -10).attr('y', ganttTop + i * cellH + cellH / 2 + 4)
          .attr('text-anchor', 'end').attr('fill', '#8B949E')
          .attr('font-size', 9).attr('font-family', 'JetBrains Mono, monospace')
          .text(PROGRAM[i].name.substring(0, 16));
      }

      // Cycle numbers
      const startCycle = Math.max(1, this.cycle - Math.floor(w / cellW) + 2);
      const endCycle = startCycle + Math.floor(w / cellW);

      for (let c = startCycle; c <= endCycle && c <= this.cycle + 1; c++) {
        const x = (c - startCycle) * cellW;
        g.append('text')
          .attr('x', x + cellW / 2).attr('y', ganttTop - 6)
          .attr('text-anchor', 'middle').attr('fill', '#484F58')
          .attr('font-size', 9).text(c);
      }

      // Grid lines
      for (let i = 0; i <= instrCount; i++) {
        g.append('line')
          .attr('x1', 0).attr('y1', ganttTop + i * cellH)
          .attr('x2', w).attr('y2', ganttTop + i * cellH)
          .attr('stroke', '#21262D').attr('stroke-width', 0.5);
      }

      // History cells
      this.history.forEach(({ instr, stage, cycle }) => {
        if (instr >= instrCount) return;
        if (cycle < startCycle || cycle > endCycle) return;
        const x = (cycle - startCycle) * cellW;
        const y = ganttTop + instr * cellH;

        g.append('rect')
          .attr('x', x + 1).attr('y', y + 1)
          .attr('width', cellW - 2).attr('height', cellH - 2)
          .attr('rx', 3)
          .attr('fill', COLORS[stage])
          .attr('opacity', 0.8);

        g.append('text')
          .attr('x', x + cellW / 2).attr('y', y + cellH / 2 + 4)
          .attr('text-anchor', 'middle')
          .attr('fill', '#0D1117').attr('font-size', 9).attr('font-weight', 600)
          .text(STAGES[stage]);
      });
    }
  }

  // Wait for DOM + D3
  function init() {
    if (typeof d3 !== 'undefined' && document.getElementById('pipeline-sim')) {
      new PipelineSim();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
