---
name: senangwebs-zero
description: Framework-agnostic vanilla TypeScript user onboarding tour library with backdrop highlights, step dialogs, and collision-aware positioning.
version: 0.9.3
package: senangwebs-zero
---

# SenangWebs Zero (SWZ)

## Quick Reference

- **Purpose**: Product tours / onboarding walkthroughs with backdrop cutouts and step dialogs
- **Entry**: ESM, CJS, UMD outputs + TypeScript declarations
- **Dependencies**: none at runtime (zero-dependency hand-rolled positioning engine)
- **Scripts**: `npm run build` (js + css), `npm run build:js` (rollup), `npm run build:css` (sass), `npm run dev` (rollup watch), `npm run lint` (tsc --noEmit), `npm test` (vitest), `npm run prepublishOnly`
- **Types**: `SWZOptions`, `SWZStep`, and `SWZPlacement`

## Workflow

Start in `C:\wamp64\www\sw-libraries\senangwebs-zero`. Read `README.md`, `package.json`, and touched source files. Match existing TypeScript patterns. This is a framework-agnostic TypeScript library — output includes ESM, CJS, UMD, CSS, and `.d.ts` declarations.

## Step Declaration

### DOM Data Attributes
```html
<div data-swz-tour="Step content here"
     data-swz-title="Step Title"
     data-swz-group="groupA"
     data-swz-order="1"
     data-swz-fixed="true"
     data-swz-margin="10"
     data-swz-placement="right">
  Highlight target
</div>
```

| Attribute | Description |
|---|---|
| `data-swz-tour` | Step content; HTML is allowed for trusted/sanitized content |
| `data-swz-title` | Step title (optional) |
| `data-swz-group` | Group name (steps ordered within group) |
| `data-swz-order` | Order within group |
| `data-swz-fixed` | Fixed position element |
| `data-swz-margin` | Cutout margin (px) |
| `data-swz-placement` | Per-step dialog placement: `auto`, `top`, `right`, `bottom`, or `left` |

### JavaScript Step Objects
```js
const steps = [{
  target: '#target-element',
  title: 'Step Title',
  content: 'Step description',
  placement: 'auto' | 'top' | 'right' | 'bottom' | 'left',
  group: 'groupA'
}]
```

## JavaScript API

```js
const tour = new SenangWebsZero({
  steps: [...],
  // 30+ options including:
  autoScroll: true,
  backdropColor: 'rgba(0,0,0,0.7)',
  dialogPlacement: 'auto',
  completeOnFinish: true,
  rememberStep: true,        // localStorage completion persistence
  keyboardControls: true,
  // ... see README for full list
})

tour.start()
tour.visitStep(index)
tour.nextStep()
tour.prevStep()
tour.exit()
tour.finishTour()
tour.isFinished()
tour.deleteFinishedTour()
tour.addSteps([...])
tour.setOptions({...})
tour.refresh()              // re-scan DOM for data attributes
tour.refreshDialog()        // reposition dialog
tour.updatePositions()      // recalculate backdrop cutout
tour.destroy()              // drop state/hooks/timers for GC
```

### Lifecycle Hooks (all support async/Promise; reject = cancel action)
```
onBeforeStepChange()          // called before a transition; no args
onAfterStepChange()           // called after the new step renders; no args
onBeforeExit()                // exit is cancelled when this rejects/returns false
onAfterExit()
onFinish()                    // Finish button, or finishTour(); reject = cancel
```

### Properties
`isVisible`, `activeStep`, `tourSteps`, `dialog`, `backdrop`, `options`, `group`

## Focus Areas

- Backdrop with animated cutout highlights around target elements
- Zero-dependency collision-aware dialog positioning (custom placement/flip/shift engine)
- Per-step placement override via object `placement` or `data-swz-placement`
- Step progress: dots and progress bar
- Group-based tour targeting: multiple tours on same page, isolated
- Lifecycle hooks with gating: reject Promise to cancel action
- localStorage: completion persistence and step memory
- Accessibility: `role="dialog"`, `aria-modal="true"`, focus trapping, `prefers-reduced-motion` support
- Full TypeScript types with declarations output
- Framework-agnostic: works with any JS framework or none

## Implementation Guidance

- Preserve backward compatibility for all method signatures, option names, and hook names
- Lifecycle hook rejection must cleanly cancel the action
- Step-change transitions are guarded: concurrent navigation calls are dropped while one is in flight
- String step targets resolve lazily on every render — never mutate `step.target`
- Test backdrop cutout animation and dialog positioning at edge of viewport
- Verify focus trapping with Tab/Shift+Tab
- TypeScript: run `npm run lint` (tsc --noEmit) after type changes
- Keep `.d.ts` declarations in sync with source

## Validation

```bash
npm run lint       # TypeScript type check
npm test           # vitest (jsdom)
npm run build      # full build (JS + CSS)
npm run prepublishOnly
```
