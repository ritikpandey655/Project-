/// <reference types="vite/client" />

// PWA Install Prompt Event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface WindowEventMap {
  'beforeinstallprompt': BeforeInstallPromptEvent;
}

// Environment variables
interface ImportMetaEnv {
  readonly API_KEY: string;
  readonly VITE_APP_TITLE: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global window extensions
interface Window {
  deferInstallPrompt?: any;
}
