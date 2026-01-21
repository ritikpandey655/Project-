import { Camera } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { PushNotifications } from '@capacitor/push-notifications';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();

// Initialize native features
export const initializeCapacitor = async () => {
  if (!isNative) return;

  try {
    // Hide splash screen after app is ready
    await SplashScreen.hide();

    // Configure status bar
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#5B2EFF' });

    // Request push notification permissions
    const result = await PushNotifications.requestPermissions();
    if (result.receive === 'granted') {
      await PushNotifications.register();
    }

    // Listen to push notifications
    PushNotifications.addListener('registration', token => {
      console.log('Push registration success, token: ' + token.value);
      // Save token to Firebase for sending notifications
      Preferences.set({ key: 'fcm_token', value: token.value });
    });

    PushNotifications.addListener('registrationError', err => {
      console.error('Registration error: ', err.error);
    });

    PushNotifications.addListener('pushNotificationReceived', notification => {
      console.log('Push notification received: ', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', notification => {
      console.log('Push notification action performed', notification);
    });

    // App state listeners
    CapApp.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active?', isActive);
    });

    CapApp.addListener('appUrlOpen', data => {
      console.log('App opened with URL:', data);
    });

    // Network status
    Network.addListener('networkStatusChange', status => {
      console.log('Network status changed', status);
    });

  } catch (error) {
    console.error('Capacitor initialization error:', error);
  }
};

// Camera utilities
export const takePicture = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: 'dataUrl',
      source: 'camera'
    });
    return image.dataUrl;
  } catch (error) {
    console.error('Camera error:', error);
    return null;
  }
};

export const pickImage = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: 'dataUrl',
      source: 'photos'
    });
    return image.dataUrl;
  } catch (error) {
    console.error('Image picker error:', error);
    return null;
  }
};

// Share utilities
export const shareContent = async (title: string, text: string, url?: string) => {
  try {
    await Share.share({
      title,
      text,
      url,
      dialogTitle: 'Share via'
    });
  } catch (error) {
    console.error('Share error:', error);
  }
};

// Filesystem utilities
export const saveFile = async (filename: string, data: string) => {
  try {
    const result = await Filesystem.writeFile({
      path: filename,
      data: data,
      directory: 'documents'
    });
    return result.uri;
  } catch (error) {
    console.error('File save error:', error);
    return null;
  }
};

export const readFile = async (filename: string) => {
  try {
    const result = await Filesystem.readFile({
      path: filename,
      directory: 'documents'
    });
    return result.data;
  } catch (error) {
    console.error('File read error:', error);
    return null;
  }
};

// Preferences (Key-Value storage)
export const savePreference = async (key: string, value: string) => {
  await Preferences.set({ key, value });
};

export const getPreference = async (key: string) => {
  const { value } = await Preferences.get({ key });
  return value;
};

export const removePreference = async (key: string) => {
  await Preferences.remove({ key });
};

// Check network status
export const getNetworkStatus = async () => {
  const status = await Network.getStatus();
  return status;
};

// App info
export const getAppInfo = async () => {
  if (!isNative) return null;
  const info = await CapApp.getInfo();
  return info;
};

export default {
  isNative,
  platform,
  initializeCapacitor,
  takePicture,
  pickImage,
  shareContent,
  saveFile,
  readFile,
  savePreference,
  getPreference,
  removePreference,
  getNetworkStatus,
  getAppInfo
};
