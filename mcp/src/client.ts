import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// mcp/.env wins; the repo-root .env supplies the URL + anon key the web app already uses.
loadEnv({ path: resolve(here, '../.env') });
loadEnv({ path: resolve(here, '../../.env') });

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const email = process.env.HABIT_EMAIL;
const password = process.env.HABIT_PASSWORD;

let client: SupabaseClient | null = null;
let user: User | null = null;
let signIn: Promise<void> | null = null;

/**
 * The signed-in client and user. We authenticate with the anon key as a normal user rather
 * than a service-role key, so every query stays behind row-level security — the server
 * cannot reach rows that aren't yours even if a tool asks it to.
 */
export async function getSession(): Promise<{ db: SupabaseClient; user: User }> {
  if (!url || !anonKey) {
    throw new Error(
      'Missing SUPABASE_URL / SUPABASE_ANON_KEY (or VITE_ equivalents in the repo .env).',
    );
  }
  if (!email || !password) {
    throw new Error('Missing HABIT_EMAIL / HABIT_PASSWORD in the MCP server env.');
  }

  client ??= createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: true },
  });

  // Sign in once and reuse; concurrent tool calls await the same promise.
  signIn ??= (async () => {
    const { data, error } = await client!.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`Supabase sign-in failed: ${error.message}`);
    user = data.user;
  })();

  try {
    await signIn;
  } catch (err) {
    signIn = null; // let the next call retry rather than caching the failure forever
    throw err;
  }

  return { db: client, user: user! };
}

/**
 * Unwrap a PostgREST result, turning its error into a thrown Error. When `error` is null
 * PostgREST always returns data, so the non-null assertion is safe.
 */
export function unwrap<T>({ data, error }: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (error) throw new Error(error.message);
  return data as NonNullable<T>;
}
