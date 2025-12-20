import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.pyqverse.app',
  appName: 'PYQverse',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;