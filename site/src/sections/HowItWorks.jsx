import React from 'react';
import { howItWorksContent } from '../content.js';
import { Reveal, SectionHeading } from '../components/ui.jsx';

export function HowItWorks() {
  return (
    <section className="lp-section" id="how-it-works">
      <div className="container">
        <SectionHeading
          overline={howItWorksContent.overline}
          title={howItWorksContent.title}
          accent={howItWorksContent.accent}
          description={howItWorksContent.description}
        />
        <div className="lp-steps">
          {howItWorksContent.steps.map((step, index) => (
            <Reveal key={step.number} className="lp-step" delay={index * 0.07}>
              <span className="lp-step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <code>{step.command}</code>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
