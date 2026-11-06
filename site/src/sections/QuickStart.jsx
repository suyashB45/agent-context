import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { quickStartContent, uiText } from '../content.js';
import { Icon } from '../components/icons.jsx';
import { CodeBlock, Reveal, SectionHeading, TabList } from '../components/ui.jsx';

export function QuickStart() {
  const [active, setActive] = useState(quickStartContent.tabs[0].id);
  const tab = quickStartContent.tabs.find((item) => item.id === active) ?? quickStartContent.tabs[0];

  return (
    <section className="lp-section" id="quickstart">
      <div className="container">
        <SectionHeading
          overline={quickStartContent.overline}
          title={quickStartContent.title}
          accent={quickStartContent.accent}
          description={quickStartContent.description}
        />
        <Reveal className="lp-quickstart">
          <TabList
            items={quickStartContent.tabs}
            value={active}
            onChange={setActive}
            label={uiText.installationMethod}
            idPrefix="quickstart"
          />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab.id}
              id={`quickstart-${tab.id}-panel`}
              role="tabpanel"
                tabIndex={0}
              aria-labelledby={`quickstart-${tab.id}-tab`}
              className="lp-quickstart-panel"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <div className="lp-quickstart-steps">
                {tab.steps.map((step, index) => (
                  <div className="lp-quickstart-step" key={step.label}>
                    <span className="lp-step-index">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <h3>{step.label}</h3>
                      <CodeBlock code={step.code} />
                    </div>
                  </div>
                ))}
              </div>
              <aside className="lp-dashboard-callout">
                <span className="lp-callout-icon">
                  <Icon name="dashboard" size={20} />
                </span>
                <p>{quickStartContent.dashboardLabel}</p>
                <a href={uiText.dashboardUrl} target="_blank" rel="noreferrer">
                  {uiText.dashboardUrl}
                  <Icon name="arrowUpRight" size={14} />
                </a>
                <p className="lp-callout-note">{quickStartContent.dashboardHint}</p>
              </aside>
            </motion.div>
          </AnimatePresence>
          <div className="lp-registry-install">
            <a className="lp-inline-link" href={quickStartContent.download.href} download>{quickStartContent.download.label}<Icon name="arrow" size={13} /></a>
            {quickStartContent.registryCommand ? <CodeBlock title={quickStartContent.registryLabel} code={quickStartContent.registryCommand} /> : null}
          </div>
          <p className="lp-quickstart-note">
            <Icon name="alert" size={15} />
            {quickStartContent.note}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
