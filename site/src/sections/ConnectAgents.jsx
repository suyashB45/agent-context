import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { connectContent, uiText } from '../content.js';
import { Icon } from '../components/icons.jsx';
import { CodeBlock, Reveal, SectionHeading, TabList } from '../components/ui.jsx';

export function ConnectAgents() {
  const [active, setActive] = useState(connectContent.tabs[0].id);
  const tab = connectContent.tabs.find((item) => item.id === active) ?? connectContent.tabs[0];

  return (
    <section className="lp-section" id="connect">
      <div className="container">
        <SectionHeading
          overline={connectContent.overline}
          title={connectContent.title}
          accent={connectContent.accent}
          description={connectContent.description}
        />
        <div className="lp-connect-grid">
          <Reveal className="lp-connect-config">
            <TabList
              items={connectContent.tabs}
              value={active}
              onChange={setActive}
              label={uiText.mcpClient}
              idPrefix="connect"
            />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab.id}
                id={`connect-${tab.id}-panel`}
                role="tabpanel"
                tabIndex={0}
                aria-labelledby={`connect-${tab.id}-tab`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <CodeBlock code={tab.command} title={connectContent.configTitle.toUpperCase()} />
              </motion.div>
            </AnimatePresence>
            <ul className="lp-connect-notes">
              {connectContent.notes.map((note) => (
                <li key={note}>
                  <Icon name="check" size={13} />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal className="lp-instructions" delay={0.08}>
            <div className="lp-instructions-head">
              <span className="lp-instructions-icon">
                <Icon name="terminal" size={18} />
              </span>
              <h3>{connectContent.instructions.title}</h3>
            </div>
            <CodeBlock
              code={connectContent.instructions.code}
              title={uiText.instructionsLabel}
              className="lp-instructions-code"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
