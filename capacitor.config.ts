import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.pyqverse.app',
  appName: 'PYQverse',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'pyqverse.in',
    // Clear text traffic for local development
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#5B2EFF',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#5B2EFF'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Camera: {
      permissions: {
        camera: 'Camera permission is required for doubt solver',
        photos: 'Photo access is required to upload questions'
      }
    },
    Filesystem: {
      permissions: {
        publicStorage: 'Storage access is required for offline papers and downloads'
      }
    }
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK'
    }
  }
};

export default config;
