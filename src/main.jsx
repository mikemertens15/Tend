import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './auth/AuthProvider';
import { HouseholdProvider } from './household/HouseholdProvider';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <HouseholdProvider>
        <App />
      </HouseholdProvider>
    </AuthProvider>
  </StrictMode>,
);

// Registers the service worker that makes Tend installable. Only in a real
// build: in dev it would sit in front of Vite's module graph and fight HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Installability is a nicety; the app works fine without it.
    });
  });
}
