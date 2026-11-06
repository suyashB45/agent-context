import React from 'react';
import { heroContent, uiText } from '../content.js';
import { Icon } from '../components/icons.jsx';
import { CopyButton, Reveal } from '../components/ui.jsx';

function HandoffNote() {
  const note = heroContent.note;
  return <figure className="handoff-example">
    <p className="handoff-intro">{note.heading}</p>
    <div className="handoff-page">
      <div className="handoff-page-header"><span>{note.filename}</span><span>{uiText.exampleData}</span></div>
      <div className="handoff-byline"><span>{note.from}</span><Icon name="arrow" size={14} /><span>{note.to}</span></div>
      <dl className="handoff-entries">{note.sections.map((entry) => <div key={entry.label}><dt>{entry.label}</dt><dd>{entry.text}</dd></div>)}</dl>
      <div className="handoff-read"><Icon name="terminal" size={14} /><code>{note.read}</code></div>
    </div>
    <figcaption>{note.caption}</figcaption>
  </figure>;
}

export function Hero() {
  return <section className="lp-hero" id="top">
    <div className="container">
      <div className="lp-hero-grid">
        <div className="lp-hero-copy">
          <Reveal><span className="lp-release-pill">{heroContent.pill}</span></Reveal>
          <Reveal delay={0.03}><h1>{heroContent.title.line1}<span>{heroContent.title.line2}</span></h1></Reveal>
          <Reveal delay={0.05}><p className="lp-hero-description">{heroContent.description}</p></Reveal>
          <Reveal delay={0.07} className="lp-hero-actions">
            <a className="site-button primary" href={heroContent.primary.href}>{heroContent.primary.label}<Icon name="arrow" size={15} /></a>
            <a className="hero-source-link" href={heroContent.secondary.href} target="_blank" rel="noreferrer">{heroContent.secondary.label}<Icon name="arrowUpRight" size={14} /></a>
          </Reveal>
          <Reveal delay={0.09} className="hero-install-bar"><code>{heroContent.install.command}</code><CopyButton text={heroContent.install.command} /></Reveal>
          <div className="lp-badges">{heroContent.badges.map((badge) => <span key={badge}>{badge}</span>)}</div>
          <p className="lp-hero-footnote">{heroContent.footnote}</p>
        </div>
        <Reveal delay={0.1} className="lp-hero-visual"><HandoffNote /></Reveal>
      </div>
      <div className="hero-client-strip"><p>{heroContent.clientLabel}</p><div>{heroContent.clients.map((client) => <span key={client}>{client}</span>)}</div></div>
    </div>
  </section>;
}
