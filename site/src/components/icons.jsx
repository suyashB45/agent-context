import React from 'react';

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function Svg({ size = 20, className, children, filled = false, ...props }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      focusable="false"
      {...(filled ? { fill: 'currentColor' } : strokeProps)}
      {...props}
    >
      {children}
    </svg>
  );
}

export function Icon({ name, size = 20, className, ...props }) {
  switch (name) {
    case 'arrow':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </Svg>
      );
    case 'arrowUpRight':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="M7 17 17 7M8 7h9v9" />
        </Svg>
      );
    case 'copy':
      return (
        <Svg size={size} className={className} {...props}>
          <rect x="8" y="8" width="11" height="12" rx="2" />
          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2" />
        </Svg>
      );
    case 'check':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="m5 12 4 4L19 6" />
        </Svg>
      );
    case 'sun':
      return (
        <Svg size={size} className={className} {...props}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </Svg>
      );
    case 'moon':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
        </Svg>
      );
    case 'menu':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </Svg>
      );
    case 'close':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="M6 6l12 12M18 6 6 18" />
        </Svg>
      );
    case 'github':
      return (
        <svg
          aria-hidden="true"
          className={className}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          focusable="false"
          {...props}
        >
          <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-1.05-.01-1.9-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.35 9.35 0 0 1 12 6.98c.85 0 1.7.12 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.04 10.04 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
        </svg>
      );
    case 'book':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5Z" />
          <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20M8 7h8M8 11h6" />
        </Svg>
      );
    case 'key':
      return (
        <Svg size={size} className={className} {...props}>
          <circle cx="8" cy="8" r="4" />
          <path d="m11 11 9 9M16 16l2-2M18 18l2-2" />
        </Svg>
      );
    case 'pen':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </Svg>
      );
    case 'handoff':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="M4 8h13M14 5l3 3-3 3M20 16H7M10 13l-3 3 3 3" />
        </Svg>
      );
    case 'database':
      return (
        <Svg size={size} className={className} {...props}>
          <ellipse cx="12" cy="5.5" rx="7" ry="3" />
          <path d="M5 5.5v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6M5 11.5v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6" />
        </Svg>
      );
    case 'ticket':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 5v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2.5 2.5 0 0 0 0-5V7Z" />
          <path d="M13 5v14" strokeDasharray="2 3" />
        </Svg>
      );
    case 'search':
      return (
        <Svg size={size} className={className} {...props}>
          <circle cx="11" cy="11" r="6" />
          <path d="m16 16 4 4M8.5 11h5M11 8.5v5" />
        </Svg>
      );
    case 'dashboard':
      return (
        <Svg size={size} className={className} {...props}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16M9 11h12M3 9h6" />
        </Svg>
      );
    case 'shield':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="M12 3 20 6v6c0 4.6-3.4 8.2-8 9-4.6-.8-8-4.4-8-9V6l8-3Z" />
          <path d="m8.5 12 2.3 2.3 4.7-5" />
        </Svg>
      );
    case 'sqlite':
      return (
        <Svg size={size} className={className} {...props}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M7 8h10M7 12h4M7 16h10" />
          <circle cx="16.5" cy="12" r=".8" fill="currentColor" stroke="none" />
        </Svg>
      );
    case 'lan':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="M5 12.5a10 10 0 0 1 14 0M8 15.5a6 6 0 0 1 8 0M11 18.5a2 2 0 0 1 2 0" />
          <circle cx="12" cy="21" r=".8" fill="currentColor" stroke="none" />
        </Svg>
      );
    case 'vpn':
      return (
        <Svg size={size} className={className} {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c3 2.7 3 15.3 0 18M12 3c-3 2.7-3 15.3 0 18" />
        </Svg>
      );
    case 'ssh':
      return (
        <Svg size={size} className={className} {...props}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="m7 9 3 3-3 3M13 15h4" />
        </Svg>
      );
    case 'https':
      return (
        <Svg size={size} className={className} {...props}>
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V8a4 4 0 0 1 8 0v2" />
          <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
        </Svg>
      );
    case 'claude':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
          <circle cx="12" cy="12" r="2.5" />
        </Svg>
      );
    case 'codex':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="m8 7-4 5 4 5M16 7l4 5-4 5M13.5 5l-3 14" />
        </Svg>
      );
    case 'cursor':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="m5 4 14 8-6 1.5L10 20 5 4Z" />
        </Svg>
      );
    case 'vscode':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="m4 7 7-4 9 4v10l-9 4-7-4V7Z" />
          <path d="m4 7 9 5 7-5M13 12v9" />
        </Svg>
      );
    case 'gemini':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="M12 3c.7 4.8 3.2 7.3 8 8-4.8.7-7.3 3.2-8 8-.7-4.8-3.2-7.3-8-8 4.8-.7 7.3-3.2 8-8Z" />
        </Svg>
      );
    case 'mcp':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="M8 10v4M12 8v8M16 10v4" />
        </Svg>
      );
    case 'alert':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="M12 3 2.5 20h19L12 3Z" />
          <path d="M12 9v5M12 17.5v.1" />
        </Svg>
      );
    case 'checkCircle':
      return (
        <Svg size={size} className={className} {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.5 2.5L16.5 9" />
        </Svg>
      );
    case 'xCircle':
      return (
        <Svg size={size} className={className} {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="m9 9 6 6M15 9l-6 6" />
        </Svg>
      );
    case 'terminal':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="m5 8 4 4-4 4M12 16h7" />
        </Svg>
      );
    case 'layers':
      return (
        <Svg size={size} className={className} {...props}>
          <path d="m12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 17l9 5 9-5" />
        </Svg>
      );
    default:
      return (
        <Svg size={size} className={className} {...props}>
          <circle cx="12" cy="12" r="8" />
        </Svg>
      );
  }
}
