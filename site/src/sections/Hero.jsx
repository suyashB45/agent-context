import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { heroContent, uiText } from '../content.js';
import { Icon } from '../components/icons.jsx';
import { CopyButton, Reveal } from '../components/ui.jsx';

function HandoffActivity() {
  const lines = heroContent.terminal.lines;
  const reduce = useReducedMotion();
  const [cursor, setCursor] = useState({ line: lines.length, char: 0 });

  useEffect(() => {
    if (reduce) { setCursor({ line: lines.length, char: 0 }); return; }
    let line = 0;
    let char = 0;
    let timer;
    const step = () => {
      if (!lines[line]) { setCursor({ line: lines.length, char: 0 }); return; }
      char += 1;
      setCursor({ line, char });
      if (char >= lines[line].text.length) { line += 1; char = 0; timer = setTimeout(step, 220); }
      else timer = setTimeout(step, 14);
    };
    setCursor({ line: 0, char: 0 });
    timer = setTimeout(step, 350);
    return () => clearTimeout(timer);
  }, [lines, reduce]);

  const last = Math.min(cursor.line, lines.length - 1);
  return <div className="bridge-activity" aria-label={uiText.terminalAria}>
    <span className="lp-sr-only">{uiText.terminalSummary}</span>
    <div className="bridge-activity-label"><span className="lp-live-dot" />{heroContent.bridge.console}</div>
    <div className="bridge-log" aria-hidden="true">
      {lines.slice(Math.max(0, last - 2), last + 1).map((line, offset) => {
        const index = Math.max(0, last - 2) + offset;
        const typing = index === cursor.line;
        return <div className={`bridge-log-line tone-${line.tone}`} key={index}>
          <span className="bridge-log-marker">›</span>
          <span>{typing ? line.text.slice(0, cursor.char) : line.text}{typing && <span className="lp-cursor" />}</span>
        </div>;
      })}
    </div>
    <span className="bridge-transport">{heroContent.terminal.protocol}</span>
  </div>;
}

function AgentNode({ agent, index }) {
  return <div className={`bridge-agent bridge-agent-${index}`}>
    <div className="bridge-agent-heading"><span className="bridge-avatar">{agent.id}</span><div><strong>{agent.label}</strong><small>{agent.role}</small></div><Icon name="terminal" size={17} /></div>
    <code>{agent.command}<span aria-hidden="true">(…)</span></code>
    <ul>{agent.items.map((item) => <li key={item}><Icon name="check" size={12} />{item}</li>)}</ul>
    <div className="bridge-agent-state"><span className="lp-live-dot" />{agent.state}</div>
  </div>;
}

function ContextBridge() {
  const bridge = heroContent.bridge;
  return <div className="context-bridge" role="group" aria-label={bridge.label}>
    <div className="bridge-toolbar">
      <span className="bridge-window-mark" aria-hidden="true"><i /><i /><i /></span>
      <span className="bridge-project">{bridge.project}</span>
      <span className="bridge-example">{uiText.exampleData}</span>
    </div>
    <div className="bridge-canvas">
      <AgentNode agent={bridge.agents[0]} index={0} />
      <div className="bridge-wire bridge-wire-green" aria-hidden="true"><span /><Icon name="arrow" size={16} /></div>
      <div className="bridge-memory">
        <div className="bridge-core-mark"><Icon name="layers" size={37} /></div>
        <strong>{bridge.coreTitle}</strong><p>{bridge.coreLabel}</p>
        <div className="bridge-memory-tags">{bridge.coreTags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      </div>
      <div className="bridge-wire bridge-wire-blue" aria-hidden="true"><span /><Icon name="arrow" size={16} /></div>
      <AgentNode agent={bridge.agents[1]} index={1} />
    </div>
    <div className="bridge-storage"><Icon name="database" size={13} />{bridge.storage}</div>
    <HandoffActivity />
  </div>;
}

export function Hero() {
  return <section className="lp-hero" id="top">
    <div className="hero-orbit hero-orbit-green" aria-hidden="true" /><div className="hero-orbit hero-orbit-blue" aria-hidden="true" />
    <div className="container lp-hero-grid">
      <div className="lp-hero-copy">
        <Reveal><span className="lp-release-pill"><span className="lp-live-dot" />{heroContent.pill}<Icon name="arrowUpRight" size={12} /></span></Reveal>
        <Reveal delay={0.05}><h1>{heroContent.title.line1}<span>{heroContent.title.line2}</span></h1></Reveal>
        <Reveal delay={0.1}><p className="lp-hero-description">{heroContent.description}</p></Reveal>
        <Reveal delay={0.15} className="lp-hero-actions">
          <a className="site-button primary" href={heroContent.primary.href}>{heroContent.primary.label}<Icon name="arrow" size={15} /></a>
          <a className="site-button secondary" href={heroContent.secondary.href} target="_blank" rel="noreferrer"><Icon name="github" size={15} />{heroContent.secondary.label}</a>
        </Reveal>
        <Reveal delay={0.18} className="hero-install-bar"><Icon name="terminal" size={15} /><code>{heroContent.install.command}</code><CopyButton text={heroContent.install.command} /></Reveal>
        <Reveal delay={0.2} className="lp-badges">{heroContent.badges.map((badge) => <span key={badge}><Icon name="check" size={10} />{badge}</span>)}</Reveal>
      </div>
      <Reveal delay={0.22} className="lp-hero-visual"><ContextBridge /></Reveal>
      <div className="hero-client-strip"><p>{heroContent.bridge.clientLabel}</p><div>{heroContent.bridge.clients.map((client) => <span key={client}>{client}</span>)}</div></div>
      <p className="lp-hero-footnote">{heroContent.footnote}</p>
    </div>
  </section>;
}
