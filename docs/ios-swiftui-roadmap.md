# SwiftUI Migration Roadmap for HabitTracking

## 1) Current Architecture Breakdown

### Technology/runtime
- Frontend is a React SPA bootstrapped with Vite (`createRoot` in `src/main.tsx`).
- Routing uses `react-router` with explicit path-to-screen mapping in `src/app/routes.ts`.
- Authentication and session lifecycle are centralized in `AuthContext`.
- Data persistence uses Supabase (Auth + Postgres tables via `@supabase/supabase-js`).

### Feature modules and responsibilities
- **Auth**: email/password login, signup, Google OAuth, logout.
- **Habit lifecycle**: create, list, reorder, update, archive habits.
- **Progress logging**: per-day progress upsert in `habit_logs`.
- **Habit detail analytics**: streak + 12-week heatmap + quick-add editing.
- **Calendar**: month matrix with category filtering and day detail.
- **Analytics**: 7-day completion trend + active habits + per-habit completion bars.
- **Profile**: user metadata display, local toggles, feedback submission.

### State management approach
- Global auth state uses React context (`AuthProvider`) with local state for `user`, `session`, `loading`.
- Domain state for habits is encapsulated in custom hook `useHabits`:
  - fetch habits + today's logs
  - optimistic updates for habit updates and logging
  - fire-and-forget writes (`.then()` without explicit error propagation in several calls)
- Each screen stores local UI state (form fields, picker visibility, selected dates, etc.) with `useState`.
- Side effects are done with `useEffect` and callbacks/memos where needed.

### API/backend interaction model
- Supabase client initialized from env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Auth calls:
  - `signInWithPassword`, `signUp`, `signInWithOAuth`, `signOut`, `getSession`, `onAuthStateChange`.
- Data calls:
  - `habits` table: select/insert/update/order/filter by `user_id`, `archived`.
  - `habit_logs` table: select + upsert conflict key (`habit_id,date`).
  - `feedback` table: insert feedback from profile.

### Core user flows (as implemented)
1. **User authentication**
   - Launch → Login (`/`) or Signup (`/signup`) → success navigates to `/home`.
   - Google OAuth redirect points to `/home`.
2. **Daily tracking flow**
   - Home lists active habits with current day progress.
   - User taps Complete or quick +increment from card.
   - User can drag-reorder cards; order persists via `position` updates.
3. **Habit configuration flow**
   - FAB on Home opens Create Habit.
   - User chooses icon, color, category, frequency, metric type, goal, increments.
4. **Habit deep-dive flow**
   - Tap card to open Habit Detail.
   - User edits name/category/icon/color/increments, logs progress, checks streak/heatmap, archives habit.
5. **Historical/summary flow**
   - Calendar screen shows month completion and per-day habit values.
   - Analytics screen shows 7-day bars, average completion, and per-habit completion.
6. **Account/support flow**
   - Profile shows identity, logout, local toggles, and feedback submission.

---

## 2) Screen Mapping to Native iOS

### Existing screens → SwiftUI equivalents
- `/` LoginScreen → `LoginView`
- `/signup` SignupScreen → `SignupView`
- `/home` HomeScreen → `HomeView`
- `/create-habit` CreateHabitScreen → `CreateHabitView` (modal sheet)
- `/habit/:id` HabitDetailScreen → `HabitDetailView`
- `/calendar` CalendarScreen → `CalendarView`
- `/analytics` AnalyticsScreen → `AnalyticsView`
- `/profile` ProfileScreen → `ProfileView`

### Navigation model translation
- Web bottom nav → iOS `TabView` with tabs: Home, Calendar, Analytics, Profile.
- Push detail navigation:
  - Home list item → `NavigationStack` push to `HabitDetailView`.
- Modal presentation:
  - Create Habit should be presented as `.sheet` from Home (instead of route-style full page).
- Auth gate:
  - Root coordinator toggles between `AuthFlowView` (Login/Signup stack) and `MainTabView` (authenticated app).

### Recommended iOS nav hierarchy
- `AppRootView`
  - if unauthenticated: `NavigationStack { LoginView / SignupView }`
  - if authenticated: `TabView`
    - `NavigationStack { HomeView }`
    - `NavigationStack { CalendarView }`
    - `NavigationStack { AnalyticsView }`
    - `NavigationStack { ProfileView }`

---

## 3) Component & Hook Translation Strategy

### React component → SwiftUI view patterns
- Screen components become top-level `View` structs.
- Shared UI pieces (`HabitCard`, `BottomNav`, `CalendarHeatmap`) become reusable SwiftUI subviews.
- Tailwind utility styling becomes:
  - `Color` assets + semantic theme tokens
  - reusable `ViewModifier`s for cards, pills, rounded buttons
  - typography via custom text styles.

### Hook mapping guide
- `useState` → `@State` (view-local), `@Published` in `ObservableObject` (shared).
- `useEffect` → `.task`, `.onAppear`, `.onChange`.
- `useMemo` → computed properties; cache only when needed.
- `useCallback` → plain methods on view model/service (no identity issues like React).
- Context (`useAuth`) → `@EnvironmentObject AuthStore`.
- `useHabits` custom hook → `HabitsStore: ObservableObject`.

### Concrete migration of current custom hooks
- `AuthContext` responsibilities move to `AuthStore`:
  - bootstrap session on launch
  - subscribe to auth state changes
  - expose login/signup/google/logout async functions
- `useHabits` responsibilities move to `HabitsStore`:
  - `@Published habits`, `isLoading`
  - methods: `fetchHabits`, `createHabit`, `updateHabit`, `reorderHabits`, `logProgress`, `getHabitLogs`, `archiveHabit`
  - preserve optimistic updates but add centralized error handling.

### Interaction translation notes
- Drag-reorder (`react-dnd`) → native `.onMove` in `List` or custom `DragGesture` if card-grid style retained.
- Calendar heatmap grid → `LazyHGrid`/`LazyVGrid`.
- Toast/banner feedback (if added) → `Alert`, `confirmationDialog`, or overlay banner view.

---

## 4) Step-by-Step Migration Plan (Ordered Phases)

### Phase 0 — Discovery & parity spec
1. Freeze web feature inventory and data contracts.
2. Export/design a UI parity matrix (web vs iOS expected behavior).
3. Document Supabase schema assumptions (`habits`, `habit_logs`, `feedback`).

**Dependency:** none.  
**Deliverable:** migration spec + acceptance criteria.

### Phase 1 — iOS app foundation
1. Create SwiftUI iOS project.
2. Add Supabase Swift SDK and secure config loading.
3. Build theme system (colors/spacing/text styles).
4. Define core models (`Habit`, `HabitLog`, `UserProfile`, DTOs).

**Dependency:** Phase 0.  
**Build first:** architecture skeleton before UI feature work.

### Phase 2 — Auth flow + root navigation
1. Implement `AuthStore` and session bootstrap.
2. Implement Login and Signup views.
3. Implement OAuth handoff (Google) and deep-link return handling.
4. Build root auth gate to switch flows.

**Dependency:** Phase 1.  
**Why early:** everything else requires authenticated `user_id`.

### Phase 3 — Habit domain services + Home MVP
1. Implement repository/service methods for habits/logging.
2. Implement `HabitsStore` with loading + optimistic update behavior.
3. Build Home screen list with progress cards.
4. Add mark-complete and +increment actions.
5. Add create-habit entry point (temporary simple form).

**Dependency:** Phase 2.  
**Build first in feature space:** daily tracking loop.

### Phase 4 — Create Habit + detail editing
1. Build full Create Habit form (icon/color/category/frequency/metric/goals/increments).
2. Build Habit Detail screen with:
   - progress section
   - name/category/icon/color editing
   - increment editing
   - archive action.
3. Implement 12-week heatmap subview.

**Dependency:** Phase 3.

### Phase 5 — Calendar + analytics
1. Calendar month matrix with category filtering.
2. Day detail panel for selected date.
3. Weekly analytics bars + aggregate KPIs + per-habit progress bars.

**Dependency:** Phase 3 data layer, ideally after Phase 4 UI tokens are stable.

### Phase 6 — Profile + support features
1. Profile identity rendering from auth metadata.
2. Logout flow.
3. Feedback form submission (`feedback` table).
4. Decide persistence for local toggles (notifications/dark mode) via `@AppStorage`.

**Dependency:** Phase 2.

### Phase 7 — Hardening
1. Error handling and offline behavior.
2. Loading/empty/error states parity.
3. Instrumentation + crash/analytics tools.
4. Unit tests for stores/services + UI tests for core flows.

**Dependency:** all prior phases.

### Phase 8 — Cutover
1. Beta rollout (TestFlight) with feature parity checklist.
2. Monitor metrics and backend load.
3. Gradual user migration and deprecate web-only assumptions.

---

## 5) Suggested iOS Project Structure

```text
HabitTrackingiOS/
  App/
    HabitTrackingApp.swift
    AppRootView.swift
    AppCoordinator.swift
  Core/
    Theme/
      Colors.swift
      Typography.swift
      ViewModifiers.swift
    Extensions/
    Utilities/
      DateFormatting.swift
  Models/
    Habit.swift
    HabitLog.swift
    FeedbackMessage.swift
    AuthUser.swift
  Services/
    API/
      SupabaseClientProvider.swift
      AuthService.swift
      HabitService.swift
      AnalyticsService.swift
      FeedbackService.swift
    Repositories/
      HabitRepository.swift
  Stores/
    AuthStore.swift
    HabitsStore.swift
    CalendarStore.swift
    AnalyticsStore.swift
    ProfileStore.swift
  Features/
    Auth/
      LoginView.swift
      SignupView.swift
    Home/
      HomeView.swift
      HabitCardView.swift
      CreateHabitView.swift
    HabitDetail/
      HabitDetailView.swift
      CalendarHeatmapView.swift
    Calendar/
      CalendarView.swift
    Analytics/
      AnalyticsView.swift
    Profile/
      ProfileView.swift
  Components/
    CommonButton.swift
    CardContainer.swift
    LoadingView.swift
    EmptyStateView.swift
  Resources/
    Assets.xcassets
    Config.xcconfig
```

### Networking layer design
- Keep a slim `SupabaseClientProvider` (single configured client).
- Wrap raw SDK calls in service protocols (testable via mocks).
- Repository layer composes service calls + mapping logic (DTO → domain).
- Stores call repositories and own published UI state.
- Centralize error mapping to user-facing messages.

---

## 6) Reusable vs Non-Reusable Logic

### Reusable with minimal change
- Backend schema and Supabase project (auth + tables).
- Core domain concepts: habit model fields, log semantics, archive behavior.
- Date key format (`YYYY-MM-DD`) for consistent daily log joins.
- Business formulas:
  - completion percent
  - heatmap normalization
  - streak computation logic.

### Must be rewritten for iOS
- All UI components and styling (Tailwind/React JSX → SwiftUI).
- Routing and navigation behavior (`react-router` → `NavigationStack`/`TabView`/`.sheet`).
- React state hooks/context infrastructure.
- Drag-and-drop implementation (web DnD APIs are not portable).
- Web-specific OAuth redirect handling logic (`window.location.origin`) to iOS URL scheme/universal links.

### Optional shared assets
- If you introduce a shared OpenAPI/spec or typed contract layer, both clients can align on payload expectations.
- Consider extracting business rules into backend SQL/RPC for cross-client consistency where possible.

---

## 7) Risks & Challenges (Practical)

### UI/UX parity risks
- Current app is single-column, mobile-web style; iOS should still adapt to dynamic type, safe areas, and accessibility sizes.
- Web toggles for dark mode/notifications are local-only right now; users may expect real system integration on iOS.
- Modal vs push transitions will change perceived flow unless intentionally matched.

### Data consistency/performance risks
- Several writes in web code are fire-and-forget; iOS should avoid silent failures by tracking task results.
- Reordering currently performs N updates; for larger lists this can cause write amplification—consider batched RPC.
- Calendar/analytics perform month/week range fetches; cache per month/week and avoid duplicate fetches on tab switches.

### Platform-specific constraints
- Google OAuth requires iOS URL callback setup and Supabase redirect configuration.
- Background refresh/push notifications require Apple entitlements and additional backend workflows.
- Offline behavior differs from web; define conflict policy for queued logs when reconnecting.

### Migration execution risks
- Building all screens before stabilizing data layer will cause rework—service/store foundation must come first.
- Feature parity can drift; use a checklist tied to each existing route/screen.

---

## Recommended Build Order (Short Version)
1. Foundation (project + services + models)
2. Auth + root navigation
3. Home tracking loop
4. Create + Detail
5. Calendar + Analytics
6. Profile + feedback
7. QA/perf/offline hardening
8. Beta rollout

