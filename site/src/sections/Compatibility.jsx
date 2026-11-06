import React from 'react';
import { compatibilityContent } from '../content.js';
import { Icon } from '../components/icons.jsx';
import { Reveal, SectionHeading } from '../components/ui.jsx';

export function Compatibility() {
  return (
    <section className="lp-section" id="compatibility">
      <div className="container">
        <SectionHeading
          overline={compatibilityContent.overline}
          title={compatibilityContent.title}
          accent={compatibilityContent.accent}
          description={compatibilityContent.description}
        />
        <div className="lp-compat-grid">
          {compatibilityContent.clients.map((client, index) => (
            <Reveal key={client.name} className="lp-compat-card" delay={index * 0.04}>
              <span className="lp-compat-icon">
                <Icon name={client.icon} size={22} />
              </span>
              <span>
                <strong>{client.name}</strong>
                <small>{client.meta}</small>
              </span>
              <Icon name="check" size={14} />
            </Reveal>
          ))}
        </div>
        <p className="lp-section-footnote">{compatibilityContent.note}</p>
      </div>
    </section>
  );
}
