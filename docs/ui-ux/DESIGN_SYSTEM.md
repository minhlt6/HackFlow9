# HackFlow Enterprise UI Design System & Phase 1 Architecture Report

> **Version:** 2.0.0  
> **Component Architecture:** `shadcn/ui` + `lucide-react` + Tailwind CSS v3.4  
> **Default Theme:** Light Mode (`:root`), with full Dark Mode (`.dark`) support  
> **Target Domain:** B2B / Academic SaaS Hackathon Administration & Operations Platform

---

## Part 1: Phase 1 — Repository Inspection & Compatibility Report

### 1.1 Current Frontend Architecture
- **Build & Runtime:** Vite `8.3.1`, React `19.3.0`, TypeScript `~6.0.2` (`strict`, `verbatimModuleSyntax: true`, `erasableSyntaxOnly: true`, `noUnusedLocals: true`, `noUnusedParameters: true`).
- **Styling Engine:** Tailwind CSS `3.4.19` with PostCSS `8.5.28` and Autoprefixer `10.6.1`. Currently, `tailwind.config.js` has an empty `theme.extend` and no semantic CSS variable tokens.
- **Routing (`src/App.tsx`):** `react-router-dom` `7.18.4` (`createBrowserRouter`) with 4 role portals (`candidate`, `admin`, `judge`, `mentor`), `ProtectedRoute` RBAC guard, and preview routes (`/preview-ui`, `/preview-teams`, `/preview-checkpoints`).
- **State & Data Layer:**
  - `src/store/useAuthStore.ts` & `src/store/useMockStore.ts`: Zustand `5.0.15` persisted stores.
  - `src/api/`: Axios client (`axiosClient.ts`) with Bearer token injection and 401 handling, plus domain modules (`teamsApi.ts`, `checkpointApi.ts`, `profileApi.ts`).
- **Forms & Icons:** `react-hook-form` (`7.90.0`), `zod` (`4.6.7`), `@hookform/resolvers` (`5.9.1`), and `lucide-react` (`1.48.0`) are already installed.
- **UI/UX Pro Max Check:** Inspected workspace and global skill directories (`uipro` CLI, `.gemini`, `.claude`, `.cursor`) — UI/UX Pro Max is not installed on this machine, so this formal Design System specification is generated directly prior to implementation.

### 1.2 Identified Compatibility & Design Risks
1. **Hardcoded Dark Palette & Decorative Styling:** Existing components (`MainLayout.tsx`, `Card.tsx`, `Button.tsx`, `Input.tsx`, `Modal.tsx`) hardcode dark hex values (`#080D18`, `#0B1120`, `#1E293B`, `#334155`), decorative display fonts (`Righteous`), gradient text fills, pill buttons (`rounded-full`), and oversized card radii (`rounded-[16px]`).
2. **Backward Compatibility Across 27 Existing Routes:** Existing candidate, judge, mentor, and admin pages import `Button`, `Badge`, `Card`, `Input`, and `Modal` from `src/components/`. Replacing their prop interfaces would break compilation.
   - **Mitigation:** Establish standard `shadcn/ui` primitives in `src/components/ui/*` and upgrade `src/components/{Button,Badge,Card,Input,Modal}.tsx` as backward-compatible adapters backed by the new design tokens.
3. **Dependency Discipline:** `react`, `lucide-react`, `react-hook-form`, `zod`, `@hookform/resolvers`, `zustand`, and `tailwindcss` are already installed. By implementing `cn()` and `cva()` in `src/lib/utils.ts` using pure TypeScript, we achieve full `shadcn/ui` ergonomics with zero external dependency bloat or React 19 peer dependency conflicts.
4. **Separation of Concerns:** Several existing admin pages (`AdminTeamsPage.tsx`, `AdminApprovalsPage.tsx`) mix API calls, store mutations, filtering logic, and table markup inside a single component file.
   - **Mitigation:** Extract mock data (`src/mocks/adminTeamsMockData.ts`), API client methods (`src/api/adminTeamsApi.ts`), and domain state/filtering logic (`src/hooks/useAdminTeams.ts`) away from UI components.

---

## Part 2: Design System Specification

### 2.1 Design Principles
1. **High Information Density:** Prioritize scannable tabular layouts, compact spacing, crisp 1px structural borders, and tabular numerals (`tabular-nums`) over decorative gradients or oversized cards.
2. **Light Mode First, Dark Mode Ready:** Default to a high-contrast, glare-free Slate & Cobalt Light Mode (`#F8FAFC` background, `#FFFFFF` surface, `#0F172A` text) suitable for daytime administration, with a persistent header toggle for Dark Mode (`.dark`).
3. **Deliberate Visual Hierarchy:** Differentiate primary actions, secondary controls, muted metadata, and semantic status badges with WCAG AA+ contrast ratios ($\ge 4.5:1$ for normal text, $\ge 7:1$ for primary body copy).
4. **Keyboard & Screen-Reader Accessibility:** Every interactive control (sortable table headers, dropdown menus, dialogs, form inputs, pagination) supports keyboard navigation (`Tab`, `Enter`, `Space`, `Escape`, `ArrowUp/Down`) and explicit ARIA attributes (`aria-sort`, `aria-invalid`, `aria-expanded`, `role="dialog"`).

### 2.2 Color Tokens (CSS Variables & Semantic Scales)

| Token Name | Light Mode (Default `:root`) | Dark Mode (`.dark`) | Usage |
| :--- | :--- | :--- | :--- |
| `--background` | `210 40% 98%` (`#F8FAFC`) | `222 47% 6%` (`#080D18`) | App canvas background |
| `--foreground` | `222 47% 11%` (`#0F172A`) | `210 40% 98%` (`#F8FAFC`) | Primary body & heading text |
| `--card` | `0 0% 100%` (`#FFFFFF`) | `222 47% 10%` (`#0E1726`) | Surface containers, tables, panels |
| `--card-foreground` | `222 47% 11%` (`#0F172A`) | `210 40% 98%` (`#F8FAFC`) | Text inside cards and tables |
| `--popover` | `0 0% 100%` (`#FFFFFF`) | `222 47% 11%` (`#0F172A`) | Dropdowns, modals, popovers |
| `--primary` | `239 84% 60%` (`#4F46E5`) | `239 84% 67%` (`#6366F1`) | Primary brand CTA, active indicator |
| `--primary-foreground` | `0 0% 100%` (`#FFFFFF`) | `0 0% 100%` (`#FFFFFF`) | Text on primary buttons |
| `--secondary` | `210 40% 96.1%` (`#F1F5F9`) | `217 33% 17%` (`#1E293B`) | Secondary buttons, filter chips |
| `--secondary-foreground` | `222 47% 11%` (`#0F172A`) | `210 40% 96%` (`#F1F5F9`) | Text on secondary surfaces |
| `--muted` | `210 40% 96.1%` (`#F1F5F9`) | `217 33% 15%` (`#172033`) | Table header bg, skeleton base |
| `--muted-foreground` | `215 16% 42%` (`#59677A`) | `215 20% 65%` (`#94A3B8`) | Secondary labels, captions, helper text |
| `--accent` | `210 40% 94%` (`#E2E8F0`) | `217 33% 18%` (`#1E293B`) | Hover states for rows and menu items |
| `--destructive` | `347 77% 50%` (`#E11D48`) | `347 77% 56%` (`#F43F5E`) | Danger actions, error borders |
| `--success` | `160 84% 39%` (`#10B981` / `#059669`) | `160 84% 45%` (`#34D399`) | Approved status, positive confirmation |
| `--warning` | `38 92% 50%` (`#D97706`) | `38 92% 55%` (`#FBBF24`) | Pending status, quota alerts |
| `--border` | `214 32% 89%` (`#DCE3EC`) | `217 33% 18%` (`#1E293B`) | Hairline structural borders |
| `--input` | `214 32% 86%` (`#CBD5E1`) | `217 33% 22%` (`#263449`) | Form control borders |
| `--ring` | `239 84% 60%` (`#4F46E5`) | `239 84% 67%` (`#6366F1`) | Keyboard focus ring (`ring-2`) |

### 2.3 Typography Scale
- **Font Families:**
  - `--font-sans`: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
  - `--font-mono`: `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
- **Hierarchy:**
  - **Page Title (`h1`):** `text-xl sm:text-2xl font-semibold tracking-tight text-foreground` (`20px–24px`, line-height `1.25`)
  - **Section / Dialog Title (`h2`/`h3`):** `text-base font-semibold tracking-tight text-foreground` (`16px`, line-height `1.4`)
  - **Card / Table Header:** `text-xs font-semibold uppercase tracking-wider text-muted-foreground` (`12px`)
  - **Body / Table Cell:** `text-sm text-foreground` (`14px`, line-height `1.5`)
  - **Secondary / Helper / Caption:** `text-xs text-muted-foreground` (`12px`, line-height `1.4`)
  - **Technical Identifiers (SHA, Invite Code, ID):** `font-mono text-xs tabular-nums`

### 2.4 Spacing, Radii, Borders & Elevation
- **Radius Tokens:**
  - `--radius`: `0.5rem` (`8px`) — Cards, dialogs, table containers (`rounded-lg`)
  - `calc(var(--radius) - 2px)` (`6px`) — Buttons, inputs, select triggers, dropdown items (`rounded-md`)
  - `calc(var(--radius) - 4px)` (`4px`) — Badges, code pills, checkboxes (`rounded`)
- **Spacing Rhythm:**
  - Shell sidebar width: `256px` (`w-64`) expanded, `64px` (`w-16`) collapsed.
  - Top navigation height: `56px` (`h-14`).
  - Content padding: `p-4 sm:p-6 lg:p-8` with `max-w-[1440px] mx-auto space-y-6`.
  - Table cell density: `px-4 py-3` standard (`px-3 py-2` compact).
- **Shadows:**
  - Cards & Tables: `shadow-xs` (`0 1px 2px 0 rgb(15 23 42 / 0.04)`) with `1px solid hsl(var(--border))`.
  - Dropdowns & Popovers: `shadow-md` (`0 4px 12px -2px rgb(15 23 42 / 0.08)`).
  - Modals / Dialogs: `shadow-xl` with backdrop `bg-slate-950/50 backdrop-blur-[2px]`.

### 2.5 Interaction States
- **Focus-Visible:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background`
- **Disabled:** `disabled:pointer-events-none disabled:opacity-50`
- **Loading:** Inline `<Loader2 className="h-4 w-4 animate-spin" />` with `aria-busy="true"` and disabled button state.
- **Table Row Hover & Selection:** `hover:bg-muted/60 data-[state=selected]:bg-primary/5 transition-colors`.
