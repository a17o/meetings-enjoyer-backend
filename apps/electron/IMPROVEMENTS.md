# Final Improvements Implementation

## Changes Being Made

### 1. Window Dimensions
- ✅ Width: 400px → 800px (doubled)
- ✅ Height: 800px → 900px

### 2. Always-On-Top Across Spaces
- [ ] `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })`
- [ ] `setAlwaysOnTop(true, 'screen-saver')`
- [ ] Re-assert on blur/focus

### 3. True Click-Through
- [ ] CSS `pointer-events: none` when collapsed
- [ ] Remove on expand

### 4. Focus Hygiene
- [ ] Never steal focus on show
- [ ] Focus trap in drawer
- [ ] Only focusable when expanded + mouse over

### 5. Re-Dock + HiDPI
- [ ] Listen to display-metrics-changed
- [ ] Respect scaleFactor
- [ ] 12px safe margin for notch

### 6. Security + CSP
- [ ] Strict CSP in index.html
- [ ] Disable devtools in production
- [ ] Sanitize all text rendering

### 7. Panic Stop Wiring
- ✅ Already implemented

### 8. Answer Queue + Stale UX
- ✅ 90s timeout implemented
- ✅ Queue display implemented
- [ ] Add "Re-ask" action placeholder

### 9. Global Shortcuts Lifecycle
- [ ] Proper registration/unregistration
- [ ] Only Alt+Space when collapsed

### 10. Logging + Crash Safety
- ✅ File logging implemented
- [ ] Add try/catch wrappers
- [ ] Renderer crash reload button

### 11. Accessibility
- ✅ prefers-reduced-motion implemented
- [ ] Verify 4.5:1 contrast
- [ ] Add aria-labels

### 12. Mock Server Parity
- ✅ call_status implemented
- ✅ speech_canceled implemented
- ✅ pong with serverTs implemented

## Status
Starting implementation now...
