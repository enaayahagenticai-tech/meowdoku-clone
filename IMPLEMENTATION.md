# Meowdoku Clone - Full Game Implementation

Build an exact clone of Meowdoku (cat sudoku puzzle game). The game must:

## CORE RULES
1. Place exactly one cat in each colored region
2. No two cats share same row or column  
3. Cats cannot touch even diagonally (no-corner rule)
4. Tap cycle: empty → X-mark → cat → empty

## IMPLEMENTATION REQUIREMENTS

### Game Logic
- Use the types.ts and generator.ts I created as starting point
- Implement complete solver that validates all solutions
- Hearts system: 3 lives, wrong placement deducts heart
- Undo/Redo functionality
- Win detection (all cats placed correctly)

### Puzzle Generation
- Generate 250+ unique puzzles with varying region shapes
- Normal/Hard/Ultra difficulty (more starting clues = easier)
- Daily puzzle (seeded by date)
- Region shapes should be irregular (not just 3x3 blocks)

### UI/UX
- 9x9 grid with soft pastel colored regions
- Tap once for X-mark, double-tap or tap twice for cat
- Smooth animations (fade in/out, heart pop, cat placement)
- Cat emoji or SVG cat face (simple, cute)
- Hearts display (❤️) at top
- Level selector / progress tracking
- Responsive for mobile + desktop

### Features to ADD (beyond original)
- Cat variety: unlock 20+ cat skins via completion streaks
- Sound effects: cat meow on place, soft chime on solve, heartbeat on wrong
- Achievement badges
- Stats screen (games played, win rate, best times)
- Dark mode toggle

### Tech Stack
- React + TypeScript + Vite
- Tailwind CSS for styling
- Capacitor for APK build
- LocalStorage for save data

### Output
- Web version deployable to GitHub Pages
- Android APK build scripts
- README with install instructions

BUILD THE ENTIRE GAME. Commit to git with descriptive messages. The generator.ts has issues - rewrite it to properly generate puzzles.