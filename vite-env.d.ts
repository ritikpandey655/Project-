// Augment the NodeJS namespace to include typed environment variables
// This prevents "Cannot redeclare block-scoped variable 'process'" errors
// while ensuring process.env.API_KEY is recognized.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    [key: string]: any;
  }
}

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