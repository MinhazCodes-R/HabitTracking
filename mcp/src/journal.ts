import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getSession, unwrap } from './client.js';
import { json, text } from './shared.js';

const FIELDS = 'id, user_id, body, created_at, parent_id, visibility';

export function registerJournalTools(server: McpServer) {
  server.registerTool(
    'list_journal_entries',
    {
      title: 'List journal entries',
      description:
        "Journal posts. Scope \"mine\" is the user's own entries; \"feed\" also includes other " +
        "people's public posts, the same as the in-app feed.",
      inputSchema: {
        scope: z.enum(['mine', 'feed']).optional().describe('Default "mine".'),
        limit: z.number().int().min(1).max(100).optional().describe('Default 25.'),
        parent_id: z.string().optional().describe('Fetch replies to this post instead of top-level posts.'),
      },
    },
    async ({ scope, limit, parent_id }) => {
      const { db, user } = await getSession();
      let query = db.from('journal_entries').select(FIELDS).order('created_at', { ascending: false }).limit(limit ?? 25);

      query = parent_id ? query.eq('parent_id', parent_id) : query.is('parent_id', null);
      query = scope === 'feed' ? query.or(`visibility.eq.public,user_id.eq.${user.id}`) : query.eq('user_id', user.id);

      const rows = unwrap(await query) as { user_id: string }[];
      return json({
        entries: rows.map(r => ({ ...r, mine: r.user_id === user.id })),
      });
    },
  );

  server.registerTool(
    'create_journal_entry',
    {
      title: 'Write a journal entry',
      description:
        'Post a journal entry. Private by default — only pass visibility "public" when the user ' +
        'has actually asked to share it, since public entries appear in other people\'s feeds.',
      inputSchema: {
        body: z.string().min(1),
        visibility: z.enum(['private', 'public']).optional().describe('Default "private".'),
        parent_id: z.string().optional().describe('Reply to this post.'),
      },
    },
    async ({ body, visibility, parent_id }) => {
      const { db, user } = await getSession();
      const row = unwrap(
        await db
          .from('journal_entries')
          .insert({
            user_id: user.id,
            body,
            visibility: visibility ?? 'private',
            parent_id: parent_id ?? null,
          })
          .select(FIELDS)
          .single(),
      );
      return json({ created: row });
    },
  );

  server.registerTool(
    'delete_journal_entry',
    {
      title: 'Delete a journal entry',
      description: 'Permanently delete one of the user\'s own journal entries.',
      inputSchema: { entry_id: z.string() },
    },
    async ({ entry_id }) => {
      const { db, user } = await getSession();
      const deleted = unwrap(
        await db.from('journal_entries').delete().eq('id', entry_id).eq('user_id', user.id).select('id'),
      );
      if (deleted.length === 0) throw new Error(`No journal entry ${entry_id} belonging to you.`);
      return text(`Deleted journal entry ${entry_id}.`);
    },
  );
}
