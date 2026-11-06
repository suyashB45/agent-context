import React from 'react';
import { footerContent, siteBrand } from '../content.js';
import { Logo } from '../components/ui.jsx';

function resolveHref(href, docs) {
  if (!href.startsWith('#')) return href;
  return docs ? `/${href}` : href;
}

export function Footer({ docs = false }) {
  return (
    <footer className="lp-footer">
      <div className="container">
        <div className="lp-footer-top">
          <div className="lp-footer-brand">
            <Logo />
            <p>{footerContent.tagline}</p>
            <span className="lp-footer-version">{footerContent.bottomNote}</span>
          </div>
          <div className="lp-footer-columns">
            {footerContent.columns.map((column) => (
              <div key={column.title} className="lp-footer-column">
                <h3>{column.title}</h3>
                {column.links.map((link) => (
                  <a
                    key={link.label}
                    href={resolveHref(link.href, docs)}
                    {...(link.href.startsWith('http')
                      ? { target: '_blank', rel: 'noreferrer' }
                      : {})}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>{footerContent.bottom} · {footerContent.creator}</span>
          <div className="lp-profile-links">{footerContent.profileLinks.map((link) => <a key={link.url} href={link.url} {...(link.url.startsWith('https:') ? { target: '_blank', rel: 'noreferrer' } : {})}>{link.label}</a>)}</div>
          <span>
            {siteBrand.name} · {siteBrand.releaseLabel}
          </span>
        </div>
      </div>
    </footer>
  );
}
