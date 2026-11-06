import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);
