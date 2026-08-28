# Minimalist Habit Tracking App

A minimalist habit tracker. Set goals, log progress, watch streaks build. Design originated in [Figma](https://www.figma.com/design/tmoVoYRV79YXHpeVnFbpNy/Minimalist-Habit-Tracking-App).

## Tech Stack

### Frontend
- **[React 18](https://react.dev/)** + **[TypeScript](https://www.typescriptlang.org/)** — UI runtime and types
- **[Vite 6](https://vitejs.dev/)** — dev server and bundler
- **[React Router 7](https://reactrouter.com/)** — client-side routing

### Styling & UI
- **[Tailwind CSS 4](https://tailwindcss.com/)** (with `@tailwindcss/vite` and `tw-animate-css`) — utility-first styling
- **[Radix UI](https://www.radix-ui.com/)** — unstyled accessible primitives (dialog, dropdown, popover, tabs, etc.)
- **[lucide-react](https://lucide.dev/)** and **[@mui/icons-material](https://mui.com/material-ui/material-icons/)** — icon sets
- **[motion](https://motion.dev/)** — animations
- **[sonner](https://sonner.emilkowal.ski/)** — toast notifications
- **[vaul](https://vaul.emilkowal.ski/)** — bottom-sheet drawer

### Data & Interaction
- **[Supabase](https://supabase.com/)** (`@supabase/supabase-js`) — auth + Postgres backend, used for `habits` and `habit_logs` tables
- **[react-hook-form](https://react-hook-form.com/)** — form state
- **[react-dnd](https://react-dnd.github.io/react-dnd/)** with the HTML5 backend — drag-to-reorder habits on the home screen
- **[recharts](https://recharts.org/)** — chart primitives
- **[date-fns](https://date-fns.org/)** — date utilities

### Hosting & Analytics
- **[Vercel](https://vercel.com/)** — hosting (`vercel.json`)
- **[@vercel/analytics](https://vercel.com/docs/analytics)** — site analytics

## Project Layout

```
src/
  app/
    App.tsx              # router setup
    AuthContext.tsx      # Supabase session provider
    routes.ts            # route definitions
    components/          # shared components + Radix-based ui/ kit
    screens/             # Home, Calendar, Analytics, HabitDetail, etc.
  hooks/
    useHabits.ts         # CRUD + logging against Supabase
  lib/
    supabase.ts          # Supabase client
    date.ts              # local-date helpers
    habitConfig.ts       # icon + color options
    habitState.ts        # "Habit" state — auto-complete window helpers
  styles/                # tailwind, theme, fonts
```

## Running the code

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

### Habit states

A habit is either **tracked daily** (you tap Complete each day) or in the **Habit** state — one you
have internalised and no longer want to check in on. A habit in the Habit state counts as Done for
every day from `habit_since` onwards, on Home, the calendars and Analytics, with no `habit_logs`
rows written. Switching back to daily tracking clears the window; days logged before `habit_since`
are never rewritten. Set it when creating a habit, or from the habit's detail screen.

Requires the `supabase-migration-habit-state.sql` migration.

## Configuration

A Supabase project is required. Set the following environment variables (e.g. in `.env`):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
