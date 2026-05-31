# SenangWebs Zero

A framework-agnostic, vanilla-TypeScript user-onboarding tour library. Renders guided product tours / onboarding walkthroughs with step-by-step dialogs, backdrop highlights, and collision-aware positioning.

```bash
npm install senangwebs-zero
```

## Quick Start

### NPM / Bundler

```js
import { SenangWebsZero } from 'senangwebs-zero';
import 'senangwebs-zero/dist/swz.css';

const tour = new SenangWebsZero({ /* options */ });
tour.start();       // ungrouped steps
tour.start('nav');  // steps with data-swz-group="nav"
```

### CDN / Global

```html
<link rel="stylesheet" href="https://unpkg.com/senangwebs-zero/dist/swz.css">
<script src="https://unpkg.com/senangwebs-zero/dist/swz.umd.js"></script>
<script>
  const tour = new swz.SenangWebsZero({ /* options */ });
  tour.start();
</script>
```

## Declaring Steps

### Method 1: DOM Data Attributes

Add `data-swz-tour` to any element. The element becomes the highlight target.
Step content is rendered as HTML, so only pass trusted or sanitized content.

```html
<div data-swz-tour="Welcome to the dashboard!" data-swz-title="Step 1">Dashboard</div>
<button data-swz-tour="Click here to save" data-swz-group="editor">Save</button>
```

| Attribute | Description |
|---|---|
| `data-swz-tour` | **Required.** Step content (HTML allowed). |
| `data-swz-title` | Title shown in dialog header. |
| `data-swz-group` | Group key; step only runs with `start("group")`. |
| `data-swz-order` | Sort order (ascending). |
| `data-swz-fixed` | Treat target as `position:fixed` for highlight positioning. |
| `data-swz-margin` | Per-step scroll margin override (px). |

### Method 2: JS Object Array

```js
const tour = new SenangWebsZero({
  steps: [
    { content: 'Welcome!', title: 'Intro', target: '#header', order: 1 },
    { content: 'Click save to continue.', target: '#save-btn', order: 2 },
    { content: 'Centered step with no target.', title: 'Done', order: 3 },
  ],
});
tour.start();
```

## API

### Constructor

```js
new SenangWebsZero(options?: SWZOptions)
```

Does **not** auto-start.

### Methods

| Method | Description |
|---|---|
| `start(group?)` | Begin the tour. With `group`, only steps matching that group run. |
| `visitStep('next' \| 'prev' \| number)` | Navigate to next, previous, or specific step index. |
| `nextStep()` | Advance one step (or finish if last). |
| `prevStep()` | Go back one step. |
| `exit()` | Close the tour without recording completion. Fires `onBeforeExit`/`onAfterExit`. |
| `finishTour(exit?, group?)` | Programmatically mark complete. If `exit` is `true` (default), also closes the tour. |
| `isFinished(group?)` | `boolean` — whether the tour group was completed. |
| `deleteFinishedTour(group?)` | Clear the completion record. |
| `addSteps(steps[])` | Append object steps to the tour. |
| `setOptions(options)` | Shallow-merge options at runtime. |
| `refresh()` | Recompute steps (rescan DOM + object steps), re-render. |
| `refreshDialog()` | Re-render dialog content/position only (no step recompute). |
| `updatePositions()` | Recompute backdrop + dialog geometry only. |

### Properties

| Property | Type | Description |
|---|---|---|
| `isVisible` | `boolean` | `true` while the tour is on screen. |
| `activeStep` | `number` | Zero-based current step index. Writable; pair with `refreshDialog()`. |
| `tourSteps` | `SWZStep[]` | Resolved, ordered step list. Mutable. |
| `dialog` | `HTMLElement` | Dialog DOM node. |
| `backdrop` | `HTMLElement` | Backdrop DOM node. |
| `options` | `SWZOptions` | Active resolved options. |
| `group` | `string \| undefined` | Active group if `start(group)` was used. |

## Lifecycle Hooks

Single-handler, last-registration-wins. Each handler may be sync or return a Promise. **Rejecting** (or resolving `false`) cancels the gated action.

| Hook | Fires | Gating |
|---|---|---|
| `onBeforeStepChange(fn)` | Before step transition | reject → cancel change |
| `onAfterStepChange(fn)` | After new step renders | no |
| `onBeforeExit(fn)` | Before exit (escape, click‑outside, close btn) | reject → stay open |
| `onAfterExit(fn)` | After teardown | no |
| `onFinish(fn)` | Finish button on last step | reject → cancel finish |

```js
tour.onBeforeStepChange(() => {
  if (!canProceed) throw new Error('Blocked'); // cancels navigation
});

tour.onFinish(async () => {
  await api.markOnboardingComplete();
});
```

## Options (`SWZOptions`)

| Option | Type | Default | Description |
|---|---|---|---|
| `steps` | `SWZStep[]` | `[]` | Steps declared as objects at construction. |
| `autoScroll` | `boolean` | `true` | Scroll window so target is in view. |
| `autoScrollSmooth` | `boolean` | `true` | Use smooth scrolling. |
| `autoScrollOffset` | `number` | `20` | Margin (px) around target when scrolling. |
| `backdropColor` | `string` | `'rgba(20,20,21,0.84)'` | Overlay color (any valid CSS). |
| `backdropClass` | `string` | `''` | Extra CSS class on backdrop element. |
| `backdropAnimate` | `boolean` | `true` | Animate cutout position between steps. |
| `targetPadding` | `number` | `30` | Padding (px) of the highlight cut‑out. |
| `dialogClass` | `string` | `''` | Extra CSS class on dialog element. |
| `dialogZ` | `number` | `999` | `z-index` of the dialog. |
| `dialogWidth` | `number` | `0` | Fixed dialog width (px). `0` = auto. |
| `dialogMaxWidth` | `number` | `340` | Max dialog width (px). |
| `dialogPlacement` | `'top'\|'right'\|'bottom'\|'left'` | `undefined` | Preferred side; `undefined` = auto. |
| `dialogAnimate` | `boolean` | `true` | Animate dialog position between steps. |
| `closeButton` | `boolean` | `true` | Show close (✕) button. |
| `nextLabel` | `string` | `'Next'` | Next button text. |
| `prevLabel` | `string` | `'Back'` | Back button text. |
| `finishLabel` | `string` | `'Finish'` | Final-step button text. |
| `hideNext` | `boolean` | `false` | Hide next button. |
| `hidePrev` | `boolean` | `false` | Hide back button. |
| `showButtons` | `boolean` | `true` | Master toggle for nav buttons. |
| `showStepDots` | `boolean` | `true` | Show progress dots. |
| `stepDotsPlacement` | `'footer'\|'body'` | `'footer'` | Where dots render. |
| `showStepProgress` | `boolean` | `true` | Show `n/total` progress text. |
| `progressBar` | `string` | `''` | Color string → renders progress bar. |
| `completeOnFinish` | `boolean` | `true` | Persist completion in `localStorage`. |
| `rememberStep` | `boolean` | `false` | Resume from last active step on reopen. |
| `exitOnEscape` | `boolean` | `true` | Escape key exits the tour. |
| `exitOnClickOutside` | `boolean` | `true` | Click outside dialog exits. |
| `keyboardControls` | `boolean` | `true` | Arrow keys navigate, Escape exits. |
| `propagateEvents` | `boolean` | `false` | Allow interaction with target through highlight. |
| `debug` | `boolean` | `true` | Emit console diagnostics. |

## Persistence

Completion is tracked in `localStorage` using `swz:`-prefixed keys keyed by group (default group = `"tour"`).

```js
tour.onFinish(() => console.log('done'));

tour.start('onboarding');
tour.isFinished('onboarding');  // true after finishing
tour.deleteFinishedTour('onboarding');  // reset
```

With `rememberStep: true`, the last active step is also stored and resumed on next `start()`.

## CSS Classes

All DOM elements use the `.swz-*` namespace:

```
.swz-backdrop          — full-viewport overlay
  .swz-cutout          — highlight hole (child of backdrop)
.swz-dialog            — floating popover
  .swz-dialog-header
    .swz-dialog-title
    .swz-dialog-close
  .swz-progressbar     — colored bar under header
  .swz-dialog-body
  .swz-dots            — step indicator dots
  .swz-dialog-footer
    .swz-prev          — back button
    .swz-progress      — "n/total" text
    .swz-next          — next/finish button
  .swz-arrow           — caret pointing at target
```

Pass `dialogClass` / `backdropClass` for custom styling hooks.

## Accessibility

- Dialog has `role="dialog"`, `aria-modal`, and `aria-label` from step title.
- Focus moves to dialog on each step; focus returns to trigger element on exit.
- Tab is trapped within the dialog while open.
- All buttons are real `<button>`s with accessible names.
- `prefers-reduced-motion: reduce` disables all animations and smooth scrolling.

## TypeScript

Full type definitions ship with the package:

```ts
import type { SWZOptions, SWZStep } from 'senangwebs-zero';
```

## Build

```bash
npm run build          # JS (rollup) + CSS (sass)
npm run build:js       # rollup only
npm run build:css      # sass only
npm run lint           # tsc --noEmit
```

Outputs:

| File | Format |
|---|---|
| `dist/swz.esm.mjs` | ES Module |
| `dist/swz.cjs.js` | CommonJS |
| `dist/swz.umd.js` | UMD (CDN global `swz`) |
| `dist/swz.css` | Compiled CSS |
| `dist/types/` | `.d.ts` declarations |

## License

MIT
