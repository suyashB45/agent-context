import React from 'react';
import { finalCtaContent } from '../content.js';
import { Icon } from '../components/icons.jsx';
import { Reveal } from '../components/ui.jsx';

export function FinalCta() {
  return (
    <section className="lp-final-section" id="get-started">
      <div className="container">
        <Reveal className="lp-final-cta">
          <p className="lp-overline">{finalCtaContent.overline}</p>
          <h2>{finalCtaContent.title}</h2>
          <p className="lp-lead">{finalCtaContent.description}</p>
          <div className="lp-hero-actions">
            <a className="site-button primary" href={finalCtaContent.primary.href}>
              {finalCtaContent.primary.label}
              <Icon name="arrow" size={15} />
            </a>
            <a
              className="site-button secondary"
              href={finalCtaContent.secondary.href}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="github" size={15} />
              {finalCtaContent.secondary.label}
            </a>
          </div>
          <p className="lp-final-note">{finalCtaContent.note}</p>
        </Reveal>
      </div>
    </section>
  );
}
