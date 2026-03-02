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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { userAPI, postAPI, eventAPI } from '../services/api';
import { COLORS, ROLES } from '../config/constants';

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
    <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.border }]} onPress={onPress} disabled={!onPress}>
      <View style={[styles.menuIcon, { backgroundColor: `${theme.primary}15` }]}>
        <Ionicons name={icon} size={22} color={theme.primary} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, { color: theme.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.menuSubtitle, { color: theme.gray }]}>{subtitle}</Text>}
      </View>
      {rightComponent || (showArrow && (
        <Ionicons name="chevron-forward" size={20} color={theme.gray} />
      ))}
    </TouchableOpacity>
  );

  const StatCard = ({ value, label }) => (
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
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Profile Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>
            {user?.name?.charAt(0) || '?'}
          </Text>
        </View>
        <Text style={[styles.userName, { color: theme.text }]}>{user?.name}</Text>
        <Text style={[styles.userPid, { color: theme.textSecondary }]}>{user?.pid}</Text>
        <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(user?.role) }]}>
          <Text style={styles.roleBadgeText}>{user?.role?.toUpperCase()}</Text>
        </View>
        <Text style={[styles.department, { color: theme.textSecondary }]}>{user?.department}</Text>
      </View>

      {/* Stats */}
      <View style={[styles.statsContainer, { backgroundColor: theme.surface }]}>
        <StatCard value={stats?.postsCount || 0} label="Posts" />
        <StatCard value={stats?.eventsAttended || 0} label="Events" />
        <StatCard value={user?.graduation_year || '-'} label="Grad Year" />
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.gray }]}>Account</Text>
        <View style={[styles.menuGroup, { backgroundColor: theme.surface }]}>
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
        <Text style={[styles.sectionTitle, { color: theme.gray }]}>Preferences</Text>
        <View style={[styles.menuGroup, { backgroundColor: theme.surface }]}>
          <MenuItem
            icon="notifications-outline"
            title="Push Notifications"
            subtitle="Receive alerts for new posts and events"
            showArrow={false}
            rightComponent={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: theme.gray, true: theme.primary }}
                thumbColor={COLORS.white}
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
                trackColor={{ false: theme.gray, true: theme.primary }}
                thumbColor={COLORS.white}
              />
            }
          />
        </View>
      </View>

      {/* Admin Section */}
      {user?.role === ROLES.ADMIN && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.gray }]}>Admin Tools</Text>
          <View style={[styles.menuGroup, { backgroundColor: theme.surface }]}>
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
        <Text style={[styles.sectionTitle, { color: theme.gray }]}>Information</Text>
        <View style={[styles.menuGroup, { backgroundColor: theme.surface }]}>
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
        style={[
          styles.logoutButton, 
          { 
            backgroundColor: theme.surface,
            borderColor: theme.danger
          }
        ]} 
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={22} color={theme.danger} />
        <Text style={[styles.logoutText, { color: theme.danger }]}>Logout</Text>
      </TouchableOpacity>

      <View style={[styles.footer, { backgroundColor: theme.background }]}>
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>Campus Connect © 2024</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: COLORS.white,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarLargeText: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  userPid: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  roleBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  department: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    marginTop: -20,
    marginHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCard: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  menuGroup: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  menuSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.gray,
  },
});

export default ProfileScreen;
