
// Asset declarations
declare module '*.png' {
  const pngSrc: string
  export default pngSrc
}

declare module '*.jpg' {
  const jpgSrc: string
  export default jpgSrc
}

declare module '*.jpeg' {
  const jpegSrc: string
  export default jpegSrc
}

declare module '*.svg' {
  const svgSrc: string
  export default svgSrc
}

declare module '*.ico' {
  const icoSrc: string
  export default icoSrc
}

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
