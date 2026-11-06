import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { dashboardContent, siteBrand, uiText } from '../content.js';
import { Icon } from '../components/icons.jsx';
import { CodeBlock, Reveal, SectionHeading, TabList } from '../components/ui.jsx';

function DashboardPanel({ tab }) {
  if (tab.kind === 'code') {
    return (
      <div className="lp-dash-panel">
        <div className="lp-dash-panel-head">
          <p className="lp-dash-eyebrow">{tab.eyebrow}</p>
          <h3>{tab.title}</h3>
          <p>{tab.description}</p>
        </div>
        <CodeBlock code={tab.code} title={tab.codeLabel} />
        <p className="lp-dash-note">{tab.note}</p>
      </div>
    );
  }

  return (
    <div className="lp-dash-panel">
      <div className="lp-dash-panel-head">
        <p className="lp-dash-eyebrow">{tab.eyebrow}</p>
        <h3>{tab.title}</h3>
        <p>{tab.description}</p>
      </div>
      <div className="lp-dash-rows">
        {tab.rows.map((row) => (
          <div className="lp-dash-row" key={`${tab.id}-${row.name}`}>
            <span className="lp-dash-avatar" aria-hidden="true">
              {row.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="lp-dash-row-copy">
              <strong>{row.name}</strong>
              <small>{row.meta}</small>
            </span>
            <span className="lp-dash-status">{row.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardPreview() {
  const [active, setActive] = useState(dashboardContent.tabs[0].id);
  const tab = dashboardContent.tabs.find((item) => item.id === active) ?? dashboardContent.tabs[0];

  return (
    <section className="lp-section" id="dashboard">
      <div className="container">
        <SectionHeading
          overline={dashboardContent.overline}
          title={dashboardContent.title}
          accent={dashboardContent.accent}
          description={dashboardContent.description}
        />
        <Reveal className="lp-browser">
          <div className="lp-browser-bar">
            <span className="lp-window-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="lp-browser-url">
              <Icon name="shield" size={12} />
              {uiText.dashboardUrl}
            </span>
            <span className="lp-example-pill">{uiText.exampleData}</span>
          </div>
          <div className="lp-dash">
            <div className="lp-dash-top">
              <span className="lp-dash-brand">
                <span className="lp-dash-mark" aria-hidden="true">
                  {uiText.dashboardMark}
                </span>
                <span>
                  <strong>{siteBrand.name}</strong>
                  <small>{uiText.dashboardProject}</small>
                </span>
              </span>
              <span className="lp-dash-instance">
                <span className="lp-live-dot" />
                {uiText.localInstance}
              </span>
            </div>
            <TabList
              items={dashboardContent.tabs}
              value={active}
              onChange={setActive}
              label={uiText.dashboardTabs}
              idPrefix="dashboard"
            />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab.id}
                id={`dashboard-${tab.id}-panel`}
                role="tabpanel"
                tabIndex={0}
                aria-labelledby={`dashboard-${tab.id}-tab`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <DashboardPanel tab={tab} />
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
        <p className="lp-section-footnote">{dashboardContent.caption}</p>
      </div>
    </section>
  );
}
