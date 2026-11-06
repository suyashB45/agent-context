import React from 'react';
import { problemContent } from '../content.js';
import { Icon } from '../components/icons.jsx';
import { Reveal, SectionHeading } from '../components/ui.jsx';

function ComparisonCard({ data, variant, delay }) {
  return (
    <Reveal delay={delay} className={`lp-compare-card ${variant}`}>
      <div className="lp-compare-head">
        <span className="lp-compare-icon">
          <Icon name={variant === 'without' ? 'xCircle' : 'checkCircle'} size={19} />
        </span>
        <h3>{data.label}</h3>
      </div>
      <ul>
        {data.items.map((item) => (
          <li key={item}>
            <Icon name={variant === 'without' ? 'close' : 'check'} size={13} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

export function Problem() {
  return (
    <section className="lp-section" id="problem">
      <div className="container">
        <SectionHeading
          overline={problemContent.overline}
          title={problemContent.title}
          accent={problemContent.accent}
          description={problemContent.description}
        />
        <div className="lp-compare-grid">
          <ComparisonCard data={problemContent.without} variant="without" delay={0.05} />
          <ComparisonCard data={problemContent.with} variant="with" delay={0.12} />
        </div>
      </div>
    </section>
  );
}
