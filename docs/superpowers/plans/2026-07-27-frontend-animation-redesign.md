# ReqFlow-Web Frontend Animation & Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Framer Motion-driven animations and micro-interactions across `reqflow-web`'s single-page UI (hero entrance, input/button feedback, pipeline nodes, waterfall bars, stage detail panel, terminal log, ambient background) while preserving the existing neon/cyberpunk visual identity and single-file code structure.

**Architecture:** All changes live in the existing `src/App.jsx` (plus small additive CSS in `src/styles.css`). No new component files are created. `framer-motion` is added as the only new dependency; the app's root JSX is wrapped in `<MotionConfig reducedMotion="user">` so decorative transform-based motion is automatically suppressed for users with OS-level reduced-motion preference, with explicit `useReducedMotion()` gating added where an animation is a fully decorative infinite loop.

**Tech Stack:** React 18, Vite 6, Tailwind (via CDN script, unchanged), `framer-motion` (new).

## Global Constraints

- Single-file structure is preserved: only `src/App.jsx` and `src/styles.css` are modified; no new component files.
- Do NOT migrate Tailwind from the CDN `<script>` tag to an npm-installed build — out of scope.
- Do NOT change the color palette, typography, or layout/identity — this is animation/motion polish only, no rebrand.
- Do NOT add new product features — only visual/animation behavior changes.
- All new animations must animate `transform`/`opacity`-equivalent properties (e.g. `scaleX`, `x`, `y`, `scale`, `opacity`) — never animate `width`/`height`/`top`/`left` directly.
- Respect `prefers-reduced-motion`: the app root uses `<MotionConfig reducedMotion="user">`; any fully-decorative `repeat: Infinity` loop must additionally be gated behind `useReducedMotion()` so it does not render at all for reduced-motion users.
- This repo has **no automated test suite** (no Jest/Vitest/RTL installed, confirmed via `package.json`). Verification for every task is manual: `npm run dev`, drive the app in a browser (use the `claude-in-chrome` skill), confirm the described visual behavior and check the browser console for errors, then `npm run lint`.
- ESLint enforces `no-unused-vars: "error"` (see `eslint.config.js:39`). Every import added in a task must be used within that same task — do not add an import in one task "for later use" in a subsequent task.
- `framer-motion` has no version floor specified — install whatever `npm install framer-motion` resolves as latest.

---

### Task 1: Framer Motion setup + Hero/Header entrance animation

**Files:**
- Modify: `package.json` (new dependency, via `npm install`)
- Modify: `src/App.jsx` (imports, new state/effect, header JSX, root `<main>` wrapper)

**Interfaces:**
- Produces: `framer-motion` named imports `motion`, `MotionConfig`, `useReducedMotion`, `animate` — available for later tasks to extend the same `import` statement.
- Produces: `shouldReduceMotion` (boolean, from `useReducedMotion()`) — declared inside `App()`, consumed by Task 7.
- Produces: root JSX wrapped in `<MotionConfig reducedMotion="user">` — all later `motion.*` elements automatically get reduced-motion handling for transform-based props.

- [ ] **Step 1: Install the dependency**

Run: `npm install framer-motion`

- [ ] **Step 2: Update the React import to add `useRef`**

In `src/App.jsx`, change the first line from:

```jsx
import { useEffect, useMemo, useState } from "react";
```

to:

```jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, MotionConfig, useReducedMotion } from "framer-motion";
```

- [ ] **Step 3: Add hero animation variants at module scope**

Directly below the `STAGES` array definition (after its closing `];`), add:

```js
const heroContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

const heroItemVariants = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 120, damping: 18 }
  }
};
```

- [ ] **Step 4: Add reduced-motion detection and the visit-counter count-up state**

Inside `function App()`, directly after the line
`const [totalVisits, setTotalVisits] = useState(() => getCachedVisitTotal());`,
add:

```jsx
  const shouldReduceMotion = useReducedMotion();
  const [displayedVisits, setDisplayedVisits] = useState(() => getCachedVisitTotal());
  const previousVisitsRef = useRef(totalVisits);
```

- [ ] **Step 5: Add the count-up effect**

Directly after the existing `useEffect` that fetches/registers visits (the one ending with the `return () => { isUnmounted = true; clearTimeout(timeoutId); clearInterval(intervalId); };` block), add a new, separate effect:

```jsx
  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayedVisits(totalVisits);
      previousVisitsRef.current = totalVisits;
      return;
    }

    const controls = animate(previousVisitsRef.current, totalVisits, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (value) => setDisplayedVisits(Math.round(value))
    });
    previousVisitsRef.current = totalVisits;

    return () => controls.stop();
  }, [totalVisits, shouldReduceMotion]);
```

- [ ] **Step 6: Wrap the root return in `MotionConfig`**

Change:

```jsx
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
```

to:

```jsx
  return (
    <MotionConfig reducedMotion="user">
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
```

And change the matching closing tags at the end of the component's JSX from:

```jsx
    </main>
  );
}
```

to:

```jsx
    </main>
    </MotionConfig>
  );
}
```

(Indentation of the lines in between is left as-is — functionally correct, cosmetic only.)

- [ ] **Step 7: Animate the header block**

Replace:

```jsx
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.45em] text-slate-400">
              Network - Browser
            </p>
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-right">
              <p className="font-['Share_Tech_Mono'] text-[10px] uppercase tracking-[0.2em] text-emerald-200">
                Total Visits {formatVisitsCompact(totalVisits)}
              </p>
            </div>
          </div>
          <h1 className="title-glow text-3xl font-extrabold uppercase tracking-[0.05em] sm:text-5xl">
            HTTP Request Lifecycle
          </h1>
          <p className="font-['Space_Grotesk'] text-sm text-slate-400 sm:text-base">
            Neon waterfall timeline for DNS, transport, security, request and render phases.
          </p>
        </header>
```

with:

```jsx
        <motion.header
          className="space-y-3"
          variants={heroContainerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between gap-3">
            <motion.p
              variants={heroItemVariants}
              className="font-mono text-xs uppercase tracking-[0.45em] text-slate-400"
            >
              Network - Browser
            </motion.p>
            <motion.div
              variants={heroItemVariants}
              className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-right"
            >
              <p className="font-['Share_Tech_Mono'] text-[10px] uppercase tracking-[0.2em] text-emerald-200">
                Total Visits {formatVisitsCompact(displayedVisits)}
              </p>
            </motion.div>
          </div>
          <motion.h1
            variants={heroItemVariants}
            className="title-glow text-3xl font-extrabold uppercase tracking-[0.05em] sm:text-5xl"
          >
            HTTP Request Lifecycle
          </motion.h1>
          <motion.p
            variants={heroItemVariants}
            className="font-['Space_Grotesk'] text-sm text-slate-400 sm:text-base"
          >
            Neon waterfall timeline for DNS, transport, security, request and render phases.
          </motion.p>
        </motion.header>
```

- [ ] **Step 8: Verify manually**

Run: `npm run dev`
Using the `claude-in-chrome` skill, open `http://localhost:6061`, and confirm:
- On page load, the badge, visit counter, title, and subtitle fade/slide in one after another (not all at once).
- The visit counter number animates upward briefly instead of snapping to its value.
- No errors in the browser console.

- [ ] **Step 9: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json src/App.jsx
git commit -m "feat: add framer-motion and animate hero header entrance"
```

---

### Task 2: Input & button micro-interactions

**Files:**
- Modify: `src/App.jsx` (import line, URL input, Analyze button, error message)

**Interfaces:**
- Consumes: `motion` import from Task 1.
- Produces: `AnimatePresence`, `useAnimationControls` added to the framer-motion import line, available for Tasks 5 and 6 to reuse `AnimatePresence`.

- [ ] **Step 1: Extend the framer-motion import**

Change:

```jsx
import { animate, motion, MotionConfig, useReducedMotion } from "framer-motion";
```

to:

```jsx
import { animate, AnimatePresence, motion, MotionConfig, useAnimationControls, useReducedMotion } from "framer-motion";
```

- [ ] **Step 2: Add animation controls for the input shake**

Inside `function App()`, directly after the `previousVisitsRef` declaration added in Task 1, add:

```jsx
  const inputControls = useAnimationControls();
```

- [ ] **Step 3: Trigger the shake on invalid URL**

In `runAnalysis`, find:

```jsx
    if (!isValidHttpUrl(targetUrl)) {
      setErrorMessage("URL noto'g'ri. Faqat http:// yoki https:// bilan to'liq URL kiriting.");
      setLogs([
        {
          text: `> [ERR] Invalid URL: ${targetUrl || "(empty)"}`,
          stageIndex: 0
        }
      ]);
      return;
    }
```

and change it to:

```jsx
    if (!isValidHttpUrl(targetUrl)) {
      setErrorMessage("URL noto'g'ri. Faqat http:// yoki https:// bilan to'liq URL kiriting.");
      setLogs([
        {
          text: `> [ERR] Invalid URL: ${targetUrl || "(empty)"}`,
          stageIndex: 0
        }
      ]);
      inputControls.start({
        x: [0, -8, 8, -6, 6, -3, 3, 0],
        transition: { duration: 0.45, ease: "easeInOut" }
      });
      return;
    }
```

- [ ] **Step 4: Animate the input and button**

Replace:

```jsx
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://muhammadqodir.com"
              className="h-12 flex-1 rounded-xl border border-slate-700/70 bg-slate-900/80 px-4 font-['Share_Tech_Mono'] text-sm text-slate-100 outline-none transition focus:border-cyan-400/70 focus:shadow-neon"
            />
            <button
              type="button"
              onClick={runAnalysis}
              disabled={isRunning}
              className="h-12 rounded-xl border border-cyan-400/60 bg-cyan-400/15 px-5 font-['Orbitron'] text-sm font-bold uppercase tracking-[0.18em] text-cyan-200 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRunning ? "Running..." : "Analyze"}
            </button>
          </div>

          {errorMessage ? (
            <p className="mt-3 rounded-xl border border-rose-500/45 bg-rose-500/10 px-3 py-2 font-['Share_Tech_Mono'] text-xs text-rose-200">
              {errorMessage}
            </p>
          ) : null}
```

with:

```jsx
            <motion.input
              animate={inputControls}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://muhammadqodir.com"
              className="h-12 flex-1 rounded-xl border border-slate-700/70 bg-slate-900/80 px-4 font-['Share_Tech_Mono'] text-sm text-slate-100 outline-none transition focus:border-cyan-400/70 focus:shadow-neon"
            />
            <motion.button
              type="button"
              onClick={runAnalysis}
              disabled={isRunning}
              whileHover={!isRunning ? { scale: 1.03 } : undefined}
              whileTap={!isRunning ? { scale: 0.97 } : undefined}
              className="h-12 rounded-xl border border-cyan-400/60 bg-cyan-400/15 px-5 font-['Orbitron'] text-sm font-bold uppercase tracking-[0.18em] text-cyan-200 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRunning ? (
                <span className="inline-flex items-center gap-2">
                  <motion.span
                    className="inline-block h-2 w-2 rounded-full bg-cyan-300"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                  />
                  Running...
                </span>
              ) : (
                "Analyze"
              )}
            </motion.button>
          </div>

          <AnimatePresence>
            {errorMessage ? (
              <motion.p
                key="error-message"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="mt-3 rounded-xl border border-rose-500/45 bg-rose-500/10 px-3 py-2 font-['Share_Tech_Mono'] text-xs text-rose-200"
              >
                {errorMessage}
              </motion.p>
            ) : null}
          </AnimatePresence>
```

- [ ] **Step 5: Verify manually**

Run: `npm run dev` (if not already running).
Using `claude-in-chrome`:
- Clear the URL input and click Analyze — confirm the input shakes and the error message fades/slides in.
- Hover and click the Analyze button with a valid URL — confirm the hover/tap scale feedback and the pulsing dot next to "Running...".
- Confirm no console errors.

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx
git commit -m "feat: animate URL input and Analyze button interactions"
```

---

### Task 3: Pipeline nodes & connecting line

**Files:**
- Modify: `src/App.jsx` (pipeline section JSX, new `pipelineProgress` const)
- Modify: `src/styles.css` (`.stage-node` positioning, new `.pipeline-line-progress` and `.stage-node-ring` classes)

**Interfaces:**
- Consumes: `motion` import from Task 1; existing `barProgress`, `hasAnalyzed`, `activeStage`, `STAGES` state/consts.
- Produces: none consumed by later tasks.

- [ ] **Step 1: Add the pipeline progress calculation**

Directly above the `return (` statement in `App()` (after the `handleStageFocus` function definition), add:

```jsx
  const completedStageCount = STAGES.filter((stage) => barProgress[stage.key] === 1).length;
  const pipelineProgress = hasAnalyzed ? completedStageCount / STAGES.length : 0;
```

- [ ] **Step 2: Add CSS for the progress line and active-node ring**

In `src/styles.css`, directly after the existing `.pipeline-line { ... }` block, add:

```css
.pipeline-line-progress {
  position: absolute;
  left: 8%;
  right: 8%;
  top: 19px;
  height: 2px;
  transform-origin: left center;
  background: linear-gradient(90deg, #38bdf8, #22c55e);
  filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.55));
  border-radius: 999px;
}
```

Then update `.stage-node` to add `position: relative;` as its first declaration:

```css
.stage-node {
  position: relative;
  display: grid;
  height: 38px;
  width: 38px;
  place-items: center;
  cursor: pointer;
  border-radius: 9999px;
  border: 1px solid color-mix(in srgb, var(--stage-color) 84%, #0f172a);
  background: radial-gradient(circle at 50% 35%, #0f172a, #020617);
  color: #b4c3d9;
  opacity: 0.52;
  font-size: 12px;
  font-weight: 700;
  font-family: "Share Tech Mono", monospace;
  transition: transform 0.2s ease, box-shadow 0.3s ease, color 0.3s ease, opacity 0.3s ease;
}
```

Then, directly after the `.stage-node-done { ... }` block, add:

```css
.stage-node-ring {
  position: absolute;
  inset: -3px;
  border-radius: 9999px;
  border: 2px solid var(--stage-color);
  box-shadow:
    0 0 18px color-mix(in srgb, var(--stage-color) 80%, transparent),
    0 0 30px color-mix(in srgb, var(--stage-color) 40%, transparent);
  pointer-events: none;
}
```

Finally, inside the existing `@media (max-width: 640px) { ... }` block at the bottom of the file, add a rule so the progress overlay follows the same mobile behavior as the base line:

```css
@media (max-width: 640px) {
  .pipeline-line,
  .pipeline-line-progress {
    display: none;
  }

  .stage-node {
    height: 34px;
    width: 34px;
  }
}
```

(This replaces the existing `@media (max-width: 640px) { .pipeline-line { display: none; } .stage-node { ... } }` block — merge rather than duplicate.)

- [ ] **Step 3: Animate the connecting line and the active-node ring**

Replace:

```jsx
          <div className="relative grid grid-cols-2 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
            <span className="pipeline-line" />
            {timeline.map((stage, index) => {
              const isActive = activeStage === index;
              const isDone = barProgress[stage.key] === 1;
              return (
                <div key={stage.key} className="relative flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStageFocus(index)}
                    className={`stage-node ${isActive ? "stage-node-active" : ""} ${
                      isDone ? "stage-node-done" : ""
                    }`}
                    style={{ "--stage-color": stage.color }}
                  >
                    {stage.short}
                  </button>
                  <div className="text-center font-['Space_Grotesk'] text-[10px] font-semibold text-slate-300">
                    {stage.label}
                    <p className="font-mono text-[10px] text-slate-500">
                      {hasAnalyzed ? `~${stage.duration}ms` : "0ms"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
```

with:

```jsx
          <div className="relative grid grid-cols-2 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
            <span className="pipeline-line" />
            <motion.span
              className="pipeline-line-progress"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: pipelineProgress }}
              transition={{ type: "spring", stiffness: 90, damping: 20 }}
            />
            {timeline.map((stage, index) => {
              const isActive = activeStage === index;
              const isDone = barProgress[stage.key] === 1;
              return (
                <div key={stage.key} className="relative flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStageFocus(index)}
                    className={`stage-node ${isActive ? "stage-node-active" : ""} ${
                      isDone ? "stage-node-done" : ""
                    }`}
                    style={{ "--stage-color": stage.color }}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="active-stage-ring"
                        className="stage-node-ring"
                        style={{ "--stage-color": stage.color }}
                        transition={{ type: "spring", stiffness: 260, damping: 24 }}
                      />
                    ) : null}
                    <span className="relative z-10">{stage.short}</span>
                  </button>
                  <div className="text-center font-['Space_Grotesk'] text-[10px] font-semibold text-slate-300">
                    {stage.label}
                    <p className="font-mono text-[10px] text-slate-500">
                      {hasAnalyzed ? `~${stage.duration}ms` : "0ms"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
```

- [ ] **Step 4: Verify manually**

Run the app and, using `claude-in-chrome`:
- Run a full analysis and confirm the progress line fills left-to-right as stages complete.
- Click between different pipeline nodes (when not running) and confirm the highlighted ring glides smoothly from one node to the next instead of jumping.
- Confirm no console errors.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/styles.css
git commit -m "feat: animate pipeline connecting line and active-node ring"
```

---

### Task 4: Waterfall timing bars

**Files:**
- Modify: `src/App.jsx` (waterfall bar JSX)
- Modify: `src/styles.css` (`.waterfall-bar`)

**Interfaces:**
- Consumes: `motion` import from Task 1.
- Produces: none consumed by later tasks.

- [ ] **Step 1: Remove the now-redundant CSS transition**

In `src/styles.css`, change:

```css
.waterfall-bar {
  position: absolute;
  top: 4px;
  height: calc(100% - 8px);
  border-radius: 8px;
  transform-origin: left;
  filter: saturate(115%) brightness(110%);
  transition: transform 0.48s ease-out, opacity 0.24s ease;
}
```

to:

```css
.waterfall-bar {
  position: absolute;
  top: 4px;
  height: calc(100% - 8px);
  border-radius: 8px;
  transform-origin: left;
  filter: saturate(115%) brightness(110%);
}
```

- [ ] **Step 2: Animate the bar fill with Framer Motion**

Replace:

```jsx
                  <div
                    className="waterfall-bar"
                    style={{
                      left: `${stage.startPct}%`,
                      width: `${stage.widthPct}%`,
                      background: `linear-gradient(90deg, ${stage.color}, ${stage.color}cc)`,
                      boxShadow: `0 0 16px ${stage.color}66`,
                      opacity: focusedStage >= idx ? 1 : 0.2,
                      transform: `scaleX(${barProgress[stage.key] || (!isRunning && focusedStage >= idx ? 1 : 0)})`
                    }}
                  />
```

with:

```jsx
                  <motion.div
                    className="waterfall-bar"
                    style={{
                      left: `${stage.startPct}%`,
                      width: `${stage.widthPct}%`,
                      background: `linear-gradient(90deg, ${stage.color}, ${stage.color}cc)`,
                      boxShadow: `0 0 16px ${stage.color}66`
                    }}
                    initial={false}
                    animate={{
                      scaleX: barProgress[stage.key] || (!isRunning && focusedStage >= idx ? 1 : 0),
                      opacity: focusedStage >= idx ? 1 : 0.2
                    }}
                    transition={{
                      scaleX: {
                        type: "spring",
                        stiffness: 140,
                        damping: 14,
                        delay: idx * 0.06
                      },
                      opacity: { duration: 0.2 }
                    }}
                  />
```

- [ ] **Step 3: Verify manually**

Run the app and, using `claude-in-chrome`, run a full analysis and confirm the waterfall bars fill in a staggered "domino" fashion with a slight spring bounce, rather than a simple linear fill. Confirm no console errors.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/styles.css
git commit -m "feat: animate waterfall bars with staggered spring fill"
```

---

### Task 5: Stage detail panel crossfade + notes stagger

**Files:**
- Modify: `src/App.jsx` (stage detail panel JSX)

**Interfaces:**
- Consumes: `motion`, `AnimatePresence` imports (Tasks 1 and 2).
- Produces: none consumed by later tasks.

- [ ] **Step 1: Animate the panel header and notes**

Replace:

```jsx
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="grid h-10 w-10 place-items-center rounded-xl border text-sm font-bold"
                style={{
                  borderColor: `${currentStage.color}88`,
                  color: currentStage.color,
                  boxShadow: `0 0 16px ${currentStage.color}44`
                }}
              >
                {currentStage.short}
              </div>
              <div>
                <p
                  className="font-['Orbitron'] text-xl font-bold"
                  style={{ color: currentStage.color }}
                >
                  {detail.title}
                </p>
                <p className="font-['Share_Tech_Mono'] text-xs text-slate-500">
                  typical: {hasAnalyzed ? `~${detail.durationMs}ms` : "0ms"}
                </p>
              </div>
            </div>
            <div
              className="rounded-full border px-3 py-1 font-['Share_Tech_Mono'] text-xs"
              style={{
                borderColor: `${currentStage.color}66`,
                color: currentStage.color,
                boxShadow: `0 0 12px ${currentStage.color}33`
              }}
            >
              {isRunning ? "in progress" : "ready"}
            </div>
          </div>

          <div className="space-y-2">
            {currentVisibleNotes.map((item, idx) => (
              <div
                key={`${currentStage.short}-${idx}`}
                className="flex items-center justify-between rounded-lg border border-slate-800/90 bg-slate-950/40 px-3 py-2"
              >
                <p className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: currentStage.color }}
                  />
                  {item.left}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {item.right}
                </p>
              </div>
            ))}
          </div>
```

with:

```jsx
          <AnimatePresence>
            <motion.div
              key={currentStage.short}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="mb-3 flex items-start justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className="grid h-10 w-10 place-items-center rounded-xl border text-sm font-bold"
                  style={{
                    borderColor: `${currentStage.color}88`,
                    color: currentStage.color,
                    boxShadow: `0 0 16px ${currentStage.color}44`
                  }}
                >
                  {currentStage.short}
                </div>
                <div>
                  <p
                    className="font-['Orbitron'] text-xl font-bold"
                    style={{ color: currentStage.color }}
                  >
                    {detail.title}
                  </p>
                  <p className="font-['Share_Tech_Mono'] text-xs text-slate-500">
                    typical: {hasAnalyzed ? `~${detail.durationMs}ms` : "0ms"}
                  </p>
                </div>
              </div>
              <div
                className="rounded-full border px-3 py-1 font-['Share_Tech_Mono'] text-xs"
                style={{
                  borderColor: `${currentStage.color}66`,
                  color: currentStage.color,
                  boxShadow: `0 0 12px ${currentStage.color}33`
                }}
              >
                {isRunning ? "in progress" : "ready"}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="space-y-2">
            {currentVisibleNotes.map((item, idx) => (
              <motion.div
                key={`${currentStage.short}-${idx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex items-center justify-between rounded-lg border border-slate-800/90 bg-slate-950/40 px-3 py-2"
              >
                <p className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: currentStage.color }}
                  />
                  {item.left}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {item.right}
                </p>
              </motion.div>
            ))}
          </div>
```

- [ ] **Step 2: Verify manually**

Run the app and, using `claude-in-chrome`:
- Click through different pipeline nodes manually and confirm the detail panel header crossfades/slides between stages.
- Run a full analysis and confirm notes fade/slide in individually as they appear, rather than popping in instantly.
- Confirm no console errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: crossfade stage detail panel and stagger note reveal"
```

---

### Task 6: Terminal log animation + blinking cursor

**Files:**
- Modify: `src/App.jsx` (terminal log JSX)
- Modify: `src/styles.css` (remove `.terminal-line`/`fadeLine`, add `.terminal-cursor`)

**Interfaces:**
- Consumes: `motion`, `AnimatePresence` imports (Tasks 1 and 2).
- Produces: none consumed by later tasks.

- [ ] **Step 1: Replace the CSS fade animation with a cursor style**

In `src/styles.css`, change:

```css
.terminal-line {
  animation: fadeLine 220ms ease-out;
}

@keyframes fadeLine {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

to:

```css
.terminal-cursor {
  display: inline-block;
  color: #38bdf8;
}
```

- [ ] **Step 2: Animate log lines and add the blinking cursor**

Replace:

```jsx
          <div className="max-h-72 overflow-auto rounded-xl border border-slate-800 bg-black/60 p-4 font-['Share_Tech_Mono'] text-xs leading-6 text-slate-200">
            {visibleLogs.map((entry, index) => (
              <div key={`${entry.text}-${index}`} className="terminal-line">
                {entry.text}
              </div>
            ))}
          </div>
```

with:

```jsx
          <div className="max-h-72 overflow-auto rounded-xl border border-slate-800 bg-black/60 p-4 font-['Share_Tech_Mono'] text-xs leading-6 text-slate-200">
            <AnimatePresence initial={false}>
              {visibleLogs.map((entry, index) => (
                <motion.div
                  key={`${entry.text}-${index}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {entry.text}
                </motion.div>
              ))}
            </AnimatePresence>
            {visibleLogs.length > 0 ? (
              <motion.span
                className="terminal-cursor"
                animate={{ opacity: [1, 1, 0, 0] }}
                transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1], ease: "linear" }}
              >
                ▊
              </motion.span>
            ) : null}
          </div>
```

- [ ] **Step 3: Verify manually**

Run the app and, using `claude-in-chrome`, run a full analysis and confirm log lines slide/fade in one by one and a blinking cursor appears after the last line. Confirm no console errors.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/styles.css
git commit -m "feat: animate terminal log lines and add blinking cursor"
```

---

### Task 7: Ambient background breathing animation

**Files:**
- Modify: `src/App.jsx` (background blob JSX)

**Interfaces:**
- Consumes: `motion` import (Task 1), `shouldReduceMotion` (Task 1).
- Produces: none consumed by later tasks.

- [ ] **Step 1: Animate the background blobs**

Replace:

```jsx
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-cyan-400/20 blur-[170px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-fuchsia-500/20 blur-[140px]" />
```

with:

```jsx
      <motion.div
        className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-cyan-400/20 blur-[170px]"
        animate={
          shouldReduceMotion
            ? undefined
            : { scale: [1, 1.08, 1], opacity: [0.2, 0.28, 0.2] }
        }
        transition={{ duration: 10, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-fuchsia-500/20 blur-[140px]"
        animate={
          shouldReduceMotion
            ? undefined
            : { scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }
        }
        transition={{ duration: 12, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: 1.5 }}
      />
```

- [ ] **Step 2: Verify manually**

Run the app and, using `claude-in-chrome`, observe the background for ~10-15 seconds and confirm the two glow blobs slowly and subtly pulse in scale/opacity without being distracting. Confirm no console errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add subtle breathing animation to ambient background blobs"
```

---

### Task 8: Full verification pass (reduced motion, responsive, production build)

**Files:** none (verification only; fix-forward only if an issue is found)

**Interfaces:** N/A — this task exercises the combined output of Tasks 1-7.

- [ ] **Step 1: Full end-to-end animation walkthrough**

Run: `npm run dev`
Using `claude-in-chrome`, load `http://localhost:6061` and run a full analysis with a valid URL end-to-end. Confirm all seven animation areas are visible and behave correctly together in one run: hero entrance + visit counter count-up, input/button interactions, pipeline node ring + connecting line, waterfall bars, stage detail panel crossfade + notes stagger, terminal log line-by-line reveal + blinking cursor, ambient background breathing. Confirm no console errors or warnings introduced by the animation changes.

- [ ] **Step 2: Responsive check**

Using `claude-in-chrome`, resize/emulate a mobile viewport (e.g. 375px wide) and a tablet viewport (e.g. 768px wide). Confirm the pipeline section, waterfall rows, and detail panel remain usable and the animations don't cause layout overflow or clipping.

- [ ] **Step 3: Reduced-motion check**

Using Chrome DevTools' Rendering tab, set "Emulate CSS media feature prefers-reduced-motion" to `reduce`, reload the page, and run an analysis. Confirm: the hero entrance and note/log reveals still communicate state (simple fades) without large movement, the ambient background blobs are static (no pulsing), and the visit counter updates without a tweened count-up.

- [ ] **Step 4: Lint and production build**

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: build completes successfully with no errors.

- [ ] **Step 5: Fix-forward commit (only if needed)**

If any issue was found and fixed during Steps 1-4, stage the affected files and commit:

```bash
git add src/App.jsx src/styles.css
git commit -m "fix: address animation issues found in verification pass"
```

If nothing needed fixing, this step is skipped — no empty commit.
