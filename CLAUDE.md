# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Two things share one repo:

1. **A Claude Code design-agency template** ("Unicorn Skills") — 113 skills, 27 commands, 5 agents, 2 MCP servers under `.claude/`. This is what `# Project Configuration` (below) documents. Relevant for *design-workflow* tasks.
2. **The FFIE product codebase** — the apps actually being built. Relevant for *engineering* tasks; documented in this section.

`project/brief/` holds the PRD, WBS, and personas (Julien = member, Karim = non-member company, Léa = public); `project/STATE.md` tracks project stage. These drive product decisions referenced throughout the code (e.g. screen comments cite personas).

## Apps & commands

Two independent npm apps, each with its own `node_modules`. There is **no test runner and no ESLint in `mobile/`** — `tsc --noEmit` is the de-facto check; run it before claiming a change is done.

**`mobile/` — the FFIE app (Expo SDK 54, React Native 0.81, React 19, TypeScript strict).**
```bash
cd mobile && npm install          # postinstall runs patch-package (see mobile/patches/)
npm run ios | android | web | start   # each first frees port 8081, then `expo start`
./node_modules/.bin/tsc --noEmit -p tsconfig.json   # typecheck (no test/lint scripts exist)
```
- Expo's API surface changed across versions — **read the versioned docs before writing native/Expo code** (see `mobile/AGENTS.md`).
- Android is **edge-to-edge** (`app.json` → `android.edgeToEdgeEnabled`); rely on `useSafeAreaInsets()` for system-bar clearance. Native config changes (`app.json`) require a rebuild, not a JS reload.

**`design-system-preview/` — Next.js 15 (App Router) token/contrast visualizer, next-intl i18n.**
```bash
cd design-system-preview && npm install
npm run dev | build | start | lint   # `next lint` is the only lint in the repo
```

## Build & release (iOS / TestFlight)

The mobile app ships to TestFlight via **EAS Build** (cloud build + signing — no local Xcode needed). Profiles live in `mobile/eas.json` (`development`, `preview`, `production`; `appVersionSource: "remote"`, so EAS owns the build number, not `app.json`'s `buildNumber`). iOS identity is in `app.json`: `ios.bundleIdentifier` = `fr.ffie.app` (permanent once published — don't change casually), and `extra.eas.projectId` links the Expo project (EAS-managed; `eas init` (re)writes it — don't hand-edit).

```bash
cd mobile
eas build  --platform ios --profile production   # cloud build; prompts Apple login + generates signing
eas submit --platform ios --latest               # upload .ipa to App Store Connect → TestFlight
```

Requires an active Apple Developer Program membership; the App Store Connect record/TestFlight live under whichever Apple team runs the build. `mobile/TESTFLIGHT.md` is the tester-facing "What to Test" copy (both onboarding paths, mocked v1 sign-in, intentional placeholders) — keep it current when flows change. Gate any build on `npx expo-doctor` (must be green) + `tsc --noEmit`.

## Design tokens are the single source of truth

`project/design-system/tokens.ts` is the one design-system file; **never hardcode colors/spacing/radii/motion** — import from it. The `mobile` app aliases it as `@tokens` (configured in *both* `mobile/tsconfig.json` paths and `mobile/babel.config.js` module-resolver — keep them in sync), and `@/*` → `mobile/src/*`.

Shape: `primitives` (radii, motion.duration, sizes), `semantics` (spacing.gutter, density), and `themes` (`light` / `dark` / **`sunlight`** = high-contrast outdoor). Usage is `const t = themes[themeName]` then `t.text.body`, `t.text.muted`, `t.brand.accent`, `t.action.primary.{bg,bgPressed,fg}`, `t.surface.*`, `t.border.*`. `ThemeName` and `DensityMode` are exported types.

## Mobile architecture (the non-obvious parts)

- **`index.ts` installs the global Raleway font (`src/theme/installGlobalFont`) before `registerRootComponent`** — this import MUST stay first. React 19 broke the old `Text.defaultProps` approach, so the global default font is patched in here instead.
- **`App.tsx`** gates on `useFonts`, then nests providers: `SafeAreaProvider → RoleProvider → MembershipProvider → ActiveTabProvider`. It runs onboarding → main, and switches the whole tab set by role.
- **Role / access model** (`src/auth/roleContext.tsx`): 4 roles — `guest-public`, `guest-company`, `member`, `admin` (admin is web-only and a hard fail on mobile). `canAccess(role, access)` is the pure gate; `RequireRole` enforces it. In v1 there is **no real auth** — role is mock state seeded by onboarding and cyclable via the `RoleDebugSwitcher` chip (`ENABLE_ROLE_DEBUG` in `App.tsx`).
- **Navigation is home-rolled** (`src/components/navigation/BottomTabBar.tsx`, tables in `src/navigation/tabs.tsx`): `MEMBER_TABS` vs `GUEST_TABS`. The `tabs / activeKey / onSelect` contract is intentionally react-navigation-compatible so swapping in a real router later is mechanical.
- **Screens are data-driven.** List screens (Library, News, Partners, "Join FFIE") render from `src/data/*.ts` through shared iOS-HIG primitives in `src/components/ui/ios.tsx` (`LargeTitleHeader`, `InsetGroup`, `InsetRow`, `useGroupedColors`). To change list content, edit the data file, not the screen.

## Conventions that bite if you don't know them

- **No fabricated real-world data.** Contact details, dues, document counts come from FFIE. Entries without real data render an explicit "details coming" placeholder rather than invented phone numbers (see `src/data/federations.ts` + `BecomeMemberScreen`). Honor this.
- **Reduced motion is non-negotiable.** Gate every animation on `AccessibilityInfo.isReduceMotionEnabled()` (the `useReducedMotion` pattern) and snap to the end state when it's on. Animating `height` requires `useNativeDriver: false`; transforms/opacity use the native driver.
- **Maps use the native `react-native-maps` module** (`BecomeMemberScreen`): Apple Maps on iOS (no key, works out of the box), Google Maps on Android. `app.json` ships a `REPLACE_WITH_ANDROID_GOOGLE_MAPS_API_KEY` placeholder — Android maps stay blank until a real key is supplied via env/secret (never commit the real key).
- Match the surrounding screen's existing token usage, comment density, and iOS-HIG styling — these files are heavily, deliberately commented.

# Project Configuration

## Skills (113 active — extras in `.claude/skills-archive/`)

### Engineering Quality Skills (4) — code-level quality, snapshotted from upstream
Self-contained, no plugin/network dependency — travel with the repo.
- **emil-design-eng** — Emil Kowalski's animation & UI polish philosophy: animation decision framework (when *not* to animate), motion taste, required Before/After/Why review table format
- **vercel-web-design-guidelines** — terse `file:line` review for Vercel WIG (a11y, focus, forms, animation, typography, performance, hydration, dark mode, i18n, anti-patterns)
- **vercel-react-best-practices** — 70 React/Next.js perf rules across 8 categories (waterfalls, bundle, server perf, re-render, rendering, JS perf, advanced)
- **vercel-react-native-skills** — 36 React Native/Expo rules (FlashList virtualization, Reanimated GPU patterns, Pressable, Expo image, safe areas, monorepo native deps); only triggers on RN/Expo work

### Designer Skills (72) — design, build, deliver
- **Design Research (10)** — personas, empathy maps, journey maps, interviews, usability testing
- **Design Systems (8)** — tokens, components, accessibility, theming, documentation
- **UX Strategy (8)** — competitive analysis, design principles, experience mapping, alignment
- **UI Design (9)** — color systems, typography, layout grids, responsive, dark mode
- **Interaction Design (7)** — micro-interactions, animations, state machines, gestures, error handling
- **Prototyping & Testing (8)** — wireframes, heuristic evaluation, A/B testing, user flows
- **Design Ops (7)** — critique, handoff specs, sprint planning, QA checklists, workflows
- **Designer Toolkit (6)** — rationale, presentations, case studies, UX writing, adoption
- **Figma (7)** — `figma-use` (mandatory prereq), generate-design, implement-design, generate-library, code-connect, create-design-system-rules, create-new-file
- **Frontend Design (1)** — distinctive, production-grade UI code (Anthropic official)
- **shadcn/ui (1)** — Radix UI + Tailwind CSS component patterns

> **Optional visual-style packs** (not bundled): `high-end-visual-design`, `minimalist-ui`, `industrial-brutalist-ui`, `stitch-design-taste`, `design-taste-frontend`, `redesign-existing-projects`. Add to `.claude/skills/` per project if a specific aesthetic direction is needed.

### Inclusive Design Skills (37) — accessibility, inclusion, cognitive a11y
Moderate selection optimized for agency frontend delivery. Niche/specialty skills archived to `.claude/skills-archive/` — restorable via `git mv` when needed.
- **Cognitive Accessibility (7)** — cognitive load, plain language, wayfinding, memory, error recovery, simplify, review
- **Inclusive Interaction (8)** — keyboard nav, gestures, touch targets, motion sensitivity, multi-modal, feedback, design-flow, audit
- **Accessible Content (7)** — alt text, headings, forms, links, structure, readable content, review
- **Inclusive Personas (4)** — generate, disability-inclusive personas, inclusive user stories, scenario map
- **Adaptive Interfaces (6)** — color independence, flexible typography, information density, responsive accessibility, user preferences, specify
- **Accessibility Decisions (5)** — compliance mapping, decision documentation, tradeoff analysis, handoff, review

## Agents (5 — auto-activate)
Just talk naturally. Claude picks the right agent based on your task. **New designers should start by saying hello to Unicorn.**
- **unicorn** — studio lead & project director; greets newcomers, reads PRD/WBS, tracks project stage, routes to the right specialist. Ask it to be **instructor** (explains every step) or **operator** (just runs the workflow).
- **designer-copilot** — senior design partner; hands-on design thinking, reviews, prototype iteration
- **ui-designer** — visual & interaction design specialist
- **design-system-architect** — components, tokens, theming
- **design-reviewer** — QA, heuristics, accessibility checks

Additional specialist agents (ux-strategist, design-researcher, interaction-designer, design-ops-lead) live in `.claude/agents-archive/` if a project needs deeper specialist routing.

### Project layout (used by Unicorn)
- `./project/brief/` — drop the PRD, WBS, and any reference materials here
- `./project/STATE.md` — current project stage, decisions, next step (Unicorn reads & updates)

## Default Skill Routing

When skills overlap, follow these defaults unless the user explicitly asks for a different one:

- **Animation, motion, UI polish, transitions, micro-interactions (implementation/review)** → default to `emil-design-eng`. It has a decision framework (when *not* to animate), specific opinionated values with reasoning, and a required `Before | After | Why` review table format. Other skills (`interaction-design--animation-principles`, `interaction-design--micro-interaction-spec`) are only used when the user explicitly names them or asks for a generic principles primer / formal spec document.
- **Motion accessibility (vestibular safety, prefers-reduced-motion, photosensitivity)** → `inclusive-interaction--motion-sensitivity` always runs alongside Emil for any motion work — it's harm prevention, not taste, and is non-negotiable.
- **Code-level UI review (a11y, forms, hydration, dark mode, anti-patterns)** → `vercel-web-design-guidelines` for the file-by-file checklist pass.
- **React/Next.js performance** → `vercel-react-best-practices`. **React Native/Expo perf** → `vercel-react-native-skills`.
- **Bold aesthetic direction / building a new screen from scratch** → `frontend-design`.

## How Skills Layer Together
Designer skills build the system. Inclusive skills extend it for accessibility. Use together:
1. Design gestures → then design gesture alternatives
2. Build color system → then audit for color independence
3. Create personas → then expand with disability dimensions
4. Define animations → Emil for the motion taste, motion-sensitivity for the safety pass
5. Write component spec → then verify keyboard navigation
6. Create typography scale → then ensure flexible typography
7. Design layouts → then audit responsive accessibility

## How to Use
- Skills load automatically from `.claude/skills/`
- Commands available as slash commands from `.claude/commands/`
- Agents auto-activate from `.claude/agents/`
- MCP servers (Puppeteer, Chrome DevTools) configured in `.mcp.json`
- Run `./setup.sh` on a new machine to install marketplace plugins

## Project Conventions
- Adapt all design outputs to the project's existing stack and conventions
- Prioritize accessibility (WCAG AA minimum) in all design decisions
- Use design tokens over raw values whenever possible
- Design for keyboard, screen reader, and reduced motion from the start
- Include disability as a natural dimension in all personas and user stories
