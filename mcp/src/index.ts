#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerHabitTools } from './habits.js';
import { registerGroupTools } from './groups.js';
import { registerJournalTools } from './journal.js';
import { registerWorkoutTools } from './workouts.js';

const server = new McpServer({ name: 'habit-tracker', version: '0.1.0' });

registerHabitTools(server);
registerGroupTools(server);
registerJournalTools(server);
registerWorkoutTools(server);

// stdio is the transport: the MCP client spawns this process and talks over stdin/stdout,
// so nothing may be written to stdout except protocol frames.
await server.connect(new StdioServerTransport());
console.error('habit-tracker MCP server ready');
