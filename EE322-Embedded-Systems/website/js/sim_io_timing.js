/* ============================================================================
   EE322 — I/O Protocol Timing Simulation
   Draws waveform diagrams for UART, SPI, I²C protocols.
   Container: #io-sim  |  Module: m05.html
   ============================================================================ */
(function () {
  'use strict';

  const SIGNAL_COLORS = {
    CLK:  '#FFB300',
    MOSI: '#00FF9C',
    MISO: '#00BFFF',
    CS:   '#FF4C4C',
    SDA:  '#00FF9C',
    SCL:  '#FFB300',
    TX:   '#00FF9C',
    RX:   '#00BFFF'
  };

  const PROTOCOLS = {
    uart: {
      label: 'UART (8N1)',
      signals: ['TX'],
      generate(dataByte) {
        // Start bit (0), 8 data bits (LSB first), Stop bit (1)
        const bits = [0]; // start
        for (let i = 0; i < 8; i++) bits.push((dataByte >> i) & 1);
        bits.push(1); // stop
        return { TX: bits };
      },
      bitCount: 10,
      description: 'Start(0) → D0..D7 → Stop(1)'
    },
    spi: {
      label: 'SPI Mode 0 (CPOL=0, CPHA=0)',
      signals: ['CS', 'CLK', 'MOSI', 'MISO'],
      generate(dataByte) {
        const mosiBits = [];
        const misoBits = [];
        const clkBits = [];
        const csBits = [];
        // CS low for duration, with lead/trail
        csBits.push(1); // idle
        for (let i = 0; i < 8; i++) {
          mosiBits.push((dataByte >> (7 - i)) & 1);
          misoBits.push(((~dataByte) >> (7 - i)) & 1); // simulated response
          clkBits.push(0, 1); // rising edge samples
          csBits.push(0, 0);
        }
        csBits.push(1); // idle after
        return {
          CS: csBits,
          CLK: clkBits,
          MOSI: mosiBits,
          MISO: misoBits
        };
      },
      bitCount: 8,
      description: 'CS↓ → 8 CLK cycles (sample on rising) → CS↑'
    },
    i2c: {
      label: 'I²C (7-bit addr + Write)',
      signals: ['SCL', 'SDA'],
      generate(dataByte) {
        // START, 7-bit addr, R/W=0, ACK, 8 data bits, ACK, STOP
        const addr = 0x48; // example address
        const scl = [];
        const sda = [];

        // START condition: SDA falls while SCL high
        sda.push(1, 0);
        scl.push(1, 1);

        // 7 address bits + R/W bit (0 = write)
        const addrByte = (addr << 1) | 0;
        for (let i = 7; i >= 0; i--) {
          const bit = (addrByte >> i) & 1;
          sda.push(bit, bit);
          scl.push(0, 1);
        }
        // ACK from slave (SDA low)
        sda.push(0, 0);
        scl.push(0, 1);

        // 8 data bits
        for (let i = 7; i >= 0; i--) {
          const bit = (dataByte >> i) & 1;
          sda.push(bit, bit);
          scl.push(0, 1);
        }
        // ACK
        sda.push(0, 0);
        scl.push(0, 1);

        // STOP condition: SDA rises while SCL high
        sda.push(0, 1);
        scl.push(0, 1);

        return { SCL: scl, SDA: sda };
      },
      bitCount: 20,
      description: 'START → Addr(7)+R/W → ACK → Data(8) → ACK → STOP'
    }
  };

  class IOTimingSim extends SimulationBase {
    constructor() {
      super('io-sim');
      if (!this.container) return;

      this.protocol = 'uart';
      this.dataByte = 0xA5;
      this.currentBit = 0;
      this.waveforms = {};
      this.totalBits = 0;

      this.svg = null;
      this.width = 0;
      this.height = 0;

      this.bindExtra();
      this.doReset();
      this.initCanvas();
      this.render();
    }

    bindExtra() {
      const select = this.container.querySelector('[data-control="protocol"]');
      if (select) {
        select.addEventListener('change', (e) => {
          this.protocol = e.target.value;
          this.doReset();
          this.render();
        });
      }
    }

    doStep() {
      const proto = PROTOCOLS[this.protocol];
      if (!this.waveforms || Object.keys(this.waveforms).length === 0) {
        this.waveforms = proto.generate(this.dataByte);
        // Determine total length from first signal
        const firstSignal = Object.keys(this.waveforms)[0];
        this.totalBits = this.waveforms[firstSignal].length;
      }

      if (this.currentBit < this.totalBits) {
        this.currentBit++;
      }

      this.updateStats();
    }

    doReset() {
      this.currentBit = 0;
      const proto = PROTOCOLS[this.protocol];
      this.waveforms = proto.generate(this.dataByte);
      const firstSignal = Object.keys(this.waveforms)[0];
      this.totalBits = this.waveforms[firstSignal].length;
      this.updateStats();
    }

    updateStats() {
      const el = (id) => document.getElementById(id);
      if (el('io-bit'))  el('io-bit').textContent = this.currentBit;
      if (el('io-byte')) el('io-byte').textContent = '0x' + this.dataByte.toString(16).toUpperCase();
      if (el('io-time')) {
        // Estimate time at common baud rates
        const rates = { uart: 115200, spi: 1000000, i2c: 400000 };
        const bitTime = 1 / rates[this.protocol];
        const us = (this.currentBit * bitTime * 1e6).toFixed(1);
        el('io-time').textContent = us + ' μs';
      }
    }

    initCanvas() {
      if (!this.canvas) return;
      this.canvas.innerHTML = '';
      const rect = this.canvas.getBoundingClientRect();
      this.width = rect.width || 700;
      this.height = Math.max(250, rect.height);

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

      const proto = PROTOCOLS[this.protocol];
      const signals = proto.signals;
      const numSignals = signals.length;

      const margin = { top: 30, right: 20, bottom: 30, left: 70 };
      const w = this.width - margin.left - margin.right;
      const h = this.height - margin.top - margin.bottom;
      const g = this.svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // Title
      g.append('text').attr('x', w / 2).attr('y', -12)
        .attr('text-anchor', 'middle').attr('fill', '#C9D1D9')
        .attr('font-size', 13).attr('font-weight', 600)
        .text(proto.label + '  —  ' + proto.description);

      const laneH = h / numSignals;
      const amplitude = laneH * 0.5;

      signals.forEach((sigName, sIdx) => {
        const yBase = sIdx * laneH + laneH * 0.7;
        const data = this.waveforms[sigName] || [];
        const color = SIGNAL_COLORS[sigName] || '#8B949E';
        const stepW = Math.min(w / Math.max(data.length, 1), 40);

        // Signal label
        g.append('text')
          .attr('x', -10).attr('y', yBase - amplitude / 2)
          .attr('text-anchor', 'end')
          .attr('fill', color).attr('font-size', 12).attr('font-weight', 600)
          .text(sigName);

        // Base line
        g.append('line')
          .attr('x1', 0).attr('y1', yBase).attr('x2', w).attr('y2', yBase)
          .attr('stroke', '#21262D').attr('stroke-dasharray', '2,4');

        // Waveform path
        if (data.length === 0) return;

        let path = '';
        const visibleBits = Math.min(this.currentBit, data.length);

        for (let i = 0; i < visibleBits; i++) {
          const x = i * stepW;
          const y = yBase - data[i] * amplitude;
          const prevY = i > 0 ? yBase - data[i - 1] * amplitude : y;

          if (i === 0) {
            path += `M ${x} ${y}`;
          } else {
            // Vertical transition then horizontal
            path += ` L ${x} ${prevY} L ${x} ${y}`;
          }
          path += ` L ${x + stepW} ${y}`;
        }

        g.append('path')
          .attr('d', path)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2)
          .attr('stroke-linecap', 'round');

        // Cursor line at current position
        if (visibleBits > 0 && visibleBits < data.length) {
          const cursorX = visibleBits * stepW;
          g.append('line')
            .attr('x1', cursorX).attr('y1', yBase - amplitude - 5)
            .attr('x2', cursorX).attr('y2', yBase + 5)
            .attr('stroke', '#FFB300')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '3,3');
        }
      });

      // Bit numbers along bottom
      const firstSig = this.waveforms[signals[0]] || [];
      const stepW = Math.min(w / Math.max(firstSig.length, 1), 40);
      for (let i = 0; i < Math.min(this.currentBit, firstSig.length); i++) {
        if (i % 2 === 0) {
          g.append('text')
            .attr('x', i * stepW + stepW / 2).attr('y', h + 15)
            .attr('text-anchor', 'middle').attr('fill', '#484F58')
            .attr('font-size', 8).text(i);
        }
      }
    }
  }

  function init() {
    if (typeof d3 !== 'undefined' && document.getElementById('io-sim')) {
      new IOTimingSim();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
