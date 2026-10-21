import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ToastProvider } from '@/context/ToastContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { QuoteCartProvider } from '@/context/QuoteCartContext';
import { AuthProvider } from '@/context/AuthContext';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Point de montage #root introuvable');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <SettingsProvider>
          <QuoteCartProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </QuoteCartProvider>
        </SettingsProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
