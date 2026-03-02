/**
 * Cross-platform storage utility
 * Uses localStorage on web, SecureStore on native
 */

import { Platform } from 'react-native';

let SecureStore = null;

if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

export const getItemAsync = async (key) => {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('localStorage getItem error:', e);
      return null;
    }
  }
  return await SecureStore.getItemAsync(key);
};

export const setItemAsync = async (key, value) => {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('localStorage setItem error:', e);
    }
    return;
  }
  return await SecureStore.setItemAsync(key, value);
};

export const deleteItemAsync = async (key) => {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('localStorage removeItem error:', e);
    }
    return;
  }
  return await SecureStore.deleteItemAsync(key);
};
