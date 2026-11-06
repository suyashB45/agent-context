import config from '../config.json';
import { releaseBasename } from '../../src/release-files.mjs';

const cli = config.cliName || 'agent-context';
const archive = releaseBasename(config.packageName, config.version);
const github = config.repositoryUrl || 'https://github.com/suyashB45/agent-context';
const docs = `${github}/tree/main/docs`;
const npmUrl = `https://www.npmjs.com/package/${config.packageName}`;

export const landingMeta = {
  title: 'Agent Context — Shared memory for your coding agents',
  description:
    'Shared project memory and task handoffs for MCP-compatible coding agents. Local-first, self-hosted, MIT licensed, with a React dashboard and local SQLite storage.',
  ogTitle: 'Agent Context — Shared memory for your coding agents',
  ogDescription:
    'One agent records the work; the next reads the context before continuing. Open-source project memory for MCP-compatible coding agents.',
  themeColor: '#05070b',
};

export const uiText = {
  terminalLabel: 'TERMINAL',
  setupGuide: 'Setup guide',
  mainNavigation: 'Main navigation',
  mobileNavigation: 'Mobile navigation',
  installationMethod: 'Installation method',
  mcpClient: 'MCP client',
  instructionsLabel: 'AGENT_INSTRUCTIONS',
  dashboardTabs: 'Dashboard preview tabs',
  dashboardMark: 'ac',
  dashboardProject: 'launchpad / shared context',
  localInstance: 'Local instance',
  currentLimits: 'Current limits',
  skip: 'Skip to content',
  menu: 'Open menu',
  closeMenu: 'Close menu',
  themeLight: 'Switch to light mode',
  themeDark: 'Switch to dark mode',
  copy: 'Copy',
  copied: 'Copied',
  copyFailed: 'Copy failed — select the command manually',
  copiedToast: 'Copied to clipboard',
  terminalTitle: 'launchpad / shared context',
  terminalAria: 'Example terminal showing Agent A recording a handoff and Agent B reading it',
  terminalSummary:
    'Agent A records a handoff. Agent B reads the project context, sees the decisions and test report, then claims the next task.',
  exampleData: 'Example data',
  dashboardUrl: 'http://127.0.0.1:8765/dashboard',
  recommendedFor: 'Recommended for',
};

export const siteBrand = {
  name: 'Agent Context',
  wordmark: { lead: 'agent', thin: 'context' },
  version: config.version,
  releaseLabel: `v${config.version} · early release`,
  tagline:
    'Shared project memory and task handoffs for MCP-compatible coding agents.',
};

export const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Connect', href: '#connect' },
  { label: 'Team', href: '#team' },
  { label: 'Docs', href: '/docs/', external: false },
];

export const headerActions = {
  github: { label: 'View on GitHub', href: github },
  getStarted: { label: 'Get started', href: '#quickstart' },
};

export const heroContent = {
  pill: siteBrand.releaseLabel,
  title: {
    line1: 'Shared memory for',
    line2: 'your coding agents',
  },
  description: siteBrand.tagline,
  primary: { label: 'Get started', href: '#quickstart' },
  secondary: { label: 'View on GitHub', href: github },
  badges: ['MCP compatible', 'Local-first', 'MIT license', 'SQLite'],
  footnote: 'Node.js 24+ and npm required. No Python, cloud model or model API key.',
  install: { command: `npm install -g ${config.packageName}`, label: 'Install from npm', href: npmUrl },
  bridge: {
    title: 'A shared thread between sessions',
    project: 'project / launchpad',
    label: 'Illustrative agent handoff using a shared local project record',
    coreTitle: 'Agent Context',
    coreLabel: 'Shared project memory',
    coreTags: ['Context', 'Decisions', 'Handoffs'],
    storage: 'Your computer or team server · SQLite',
    console: 'Handoff activity',
    agents: [
      { id: 'A', label: 'Agent A', role: 'Finishing a session', command: 'record_update', state: 'Handoff recorded', items: ['Decisions and changed files', 'Test results and next steps'] },
      { id: 'B', label: 'Agent B', role: 'Starting the next session', command: 'get_context', state: 'Context available', items: ['Read project memory', 'Claim the next task'] },
    ],
    clientLabel: 'Connect the tools you already use',
    clients: ['Claude Code', 'Codex', 'Cursor', 'VS Code / Copilot', 'Gemini CLI', 'Other MCP clients'],
  },
  terminal: {
    windowTitle: 'launchpad / shared context',
    protocol: 'stdio + Streamable HTTP',
    lines: [
      { tone: 'cmd', text: '$ agent-context' },
      { tone: 'meta', text: 'local service ready · 127.0.0.1:8765' },
      { tone: 'agent', text: 'agent-a  record_update(kind="handoff")' },
      { tone: 'ok', text: 'handoff saved · decisions, files, test report' },
      { tone: 'agent', text: 'agent-b  get_context(project_id="launchpad")' },
      { tone: 'ok', text: 'context loaded · next step: connect login screen' },
      { tone: 'agent', text: 'agent-b  claim_task(expected_version)' },
      { tone: 'ok', text: 'task claimed · renew the lease before it expires' },
    ],
    agents: [
      { id: 'A', name: 'Agent A', state: 'Recorded handoff' },
      { id: 'B', name: 'Agent B', state: 'Reading context' },
    ],
    footnote: 'The next session starts where the last one stopped.',
  },
};

export const problemContent = {
  overline: 'The handoff problem',
  title: 'Context dies between sessions.',
  accent: 'Shared memory keeps it alive.',
  description:
    'A new session should not mean starting over. Agent Context gives every agent one place to read what happened and write what comes next.',
  without: {
    label: 'Without shared context',
    items: [
      'Agents lose project context between sessions.',
      'The same task gets picked up twice.',
      'Decisions and test results disappear in chat history.',
      'Nobody knows what is actually done.',
    ],
  },
  with: {
    label: 'With Agent Context',
    items: [
      'Shared project context persists between sessions.',
      'Tasks are claimed with expiring leases.',
      'Decisions, test reports and handoffs are recorded.',
      'The next agent reads before continuing.',
    ],
  },
};

export const howItWorksContent = {
  overline: 'How it works',
  title: 'A loop your agents can follow.',
  accent: 'Read, claim, record, hand off.',
  description:
    'Every session follows the same pattern. The server keeps the record; your agents keep building.',
  steps: [
    {
      number: '01',
      icon: 'book',
      title: 'Read context',
      description:
        'Load project memory, decisions, file references and recent test reports before touching code.',
      command: 'get_context(project_id)',
    },
    {
      number: '02',
      icon: 'key',
      title: 'Claim a task',
      description:
        'Take a task with an expiring lease, an optimistic version check and a safe retry ID.',
      command: 'claim_task(expected_version)',
    },
    {
      number: '03',
      icon: 'pen',
      title: 'Record progress and decisions',
      description:
        'Write down what changed, what you verified, and why the choice was made.',
      command: 'record_update(...)',
    },
    {
      number: '04',
      icon: 'handoff',
      title: 'Handoff and release',
      description:
        'Leave an exact next step, then complete or release the task for the next session.',
      command: 'record_update(kind="handoff")',
    },
  ],
};

export const featuresContent = {
  overline: 'Features',
  title: 'Everything the next agent needs to know.',
  accent: 'Nothing it has to guess.',
  description:
    'A focused tool for keeping project state, task ownership and engineering decisions together.',
  items: [
    {
      icon: 'database',
      title: 'Persistent project context',
      description:
        'Architecture, decisions, test reports and handoffs stay attached to the project, not a single conversation.',
    },
    {
      icon: 'ticket',
      title: 'Task leases',
      description:
        'Task claims use expiring leases, optimistic versions and safe retry IDs so work has a clear owner.',
    },
    {
      icon: 'search',
      title: 'Searchable history',
      description:
        'Paginated history and literal search make past decisions and handoffs findable when they matter.',
    },
    {
      icon: 'dashboard',
      title: 'React dashboard',
      description:
        'Projects, tasks, agents, activity and connection setup in one local workspace.',
    },
    {
      icon: 'shield',
      title: 'Backups and integrity checks',
      description:
        'Consistent backups and integrity checks help protect the project record as it grows.',
    },
    {
      icon: 'sqlite',
      title: 'Local SQLite',
      description:
        'Storage runs on your own computer or team server. No cloud model or model API key is required.',
    },
  ],
};

export const quickStartContent = {
  overline: 'Quick start',
  title: 'Start local. Stay in control.',
  accent: 'No cloud account required.',
  description:
    'Agent Context runs on your own computer or a team server. Requires Node.js 24+ and npm.',
  tabs: [
    {
      id: 'package',
      label: 'Downloaded package',
      steps: [
        {
          label: 'Install the package',
          code: `npm install -g ./${archive}.tgz`,
        },
        {
          label: 'Start the server',
          code: cli,
        },
        {
          label: 'Retrieve the access token',
          code: `${cli} token`,
        },
      ],
    },
    {
      id: 'source',
      label: 'From source',
      steps: [
        { label: 'Install dependencies', code: 'npm ci' },
        { label: 'Build the package', code: 'npm run build' },
        { label: 'Start the server', code: 'npm start' },
      ],
    },
  ],
  note: config.npmPublished ? `Available on npm as ${config.packageName}.` : 'npm registry release pending.',
  download: { label: `Download v${config.version} package`, href: `/downloads/${archive}.tgz` },
  registryCommand: config.npmPublished ? `npm install -g ${config.packageName}` : null,
  registryLabel: 'Or install directly from npm',
  registryUrl: npmUrl,
  dashboardLabel: 'Open the local dashboard',
  dashboardHint: 'Paste the access token into the dashboard, then create a project.',
};

export const connectContent = {
  overline: 'Connect your agents',
  title: 'Point every agent at the same memory.',
  accent: 'Same project. Different sessions.',
  description:
    'Generate configuration for your MCP client, then add the shared workflow to the instructions your agent already reads.',
  tabs: [
    {
      id: 'generic',
      label: 'Generic MCP client',
      client: 'generic',
      command: `${cli} config --client generic`,
    },
    {
      id: 'cursor',
      label: 'Cursor',
      client: 'cursor',
      command: `${cli} config --client cursor`,
    },
    {
      id: 'vscode',
      label: 'VS Code / Copilot',
      client: 'vscode',
      command: `${cli} config --client vscode`,
    },
    {
      id: 'gemini',
      label: 'Gemini CLI',
      client: 'gemini',
      command: `${cli} config --client gemini`,
    },
  ],
  configTitle: 'Generate client configuration',
  instructions: {
    title: 'Agent instruction block',
    code: `Use agent-context MCP for project ID "my-project".
Use a unique agent_id for this session.
Read get_context and list_tasks before editing.
Claim a task and renew its lease before it expires.
Record progress, decisions, changed files and exact test results.
Before stopping, record a handoff and complete or release the task.`,
  },
  notes: [
    'Merge the generated entry with existing client settings; the command does not edit files for you.',
    'Use the same project ID across agents and restart existing sessions after changing MCP registration.',
  ],
};

export const dashboardContent = {
  overline: 'Dashboard preview',
  title: 'See the work, not just the latest message.',
  accent: 'Projects, tasks, agents and activity.',
  description:
    'The React dashboard ships with the local server. Inspect project memory, task claims, agents and connection setup in one place.',
  caption: 'Illustrative interface with example data, not a live instance.',
  tabs: [
    {
      id: 'projects',
      label: 'Projects',
      eyebrow: 'Projects',
      title: 'launchpad',
      description: 'Shared context for the current build.',
      kind: 'list',
      rows: [
        { name: 'launchpad', meta: 'launchpad / shared context', status: 'Active' },
        { name: 'developer-kit', meta: 'developer-kit / shared context', status: 'Active' },
      ],
    },
    {
      id: 'tasks',
      label: 'Tasks',
      eyebrow: 'Tasks',
      title: 'Work with a clear owner',
      description: 'Claims, leases and versions are visible before an agent starts.',
      kind: 'list',
      rows: [
        { name: 'Connect login screen', meta: 'agent-b · lease active', status: 'In progress' },
        { name: 'Document session validation', meta: 'agent-a · lease active', status: 'Claimed' },
        { name: 'Review test report', meta: 'unclaimed', status: 'Open' },
      ],
    },
    {
      id: 'agents',
      label: 'Agents',
      eyebrow: 'Agents',
      title: 'Sessions, with self-reported IDs',
      description: 'Review recorded activity and self-reported agent IDs.',
      kind: 'list',
      rows: [
        { name: 'agent-a', meta: 'Claude Code · stdio', status: 'Recording' },
        { name: 'agent-b', meta: 'Codex · Streamable HTTP', status: 'Reading context' },
      ],
    },
    {
      id: 'activity',
      label: 'Activity',
      eyebrow: 'Activity',
      title: 'A searchable trail of changes',
      description: 'Recorded handoffs, claims and decisions stay in the project history.',
      kind: 'list',
      rows: [
        { name: 'Handoff recorded', meta: 'agent-a · launchpad', status: 'handoff' },
        { name: 'Task claimed', meta: 'agent-b · connect login screen', status: 'task' },
        { name: 'Decision recorded', meta: 'agent-a · session validation', status: 'decision' },
      ],
    },
    {
      id: 'connect',
      label: 'Connect agents',
      eyebrow: 'Connect agents',
      title: 'Copy the setup command',
      description: 'Generate a configuration entry for the client you use.',
      kind: 'code',
      code: `${cli} config --client cursor`,
      codeLabel: 'CURSOR · MCP CONFIGURATION',
      note: 'Merge with existing settings. Use the same project ID in every client.',
    },
  ],
};

export const teamContent = {
  overline: 'Team setup',
  title: 'One project. Every computer.',
  accent: 'Connect the way your team already works.',
  description:
    'Run one shared instance. Teammates keep their own agents and models and connect over the network path that fits.',
  methods: [
    {
      icon: 'lan',
      title: 'Same Wi-Fi / LAN',
      recommended: 'one trusted office or home network.',
      description:
        'Connect to the host’s private IP and allow only your team subnet through the firewall.',
      href: '/docs/team/#lan',
    },
    {
      icon: 'vpn',
      title: 'Private VPN',
      recommended: 'teammates working from different locations.',
      description:
        'Use a private encrypted network with a reachable private endpoint and no public port.',
      href: '/docs/team/#vpn',
    },
    {
      icon: 'ssh',
      title: 'SSH tunnel',
      recommended: 'teammates who already have SSH access.',
      description:
        'Forward a local port to the shared server and keep the context service bound to loopback.',
      href: '/docs/team/#ssh',
    },
    {
      icon: 'https',
      title: 'HTTPS server',
      recommended: 'an always-on team endpoint.',
      description:
        'Run on persistent infrastructure with a domain and TLS reverse proxy.',
      href: '/docs/team/#https',
    },
  ],
  warning:
    'Plain LAN HTTP is unencrypted. Prefer a VPN, SSH tunnel or HTTPS for routine team access. SQLite must stay on a local disk — never on a network drive.',
};

export const securityContent = {
  overline: 'Security and limits',
  title: 'Honest limits, clearly stated.',
  accent: 'Know the trust boundary before you connect.',
  description:
    'Agent Context is built for a single trusted user or team per instance. These are the current limits.',
  limits: [
    'Every token holder can read and write every project.',
    'Agent IDs are self-reported.',
    'Claims don’t lock source files.',
    'No individual accounts, OAuth, project permissions or automatic conversation capture.',
  ],
  aside: {
    title: 'Use separate instances for unrelated trust groups.',
    description:
      'The token is the boundary. Keep unrelated teams, clients or projects on separate instances and protect the token like any other credential.',
    link: { label: 'Read SECURITY.md', href: `${github}/blob/main/SECURITY.md` },
  },
};

export const compatibilityContent = {
  overline: 'Compatibility',
  title: 'Bring your MCP client.',
  accent: 'stdio or Streamable HTTP.',
  description:
    'Agent Context works with MCP-compatible coding agents. Configuration examples are not a claim that every client version has been tested.',
  clients: [
    { name: 'Claude Code', icon: 'terminal', meta: 'stdio · Streamable HTTP' },
    { name: 'Codex', icon: 'terminal', meta: 'stdio · Streamable HTTP' },
    { name: 'Cursor', icon: 'terminal', meta: 'stdio · Streamable HTTP' },
    { name: 'VS Code / Copilot', icon: 'terminal', meta: 'MCP client' },
    { name: 'Gemini CLI', icon: 'terminal', meta: 'MCP client' },
    { name: 'Other MCP clients', icon: 'mcp', meta: 'stdio · Streamable HTTP' },
  ],
  note: 'Configuration examples are not a claim that every client version has been tested.',
};

export const roadmapContent = {
  overline: 'Roadmap',
  title: 'What comes next.',
  accent: 'Planned work, openly tracked.',
  description:
    'A short view of the roadmap. Items are placeholders and will be edited as work lands.',
  items: [
    {
      status: 'Now',
      title: 'v0.4.0 early release',
      description:
        'Downloadable package, local dashboard, MCP client setup and team connection guides.',
    },
    {
      status: 'Next',
      title: 'Context retrieval and handoff quality',
      description:
        'Better filtering and richer project summaries as histories grow.',
    },
    {
      status: 'Next',
      title: 'Stale-claim recovery and file-overlap visibility',
      description:
        'Clearer signals when a lease expires or agents edit nearby files.',
    },
    {
      status: 'Later',
      title: 'Restore and fault-injection coverage',
      description:
        'More backup, restore and failure-path tests for operations.',
    },
    {
      status: 'Later',
      title: 'Optional per-client credentials',
      description:
        'Explore scoped credentials with clearly defined permissions.',
    },
  ],
  link: { label: 'View the roadmap on GitHub', href: `${github}/blob/main/ROADMAP.md` },
  note: 'Planned work, not shipped capabilities.',
};

export const finalCtaContent = {
  overline: 'Start a shared thread',
  title: 'Give the next agent a good place to start.',
  description:
    'Install Agent Context locally, connect your MCP client, and make the next handoff the starting point.',
  primary: { label: 'Get started', href: '#quickstart' },
  secondary: { label: 'View on GitHub', href: github },
  note: 'Node.js 24+ · Local-first · MIT license',
};

export const footerContent = {
  tagline:
    'Shared project memory and task handoffs for MCP-compatible coding agents.',
  columns: [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'How it works', href: '#how-it-works' },
        { label: 'Quick start', href: '#quickstart' },
        { label: 'Dashboard preview', href: '#dashboard' },
        { label: 'Team setup', href: '#team' },
      ],
    },
    {
      title: 'Docs',
      links: [
        { label: 'Documentation', href: '/docs/' },
        { label: 'Connect agents', href: '/docs/clients/' },
        { label: 'Compatibility', href: '/docs/compatibility/' },
        { label: 'Self-hosting', href: '/docs/self-hosting/' },
      ],
    },
    {
      title: 'Community',
      links: [
        { label: 'GitHub issues', href: `${github}/issues` },
        { label: 'Contributing', href: `${github}/blob/main/CONTRIBUTING.md` },
      ],
    },
    {
      title: 'Project',
      links: [
        { label: 'Releases', href: `${github}/releases` },
        { label: 'npm package', href: npmUrl },
        { label: 'License', href: '/docs/LICENSE.txt' },
        { label: 'Security', href: `${github}/blob/main/SECURITY.md` },
        { label: 'Roadmap', href: `${github}/blob/main/ROADMAP.md` },
      ],
    },
  ],
  bottom: `Agent Context · v${config.version} · MIT license`,
  bottomNote: 'Self-hosted. Open source. Local-first.',
  creator: config.creatorName,
  profileLinks: config.profileLinks || [],
};

export const externalLinks = {
  github,
  docs,
};
