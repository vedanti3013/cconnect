/**
 * Theme Configuration
 * Light and Dark theme colors
 */

export const lightTheme = {
  // Primary colors
  primary: '#6366F1',        // Indigo
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  
  // Secondary colors
  secondary: '#10B981',      // Emerald
  secondaryLight: '#6EE7B7',
  secondaryDark: '#059669',
  
  // Accent colors
  accent: '#F59E0B',         // Amber
  accentLight: '#FCD34D',
  accentDark: '#D97706',
  
  // Status colors
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  dark: '#1F2937',
  gray: '#6B7280',
  grayLight: '#9CA3AF',
  lightGray: '#E5E7EB',
  lighter: '#F3F4F6',
  lightest: '#F9FAFB',
  
  // Semantic colors
  background: '#F9FAFB',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.2)',
  
  // Specific use cases
  urgent: '#DC2626',
  pending: '#F97316',
  voted: '#10B981',
  hover: '#F3F4F6',
};

export const darkTheme = {
  // Primary colors
  primary: '#818CF8',        // Indigo (lighter for dark mode)
  primaryLight: '#A5B4FC',
  primaryDark: '#6366F1',
  
  // Secondary colors
  secondary: '#10B981',      // Emerald
  secondaryLight: '#6EE7B7',
  secondaryDark: '#059669',
  
  // Accent colors
  accent: '#FBBF24',         // Amber (lighter)
  accentLight: '#FCD34D',
  accentDark: '#D97706',
  
  // Status colors
  success: '#10B981',
  danger: '#F87171',
  warning: '#FBBF24',
  info: '#60A5FA',
  
  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  dark: '#0F172A',
  gray: '#D1D5DB',
  grayLight: '#9CA3AF',
  lightGray: '#4B5563',
  lighter: '#1E293B',
  lightest: '#0F172A',
  
  // Semantic colors
  background: '#0F172A',
  surface: '#1E293B',
  card: '#1E293B',
  text: '#F1F5F9',
  textSecondary: '#CBD5E1',
  border: '#334155',
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowDark: 'rgba(0, 0, 0, 0.5)',
  
  // Specific use cases
  urgent: '#F87171',
  pending: '#FB923C',
  voted: '#34D399',
  hover: '#334155',
};

export const getTheme = (isDark) => isDark ? darkTheme : lightTheme;
