"use strict";

const $ = (selector) => document.querySelector(selector);
const state = {
  token: "", connected: false, view: "overview", selected: null,
  projects: [], projectOffset: null, metrics: {}, recent: [], handoffs: [],
  activity: [], activityBefore: null, activityHistory: false,
  editor: null, refreshing: false, toastTimer: null,
  agentsOffset: null,
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

function empty(container, title, description, glyph = "✧") {
  const block = element("div", "empty-state");
  block.append(element("span", "empty-glyph", glyph), element("strong", "", title), element("p", "", description));
  container.replaceChildren(block);
}

function toast(message) {
  clearTimeout(state.toastTimer);
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  state.toastTimer = setTimeout(() => { $("#toast").hidden = true; }, 3000);
}

function notice(message = "") {
  $("#notice").textContent = message;
  $("#notice").hidden = !message;
}

function disconnect() {
  state.token = "";
  state.connected = false;
  $("#workspace").hidden = true;
  $("#login").hidden = false;
  $("#access-token").value = "";
  if ($("#editor-dialog").open) $("#editor-dialog").close();
}

async function api(path, options = {}) {
  const headers = { Accept: "application/json", ...options.headers };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(path, { ...options, headers, cache: "no-store", credentials: "omit" });
  let data;
  try { data = await response.json(); } catch { throw new Error("The server returned an unexpected response."); }
  if (!response.ok) {
    if (response.status === 401 && state.connected) {
      disconnect();
      $("#login-error").textContent = "Your access token was rejected. Connect again with the current token.";
    }
    throw new Error(data.error || "The request could not be completed.");
  }
  return data;
}

function ago(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (!minutes) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const symbols = { handoff: "↗", decision: "◇", blocker: "!", progress: "↻", test: "✓", note: "≡", task_created: "+", task_claimed: "◷", task_updated: "✓" };

function eventRow(event, showProject = true) {
  const row = element("article", "event-row");
  row.append(element("span", `event-icon ${event.kind}`, symbols[event.kind] || "·"));
  const main = element("div", "event-main");
  main.append(element("strong", "", event.summary));
  const byline = [event.agent_id, showProject ? (event.project_name || event.project_id) : "", event.kind.replaceAll("_", " ")].filter(Boolean).join(" · ");
  main.append(element("p", "event-byline", byline));
  if (event.details || event.files?.length || event.git_ref) {
    const details = element("details");
    details.append(element("summary", "", "View details"));
    if (event.details) details.append(element("pre", "", event.details));
    if (event.files?.length) details.append(element("pre", "", `Files: ${event.files.join(", ")}`));
    if (event.git_ref) details.append(element("pre", "", `Git: ${event.git_ref}`));
    main.append(details);
  }
  const time = element("time", "event-time", ago(event.created_at));
  time.dateTime = event.created_at;
  time.title = new Date(event.created_at).toLocaleString();
  row.append(main, time);
  return row;
}

function events(container, items, title = "No updates yet", description = "Updates appear here when your agents record their work.", showProject = true) {
  if (!items.length) return empty(container, title, description, "≋");
  container.replaceChildren(...items.map((item) => eventRow(item, showProject)));
}

function projectRow(project) {
  const row = element("button", `project-row${state.selected === project.id ? " selected" : ""}`);
  row.type = "button";
  row.append(element("span", "project-avatar", project.name.slice(0, 2).toUpperCase()));
  const meta = element("div", "project-meta");
  meta.append(element("strong", "", project.name), element("p", "", project.id));
  row.append(meta, element("span", "row-arrow", "↗"));
  row.addEventListener("click", () => selectProject(project.id));
  return row;
}

function renderProjects() {
  for (const [selector, projects] of [["#overview-projects", state.projects.slice(0, 4)], ["#project-list", state.projects]]) {
    const container = $(selector);
    if (!projects.length) empty(container, "Your next build starts here", "Create a project, connect an agent, and give your work a shared memory.", "▦");
    else container.replaceChildren(...projects.map(projectRow));
  }
  $("#more-projects").hidden = state.projectOffset === null;
  const filter = $("#activity-project");
  const selected = filter.value;
  filter.replaceChildren(new Option("All projects", ""), ...state.projects.map((p) => new Option(p.name, p.id)));
  filter.value = selected;
}

function renderOverview() {
  const m = state.metrics;
  for (const [id, value] of [["projects", m.projects], ["tasks", m.open_tasks], ["updates", m.updates_today], ["agents", m.agents_today]]) {
    $(`#stat-${id}`).textContent = value ?? 0;
  }
  $("#stat-completed").textContent = `${m.completed_tasks ?? 0} tasks completed`;
  $("#nav-count").textContent = m.projects ?? 0;
  $("#project-count").textContent = m.projects ?? 0;
  events($("#overview-handoffs"), state.handoffs.slice(0, 3), "A fresh start for the next agent", "When an agent finishes a session, its handoff will appear here.");
  events($("#overview-activity"), state.recent.slice(0, 5));
}

function section(title) {
  const panel = element("article", "panel detail-section");
  const heading = element("div", "panel-heading");
  heading.append(element("h2", "", title));
  const body = element("div");
  panel.append(heading, body);
  return { panel, body, heading };
}

function action(label, handler, primary = false) {
  const button = element("button", `button ${primary ? "primary" : "secondary"}`, label);
  button.type = "button";
  button.addEventListener("click", handler);
  return button;
}

async function loadProject(id) {
  const encoded = encodeURIComponent(id);
  const [context, tasks] = await Promise.all([api(`/api/projects/${encoded}`), api(`/api/projects/${encoded}/tasks`)]);
  if (state.selected !== id || !state.connected) return;
  const root = $("#project-detail");
  const header = element("article", "panel");
  const heading = element("div", "detail-heading");
  const text = element("div");
  text.append(element("h2", "", context.project.name), element("span", "tag", context.project.id));
  if (context.project.description) text.append(element("p", "", context.project.description));
  heading.append(text);
  const actions = element("div", "detail-actions");
  actions.append(action("+ Add task", () => openEditor("task"), true), action("Write handoff", () => openEditor("handoff")), action("Record decision", () => openEditor("decision")));
  header.append(heading, actions);
  const searchForm = element("form", "detail-search");
  const input = element("input");
  input.placeholder = "Search this project's context…";
  input.setAttribute("aria-label", "Search project context");
  input.maxLength = 200;
  input.required = true;
  const searchButton = element("button", "button secondary", "Search");
  searchButton.type = "submit";
  searchForm.append(input, searchButton);
  header.append(searchForm);
  const searchResults = section("Search results");
  searchResults.panel.hidden = true;
  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    searchButton.disabled = true;
    try {
      const query = input.value.trim();
      if (!query) return;
      const data = await api(`/api/projects/${encoded}/search?q=${encodeURIComponent(query)}`);
      searchResults.panel.hidden = false;
      events(searchResults.body, data.events, "No matching context", "Try a file path, a decision, or a phrase from an earlier update.", false);
      if (data.next_before_event_id) searchResults.body.append(action("Load more results", () => loadSearchMore(data.next_before_event_id, query)));
    } catch (error) { notice(error.message); }
    finally { searchButton.disabled = false; }
  });

  async function loadSearchMore(before, query) {
    try {
      const data = await api(`/api/projects/${encoded}/search?q=${encodeURIComponent(query)}&before=${before}`);
      searchResults.body.querySelector("button")?.remove();
      searchResults.body.append(...data.events.map((e) => eventRow(e, false)));
      if (data.next_before_event_id) searchResults.body.append(action("Load more results", () => loadSearchMore(data.next_before_event_id, query)));
    } catch (error) { notice(error.message); }
  }

  const taskSection = section("Tasks");
  function renderTasks(page, append = false) {
    if (!append) taskSection.body.replaceChildren();
    if (!page.tasks.length && !append) empty(taskSection.body, "A clear next step", "Add a task so your agents can claim work before starting.", "◷");
    for (const task of page.tasks) {
      const row = element("div", "task-row");
      row.append(element("span", "task-check", task.status === "completed" ? "✓" : ""));
      const body = element("div", "task-body");
      body.append(element("strong", "", task.title));
      const note = [task.owner ? `${task.owner}${task.lease_active ? " · claimed" : " · claim expired"}` : "Unassigned", task.files?.join(", ")].filter(Boolean).join(" · ");
      body.append(element("p", "", note));
      if (task.description) body.append(element("p", "", task.description));
      row.append(body, element("span", `tag ${task.status}`, task.status.replaceAll("_", " ")));
      taskSection.body.append(row);
    }
    if (page.next_offset !== null) {
      const more = action("Load more tasks", async () => {
        more.disabled = true;
        try {
          const next = await api(`/api/projects/${encoded}/tasks?offset=${page.next_offset}`);
          more.remove();
          renderTasks(next, true);
        } catch (error) { more.disabled = false; notice(error.message); }
      });
      taskSection.body.append(more);
    }
  }
  renderTasks(tasks);
  const handoffs = section("Latest handoffs");
  events(handoffs.body, context.handoffs, "The next agent is listening", "Leave a handoff with completed work, blockers, and next steps.", false);
  const decisions = section("Decisions & rationale");
  events(decisions.body, context.decisions, "Keep the why with the work", "Record important choices so the next agent doesn't have to guess.", false);
  if (context.handoffs_truncated || context.decisions_truncated) {
    const link = element("a", "button quiet", "Explore full project history ↗");
    link.href = "#activity";
    link.addEventListener("click", () => { $("#activity-project").value = id; state.activity = []; state.activityHistory = false; });
    decisions.body.append(link);
  }
  root.replaceChildren(header, searchResults.panel, taskSection.panel, handoffs.panel, decisions.panel);
}

async function selectProject(id) {
  state.selected = id;
  renderProjects();
  if (location.hash !== "#projects") location.hash = "projects";
  else {
    try { await loadProject(id); } catch (error) { notice(error.message); }
  }
}

function activityPath(before = null) {
  const params = new URLSearchParams();
  if ($("#activity-project").value) params.set("project", $("#activity-project").value);
  if ($("#activity-kind").value) params.set("kind", $("#activity-kind").value);
  if (before !== null) params.set("before", before);
  return `/api/activity?${params}`;
}

async function loadActivity(reset = false) {
  const data = await api(activityPath());
  if (reset) { state.activity = []; state.activityHistory = false; }
  const merged = new Map(state.activity.map((e) => [e.id, e]));
  for (const item of data.events) merged.set(item.id, item);
  state.activity = [...merged.values()].sort((a, b) => b.id - a.id);
  if (!state.activityHistory) state.activityBefore = data.next_before_event_id;
  renderActivity();
}

function renderActivity() {
  events($("#activity-list"), state.activity);
  $("#more-activity").hidden = state.activityBefore === null;
}

async function refresh(background = false) {
  if (!state.connected || state.refreshing) return;
  state.refreshing = true;
  try {
    const [metrics, projects, recent, handoffs] = await Promise.all([
      api("/api/overview"), api("/api/projects?limit=100"), api("/api/activity"), api("/api/activity?kind=handoff"),
    ]);
    if (!state.connected) return;
    state.metrics = metrics;
    if (!background || state.projects.length <= 100) {
      state.projects = projects.projects;
      state.projectOffset = projects.next_offset;
    }
    state.recent = recent.events;
    state.handoffs = handoffs.events;
    renderProjects();
    renderOverview();
    if (state.view === "activity") await loadActivity();
    if (state.view === "agents") await loadAgents();
    if (!background && state.view === "projects" && state.selected) await loadProject(state.selected);
    $("#sync-status").className = "live-status";
    $("#sync-status").replaceChildren(element("span", "dot"), document.createTextNode("Connected"));
    notice();
  } catch (error) {
    $("#sync-status").className = "live-status offline";
    $("#sync-status").replaceChildren(element("span", "dot"), document.createTextNode("Reconnecting"));
    notice(error.message);
  } finally { state.refreshing = false; }
}

async function navigate() {
  const view = location.hash.slice(1) || "overview";
  state.view = ["overview", "projects", "agents", "activity", "connect"].includes(view) ? view : "overview";
  for (const node of document.querySelectorAll(".view")) node.hidden = node.id !== `view-${state.view}`;
  for (const node of document.querySelectorAll("[data-nav]")) node.classList.toggle("active", node.dataset.nav === state.view);
  $("#breadcrumb").textContent = { overview: "Overview", projects: "Projects", agents: "Agents", activity: "Activity", connect: "Connect agents" }[state.view];
  if (!state.connected) return;
  try {
    if (state.view === "projects" && state.selected) await loadProject(state.selected);
    if (state.view === "activity") await loadActivity(true);
    if (state.view === "agents") await loadAgents();
  } catch (error) { notice(error.message); }
}

async function loadAgents(append = false) {
  const data = await api(`/api/agents?offset=${append ? state.agentsOffset : 0}`);
  const container = $("#agents-list");
  if (!append) container.replaceChildren();
  if (!data.agents.length && !append) empty(container, "Meet your future collaborators", "Connect an agent and record its first update to see it here.", "✧");
  for (const agent of data.agents) {
    const row = element("div", "event-row");
    row.append(element("span", "project-avatar", agent.agent_id.slice(0, 2).toUpperCase()));
    const body = element("div", "event-main");
    body.append(element("strong", "", agent.agent_id), element("p", "event-byline", `${agent.updates} updates · ${agent.projects} projects · ${agent.claimed_tasks} current claims`));
    row.append(body, element("span", "event-time", ago(agent.last_seen)));
    container.append(row);
  }
  state.agentsOffset = data.next_offset;
  $("#more-agents").hidden = data.next_offset === null;
}

function field(name, label, options = {}) {
  const wrapper = element("div");
  const caption = element("label", "", label);
  const control = element(options.multiline ? "textarea" : "input");
  control.name = name;
  control.id = `editor-${name}`;
  caption.htmlFor = control.id;
  control.maxLength = options.maxLength || 4000;
  control.required = Boolean(options.required);
  if (options.placeholder) control.placeholder = options.placeholder;
  if (options.pattern) control.pattern = options.pattern;
  wrapper.append(caption, control);
  return wrapper;
}

function openEditor(mode) {
  state.editor = { mode, project: state.selected, requestId: crypto.randomUUID() };
  const project = mode === "project";
  const task = mode === "task";
  $("#editor-title").textContent = project ? "New project" : task ? "Add a task" : mode === "handoff" ? "Leave a handoff" : "Record a decision";
  $("#save-editor").textContent = project ? "Create project" : task ? "Create task" : "Save update";
  $("#editor-error").textContent = "";
  const fields = $("#editor-fields");
  if (project) fields.replaceChildren(
    field("name", "Project name", { required: true, maxLength: 200, placeholder: "My next great build" }),
    field("project_id", "Project ID", { required: true, maxLength: 80, pattern: "[a-z0-9][a-z0-9_-]{0,79}", placeholder: "my-project" }),
    field("description", "Goals and context", { multiline: true, maxLength: 8000, placeholder: "What are you building? What should every agent know?" }),
  );
  else fields.replaceChildren(
    field(task ? "title" : "summary", task ? "Task title" : "Summary", { required: true, maxLength: task ? 300 : 500 }),
    field(task ? "description" : "details", task ? "Description" : "Details and next steps", { multiline: true, maxLength: 8000 }),
    field("files", "Related files (one per line)", { multiline: true, maxLength: 12000, placeholder: "src/auth.py\nsrc/routes.py" }),
  );
  $("#editor-dialog").showModal();
}

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  state.token = $("#access-token").value.trim();
  $("#login-error").textContent = "";
  try {
    await api("/api/overview");
    state.connected = true;
    $("#access-token").value = "";
    $("#login").hidden = true;
    $("#workspace").hidden = false;
    await refresh();
    await navigate();
  } catch (error) {
    state.token = "";
    $("#login-error").textContent = error.message;
  } finally { button.disabled = false; }
});

$("#editor-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const editor = state.editor;
  const values = Object.fromEntries(new FormData(event.target));
  const button = $("#save-editor");
  button.disabled = true;
  try {
    let path = "/api/projects";
    if (editor.mode !== "project") {
      values.files = values.files.split("\n").map((file) => file.trim()).filter(Boolean);
      values.request_id = editor.requestId;
      path += `/${encodeURIComponent(editor.project)}/${editor.mode === "task" ? "tasks" : "updates"}`;
      if (editor.mode !== "task") values.kind = editor.mode;
    }
    const result = await api(path, { method: "POST", body: JSON.stringify(values) });
    $("#editor-dialog").close();
    if (editor.mode === "project") state.selected = result.id;
    await refresh();
    if (editor.mode === "project") await selectProject(result.id);
    else await loadProject(editor.project);
    toast(editor.mode === "project" ? "Project created. Connect an agent to get started." : "Saved to shared context.");
  } catch (error) { $("#editor-error").textContent = error.message; }
  finally { button.disabled = false; }
});

$("#editor-fields").addEventListener("input", () => {
  if (state.editor) state.editor.requestId = crypto.randomUUID();
});
$("#close-dialog").addEventListener("click", () => $("#editor-dialog").close());
$("#cancel-dialog").addEventListener("click", () => $("#editor-dialog").close());
$("#disconnect").addEventListener("click", disconnect);
$("#refresh").addEventListener("click", () => refresh());
document.querySelectorAll('[data-action="new-project"]').forEach((button) => button.addEventListener("click", () => openEditor("project")));
$("#activity-project").addEventListener("change", () => loadActivity(true).catch((error) => notice(error.message)));
$("#activity-kind").addEventListener("change", () => loadActivity(true).catch((error) => notice(error.message)));
$("#more-activity").addEventListener("click", async (event) => {
  event.target.disabled = true;
  try {
    const page = await api(activityPath(state.activityBefore));
    state.activity.push(...page.events);
    state.activityBefore = page.next_before_event_id;
    state.activityHistory = true;
    renderActivity();
  } catch (error) { notice(error.message); }
  finally { event.target.disabled = false; }
});
$("#more-projects").addEventListener("click", async (event) => {
  event.target.disabled = true;
  try {
    const page = await api(`/api/projects?limit=100&offset=${state.projectOffset}`);
    state.projects.push(...page.projects);
    state.projectOffset = page.next_offset;
    renderProjects();
  } catch (error) { notice(error.message); }
  finally { event.target.disabled = false; }
});
$("#more-agents").addEventListener("click", () => loadAgents(true).catch((error) => notice(error.message)));

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast("Copied to clipboard."); }
  catch { notice("Clipboard access is unavailable. Select and copy the text manually."); }
}
const endpoint = `${location.origin}/mcp`;
$("#endpoint-url").textContent = endpoint;
$("#codex-command").textContent = `codex mcp add agent-context --url ${endpoint} --bearer-token-env-var AGENT_CONTEXT_TOKEN`;
$("#claude-command").textContent = `claude mcp add --scope user --transport http agent-context ${endpoint} --header "Authorization: Bearer $AGENT_CONTEXT_TOKEN"`;
$("#copy-endpoint").addEventListener("click", () => copyText(endpoint));
document.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", () => copyText(document.getElementById(button.dataset.copy).textContent)));
window.addEventListener("hashchange", navigate);
setInterval(() => { if (!document.hidden && !$("#editor-dialog").open) refresh(true); }, 8000);
navigate();
