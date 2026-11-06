import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { heroContent, uiText } from '../content.js';
import { Icon } from '../components/icons.jsx';
import { Reveal } from '../components/ui.jsx';

function Terminal() {
  const lines = heroContent.terminal.lines;
  const reduce = useReducedMotion();
  const [cursor, setCursor] = useState({ line: lines.length, char: 0 });

  useEffect(() => {
    if (reduce) {
      setCursor({ line: lines.length, char: 0 });
      return undefined;
    }

    let cancelled = false;
    let lineIndex = 0;
    let charIndex = 0;
    let timer;

    const step = () => {
      if (cancelled) return;
      const line = lines[lineIndex];
      if (!line) {
        setCursor({ line: lines.length, char: 0 });
        return;
      }
      charIndex += 1;
      setCursor({ line: lineIndex, char: charIndex });
      if (charIndex >= line.text.length) {
        lineIndex += 1;
        charIndex = 0;
        timer = setTimeout(step, 240);
      } else {
        timer = setTimeout(step, 16 + Math.random() * 18);
      }
    };

    setCursor({ line: 0, char: 0 });
    timer = setTimeout(step, 420);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [lines, reduce]);

  return (
    <div className="lp-terminal" aria-label={uiText.terminalAria}>
      <span className="lp-sr-only">{uiText.terminalSummary}</span>
      <div className="lp-terminal-bar">
        <span className="lp-window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="lp-terminal-title">{uiText.terminalTitle}</span>
        <span className="lp-terminal-protocol">{heroContent.terminal.protocol}</span>
      </div>
      <div className="lp-terminal-body" aria-hidden="true">
        {lines.map((line, index) => {
          if (index > cursor.line) return null;
          const text = index < cursor.line ? line.text : line.text.slice(0, cursor.char);
          return (
            <div className={`lp-term-line tone-${line.tone}`} key={`${line.tone}-${index}`}>
              <span>{text}</span>
              {index === cursor.line ? <span className="lp-cursor" /> : null}
            </div>
          );
        })}
        {cursor.line >= lines.length ? (
          <div className="lp-term-line tone-cmd">
            <span className="lp-cursor" />
          </div>
        ) : null}
      </div>
      <div className="lp-terminal-foot">
        {heroContent.terminal.agents.map((agent, index) => (
          <React.Fragment key={agent.id}>
            {index > 0 ? (
              <span className="lp-term-connector" aria-hidden="true">
                <Icon name="handoff" size={16} />
              </span>
            ) : null}
            <div className="lp-term-agent">
              <span className={`lp-agent-badge agent-${index}`}>{agent.id}</span>
              <span>
                <strong>{agent.name}</strong>
                <small>{agent.state}</small>
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>
      <div className="lp-terminal-caption">
        <span className="lp-live-dot" />
        {heroContent.terminal.footnote}
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="lp-hero" id="top">
      <div className="container lp-hero-grid">
        <div className="lp-hero-copy">
          <Reveal>
            <span className="lp-release-pill">
              <span className="lp-live-dot" />
              {heroContent.pill}
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h1>
              {heroContent.title.line1}
              <span>{heroContent.title.line2}</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lp-hero-description">{heroContent.description}</p>
          </Reveal>
          <Reveal delay={0.15} className="lp-hero-actions">
            <a className="site-button primary" href={heroContent.primary.href}>
              {heroContent.primary.label}
              <Icon name="arrow" size={15} />
            </a>
            <a
              className="site-button secondary"
              href={heroContent.secondary.href}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="github" size={15} />
              {heroContent.secondary.label}
            </a>
          </Reveal>
          <Reveal delay={0.2} className="lp-badges">
            {heroContent.badges.map((badge) => (
              <span key={badge}>{badge}</span>
            ))}
          </Reveal>
          <Reveal delay={0.24}>
            <p className="lp-hero-footnote">{heroContent.footnote}</p>
          </Reveal>
        </div>
        <Reveal delay={0.12} className="lp-hero-visual">
          <motion.div
            initial={false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <Terminal />
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
