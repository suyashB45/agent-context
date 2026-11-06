export const docPages = {
  overview: { title: 'Keep your agents on the same page.', subtitle: 'Start a local instance, connect your coding tools, and make every handoff useful.' },
  quickstart: { title: 'Your first shared workspace.', subtitle: 'Download, install, and open the local dashboard.' },
  clients: { title: 'Connect your coding agents.', subtitle: 'Use the same project ID and database across clients.' },
  compatibility: { title: 'Choose your agent, system, and model.', subtitle: 'Understand MCP requirements, local models, shared connections, and what has been verified.' },
  team: { title: 'One team. One shared context.', subtitle: 'Connect over the same Wi-Fi, a private VPN, an SSH tunnel, or an HTTPS server.' },
  'self-hosting': { title: 'Run it on your terms.', subtitle: 'Understand credentials, storage, backups, and the instance trust boundary.' },
  troubleshooting: { title: 'Get back to building.', subtitle: 'Resolve installation paths, tokens, network errors, client setup, and website deployment.' },
  contributing: { title: 'Build it with us.', subtitle: 'Read the source, run the checks, and propose focused improvements.' },
};
export const docs = Object.entries(docPages).map(([id, page]) => ({ id, ...page, href: id === 'overview' ? '/docs/' : `/docs/${id}/` }));
