import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { headerActions, navLinks, uiText } from '../content.js';
import { Icon } from './icons.jsx';
import { Logo, ThemeToggle } from './ui.jsx';

function resolveHref(href, docs) {
  if (!href.startsWith('#')) return href;
  return docs ? `/${href}` : href;
}

export function Header({ docs = false }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { setOpen(false); menuRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const linkHref = (href) => resolveHref(href, docs);
  const getStarted = linkHref(headerActions.getStarted.href);

  return (
    <header className="site-header lp-header">
      <div className="container header-inner lp-header-inner">
        <Logo />
        <nav className="lp-nav" aria-label={uiText.mainNavigation}>
          {navLinks.map((link) => (
            <a key={link.label} href={linkHref(link.href)}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="lp-header-actions">
          <a
            className="lp-github-button"
            href={headerActions.github.href}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="github" size={16} />
            <span>{headerActions.github.label}</span>
          </a>
          <ThemeToggle />
          <a className="site-button primary small lp-header-cta" href={getStarted}>
            {headerActions.getStarted.label}
            <Icon name="arrow" size={14} />
          </a>
          <button
            type="button"
            className="lp-menu-button"
            ref={menuRef}
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? uiText.closeMenu : uiText.menu}
          >
            <Icon name={open ? 'close' : 'menu'} size={19} />
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.nav
            id="mobile-navigation"
            className="lp-mobile-nav"
            aria-label={uiText.mobileNavigation}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="lp-mobile-nav-inner">
              {navLinks.map((link) => (
                <a key={link.label} href={linkHref(link.href)} onClick={() => setOpen(false)}>
                  {link.label}
                  <Icon name="arrow" size={14} />
                </a>
              ))}
              <a
                href={headerActions.github.href}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
              >
                {headerActions.github.label}
                <Icon name="arrowUpRight" size={14} />
              </a>
              <a
                className="site-button primary"
                href={getStarted}
                onClick={() => setOpen(false)}
              >
                {headerActions.getStarted.label}
                <Icon name="arrow" size={14} />
              </a>
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
