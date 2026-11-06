import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createApi } from './api.js';

const pages = { overview: ['◫', 'Overview'], projects: ['▦', 'Projects'], agents: ['✧', 'Agents'], activity: ['≋', 'Activity'], connect: ['⌘', 'Connect agents'] };
const kinds = ['handoff', 'decision', 'progress', 'blocker', 'test', 'note', 'task_created', 'task_claimed', 'task_updated'];
const symbols = { handoff: '↗', decision: '◇', progress: '↻', blocker: '!', test: '✓', note: '≡', task_created: '+', task_claimed: '◷', task_updated: '✓' };
const label = (text) => text.replaceAll('_', ' ');
const ago = (time) => {
  const date = new Date(time), minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (!Number.isFinite(minutes)) return 'Unknown time';
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

function useResource(api, path, refresh) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  useEffect(() => {
    if (!path) return;
    let current = true;
    setState((old) => ({ ...old, error: '', loading: true }));
    api(path).then((data) => { if (current) setState({ data, error: '', loading: false }); })
      .catch((error) => { if (current) setState((old) => ({ ...old, error: error.message, loading: false })); });
    return () => { current = false; };
  }, [api, path, refresh]);
  return state;
}
function usePaged(api, path, key, cursorKey, refresh, parameter = 'offset') {
  const resource = useResource(api, path, refresh);
  const [extra, setExtra] = useState([]), [next, setNext] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => { generation.current += 1; setExtra([]); setError(''); setNext(resource.data?.[cursorKey] ?? null); }, [resource.data, cursorKey, path]);
  const more = async () => {
    if (busy || next === null) return;
    const current = generation.current;
    setBusy(true); setError('');
    try {
      const separator = path.includes('?') ? '&' : '?';
      const data = await api(`${path}${separator}${parameter}=${next}`);
      if (current === generation.current) { setExtra((old) => [...old, ...data[key]]); setNext(data[cursorKey]); }
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return { ...resource, rows: [...(resource.data?.[key] || []), ...extra], next, more, busy, pageError: error };
}

export function Empty({ title = 'No updates yet', description = 'Updates appear when your agents record their work.', glyph = '✧' }) {
  return <div className="empty-state"><span className="empty-glyph">{glyph}</span><strong>{title}</strong><p>{description}</p></div>;
}
function ErrorMessage({ children }) { return children ? <p className="error" role="alert">{children}</p> : null; }
function Panel({ title, action, children, className = '' }) {
  return <article className={`panel ${className}`}><div className="panel-heading"><h2>{title}</h2>{action}</div>{children}</article>;
}
export function EventList({ items = [], showProject = true, emptyTitle, emptyDescription }) {
  if (!items.length) return <Empty title={emptyTitle} description={emptyDescription} glyph="≋" />;
  return items.map((event) => <article className="event-row" key={event.id}>
    <span className={`event-icon ${event.kind}`}>{symbols[event.kind] || '·'}</span>
    <div className="event-main"><strong>{event.summary}</strong><p className="event-byline">{[event.agent_id, showProject && (event.project_name || event.project_id), label(event.kind)].filter(Boolean).join(' · ')}</p>
      {(event.details || event.files?.length || event.git_ref) ? <details><summary>View details</summary>{event.details && <pre>{event.details}</pre>}{event.files?.length > 0 && <pre>Files: {event.files.join(', ')}</pre>}{event.git_ref && <pre>Git: {event.git_ref}</pre>}</details> : null}
    </div><time className="event-time" dateTime={event.created_at} title={new Date(event.created_at).toLocaleString()}>{ago(event.created_at)}</time>
  </article>);
}
function ProjectRows({ projects, select, selected }) {
  if (!projects.length) return <Empty title="Your next build starts here" description="Create a project, connect an agent, and give your work a shared memory." glyph="▦" />;
  return projects.map((project) => <button className={`project-row${selected === project.id ? ' selected' : ''}`} key={project.id} onClick={() => select(project.id)}><span className="project-avatar">{project.name.slice(0, 2).toUpperCase()}</span><span className="project-meta"><strong>{project.name}</strong><p>{project.id}</p></span><span className="row-arrow">↗</span></button>);
}
function More({ page, children = 'Load more' }) {
  return <><ErrorMessage>{page.pageError}</ErrorMessage>{page.next !== null && <button className="button quiet full" onClick={page.more} disabled={page.busy}>{page.busy ? 'Loading…' : children}</button>}</>;
}
function Heading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{description}</p></div>{action}</div>;
}

function Login({ connect }) {
  const [token, setToken] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await createApi(token.trim())('/api/overview'); connect(token.trim()); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <div className="login-screen"><div className="login-card"><div className="brand-symbol">hf<span>·</span></div><p className="eyebrow">YOUR AGENTS. ONE WORKSPACE.</p><h1>Pick up where<br />the last agent left off.</h1><p className="muted">Connect to your instance to see projects, decisions, and handoffs in one place.</p><form onSubmit={submit}><label htmlFor="access-token">Instance access token</label><input id="access-token" type="password" autoComplete="off" maxLength={512} value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste your access token" /><p className="field-hint">Run handoffra token in your terminal. Leave empty only in local development mode.</p><button className="button primary" disabled={busy}>{busy ? 'Connecting…' : 'Open workspace'}<span>↗</span></button><ErrorMessage>{error}</ErrorMessage></form><div className="login-footer"><span className="dot" />Self-hosted. Your context stays here.</div></div><div className="login-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><div className="art-center">hf<span>·</span></div><span className="art-label label-a">Claude</span><span className="art-label label-b">Codex</span><span className="art-label label-c">Your next agent</span><div className="art-caption">Different agents.<br /><strong>Shared understanding.</strong></div></div></div>;
}

function Overview({ api, refresh, metrics, projects, select, edit }) {
  const recent = useResource(api, '/api/activity', refresh), handoffs = useResource(api, '/api/activity?kind=handoff', refresh);
  const m = metrics || {};
  const stats = [['Projects', m.projects, 'Shared spaces for your work', '▦'], ['Open tasks', m.open_tasks, `${m.completed_tasks || 0} tasks completed`, '◷'], ['Recent updates', m.updates_today, 'Recorded in the last 24 hours', '↗'], ['Contributing agents', m.agents_today, 'Reporting work in the last 24 hours', '✧']];
  return <><Heading eyebrow="A LITTLE CONTEXT GOES A LONG WAY" title="Your workspace, in sync." description="Everything your agents have done. Everything that comes next." action={<button className="button primary" onClick={() => edit('project')}>+ New project</button>} />
    <div className="stats-grid">{stats.map(([title, value, description, symbol]) => <article className="stat-card" key={title}><div className="stat-top">{title}<span>{symbol}</span></div><strong>{value ?? 0}</strong><p>{description}</p></article>)}</div>
    <ErrorMessage>{recent.error || handoffs.error}</ErrorMessage>
    <div className="overview-grid"><Panel title={<>Your projects <span className="count-badge">{m.projects || 0}</span></>} action={<a href="#projects" className="text-link">View all ↗</a>}><ProjectRows projects={projects.slice(0, 4)} select={select} /></Panel><Panel title="Latest handoffs" action={<span className="subtle-label">PASSING THE BATON</span>}><EventList items={handoffs.data?.events.slice(0, 3)} emptyTitle="A fresh start for the next agent" emptyDescription="An agent's handoff will appear here when it finishes a session." /></Panel></div>
    <Panel title="Workspace activity" className="recent-panel" action={<a href="#activity" className="text-link">All activity ↗</a>}><EventList items={recent.data?.events.slice(0, 5)} /></Panel>
    <div className="connect-banner"><div className="banner-icon">⌘</div><div><h3>Great work deserves a good handoff.</h3><p>Connect Claude, Codex, or any MCP-compatible agent to keep your project moving.</p></div><a href="#connect" className="button secondary">Connect an agent ↗</a></div>
  </>;
}

function ProjectDetail({ api, id, refresh, edit }) {
  const encoded = encodeURIComponent(id), context = useResource(api, `/api/projects/${encoded}`, refresh);
  const tasks = usePaged(api, `/api/projects/${encoded}/tasks`, 'tasks', 'next_offset', refresh);
  const [query, setQuery] = useState(''), [search, setSearch] = useState('');
  const results = usePaged(api, search ? `/api/projects/${encoded}/search?q=${encodeURIComponent(search)}` : null, 'events', 'next_before_event_id', refresh, 'before');
  if (!context.data) return <Panel title="Project"><Empty title={context.loading ? 'Loading project…' : 'Project unavailable'} description={context.error || 'Fetching shared context.'} /></Panel>;
  const data = context.data;
  return <div><ErrorMessage>{context.error || tasks.error}</ErrorMessage><article className="panel"><div className="detail-heading"><div><h2>{data.project.name}</h2><span className="tag">{data.project.id}</span>{data.project.description && <p>{data.project.description}</p>}</div></div><div className="detail-actions"><button className="button primary" onClick={() => edit('task', id)}>+ Add task</button><button className="button secondary" onClick={() => edit('handoff', id)}>Write handoff</button><button className="button secondary" onClick={() => edit('decision', id)}>Record decision</button></div><form className="detail-search" onSubmit={(event) => { event.preventDefault(); setSearch(query.trim()); }}><input aria-label="Search project context" required maxLength={200} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this project's context…" /><button className="button secondary">Search</button></form></article>
    {search && <Panel title="Search results" className="detail-section"><ErrorMessage>{results.error}</ErrorMessage><EventList items={results.rows} showProject={false} emptyTitle={results.loading ? 'Searching…' : 'No matching context'} emptyDescription="Try a file path, decision, or phrase from an earlier update." /><More page={results}>Load more results</More></Panel>}
    <Panel title="Tasks" className="detail-section">{tasks.rows.length ? tasks.rows.map((task) => <div className="task-row" key={task.id}><span className="task-check">{task.status === 'completed' ? '✓' : ''}</span><div className="task-body"><strong>{task.title}</strong><p>{task.owner ? `${task.owner} · ${task.lease_active ? 'claimed' : 'claim expired'}` : 'Unassigned'}{task.files.length ? ` · ${task.files.join(', ')}` : ''}</p>{task.description && <p>{task.description}</p>}</div><span className={`tag ${task.status}`}>{label(task.status)}</span></div>) : <Empty title="A clear next step" description="Add a task so an agent can claim work before starting." glyph="◷" />}<More page={tasks}>Load more tasks</More></Panel>
    <Panel title="Latest handoffs" className="detail-section"><EventList items={data.handoffs} showProject={false} emptyTitle="The next agent is listening" emptyDescription="Leave completed work, blockers, and exact next steps." /></Panel>
    <Panel title="Decisions & rationale" className="detail-section"><EventList items={data.decisions} showProject={false} emptyTitle="Keep the why with the work" emptyDescription="Record important choices so the next agent doesn't have to guess." />{(data.decisions_truncated || data.handoffs_truncated) && <a href="#activity" className="button quiet">Explore full history ↗</a>}</Panel>
  </div>;
}

function Projects({ api, refresh, selected, select, edit }) {
  const list = usePaged(api, '/api/projects?limit=100', 'projects', 'next_offset', refresh);
  return <><Heading eyebrow="A HOME FOR EVERY BUILD" title="Projects" description="Give every agent the same starting point." action={<button className="button primary" onClick={() => edit('project')}>+ New project</button>} /><ErrorMessage>{list.error}</ErrorMessage><div className="project-layout"><Panel title="All projects" className="project-selector"><ProjectRows projects={list.rows} selected={selected} select={select} /><More page={list}>Load more projects</More></Panel>{selected ? <ProjectDetail key={selected} id={selected} api={api} refresh={refresh} edit={edit} /> : <article className="panel empty-selection"><span className="empty-glyph">▦</span><h2>Select a project</h2><p className="muted">Explore its tasks, decisions, and the latest handoff.</p></article>}</div></>;
}

function Agents({ api, refresh }) {
  const page = usePaged(api, '/api/agents', 'agents', 'next_offset', refresh);
  return <><Heading eyebrow="THE HANDS BEHIND THE WORK" title="Agents" description="See who has contributed and which tasks they hold." action={<a href="#connect" className="button secondary">Connect an agent ↗</a>} /><ErrorMessage>{page.error}</ErrorMessage><Panel title="Reporting agents" action={<span className="subtle-label">BASED ON RECORDED ACTIVITY</span>}>{page.rows.length ? page.rows.map((agent) => <article className="event-row" key={agent.agent_id}><span className="project-avatar">{agent.agent_id.slice(0, 2).toUpperCase()}</span><div className="event-main"><strong>{agent.agent_id}</strong><p className="event-byline">{agent.updates} updates · {agent.projects} projects · {agent.claimed_tasks} current claims</p></div><span className="event-time">{ago(agent.last_seen)}</span></article>) : <Empty title="Meet your future collaborators" description="Connect an agent and record its first update to see it here." />}<More page={page}>Load more agents</More></Panel><p className="field-hint">Names are reported by clients. Last activity is a recorded update, not a live connection.</p></>;
}

function Activity({ api, refresh }) {
  const [project, setProject] = useState(''), [kind, setKind] = useState('');
  const projects = usePaged(api, '/api/projects?limit=100', 'projects', 'next_offset', refresh);
  const params = new URLSearchParams({ ...(project ? { project } : {}), ...(kind ? { kind } : {}) });
  const page = usePaged(api, `/api/activity?${params}`, 'events', 'next_before_event_id', refresh, 'before');
  return <><Heading eyebrow="THE STORY OF YOUR BUILD" title="Activity" description="A timeline of progress, decisions, and handoffs." /><div className="filter-bar"><label>Project<select value={project} onChange={(event) => setProject(event.target.value)}><option value="">All projects</option>{projects.rows.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Type<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="">All updates</option>{kinds.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>{projects.next !== null && <button className="button quiet" onClick={projects.more} disabled={projects.busy}>Load more projects</button>}</div><ErrorMessage>{page.error || projects.error || projects.pageError}</ErrorMessage><Panel title="Recorded activity"><EventList items={page.rows} /><More page={page}>Load earlier activity</More></Panel></>;
}

function Connect({ copy }) {
  const endpoint = `${window.location.origin}/mcp`;
  const instructions = 'Use agent-context MCP for project ID "my-project".\nRead get_context and list_tasks before working.\nUse a unique agent_id and claim a task before editing.\nRecord progress, files, decisions, and test results.\nBefore stopping, leave a handoff and complete or release your task.';
  const connections = [
    ['Codex', 'C', `codex mcp add agent-context --url ${endpoint} --bearer-token-env-var HANDOFFRA_TOKEN`, 'Export your instance token in the terminal that launches Codex.'],
    ['Claude Code', '✳', `claude mcp add --scope user --transport http agent-context ${endpoint} --header "Authorization: Bearer $HANDOFFRA_TOKEN"`, 'Use the same token. Claude saves the resolved header in its configuration.'],
  ];
  return <><Heading eyebrow="MANY AGENTS. ONE CONTEXT." title="Connect your agents." description="Set it up once. Keep the whole project in the loop." action={<span className="tag green">MCP ready</span>} /><div className="endpoint-card"><div><span className="eyebrow">YOUR MCP ENDPOINT</span><code>{endpoint}</code></div><button className="button secondary" onClick={() => copy(endpoint)}>Copy endpoint</button></div><div className="connect-grid">{connections.map(([name, mark, command, help]) => <article className="panel setup-card" key={name}><div className={`provider-mark${name === 'Claude Code' ? ' claude-mark' : ''}`}>{mark}</div><h2>{name}</h2><p className="muted">{help}</p><pre>{command}</pre><button className="button quiet" onClick={() => copy(command)}>Copy command</button><p className="field-hint">Restart existing sessions after adding the server.</p></article>)}</div><article className="panel workflow-card"><span className="step-number">02</span><div><h2>Teach your agents the handoff habit.</h2><p className="muted">Add this to AGENTS.md and CLAUDE.md. Replace my-project with your project ID.</p><pre>{instructions}</pre><button className="button quiet" onClick={() => copy(instructions)}>Copy instructions</button></div></article></>;
}

function Editor({ editor, close, api, saved }) {
  const dialog = useRef(null), requestId = useRef(crypto.randomUUID());
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { dialog.current.showModal(); }, []);
  const project = editor.kind === 'project', task = editor.kind === 'task';
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    const values = Object.fromEntries(new FormData(event.target));
    let path = '/api/projects';
    if (!project) {
      values.files = values.files.split('\n').map((line) => line.trim()).filter(Boolean);
      values.request_id = requestId.current;
      path += `/${encodeURIComponent(editor.project)}/${task ? 'tasks' : 'updates'}`;
      if (!task) values.kind = editor.kind;
    }
    try { const data = await api(path, { method: 'POST', body: JSON.stringify(values) }); saved(project ? data.id : editor.project); close(); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <dialog ref={dialog} onCancel={close}><form onSubmit={submit} onChange={() => { requestId.current = crypto.randomUUID(); }}><div className="dialog-heading"><div><p className="eyebrow">WORKSPACE</p><h2>{project ? 'New project' : task ? 'Add a task' : editor.kind === 'handoff' ? 'Leave a handoff' : 'Record a decision'}</h2></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={close}>×</button></div><div id="editor-fields">{project ? <><label htmlFor="editor-name">Project name</label><input name="name" id="editor-name" maxLength={200} required /><label htmlFor="editor-project-id">Project ID</label><input name="project_id" id="editor-project-id" pattern="[a-z0-9][a-z0-9_-]{0,79}" maxLength={80} required placeholder="my-project" /><label htmlFor="editor-description">Goals and context</label><textarea name="description" id="editor-description" maxLength={8000} /></> : <><label htmlFor="editor-title">{task ? 'Task title' : 'Summary'}</label><input name={task ? 'title' : 'summary'} id="editor-title" required maxLength={task ? 300 : 500} /><label htmlFor="editor-details">{task ? 'Description' : 'Details and next steps'}</label><textarea name={task ? 'description' : 'details'} id="editor-details" maxLength={8000} /><label htmlFor="editor-files">Related files (one per line)</label><textarea name="files" id="editor-files" maxLength={12000} placeholder={'src/auth.py\nsrc/routes.py'} /></>}</div><ErrorMessage>{error}</ErrorMessage><div className="dialog-actions"><button type="button" className="button secondary" onClick={close}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : project ? 'Create project' : task ? 'Create task' : 'Save update'}</button></div></form></dialog>;
}

function Workspace({ token, disconnect }) {
  const [view, setView] = useState(() => pages[location.hash.slice(1)] ? location.hash.slice(1) : 'overview');
  const [refresh, setRefresh] = useState(0), [selected, setSelected] = useState(null), [editor, setEditor] = useState(null), [toast, setToast] = useState('');
  const api = useMemo(() => createApi(token, disconnect), [token, disconnect]);
  const metrics = useResource(api, '/api/overview', refresh), projects = useResource(api, '/api/projects?limit=100', refresh);
  const notify = useCallback((message) => setToast(message), []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { const change = () => setView(pages[location.hash.slice(1)] ? location.hash.slice(1) : 'overview'); window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change); }, []);
  useEffect(() => { if (view !== 'overview' || editor) return; const timer = setInterval(() => { if (!document.hidden) setRefresh((n) => n + 1); }, 8000); return () => clearInterval(timer); }, [view, editor]);
  const select = (id) => { setSelected(id); location.hash = 'projects'; setView('projects'); };
  const edit = (kind, project = selected) => setEditor({ kind, project });
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); notify('Copied to clipboard.'); } catch { notify('Clipboard unavailable. Select and copy the text manually.'); } };
  return <div className="workspace"><aside className="sidebar"><a className="brand" href="#overview"><span className="brand-symbol small">hf<span>·</span></span><span>Handoffra<small>WORKSPACE</small></span></a><div className="instance-pill"><span className="dot" /><span>Self-hosted instance</span><span className="pill-arrow">⌄</span></div><p className="nav-label">WORKSPACE</p><nav aria-label="Main navigation">{Object.entries(pages).map(([name, [icon, title]]) => <a key={name} href={`#${name}`} className={`nav-link${name === view ? ' active' : ''}`} aria-current={name === view ? 'page' : undefined}><span aria-hidden="true">{icon}</span>{title}{name === 'projects' && <span className="nav-count">{metrics.data?.projects || 0}</span>}</a>)}</nav><div className="sidebar-bottom"><div className="sidebar-note"><span className="dot" /><strong>One source of context</strong><p>Every handoff makes the next session a little smarter.</p></div><button className="disconnect" onClick={disconnect}>Disconnect instance <span>↗</span></button></div></aside><div className="main-shell"><header className="topbar"><div><span className="muted">Workspace</span><span className="breadcrumb">/</span>{pages[view][1]}</div><div className="topbar-right"><span className={`live-status${metrics.error ? ' offline' : ''}`}><span className="dot" />{metrics.error ? 'Connection issue' : metrics.loading ? 'Updating' : 'Connected'}</span><button className="icon-button" aria-label="Refresh workspace" onClick={() => setRefresh((n) => n + 1)}>↻</button></div></header><main><ErrorMessage>{metrics.error || projects.error}</ErrorMessage>
    {view === 'overview' && <Overview api={api} refresh={refresh} metrics={metrics.data} projects={projects.data?.projects || []} select={select} edit={edit} />}
    {view === 'projects' && <Projects api={api} refresh={refresh} selected={selected} select={select} edit={edit} />}
    {view === 'agents' && <Agents api={api} refresh={refresh} />}
    {view === 'activity' && <Activity api={api} refresh={refresh} />}
    {view === 'connect' && <Connect copy={copy} />}
    <footer className="page-footer"><span>Handoffra <span className="footer-dot">·</span>Built for continuity.</span><span>Self-hosted workspace</span></footer></main></div>
    {editor && <Editor editor={editor} close={() => setEditor(null)} api={api} saved={(id) => { setRefresh((n) => n + 1); if (id) select(id); notify('Saved to shared context.'); }} />}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}

export function App() {
  const [token, setToken] = useState(null);
  const disconnect = useCallback(() => setToken(null), []);
  return token === null ? <Login connect={setToken} /> : <Workspace token={token} disconnect={disconnect} />;
}
