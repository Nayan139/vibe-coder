# VibeCode Application Redesign Plan

## Goal
Redesign both the landing page and dashboard to feel modern, polished, and easy to use, with clear hierarchy, smoother interactions, and stronger visual consistency.

## Design Direction
- **Style:** clean SaaS aesthetic with soft gradients, elevated cards, and generous spacing.
- **Primary color family:** indigo/violet with cyan accents for actions and highlights.
- **Surface system:** subtle tinted backgrounds with white cards and clear borders for readability.
- **Typography:** strong headline contrast, concise supporting text, and readable body copy.

## Color System (Tailwind Utility Direction)
- **Background:** `slate-950` to `indigo-950` gradient sections on hero, neutral light surfaces for content.
- **Primary actions:** `from-indigo-500 to-cyan-400`.
- **Accent highlights:** `violet-500`, `cyan-400`, `emerald-400`.
- **Text:** `slate-900` on light, `white`/`slate-200` on dark.
- **Borders:** soft `slate-200` or alpha white borders in dark sections.

## Landing Page Redesign Scope
1. Rebuild hero for better first impression:
   - sticky nav with stronger CTA hierarchy.
   - larger headline/subheadline and social proof badges.
   - visual panel that demonstrates AI flow in context.
2. Add richer detail sections:
   - value pillars (speed, control, confidence).
   - step-by-step workflow timeline.
   - use cases with outcomes.
   - trust/social proof stats and final CTA.
3. Improve accessibility and UX:
   - stronger contrast and focus states.
   - consistent spacing and responsive stacking behavior.
   - larger click targets for CTA buttons.

## Dashboard Redesign Scope
1. Fix alignment and layout rhythm:
   - consistent container widths and vertical spacing.
   - balanced top header area with summary metrics.
   - improved search/filters row wrapping on small screens.
2. Improve navigation clarity:
   - cleaner sidebar visual hierarchy and connection status.
   - better collapsed state behavior and button affordances.
3. Improve repository browsing:
   - clearer cards with metadata grouping.
   - better empty/loading states and explanatory text.
   - smoother hover states, transitions, and readability.

## Implementation Files
- `src/app/page.tsx` (landing redesign)
- `src/app/dashboard/layout.tsx` (dashboard shell alignment)
- `src/app/dashboard/sidebar.tsx` (sidebar revamp)
- `src/app/dashboard/dashboard-client.tsx` (content alignment and UX polish)
- `src/components/RepoCard.tsx` (card improvements)
- `src/components/ConnectGitCard.tsx` (empty state redesign)
- `src/components/LoadingSkeleton.tsx` (skeleton consistency updates)

## Validation Checklist
- Run lint/type checks and fix any introduced issues.
- Confirm responsive behavior on mobile/tablet/desktop.
- Verify dashboard interactions: account switch, search, refresh, repo navigation.
- Confirm visual consistency between landing, dashboard, and shared components.
