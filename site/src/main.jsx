import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { DocsPage, LandingPage } from './App.jsx';
import './styles.css';

const page = document.documentElement.dataset.page;
hydrateRoot(document.getElementById('root'), page === 'landing' ? <LandingPage /> : <DocsPage page={page} />);
