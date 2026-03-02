/**
 * Dashboard Screen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { postAPI, eventAPI, pollAPI } from '../services/api';
import { COLORS, ROLES } from '../config/constants';

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    urgentPosts: [],
    upcomingEvents: [],
    activePolls: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [postsRes, eventsRes, pollsRes] = await Promise.all([
        postAPI.getAll({ is_urgent: 'true', limit: 3 }),
        eventAPI.getAll({ upcoming: 'true', limit: 3 }),
        pollAPI.getAll({ active: 'true', limit: 3 }),
      ]);

      setStats({
        urgentPosts: postsRes.data.data.posts || [],
        upcomingEvents: eventsRes.data.data.events || [],
        activePolls: pollsRes.data.data.polls || [],
      });
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const QuickAction = ({ icon, title, onPress, color }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color={COLORS.white} />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  const StatCard = ({ title, count, icon, color, onPress }) => (
    <TouchableOpacity style={styles.statCard} onPress={onPress}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color={COLORS.white} />
      </View>
      <View>
        <Text style={styles.statCount}>{count}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userRole}>{user?.role?.toUpperCase()} - {user?.department}</Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person-circle" size={48} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickAction
            icon="newspaper-outline"
            title="Feed"
            color={COLORS.primary}
            onPress={() => navigation.navigate('Feed')}
          />
          <QuickAction
            icon="calendar-outline"
            title="Events"
            color={COLORS.secondary}
            onPress={() => navigation.navigate('Events')}
          />
          <QuickAction
            icon="bar-chart-outline"
            title="Polls"
            color={COLORS.accent}
            onPress={() => navigation.navigate('Polls')}
          />
          <QuickAction
            icon="qr-code-outline"
            title="Scan QR"
            color={COLORS.info}
            onPress={() => navigation.navigate('Events', { screen: 'QRScanner' })}
          />
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <StatCard
          title="Urgent Posts"
          count={stats.urgentPosts.length}
          icon="alert-circle"
          color={COLORS.danger}
          onPress={() => navigation.navigate('Feed')}
        />
        <StatCard
          title="Upcoming Events"
          count={stats.upcomingEvents.length}
          icon="calendar"
          color={COLORS.secondary}
          onPress={() => navigation.navigate('Events')}
        />
        <StatCard
          title="Active Polls"
          count={stats.activePolls.length}
          icon="stats-chart"
          color={COLORS.accent}
          onPress={() => navigation.navigate('Polls')}
        />
      </View>

      {/* Urgent Posts */}
      {stats.urgentPosts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Urgent Announcements</Text>
            <Ionicons name="alert-circle" size={20} color={COLORS.danger} />
          </View>
          {stats.urgentPosts.map((post) => (
            <TouchableOpacity
              key={post._id}
              style={styles.urgentCard}
              onPress={() => navigation.navigate('Feed', {
                screen: 'PostDetail',
                params: { postId: post._id }
              })}
            >
              <Text style={styles.urgentTitle}>{post.title}</Text>
              <Text style={styles.urgentMeta}>
                {post.created_by?.name} • {new Date(post.created_at).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Upcoming Events */}
      {stats.upcomingEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          {stats.upcomingEvents.map((event) => (
            <TouchableOpacity
              key={event._id}
              style={styles.eventCard}
              onPress={() => navigation.navigate('Events', {
                screen: 'EventDetail',
                params: { eventId: event._id }
              })}
            >
              <View style={styles.eventDate}>
                <Text style={styles.eventDay}>
                  {new Date(event.date).getDate()}
                </Text>
                <Text style={styles.eventMonth}>
                  {new Date(event.date).toLocaleString('default', { month: 'short' })}
                </Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventMeta}>{event.location}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Admin Quick Access */}
      {user?.role === ROLES.ADMIN && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Admin Tools</Text>
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => navigation.navigate('Profile', { screen: 'Analytics' })}
          >
            <Ionicons name="analytics" size={24} color={COLORS.white} />
            <Text style={styles.adminButtonText}>View Analytics Dashboard</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footer} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: COLORS.white,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  userRole: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 8,
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statTitle: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  urgentCard: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  urgentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  urgentMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  eventCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventDate: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    minWidth: 50,
  },
  eventDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  eventMonth: {
    fontSize: 12,
    color: COLORS.white,
  },
  eventInfo: {
    marginLeft: 16,
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  eventMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  adminButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  footer: {
    height: 40,
  },
});

export default DashboardScreen;
