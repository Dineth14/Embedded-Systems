/* ============================================================================
   EE322 — Memory Hierarchy Simulation
   Visualises L1 cache with direct-mapped / set-associative lookup.
   Container: #memory-sim  |  Module: m04.html
   ============================================================================ */
(function () {
  'use strict';

  const COLORS = {
    hit:  '#00FF9C',
    miss: '#FF4C4C',
    bg:   '#161B22',
    line: '#30363D',
    text: '#C9D1D9',
    dim:  '#484F58'
  };

  class MemoryHierarchySim extends SimulationBase {
    constructor() {
      super('memory-sim');
      if (!this.container) return;

      this.cacheLines = 8;
      this.cache = [];        // {tag, valid, data, lastAccess}
      this.accesses = 0;
      this.hits = 0;
      this.misses = 0;
      this.log = new SimLog('mem-log');

      // Address stream simulating a small loop w/ spatial locality
      this.addressStream = this.generateAddresses();
      this.addrIndex = 0;
      this.lastAddr = null;
      this.lastResult = null;

      this.svg = null;
      this.width = 0;
      this.height = 0;

      this.bindExtra();
      this.doReset();
      this.initCanvas();
      this.render();
    }

    bindExtra() {
      const slider = this.container.querySelector('[data-control="cache-lines"]');
      if (slider) {
        slider.addEventListener('input', (e) => {
          this.cacheLines = parseInt(e.target.value, 10);
          const display = this.container.querySelector('.cache-display');
          if (display) display.textContent = this.cacheLines;
          this.doReset();
          this.render();
        });
      }
    }

    generateAddresses() {
      // Simulate a realistic access pattern: loop with array traversal + occasional jumps
      const addrs = [];
      const base = 0x2000;
      // Array loop (spatial locality)
      for (let iter = 0; iter < 3; iter++) {
        for (let i = 0; i < 8; i++) {
          addrs.push(base + i * 4);  // sequential access
        }
        addrs.push(0x3000 + iter * 4); // sporadic access
        // Re-access beginning (temporal locality)
        addrs.push(base);
        addrs.push(base + 4);
      }
      // Stack accesses
      for (let i = 0; i < 4; i++) {
        addrs.push(0x20001000 - i * 4);
      }
      return addrs;
    }

    cacheIndex(addr) {
      return (addr >>> 2) % this.cacheLines; // word-aligned, direct-mapped
    }

    cacheTag(addr) {
      return addr >>> (2 + Math.ceil(Math.log2(this.cacheLines)));
    }

    doStep() {
      if (this.addrIndex >= this.addressStream.length) {
        this.addrIndex = 0; // wrap
      }

      const addr = this.addressStream[this.addrIndex++];
      const index = this.cacheIndex(addr);
      const tag = this.cacheTag(addr);

      this.accesses++;
      this.lastAddr = addr;

      if (this.cache[index].valid && this.cache[index].tag === tag) {
        this.hits++;
        this.lastResult = 'hit';
        this.cache[index].lastAccess = this.accesses;
        this.log.add(`0x${addr.toString(16).toUpperCase()} → Line ${index}: HIT`, 'info');
      } else {
        this.misses++;
        this.lastResult = 'miss';
        this.cache[index] = {
          tag: tag,
          valid: true,
          data: addr,
          lastAccess: this.accesses
        };
        this.log.add(`0x${addr.toString(16).toUpperCase()} → Line ${index}: MISS (loaded)`, 'warning');
      }

      this.updateStats();
    }

    doReset() {
      this.cache = Array.from({ length: this.cacheLines }, () => ({
        tag: 0, valid: false, data: 0, lastAccess: 0
      }));
      this.accesses = 0;
      this.hits = 0;
      this.misses = 0;
      this.addrIndex = 0;
      this.lastAddr = null;
      this.lastResult = null;
      if (this.log) this.log.clear();
      this.updateStats();
    }

    updateStats() {
      const el = (id) => document.getElementById(id);
      if (el('mem-accesses')) el('mem-accesses').textContent = this.accesses;
      if (el('mem-hits'))     el('mem-hits').textContent = this.hits;
      if (el('mem-misses'))   el('mem-misses').textContent = this.misses;
      if (el('mem-hitrate')) {
        const rate = this.accesses > 0 ? ((this.hits / this.accesses) * 100).toFixed(1) + '%' : '—';
        el('mem-hitrate').textContent = rate;
      }
    }

    initCanvas() {
      if (!this.canvas) return;
      this.canvas.innerHTML = '';
      const rect = this.canvas.getBoundingClientRect();
      this.width = rect.width || 700;
      this.height = Math.max(300, rect.height);

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

      const margin = { top: 30, right: 20, bottom: 20, left: 20 };
      const w = this.width - margin.left - margin.right;
      const h = this.height - margin.top - margin.bottom;
      const g = this.svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // Title
      g.append('text').attr('x', w / 2).attr('y', -10)
        .attr('text-anchor', 'middle').attr('fill', COLORS.text)
        .attr('font-size', 13).attr('font-weight', 600)
        .text(`Direct-Mapped Cache — ${this.cacheLines} Lines`);

      // Cache table
      const colW = w / 5;
      const rowH = Math.min(h / (this.cacheLines + 1), 30);

      // Header
      const headers = ['Index', 'Valid', 'Tag', 'Data (Addr)', 'Last Access'];
      headers.forEach((hdr, i) => {
        g.append('text')
          .attr('x', i * colW + colW / 2).attr('y', 12)
          .attr('text-anchor', 'middle').attr('fill', COLORS.dim)
          .attr('font-size', 10).attr('font-weight', 500).text(hdr);
      });

      g.append('line')
        .attr('x1', 0).attr('y1', 20)
        .attr('x2', w).attr('y2', 20)
        .attr('stroke', COLORS.line);

      // Rows
      for (let i = 0; i < this.cacheLines; i++) {
        const y = 26 + i * rowH;
        const entry = this.cache[i];
        const isLastAccessed = this.lastAddr !== null &&
          this.cacheIndex(this.lastAddr) === i;
        const bg = isLastAccessed
          ? (this.lastResult === 'hit' ? COLORS.hit + '18' : COLORS.miss + '18')
          : 'transparent';

        g.append('rect')
          .attr('x', 0).attr('y', y - 2)
          .attr('width', w).attr('height', rowH)
          .attr('fill', bg).attr('rx', 3);

        // Highlight border for last accessed
        if (isLastAccessed) {
          g.append('rect')
            .attr('x', 0).attr('y', y - 2)
            .attr('width', w).attr('height', rowH)
            .attr('fill', 'none')
            .attr('stroke', this.lastResult === 'hit' ? COLORS.hit : COLORS.miss)
            .attr('stroke-width', 1.5)
            .attr('rx', 3);
        }

        const rowData = [
          i.toString(),
          entry.valid ? '1' : '0',
          entry.valid ? '0x' + entry.tag.toString(16).toUpperCase() : '—',
          entry.valid ? '0x' + entry.data.toString(16).toUpperCase() : '—',
          entry.valid ? entry.lastAccess.toString() : '—'
        ];

        rowData.forEach((val, j) => {
          g.append('text')
            .attr('x', j * colW + colW / 2).attr('y', y + rowH / 2 + 3)
            .attr('text-anchor', 'middle')
            .attr('fill', j === 1 && entry.valid ? COLORS.hit : COLORS.text)
            .attr('font-size', 10)
            .attr('font-family', 'JetBrains Mono, monospace')
            .text(val);
        });
      }

      // Current address display
      if (this.lastAddr !== null) {
        const infoY = 26 + this.cacheLines * rowH + 20;
        const resultColor = this.lastResult === 'hit' ? COLORS.hit : COLORS.miss;
        g.append('text')
          .attr('x', w / 2).attr('y', infoY)
          .attr('text-anchor', 'middle').attr('fill', resultColor)
          .attr('font-size', 14).attr('font-weight', 700)
          .text(`Address 0x${this.lastAddr.toString(16).toUpperCase()} → ${this.lastResult.toUpperCase()}`);
      }
    }
  }

  function init() {
    if (typeof d3 !== 'undefined' && document.getElementById('memory-sim')) {
      new MemoryHierarchySim();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
