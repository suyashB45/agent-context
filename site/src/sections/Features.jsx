import React from 'react';
import { featuresContent } from '../content.js';
import { Icon } from '../components/icons.jsx';
import { Reveal, SectionHeading } from '../components/ui.jsx';

export function Features() {
  return (
    <section className="lp-section" id="features">
      <div className="container">
        <SectionHeading
          overline={featuresContent.overline}
          title={featuresContent.title}
          accent={featuresContent.accent}
          description={featuresContent.description}
        />
        <div className="lp-feature-grid">
          {featuresContent.items.map((feature, index) => (
            <Reveal key={feature.title} className="lp-feature-card" delay={index * 0.05}>
              <span className="feature-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="lp-feature-icon">
                <Icon name={feature.icon} size={22} />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <span className="lp-card-corner" aria-hidden="true" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
