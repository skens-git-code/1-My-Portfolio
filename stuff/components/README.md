# UI Component Architecture & Catalog

This directory houses component guidelines, architecture patterns, and modular templates for the portfolio.

## Architecture Overview

The portfolio presentation layer is designed with a high-performance single-page architecture (SPA) structured into clean, accessible semantic sections:

| Component / Section | Responsibility | Key Classes & IDs |
| :--- | :--- | :--- |
| **Loader** | Cinematic boot sequence & loading progress | `#loadingScreen`, `.loader-shell` |
| **Navigation** | Desktop floating pill & mobile drawer navigation | `#mainNav`, `.nav-container`, `.nav-link` |
| **Hero** | 3D Interactive Three.js particle canvas & personal branding | `#home`, `#hero-canvas`, `.hero-title` |
| **About** | Bio narrative, philosophy, terminal display, timeline | `#about`, `.about-terminal`, `.about-card` |
| **Experience & Education** | Career journey, education, and milestones | `#experience`, `.timeline-card` |
| **Projects Showcase** | Dynamic project filtering, modal detail viewer, Sanity data | `#projects`, `.project-card`, `.project-modal` |
| **Skills & Technologies** | Interactive tech stacks with category pills | `#skills`, `.skills-grid`, `.skill-chip` |
| **Contact** | Integrated contact form, API submissions, social channels | `#contact`, `.contact-form` |
| **Command Palette** | Quick navigation search modal (`Ctrl+K` / `Cmd+K`) | `#cmdPalette`, `.command-palette` |
| **Audio & Ambient Controls** | Cyberpunk soundtrack, volume slider, mute toggles | `.audio-player`, `#audioToggle` |

## Design Tokens

All components consume design tokens declared in `style.css`:
- **Colors**: `--clr-primary`, `--clr-accent`, `--clr-bg`, `--clr-surface`, `--clr-grad`
- **Typography**: `--font-primary`, `--font-heading`, `--font-mono`
- **Transitions**: `--transition-fast`, `--transition-smooth`, `--transition-bounce`
- **Glassmorphism**: Backdrop blur with hardware acceleration (`backdrop-filter: blur(...)`)
