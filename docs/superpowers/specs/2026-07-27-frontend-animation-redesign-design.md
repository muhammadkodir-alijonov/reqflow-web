# ReqFlow-Web Frontend Animation & Visual Polish — Design

Date: 2026-07-27

## Goal

Elevate the existing neon/cyberpunk dark-theme SPA to a polished, professional
feel by introducing Framer Motion-driven animations and micro-interactions
across the app, without changing its visual identity, file structure, or
feature set.

## Context

`reqflow-web` is a single-page React app (`src/App.jsx`, ~1000 lines,
`src/styles.css`) that visualizes an HTTP request lifecycle as a
DNS → TCP → TLS → REQ → RES → BND pipeline with a timing waterfall and
terminal-style log. It currently uses hand-written CSS transitions and
keyframes for all motion (`.stage-node`, `.waterfall-bar`, `.terminal-line`
fadeLine keyframe, etc.), Tailwind via CDN `<script>` tag, and Google Fonts
(Orbitron, Space Grotesk, Share Tech Mono). There is no animation library
installed today.

## Non-Goals (explicitly out of scope)

- No splitting `App.jsx` into multiple component files — it stays a single
  file (plus `styles.css`).
- No migration of Tailwind from the CDN `<script>` tag to an npm-installed,
  build-time Tailwind setup.
- No change to the color palette, typography, or overall layout/identity —
  the neon/cyberpunk theme is preserved and refined, not replaced.
- No new product features — this is a visual/animation polish pass only.

## Technical Approach

- Add `framer-motion` as a new dependency (npm).
- Keep the existing single-file structure; where small sub-pieces are needed
  purely to drive `AnimatePresence` keys (e.g. per-stage detail panel, per-log
  line), they stay as inline JSX/local consts inside `App.jsx`, not new files.
- Preserve the current color palette (`#f97316, #facc15, #a855f7, #38bdf8,
  #22c55e, #ec4899`), fonts, and glass-panel aesthetic.
- All animations must be built on GPU-friendly properties (`transform`,
  `opacity`) — no animating `width`/`height`/`top`/`left` directly where a
  `scaleX`/`transform` equivalent exists (the waterfall bars already follow
  this pattern via `scaleX`; new animations must match it).
- Respect `prefers-reduced-motion` via Framer Motion's `useReducedMotion()`
  hook: decorative animations (staggered entrance, ambient background pulse,
  input shake) are disabled or reduced to instant/simple fades when the user
  has reduced motion enabled. Functional animations (progress bar fill)
  degrade to a simple fade rather than being removed entirely.

## Animation Plan

### 1. Header / Hero entrance
On mount, a `motion` container with `staggerChildren` animates, in order: the
"Network - Browser" badge → visit counter → H1 title → subtitle. Each child
animates `opacity 0→1`, `y: 16→0`, with a subtle blur-out, using spring easing
(`type: "spring", stiffness: 120, damping: 18`) and ~60–80ms stagger delay
between children. The visit counter number additionally does a short
count-up animation from its previous value rather than snapping to the new
number.

### 2. Input & button micro-interactions
- URL input: focus state animates border/box-shadow glow intensity smoothly;
  on validation error, the input does a short shake (`x: [0, -6, 6, -4, 4,
  0]`).
- Analyze button: `whileHover={{ scale: 1.03 }}`, `whileTap={{ scale: 0.97
  }}`; while running, an animated spinner/progress-pulse replaces the static
  "Running..." text treatment.

### 3. Pipeline nodes & connecting line
- The connecting line (`.pipeline-line`) animates via `scaleX` progressively
  left-to-right as stages complete, instead of being a static gradient.
- Each node's active-state ring uses a shared `layoutId` so the highlighted
  ring visually glides from one node to the next when focus changes, instead
  of the current instant CSS class swap. Node activation still includes a
  spring pop-scale + glow intensification.

### 4. Waterfall timing bars
Bars animate fill via Framer Motion spring physics on `scaleX` (replacing the
current CSS `transition`), with ~60ms stagger between bars for a "domino"
reveal effect, and a slight overshoot-then-settle on completion to reinforce
the sense of real progress.

### 5. Stage detail panel (notes)
Switching stages crossfades/slides the panel header (icon, title, color) via
`AnimatePresence mode="wait"`. Notes keep their existing progressive-reveal
timing logic, but each note additionally animates in with fade + slight
slide instead of appearing instantly.

### 6. Terminal log
Each log line enters via `AnimatePresence` with a slide-up + fade
(replacing the current CSS `fadeLine` keyframe with an equivalent Framer
Motion variant), and a subtle blinking cursor (`▊`) appears after the last
line to reinforce the terminal/hacker feel.

### 7. Ambient background effects
The existing cyan/fuchsia blurred gradient blobs gain a slow, continuous
`scale`/`opacity` "breathing" animation (`repeat: Infinity, repeatType:
"mirror"`, 8–12s duration) — subtle enough not to distract from content.

## Accessibility & Performance

- `useReducedMotion()` gates all purely-decorative motion (stagger entrance,
  ambient pulse, shake); functional motion (progress fill) falls back to a
  simple fade.
- Animations stick to `transform`/`opacity` to stay GPU-accelerated and avoid
  layout thrashing.
- Framer Motion adds a modest bundle size increase (~30–40kb minified); no
  further bundle optimization is in scope for this pass.

## Testing Plan

Since this is a UI/animation change, verification happens by running the app
and observing it, not just type-checking:

- `npm run dev` and drive a full "Analyze" run through the browser
  (claude-in-chrome or equivalent), confirming all seven animation areas
  above are visible and behave correctly end-to-end.
- Check responsive behavior at mobile/tablet breakpoints.
- Enable `prefers-reduced-motion: reduce` and confirm decorative animations
  are disabled/simplified while functional ones still communicate progress.
- Confirm no new console errors/warnings are introduced.
- `npm run lint` passes.

## Decisions Confirmed With User

- Animation library: Framer Motion.
- Scope: visual + animation only (no component split, no Tailwind CDN→npm
  migration).
- Visual direction: refine existing neon/cyberpunk identity, not a rebrand.
- Animation focus areas: all of — hero entrance, input/button, pipeline
  nodes/line, waterfall bars, stage detail panel, terminal log, ambient
  background.
- First-load impression: an impressive staggered entrance animation
  (not minimal/instant).
