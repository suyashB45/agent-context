import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { siteBrand, uiText } from '../content.js';
import { Icon } from './icons.jsx';

export function Logo({ className = '' }) {
  return (
    <a className={`site-brand ${className}`.trim()} href="/" aria-label={`${siteBrand.name} home`}>
      <span className="site-logo" aria-hidden="true">
        <svg viewBox="0 0 30 30" fill="none">
          <path d="M15 3 27 10v11l-12 7L3 21V10L15 3Z" stroke="var(--mint)" strokeWidth="1.5" />
          <path d="m3 10 12 7 12-7M15 17v11M9 6.5l12 7v11" stroke="var(--blue)" strokeWidth="1.5" />
        </svg>
      </span>
      <span>
        {siteBrand.wordmark.lead}
        <span className="brand-thin">{siteBrand.wordmark.thin}</span>
      </span>
    </a>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  }, []);

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('agent-context-theme', next);
    } catch {
      setTheme(next);
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      className="lp-theme-toggle"
      onClick={toggle}
      aria-label={theme === 'light' ? uiText.themeDark : uiText.themeLight}
      title={theme === 'light' ? uiText.themeDark : uiText.themeLight}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -25, scale: 0.7 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 25, scale: 0.7 }}
          transition={{ duration: 0.18 }}
        >
          <Icon name={theme === 'light' ? 'moon' : 'sun'} size={17} />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const push = useCallback((message) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="lp-toast-region" aria-live="polite" aria-atomic="true">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              className="lp-toast"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.18 }}
            >
              <Icon name="check" size={14} />
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export function CopyButton({ text, label = uiText.copy }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast(uiText.copiedToast);
    } catch {
      toast(uiText.copyFailed);
    }
  };

  return (
    <button
      type="button"
      className={`lp-copy-button ${copied ? 'is-copied' : ''}`}
      onClick={copy}
      aria-label={copied ? uiText.copied : `${label} command`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? 'copied' : 'copy'}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.12 }}
        >
          {copied ? uiText.copied : label}
        </motion.span>
      </AnimatePresence>
      <Icon name={copied ? 'check' : 'copy'} size={13} />
    </button>
  );
}

export function CodeBlock({ code, title = uiText.terminalLabel, className = '' }) {
  return (
    <div className={`lp-code ${className}`.trim()}>
      <div className="lp-code-bar">
        <span>{title}</span>
        <CopyButton text={code} />
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function Reveal({ children, className = '', delay = 0, y = 18, ...props }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={!mounted || reduce || inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({ overline, title, accent, description, align = 'left' }) {
  return (
    <Reveal className={`lp-section-head lp-align-${align}`}>
      <p className="lp-overline">{overline}</p>
      <h2>
        {title}
        {accent ? <span>{accent}</span> : null}
      </h2>
      {description ? <p className="lp-lead">{description}</p> : null}
    </Reveal>
  );
}

export function TabList({ items, value, onChange, label, idPrefix }) {
  const onKeyDown = (event) => {
    const index = items.findIndex((item) => item.id === value);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % items.length;
    else if (event.key === 'ArrowLeft') next = (index + items.length - 1) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else return;
    event.preventDefault();
    onChange(items[next].id);
    const buttons = event.currentTarget.querySelectorAll('[role="tab"]');
    buttons[next]?.focus();
  };

  return (
    <div className="lp-tablist" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${idPrefix}-${item.id}-tab`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-${item.id}-panel`}
            tabIndex={selected ? 0 : -1}
            className={selected ? 'is-active' : ''}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
