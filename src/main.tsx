import {StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// Global error handler for debugging blank screen issues
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global Error:', { message, source, lineno, colno, error });
};

window.onunhandledrejection = (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
  // If it's a fetch error, it might be a connection issue
  if (event.reason instanceof Error && (event.reason.message.includes('fetch') || event.reason.message.includes('NetworkError'))) {
    console.warn('Possible network issue detected in unhandled rejection');
  }
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-[#0a2e24]">
            <div className="w-12 h-12 border-4 border-deenly-gold border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <App />
        </Suspense>
      </ErrorBoundary>
    </StrictMode>,
  );
} else {
  console.error('Root element not found!');
}
