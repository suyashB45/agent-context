import React from 'react';
import { featuresContent } from '../content.js';
import { Reveal, SectionHeading } from '../components/ui.jsx';

export function Features() {
  return <section className="lp-section" id="features"><div className="container feature-layout">
    <SectionHeading overline={featuresContent.overline} title={featuresContent.title} description={featuresContent.description} />
    <div className="feature-register">{featuresContent.items.map((feature, index) => <Reveal className="feature-entry" key={feature.title}>
      <span className="feature-number">{String(index + 1).padStart(2, '0')}</span>
      <div><h3>{feature.title}</h3><p>{feature.description}</p></div>
    </Reveal>)}</div>
  </div></section>;
}
