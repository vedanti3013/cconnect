/**
 * Profile Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { userAPI, postAPI, eventAPI } from '../services/api';
import { COLORS, ROLES } from '../config/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      // Fetch user's activity stats
      const [postsRes, eventsRes, eventPostsRes] = await Promise.all([
        postAPI.getAll({ created_by: user?._id, is_event: 'false', page: 1, limit: 1 }),
        eventAPI.getAll({ created_by: user?._id, page: 1, limit: 1 }),
        postAPI.getAll({ created_by: user?._id, is_event: 'true', page: 1, limit: 1 }),
      ]);

      const postsCount = postsRes.data.data.pagination?.total_posts || 0;
      const userCreatedEvents = eventsRes.data.data.pagination?.total_events || 0;
      const eventPostsCount = eventPostsRes.data.data.pagination?.total_posts || 0;

      setStats({
        postsCount,
        eventsAttended: userCreatedEvents + eventPostsCount,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        logout();
      }
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Logout', style: 'destructive', onPress: logout },
        ]
      );
    }
  };

  const MenuItem = ({ icon, title, subtitle, onPress, showArrow = true, rightComponent }) => (
    <TouchableOpacity 
      style={[styles.menuItem, { borderBottomColor: theme.border }]} 
      onPress={onPress} 
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcon, { backgroundColor: `${theme.primary}15` }]}>
        <Ionicons name={icon} size={20} color={theme.primary} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, { color: theme.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.menuSubtitle, { color: theme.gray }]}>{subtitle}</Text>}
      </View>
      {rightComponent || (showArrow && (
        <Ionicons name="chevron-forward" size={18} color={theme.gray} />
      ))}
    </TouchableOpacity>
  );

  const StatCard = ({ value, label, icon }) => (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color: theme.primary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.gray }]}>{label}</Text>
    </View>
  );

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case ROLES.ADMIN: return COLORS.danger;
      case ROLES.TEACHER: return COLORS.secondary;
      case ROLES.COMMITTEE: return COLORS.accent;
      default: return COLORS.primary;
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.innerContainer}>
        {/* Profile Header Card */}
        <View style={[styles.header, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.headerGradient, { backgroundColor: theme.primary }]} />
          <View style={styles.avatarWrapper}>
            <View style={[styles.avatarLarge, { borderColor: theme.surface }]}>
              <Text style={styles.avatarLargeText}>
                {user?.name?.charAt(0) || '?'}
              </Text>
            </View>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.userName, { color: theme.text }]}>{user?.name}</Text>
            <Text style={[styles.userPid, { color: theme.textSecondary }]}>{user?.pid}</Text>
            <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(user?.role) }]}>
              <Text style={styles.roleBadgeText}>{user?.role?.toUpperCase()}</Text>
            </View>
            <View style={styles.departmentRow}>
              <Ionicons name="school-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.department, { color: theme.textSecondary }]}> {user?.department}</Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={[styles.statsContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <StatCard value={stats?.postsCount || 0} label="Posts" />
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <StatCard value={stats?.eventsAttended || 0} label="Events" />
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <StatCard value={user?.graduation_year || '-'} label="Grad Year" />
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.gray }]}>ACCOUNT</Text>
          <View style={[styles.menuGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MenuItem
              icon="person-outline"
              title="Edit Profile"
              subtitle="Update your personal information"
              onPress={() => Alert.alert('Coming Soon', 'Profile editing will be available in a future update')}
            />
            <MenuItem
              icon="key-outline"
              title="Change Password"
              subtitle="Update your account password"
              onPress={() => Alert.alert('Coming Soon', 'Password change will be available in a future update')}
            />
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.gray }]}>PREFERENCES</Text>
          <View style={[styles.menuGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MenuItem
              icon="notifications-outline"
              title="Push Notifications"
              subtitle="Receive alerts for new posts and events"
              showArrow={false}
              rightComponent={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#D1D5DB', true: `${theme.primary}80` }}
                  thumbColor={notificationsEnabled ? theme.primary : '#F3F4F6'}
                />
              }
            />
            <MenuItem
              icon={isDarkMode ? "sunny-outline" : "moon-outline"}
              title="Dark Mode"
              subtitle={isDarkMode ? "Enabled" : "Disabled"}
              showArrow={false}
              rightComponent={
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#D1D5DB', true: `${theme.primary}80` }}
                  thumbColor={isDarkMode ? theme.primary : '#F3F4F6'}
                />
              }
            />
          </View>
        </View>

        {/* Admin Section */}
        {user?.role === ROLES.ADMIN && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.gray }]}>ADMIN TOOLS</Text>
            <View style={[styles.menuGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <MenuItem
                icon="analytics-outline"
                title="Analytics Dashboard"
                subtitle="View campus engagement metrics"
                onPress={() => navigation.navigate('Analytics')}
              />
              <MenuItem
                icon="people-outline"
                title="User Management"
                subtitle="Manage campus users"
                onPress={() => Alert.alert('Coming Soon', 'User management will be available in a future update')}
              />
            </View>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.gray }]}>INFORMATION</Text>
          <View style={[styles.menuGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MenuItem
              icon="information-circle-outline"
              title="About Campus Connect"
              subtitle="Version 1.0.0"
              onPress={() => Alert.alert('Campus Connect', 'A Centralized Role-Based Institutional Communication Platform\n\nVersion 1.0.0')}
            />
            <MenuItem
              icon="help-circle-outline"
              title="Help & Support"
              subtitle="Get help with the app"
              onPress={() => Alert.alert('Support', 'For support, please contact your campus administration.')}
            />
            <MenuItem
              icon="document-text-outline"
              title="Terms of Service"
              onPress={() => Alert.alert('Terms of Service', 'Please review the terms of service for using Campus Connect.')}
            />
            <MenuItem
              icon="shield-outline"
              title="Privacy Policy"
              onPress={() => Alert.alert('Privacy Policy', 'Your data is securely stored and never shared with third parties.')}
            />
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: theme.surface, borderColor: theme.danger }]} 
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.danger} />
          <Text style={[styles.logoutText, { color: theme.danger }]}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>Campus Connect © 2024</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  innerContainer: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    backgroundColor: COLORS.white,
    alignItems: 'center',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerGradient: {
    width: '100%',
    height: 80,
    backgroundColor: COLORS.primary,
  },
  avatarWrapper: {
    marginTop: -44,
    alignItems: 'center',
  },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  avatarLargeText: {
    color: COLORS.white,
    fontSize: 34,
    fontWeight: '700',
  },
  headerInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  userPid: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 10,
  },
  roleBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  departmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  department: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 18,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 3,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },

  // Sections
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 8,
    letterSpacing: 0.8,
    paddingLeft: 4,
  },
  menuGroup: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  menuSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.gray,
  },
});

export default ProfileScreen;
