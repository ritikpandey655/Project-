import React, { ReactNode, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("Uncaught Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#111827', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Something went wrong 😓</h1>
          <p style={{ color: '#9CA3AF', marginBottom: '2rem' }}>Please try refreshing the page.</p>
          <pre style={{ backgroundColor: '#1F2937', padding: '1rem', borderRadius: '0.5rem', overflow: 'auto', maxWidth: '90%', textAlign: 'left', fontSize: '0.8rem' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', backgroundColor: '#5B2EFF', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Refresh App
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// PWA Install Prompt Handler
const INSTALL_DISMISSED_KEY = 'pyqverse_install_dismissed';

let deferredPrompt: any = null;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('PWA: beforeinstallprompt event fired');
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  (window as any).deferredPrompt = e;
  
  // Check if user hasn't dismissed the prompt
  const isDismissed = localStorage.getItem(INSTALL_DISMISSED_KEY);
  if (!isDismissed) {
    // Dispatch custom event to show banner
    window.dispatchEvent(new Event('pwa-ready'));
    console.log('PWA: pwa-ready event dispatched');
  }
});

window.addEventListener('appinstalled', () => {
  console.log('PWA: App successfully installed');
  deferredPrompt = null;
  (window as any).deferredPrompt = null;
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('PWA: Service Worker registered successfully:', registration.scope);
      })
      .catch(error => {
        console.error('PWA: Service Worker registration failed:', error);
      });
  });
}