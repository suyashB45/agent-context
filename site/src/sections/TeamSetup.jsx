import React from 'react';
import { teamContent, uiText } from '../content.js';
import { Icon } from '../components/icons.jsx';
import { Reveal, SectionHeading } from '../components/ui.jsx';

export function TeamSetup() {
  return (
    <section className="lp-section" id="team">
      <div className="container">
        <SectionHeading
          overline={teamContent.overline}
          title={teamContent.title}
          accent={teamContent.accent}
          description={teamContent.description}
        />
        <div className="lp-team-grid">
          {teamContent.methods.map((method, index) => (
            <Reveal key={method.title} className="lp-team-card" delay={index * 0.05}>
              <span className="lp-team-icon">
                <Icon name={method.icon} size={21} />
              </span>
              <h3>{method.title}</h3>
              <p>{method.description}</p>
              <p className="lp-recommended">
                <span>{uiText.recommendedFor}</span>
                {method.recommended}
              </p>
              <a href={method.href} className="lp-inline-link">
                {uiText.setupGuide}
                <Icon name="arrow" size={13} />
              </a>
            </Reveal>
          ))}
        </div>
        <Reveal className="lp-warning" delay={0.08}>
          <Icon name="alert" size={18} />
          <p>{teamContent.warning}</p>
        </Reveal>
      </div>
    </section>
  );
}
