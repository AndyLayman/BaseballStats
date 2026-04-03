# Design System — Baseball Soundboard

## Mode
- **Dark mode only** (for now)

---

## Colors

### Neutrals

| Token        | Hex       | Usage                          |
|--------------|-----------|--------------------------------|
| `--black`    | `#0A0A0A` | Primary background             |
| `--gray-950` | `#141414` | Deep/sunken backgrounds        |
| `--gray-900` | `#1A1A1A` | Card backgrounds               |
| `--gray-800` | `#2A2A2A` | Elevated surfaces, inputs      |
| `--gray-700` | `#3A3A3A` | Borders, dividers              |
| `--gray-600` | `#5A5A5A` | Muted icons, disabled states   |
| `--gray-400` | `#8A8A8A` | Muted/secondary text           |
| `--gray-200` | `#B0B0B0` | Subtext, labels                |
| `--white`    | `#F7F7F7` | Primary text, high-contrast    |

### Accent Primitives

| Token      | Hex       |
|------------|-----------|
| `--teal`   | `#08DDC8` |
| `--green`  | `#83DD68` |
| `--purple` | `#CF59F3` |

### Accent Gradient

```css
--accent-gradient: conic-gradient(
  from 180deg at 50% -18.18%,
  #08DDC8 0deg,
  #83DD68 128.08deg,
  #CF59F3 264.81deg,
  #08DDC8 360deg
);
```

---

## Semantic Tokens

| Role                 | Token          | Value                         |
|----------------------|----------------|-------------------------------|
| Page background      | `--bg`         | `--black` (`#0A0A0A`)         |
| Card background      | `--bg-card`    | `--gray-900` (`#1A1A1A`)      |
| Input background     | `--bg-input`   | `--gray-800` (`#2A2A2A`)      |
| Primary text         | `--text`       | `--white` (`#F7F7F7`)         |
| Secondary text       | `--text-muted` | `--gray-400` (`#8A8A8A`)      |
| Dim text             | `--text-dim`   | `--gray-600` (`#5A5A5A`)      |
| Border               | `--border`     | `--gray-700` (`#3A3A3A`)      |
| Hover background     | `--hover`      | `--gray-800` (`#2A2A2A`)      |
| Primary action       | `--action`     | Accent gradient (gradient fill) |
| Active/playing state | `--active`     | Accent gradient + glow        |

---

## Typography

- **Font:** Montserrat (Google Fonts)
- **Weight:** 300 (Light) — used globally for now
- **Base size:** 14px

### Type Scale

| Token        | Size   | Usage                         |
|--------------|--------|-------------------------------|
| `--text-xs`  | 10px   | Captions, timestamps          |
| `--text-sm`  | 12px   | Labels, helper text           |
| `--text-base`| 14px   | Body text, inputs, buttons    |
| `--text-lg`  | 16px   | Section titles                |
| `--text-xl`  | 20px   | Page headings                 |
| `--text-2xl` | 24px   | Hero/display text             |

### Google Fonts Import

```css
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300&display=swap');
```

---

## Spacing Scale (8px base)

| Token    | Value  | Usage                          |
|----------|--------|--------------------------------|
| `--sp-1` | `4px`  | Tight inner padding, icon gaps |
| `--sp-2` | `8px`  | Default gap, small padding     |
| `--sp-3` | `16px` | Card padding, section gaps     |
| `--sp-4` | `24px` | Page padding, large gaps       |
| `--sp-5` | `32px` | Section margins                |
| `--sp-6` | `48px` | Major section breaks           |
| `--sp-8` | `64px` | Page-level spacing             |

---

## Border Radius Scale (8px base)

| Token      | Value    | Usage                        |
|------------|----------|------------------------------|
| `--r-1`    | `4px`    | Inputs, small elements       |
| `--r-2`    | `8px`    | Cards, buttons (default)     |
| `--r-3`    | `16px`   | Large cards, modals          |
| `--r-4`    | `24px`   | Pills, tags, chips           |
| `--r-full` | `9999px` | Circles, fully rounded       |

---

## Depth & Effects

### Glow Effects
Accent-colored glows on active/hover/playing states. No traditional box shadows.

```css
/* Individual accent glows */
--glow-teal: 0 0 12px rgba(8, 221, 200, 0.4);
--glow-green: 0 0 12px rgba(131, 221, 104, 0.4);
--glow-purple: 0 0 12px rgba(207, 89, 243, 0.4);

/* Combined multi-color glow (active/playing states) */
--glow-accent: 0 0 20px rgba(8, 221, 200, 0.3), 0 0 40px rgba(207, 89, 243, 0.15);
```

Cards and surfaces use **background color contrast** for hierarchy — no shadows.

---

## Buttons

### Primary Action
- **Background:** Accent gradient fill (conic-gradient)
- **Text:** `--black` (`#0A0A0A`)
- **Border radius:** `--r-2` (8px)
- **Hover:** Add `--glow-accent` box-shadow
- **Active/pressed:** Scale down slightly (`transform: scale(0.97)`)

### Secondary Action
- **Background:** `--gray-800` (`#2A2A2A`)
- **Text:** `--white` (`#F7F7F7`)
- **Border:** 1px solid `--gray-700`
- **Hover:** Border brightens to `--gray-600`

### Destructive / Danger
- **Background:** `--danger` (`#FF6161`)
- **Text:** `--black` (`#0A0A0A`)
- **Hover:** `box-shadow: 0 0 12px rgba(255, 97, 97, 0.4)`

---

## CSS Variables Template

```css
:root {
  /* Neutrals */
  --black: #0A0A0A;
  --gray-950: #141414;
  --gray-900: #1A1A1A;
  --gray-800: #2A2A2A;
  --gray-700: #3A3A3A;
  --gray-600: #5A5A5A;
  --gray-400: #8A8A8A;
  --gray-200: #B0B0B0;
  --white: #F7F7F7;

  /* Accents */
  --teal: #08DDC8;
  --green: #83DD68;
  --purple: #CF59F3;
  --accent-gradient: conic-gradient(
    from 180deg at 50% -18.18%,
    #08DDC8 0deg, #83DD68 128.08deg,
    #CF59F3 264.81deg, #08DDC8 360deg
  );

  /* Semantic */
  --bg: var(--black);
  --bg-card: var(--gray-900);
  --bg-input: var(--gray-800);
  --text: var(--white);
  --text-muted: var(--gray-400);
  --text-dim: var(--gray-600);
  --border: var(--gray-700);
  --hover: var(--gray-800);

  /* Spacing (8px base) */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 16px;
  --sp-4: 24px;
  --sp-5: 32px;
  --sp-6: 48px;
  --sp-8: 64px;

  /* Radius (8px base) */
  --r-1: 4px;
  --r-2: 8px;
  --r-3: 16px;
  --r-4: 24px;
  --r-full: 9999px;

  /* Typography */
  --text-xs: 10px;
  --text-sm: 12px;
  --text-base: 14px;
  --text-lg: 16px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --font: 'Montserrat', sans-serif;
  --font-weight: 300;

  /* Glows */
  --glow-teal: 0 0 12px rgba(8, 221, 200, 0.4);
  --glow-green: 0 0 12px rgba(131, 221, 104, 0.4);
  --glow-purple: 0 0 12px rgba(207, 89, 243, 0.4);
  --glow-accent: 0 0 20px rgba(8, 221, 200, 0.3), 0 0 40px rgba(207, 89, 243, 0.15);
}
```

---

## Icons

- **Library:** Lucide (CDN)
- **Default size:** 16px (small), 20px (medium), 24px (large)
- **Stroke:** Default (2px)
- **Color:** Inherits from parent `color`

---

## Motion & Animation

The app should feel **dynamic and alive** — smooth transitions, playful micro-interactions, and polished state changes.

### Timing Tokens

| Token            | Value    | Easing                          | Usage                            |
|------------------|----------|---------------------------------|----------------------------------|
| `--duration-fast`| `120ms`  | `cubic-bezier(0.4, 0, 0.2, 1)` | Hover states, toggles, opacity   |
| `--duration-base`| `250ms`  | `cubic-bezier(0.4, 0, 0.2, 1)` | Page transitions, card reveals   |
| `--duration-slow`| `500ms`  | `cubic-bezier(0.16, 1, 0.3, 1)` | Loading, modals, entrance anims |
| `--duration-xslow`| `800ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Staggered list items, hero anims|

### Easing Curves

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);      /* Smooth deceleration — entrances */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);     /* Standard — general transitions */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy overshoot — playful interactions */
```

### Micro-Interactions

| Element               | Trigger       | Animation                                               |
|-----------------------|---------------|----------------------------------------------------------|
| Buttons               | Hover         | Scale up 1.03, glow fades in                             |
| Buttons               | Press         | Scale down 0.97, glow intensifies                        |
| Sound buttons         | Playing       | Pulse glow + waveform animation                          |
| Cards                 | Page load     | Fade up + stagger (each card 50ms delay)                 |
| Page transitions      | Tab switch    | Crossfade with slight slide (outgoing left, incoming right) |
| Nav tabs              | Active        | Gradient underline slides to active tab                  |
| Toggle/bench          | State change  | Smooth opacity + icon swap with rotation                 |
| Upload                | File added    | Card slides in from bottom with spring easing            |
| Remove                | Delete        | Card collapses height + fades out                        |
| Now playing bar       | Song starts   | Slides up from bottom                                   |
| Progress bar          | Playing       | Gradient fill animates along the bar                     |
| Loading spinner       | Loading       | Conic gradient rotation                                  |
| Drag & drop           | Dragging      | Card lifts (scale 1.02) + shadow/glow appears            |
| Player photo          | Hover         | Subtle scale 1.05                                        |
| Theme elements        | Accent glow   | Slow ambient pulse on active elements                    |

### Stagger Pattern for Lists

```css
/* Each child enters with increasing delay */
.stagger-enter > * {
  opacity: 0;
  transform: translateY(12px);
  animation: fadeUp var(--duration-base) var(--ease-out) forwards;
}
.stagger-enter > *:nth-child(1) { animation-delay: 0ms; }
.stagger-enter > *:nth-child(2) { animation-delay: 50ms; }
.stagger-enter > *:nth-child(3) { animation-delay: 100ms; }
/* ...etc */

@keyframes fadeUp {
  to { opacity: 1; transform: translateY(0); }
}
```

### Page Transition Pattern

```css
.page-enter {
  animation: slideIn var(--duration-base) var(--ease-out);
}
.page-exit {
  animation: slideOut var(--duration-fast) var(--ease-in-out);
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(16px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes slideOut {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(-16px); }
}
```

### Gradient Progress Bar

```css
#progress-bar {
  background: linear-gradient(90deg, var(--teal), var(--green), var(--purple));
  background-size: 200% 100%;
  animation: gradientShift 3s ease-in-out infinite;
}
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

---

## CSS Variables Template (Updated)

```css
:root {
  /* Neutrals */
  --black: #0A0A0A;
  --gray-950: #141414;
  --gray-900: #1A1A1A;
  --gray-800: #2A2A2A;
  --gray-700: #3A3A3A;
  --gray-600: #5A5A5A;
  --gray-400: #8A8A8A;
  --gray-200: #B0B0B0;
  --white: #F7F7F7;

  /* Accents */
  --teal: #08DDC8;
  --green: #83DD68;
  --purple: #CF59F3;
  --accent-gradient: conic-gradient(
    from 180deg at 50% -18.18%,
    #08DDC8 0deg, #83DD68 128.08deg,
    #CF59F3 264.81deg, #08DDC8 360deg
  );

  /* Semantic */
  --bg: var(--black);
  --bg-card: var(--gray-900);
  --bg-input: var(--gray-800);
  --text: var(--white);
  --text-muted: var(--gray-400);
  --text-dim: var(--gray-600);
  --border: var(--gray-700);
  --hover: var(--gray-800);

  /* Spacing (8px base) */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 16px;
  --sp-4: 24px;
  --sp-5: 32px;
  --sp-6: 48px;
  --sp-8: 64px;

  /* Radius (8px base) */
  --r-1: 4px;
  --r-2: 8px;
  --r-3: 16px;
  --r-4: 24px;
  --r-full: 9999px;

  /* Typography */
  --text-xs: 10px;
  --text-sm: 12px;
  --text-base: 14px;
  --text-lg: 16px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --font: 'Montserrat', sans-serif;
  --font-weight: 300;

  /* Glows */
  --glow-teal: 0 0 12px rgba(8, 221, 200, 0.4);
  --glow-green: 0 0 12px rgba(131, 221, 104, 0.4);
  --glow-purple: 0 0 12px rgba(207, 89, 243, 0.4);
  --glow-accent: 0 0 20px rgba(8, 221, 200, 0.3), 0 0 40px rgba(207, 89, 243, 0.15);

  /* Status */
  --danger: #FF6161;
  --glow-danger: 0 0 12px rgba(255, 97, 97, 0.4);

  /* Motion */
  --duration-fast: 120ms;
  --duration-base: 250ms;
  --duration-slow: 500ms;
  --duration-xslow: 800ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## Status Colors

| Token      | Hex       | Usage                          |
|------------|-----------|--------------------------------|
| `--danger` | `#FF6161` | Destructive actions, errors    |
