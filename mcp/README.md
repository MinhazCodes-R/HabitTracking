# Habit Tracker MCP server

An [MCP](https://modelcontextprotocol.io/) server that exposes the habit tracker's Supabase data
as tools, so an assistant can read and update your habits, groups, journal and workouts in the
same database the web app uses.

## Authentication

The server signs in **as you**, with the same anon key the web app uses — not a service-role key.
Every query therefore goes through Supabase row-level security and can only ever touch your own
rows. A bad tool call cannot reach another user's data, and the credentials on disk are worth no
more than your own login.

`SUPABASE_URL` / `SUPABASE_ANON_KEY` fall back to `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
in the repo-root `.env`, so in practice you only need to supply your login.

## Setup

```bash
cd mcp
npm install
cp .env.example .env   # then fill in HABIT_EMAIL / HABIT_PASSWORD
```

Check it starts:

```bash
npm start
```

It should print `habit-tracker MCP server ready` to stderr and then wait — that is a stdio server
holding the connection open. Ctrl-C to exit.

## Registering it

Point your MCP client at the entry file by absolute path. For Claude Code:

```bash
claude mcp add habit-tracker -- /ABSOLUTE/PATH/TO/HabitTracking/mcp/node_modules/.bin/tsx /ABSOLUTE/PATH/TO/HabitTracking/mcp/src/index.ts
```

Or, as JSON config (Claude Desktop's `claude_desktop_config.json`, or any other client):

```json
{
  "mcpServers": {
    "habit-tracker": {
      "command": "/ABSOLUTE/PATH/TO/HabitTracking/mcp/node_modules/.bin/tsx",
      "args": ["/ABSOLUTE/PATH/TO/HabitTracking/mcp/src/index.ts"],
      "env": {
        "HABIT_EMAIL": "you@example.com",
        "HABIT_PASSWORD": "..."
      }
    }
  }
}
```

Credentials can live either in `mcp/.env` or in the client's `env` block. `mcp/.env` is gitignored.

## Tools

### Habits

| Tool | What it does |
| --- | --- |
| `list_habits` | Every habit with its status for a date, including which are in the Habit state |
| `get_habit` | One habit in full: config, today's progress, streak, recent history |
| `create_habit` | Add a habit (boolean, count, duration or quantity) |
| `update_habit` | Change name, goal, unit, category, group, icon, colour, increments |
| `log_habit` | Record progress for a date — `done`, an absolute `value`, or `add` to increment |
| `set_habit_state` | Switch between `daily` and `habit` (always-done) tracking |
| `archive_habit` | Hide a habit, keeping its history |
| `get_habit_history` | Day-by-day values, streak and goal-hit count |
| `get_daily_summary` | One day across all habits — what was done, what was missed |

### Groups

`list_groups`, `create_group`, `update_group`, `delete_group` (with `reassign` or `cascade`).

### Journal

`list_journal_entries` (own entries, or the public feed), `create_journal_entry`,
`delete_journal_entry`. New entries are **private by default** — visibility only goes public when
explicitly asked for, since public entries show up in other people's feeds.

### Workouts

`list_workout_templates`, `create_workout_template`, `log_workout_session` (a finished workout and
all its sets in one call), `get_workout_history`.

## Notes on behaviour

- **Habits are addressable by name.** Every tool taking a `habit`, `group` or `workout` accepts
  either a uuid or a name. An ambiguous name is an error listing the matches rather than a guess.
- **The Habit state is respected.** Habits in the `habit` state are reported as done for every day
  in their window, and `log_habit` refuses to write to them — matching the app, where those habits
  have no check-in button. Switch back to `daily` first if you really want to log one.
- **Auto-complete days are derived, not stored.** History and summaries overlay them using the same
  `src/lib/habitState.ts` helpers the UI uses, so the numbers here always agree with the screens.
- Requires the `supabase-migration-habit-state.sql` migration for the Habit state. Without it the
  server still runs — habits just all read as `daily`.

## Development

```bash
npm run typecheck
```
