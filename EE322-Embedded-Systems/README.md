# EE322 — Embedded Systems Design: Educational Resource Suite

> University of Peradeniya · Department of Electrical & Electronic Engineering  
> 3-Credit Course (27 Lecture Hours)

🌐 **Live Website:** [https://dineth14.github.io/Embedded-Systems/](https://dineth14.github.io/Embedded-Systems/)

---

## Overview

A complete educational resource suite for **EE322: Embedded Systems Design** comprising:

1. **Modular LaTeX Lecture Notes** — nine self-contained modules covering the full syllabus, with TikZ diagrams, worked examples, and practice problems.
2. **Interactive Educational Website** — a dark sci-fi terminal-themed companion site with theory panels, code examples, and six fully-functional browser-based simulations.

---

## Directory Structure

```
EE322-Embedded-Systems/
├── latex/
│   ├── preamble.tex              # Shared packages, colours, environments
│   ├── bibliography.bib          # BibTeX references
│   ├── main.tex                  # Master document (inputs all modules)
│   ├── module01_intro/           # Introduction to Embedded Systems (2 h)
│   ├── module02_architecture/    # Microprocessor Architecture (5 h)
│   ├── module03_processors/      # Embedded Processors (4 h)
│   ├── module04_memory/          # Memory Architectures (2 h)
│   ├── module05_io/              # I/O Ports & Protocols (2 h)
│   ├── module06_multitasking/    # Multitasking & RTOS (2 h)
│   ├── module07_scheduling/      # Task Scheduling (2 h)
│   ├── module08_analysis/        # Analysis & Verification (4 h)
│   └── module09_modeling/        # Modeling — FSM, UML, HSM (4 h)
│
├── website/
│   ├── index.html                # Landing page with module grid
│   ├── css/
│   │   ├── main.css              # Full design system
│   │   └── simulation.css        # Simulation-specific styles
│   ├── js/
│   │   ├── core.js               # Core classes (nav, accordion, math, reveal…)
│   │   ├── sim_fetch_execute.js  # 5-stage pipeline visualiser
│   │   ├── sim_memory_hierarchy.js # Direct-mapped cache simulator
│   │   ├── sim_io_timing.js      # UART / SPI / I²C waveform viewer
│   │   ├── sim_multitasking.js   # Preemptive task-switching timeline
│   │   ├── sim_scheduling.js     # RMS / EDF Gantt chart generator
│   │   └── sim_uml_stateflow.js  # Interactive traffic-light FSM
│   └── modules/
│       ├── m01.html … m09.html   # One page per module
│
└── README.md                     # This file
```

---

## Building the LaTeX Notes

### Pre-built PDF

The PDF is **automatically compiled** on every push via GitHub Actions.  
Download the latest version from the [**Releases page**](https://github.com/Dineth14/Embedded-Systems/releases/tag/latest).

### Requirements (local build)

- TeX Live 2023+ or MiKTeX (full install recommended)
- `biber` (ships with TeX Live)

### Compile

```bash
cd latex
pdflatex  -interaction=nonstopmode main.tex
biber     main
pdflatex  -interaction=nonstopmode main.tex
pdflatex  -interaction=nonstopmode main.tex
```

Or with `latexmk`:

```bash
cd latex
latexmk -pdf main.tex
```

---

## Running the Website

No build step needed — open `website/index.html` directly in a modern browser.

### CDN Dependencies (loaded automatically)

| Library        | Version | Purpose                    |
|---------------|---------|----------------------------|
| KaTeX          | 0.16.9  | LaTeX math rendering       |
| highlight.js   | 11.9.0  | Syntax highlighting        |
| D3.js          | 7.8.5   | Simulation visualisations  |
| Google Fonts   | —       | Orbitron, JetBrains Mono, IBM Plex Sans |

### Simulations

Each simulation extends the `SimulationBase` class and provides **Play / Pause / Step / Reset** controls:

| Simulation | Module | Description |
|-----------|--------|-------------|
| Pipeline Fetch-Execute | M02 | 5-stage pipeline with hazard detection & Gantt chart |
| Memory Hierarchy | M04 | Direct-mapped cache with hit/miss visualisation |
| I/O Protocol Timing | M05 | UART, SPI, I²C waveform diagrams |
| Multitasking | M06 | Fixed-priority preemptive task timeline |
| Task Scheduling | M07 | RMS vs EDF Gantt chart with deadline markers |
| State Machine | M09 | Traffic-light FSM with emergency event |

---

## Module Summary

| # | Title | Hours | Key Topics |
|---|-------|-------|------------|
| 01 | Introduction | 2 | Definitions, application domains, design challenges |
| 02 | Architecture | 5 | Von Neumann / Harvard, pipeline, ARM Cortex-M |
| 03 | Embedded Processors | 4 | ARM Cortex family, CMSIS, bare-metal programming |
| 04 | Memory | 2 | Cache hierarchy, Flash / SRAM / EEPROM, MPU |
| 05 | I/O Ports | 2 | GPIO, UART, SPI, I²C, DMA, interrupt-driven I/O |
| 06 | Multitasking | 2 | Threads, context switching, IPC, FreeRTOS |
| 07 | Scheduling | 2 | RMS, EDF, schedulability analysis, WCET |
| 08 | Analysis | 4 | Profiling, FMEA, reliability, MISRA-C, SPIN |
| 09 | Modeling | 4 | UML, FSM, HSM, model-driven development |

---

## License

Educational material for EE322 at University of Peradeniya. For academic use.
