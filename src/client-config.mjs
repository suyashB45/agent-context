// Client configuration is independent of the agent's model or provider.
export const CLIENT_PROFILES = [
  { id: 'generic', name: 'Other MCP client', location: 'Merge into your client’s MCP configuration. Adapt the wrapper if required by that client.' },
  { id: 'cursor', name: 'Cursor', location: 'Merge into .cursor/mcp.json in your project, or ~/.cursor/mcp.json.' },
  { id: 'vscode', name: 'VS Code / Copilot', location: 'Merge into .vscode/mcp.json in your project.' },
  { id: 'gemini', name: 'Gemini CLI', location: 'Merge into the mcpServers section of your Gemini settings.json.' },
];

export function clientConfiguration({ client = 'generic', database }) {
  if (!CLIENT_PROFILES.some((profile) => profile.id === client)) throw new Error('Unknown client. Choose generic, cursor, vscode, or gemini.');
  if (typeof database !== 'string' || !database.trim()) throw new Error('A shared database path is required.');
  const server = { command: 'agent-context-mcp', args: ['stdio', '--db', database] };
  return client === 'vscode' ? { servers: { 'agent-context': { type: 'stdio', ...server } } }
    : { mcpServers: { 'agent-context': server } };
}
