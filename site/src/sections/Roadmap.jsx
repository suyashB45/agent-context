import React from 'react';
import { roadmapContent } from '../content.js';
import { Icon } from '../components/icons.jsx';
import { Reveal, SectionHeading } from '../components/ui.jsx';

export function Roadmap() {
  return (
    <section className="lp-section" id="roadmap">
      <div className="container">
        <SectionHeading
          overline={roadmapContent.overline}
          title={roadmapContent.title}
          accent={roadmapContent.accent}
          description={roadmapContent.description}
        />
        <div className="lp-roadmap">
          {roadmapContent.items.map((item, index) => (
            <Reveal key={`${item.status}-${item.title}`} className="lp-roadmap-item" delay={index * 0.06}>
              <span className={`lp-roadmap-status status-${item.status.toLowerCase()}`}>
                {item.status}
              </span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="lp-roadmap-foot" delay={0.08}>
          <p>{roadmapContent.note}</p>
          <a className="lp-inline-link" href={roadmapContent.link.href} target="_blank" rel="noreferrer">
            {roadmapContent.link.label}
            <Icon name="arrowUpRight" size={13} />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
