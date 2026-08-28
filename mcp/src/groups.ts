import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getSession, unwrap } from './client.js';
import { json, resolveGroup, text } from './shared.js';

export function registerGroupTools(server: McpServer) {
  server.registerTool(
    'list_groups',
    {
      title: 'List habit groups',
      description: 'The user-defined groups habits are bucketed into on the Home screen.',
      inputSchema: {},
    },
    async () => {
      const { db, user } = await getSession();
      const groups = unwrap(
        await db.from('habit_groups').select('id, name, icon, color, position').eq('user_id', user.id).order('position'),
      );
      const habits = unwrap(
        await db.from('habits').select('id, name, group_id').eq('user_id', user.id).eq('archived', false),
      ) as { id: string; name: string; group_id: string | null }[];

      return json({
        groups: (groups as { id: string; name: string }[]).map(g => ({
          ...g,
          habits: habits.filter(h => h.group_id === g.id).map(h => h.name),
        })),
        ungrouped: habits.filter(h => h.group_id === null).map(h => h.name),
      });
    },
  );

  server.registerTool(
    'create_group',
    {
      title: 'Create a habit group',
      description: 'Add a new group. Habits are moved into it with update_habit.',
      inputSchema: {
        name: z.string().min(1),
        icon: z.string().optional(),
        color: z.string().optional().describe('Hex, e.g. #22c55e.'),
      },
    },
    async ({ name, icon, color }) => {
      const { db, user } = await getSession();
      const count = unwrap(await db.from('habit_groups').select('id').eq('user_id', user.id)).length;
      const row = unwrap(
        await db
          .from('habit_groups')
          .insert({ user_id: user.id, name: name.trim(), icon: icon ?? null, color: color ?? null, position: count })
          .select('id, name, icon, color, position')
          .single(),
      );
      return json({ created: row });
    },
  );

  server.registerTool(
    'update_group',
    {
      title: 'Update a habit group',
      description: 'Rename a group or change its icon/colour.',
      inputSchema: {
        group: z.string().describe('Group name or id.'),
        name: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
      },
    },
    async ({ group: ref, ...fields }) => {
      const { db, user } = await getSession();
      const group = await resolveGroup(db, user, ref);
      const updates = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
      if (Object.keys(updates).length === 0) return text('Nothing to update.');

      const row = unwrap(
        await db.from('habit_groups').update(updates).eq('id', group.id).select('id, name, icon, color, position').single(),
      );
      return json({ updated: row });
    },
  );

  server.registerTool(
    'delete_group',
    {
      title: 'Delete a habit group',
      description:
        'Delete a group. By default its habits fall back to Ungrouped; pass mode "cascade" to ' +
        'archive them along with the group.',
      inputSchema: {
        group: z.string().describe('Group name or id.'),
        mode: z.enum(['reassign', 'cascade']).optional().describe('Default "reassign".'),
      },
    },
    async ({ group: ref, mode }) => {
      const { db, user } = await getSession();
      const group = await resolveGroup(db, user, ref);

      if (mode === 'cascade') {
        unwrap(await db.from('habits').update({ archived: true }).eq('group_id', group.id).eq('user_id', user.id).select('id'));
      }
      unwrap(await db.from('habit_groups').delete().eq('id', group.id).select('id'));

      return text(
        mode === 'cascade'
          ? `Deleted "${group.name}" and archived its habits.`
          : `Deleted "${group.name}". Its habits are now Ungrouped.`,
      );
    },
  );
}
