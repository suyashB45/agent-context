import React from 'react';
import { securityContent, uiText } from '../content.js';
import { Icon } from '../components/icons.jsx';
import { Reveal, SectionHeading } from '../components/ui.jsx';

export function SecurityLimits() {
  return (
    <section className="lp-section" id="security">
      <div className="container">
        <SectionHeading
          overline={securityContent.overline}
          title={securityContent.title}
          accent={securityContent.accent}
          description={securityContent.description}
        />
        <div className="lp-security-grid">
          <Reveal className="lp-limits-card">
            <div className="lp-limits-head">
              <span className="lp-limits-icon">
                <Icon name="shield" size={20} />
              </span>
              <h3>{uiText.currentLimits}</h3>
            </div>
            <ul>
              {securityContent.limits.map((limit) => (
                <li key={limit}>
                  <Icon name="alert" size={14} />
                  <span>{limit}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal className="lp-security-aside" delay={0.08}>
            <h3>{securityContent.aside.title}</h3>
            <p>{securityContent.aside.description}</p>
            <a
              className="lp-inline-link"
              href={securityContent.aside.link.href}
              target="_blank"
              rel="noreferrer"
            >
              {securityContent.aside.link.label}
              <Icon name="arrowUpRight" size={13} />
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
