/// <reference types="vite/client" />

export {};

declare global {
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
      outcome: 'accepted' | 'dismissed';
      platform: string;
    }>;
    prompt(): Promise<void>;
  }

  interface Window {
    deferInstallPrompt?: BeforeInstallPromptEvent;
  }
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }

  namespace NodeJS {
    interface ProcessEnv {
      API_KEY: string;
      [key: string]: any;
    }
  }
}