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
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { postAPI, eventAPI, pollAPI, userAPI } from '../services/api';
import { COLORS, ROLES } from '../config/constants';

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const [stats, setStats] = useState({
    urgentPosts: [],
    upcomingEvents: [],
    activePolls: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchableEvents, setSearchableEvents] = useState([]);
  const [committeeUsers, setCommitteeUsers] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const [postsRes, eventsRes, eventPostsRes, pollsRes, committeesRes] = await Promise.all([
        postAPI.getAll({ is_urgent: 'true', limit: 3 }),
        eventAPI.getAll({ upcoming: 'true', limit: 50 }),
        postAPI.getAll({ limit: 200 }),
        pollAPI.getAll({ active: 'true', limit: 3 }),
        userAPI.getCommittees({ limit: 100 }),
      ]);

      const regularEvents = eventsRes.data.data.events || [];
      const eventPosts = eventPostsRes.data.data.posts || [];

      // Filter upcoming event posts and convert to event format
      const now = new Date();
      const upcomingEventPosts = eventPosts
        .filter(post => post.event_date && new Date(post.event_date) >= now)
        .map(post => ({
          _id: post._id,
          title: post.title,
          date: post.event_date,
          location: post.department,
          department: post.department,
          created_by: post.created_by,
          isFromPost: true,
        }));

      const allUpcomingEvents = [...regularEvents, ...upcomingEventPosts]
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      setSearchableEvents(allUpcomingEvents);
      setCommitteeUsers(committeesRes.data.data.users || []);

      // Combine and sort by date
      const dashboardUpcomingEvents = allUpcomingEvents
        .slice(0, 3);

      setStats({
        urgentPosts: postsRes.data.data.posts || [],
        upcomingEvents: dashboardUpcomingEvents,
        activePolls: pollsRes.data.data.polls || [],
      });
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

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

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchedEvents = normalizedQuery
    ? searchableEvents.filter((event) => (
        event.title?.toLowerCase().includes(normalizedQuery) ||
        event.location?.toLowerCase().includes(normalizedQuery) ||
        event.department?.toLowerCase().includes(normalizedQuery)
      ))
    : [];

  const matchedCommittees = normalizedQuery
    ? committeeUsers.filter((member) => (
        member.name?.toLowerCase().includes(normalizedQuery) ||
        member.pid?.toLowerCase().includes(normalizedQuery) ||
        member.department?.toLowerCase().includes(normalizedQuery)
      ))
    : [];

  const QuickAction = ({ icon, title, onPress, color }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color={COLORS.white} />
      </View>
      <Text style={[styles.quickActionText, { color: theme.text }]}>{title}</Text>
    </TouchableOpacity>
  );

  const StatCard = ({ title, count, icon, color, onPress, theme: themeObj }) => (
    <TouchableOpacity style={[styles.statCard, { backgroundColor: themeObj?.surface || COLORS.white }]} onPress={onPress}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color={COLORS.white} />
      </View>
      <View>
        <Text style={[styles.statCount, { color: themeObj?.primary || COLORS.primary }]}>{count}</Text>
        <Text style={[styles.statTitle, { color: themeObj?.textSecondary || COLORS.textSecondary }]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>{getGreeting()},</Text>
          <Text style={[styles.userName, { color: theme.text }]}>{user?.name || 'User'}</Text>
          <Text style={[styles.userRole, { color: theme.primary }]}>{user?.role?.toUpperCase()} - {user?.department}</Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person-circle" size={48} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search" size={18} color={theme.gray} />
        <TextInput
          style={[styles.searchInput, { color: theme.text, placeholderTextColor: theme.gray }]}
          placeholder="Search events or committee accounts"
          placeholderTextColor={theme.gray}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.trim().length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={theme.gray} />
          </TouchableOpacity>
        )}
      </View>

      {searchQuery.trim().length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Search Results</Text>

          <Text style={[styles.resultGroupTitle, { color: theme.textSecondary }]}>Events</Text>
          {matchedEvents.length > 0 ? (
            matchedEvents.slice(0, 5).map((event) => (
              <TouchableOpacity
                key={`event-${event._id}`}
                style={[styles.searchResultCard, { backgroundColor: theme.surface }]}
                onPress={() => {
                  if (event.isFromPost) {
                    navigation.navigate('Feed', {
                      screen: 'PostDetail',
                      params: { postId: event._id }
                    });
                  } else {
                    navigation.navigate('Events', {
                      screen: 'EventDetail',
                      params: { eventId: event._id }
                    });
                  }
                }}
              >
                <Ionicons name="calendar-outline" size={18} color={theme.secondary} />
                <View style={styles.searchResultTextWrap}>
                  <Text style={[styles.searchResultTitle, { color: theme.text }]}>{event.title}</Text>
                  <Text style={[styles.searchResultMeta, { color: theme.textSecondary }]}>{event.location}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={[styles.noSearchResultText, { color: theme.gray }]}>No events found</Text>
          )}

          <Text style={[styles.resultGroupTitle, styles.resultGroupSpacing, { color: theme.textSecondary }]}>Committee Accounts</Text>
          {matchedCommittees.length > 0 ? (
            matchedCommittees.slice(0, 5).map((member) => (
              <TouchableOpacity 
                key={`committee-${member._id}`} 
                style={[styles.searchResultCard, { backgroundColor: theme.surface }]}
                onPress={() => navigation.navigate('Profile', {
                  screen: 'UserDetail',
                  params: { userId: member._id }
                })}
              >
                <Ionicons name="people-outline" size={18} color={theme.primary} />
                <View style={styles.searchResultTextWrap}>
                  <Text style={[styles.searchResultTitle, { color: theme.text }]}>{member.name}</Text>
                  <Text style={[styles.searchResultMeta, { color: theme.textSecondary }]}>{member.pid} • {member.department}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={[styles.noSearchResultText, { color: theme.gray }]}>No committee accounts found</Text>
          )}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickAction
            icon="newspaper-outline"
            title="Feed"
            color={theme.primary}
            onPress={() => navigation.navigate('Feed')}
          />
          <QuickAction
            icon="calendar-outline"
            title="Events"
            color={theme.secondary}
            onPress={() => navigation.navigate('Events')}
          />
          <QuickAction
            icon="bar-chart-outline"
            title="Polls"
            color={theme.accent}
            onPress={() => navigation.navigate('Polls')}
          />
          <QuickAction
            icon="qr-code-outline"
            title="Scan QR"
            color={theme.info}
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
          color={theme.danger}
          onPress={() => navigation.navigate('Feed', { urgentOnly: true })}
          theme={theme}
        />
        <StatCard
          title="Upcoming Events"
          count={stats.upcomingEvents.length}
          icon="calendar"
          color={theme.secondary}
          onPress={() => navigation.navigate('Events')}
          theme={theme}
        />
        <StatCard
          title="Active Polls"
          count={stats.activePolls.length}
          icon="stats-chart"
          color={theme.accent}
          onPress={() => navigation.navigate('Polls')}
          theme={theme}
        />
      </View>

      {/* Urgent Posts */}
      {stats.urgentPosts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Urgent Announcements</Text>
            <Ionicons name="alert-circle" size={20} color={theme.danger} />
          </View>
          {stats.urgentPosts.map((post) => (
            <TouchableOpacity
              key={post._id}
              style={[
                styles.urgentCard,
                { 
                  backgroundColor: isDarkMode ? '#7F1D1D' : '#FEF2F2',
                  borderLeftColor: theme.danger
                }
              ]}
              onPress={() => navigation.navigate('Feed', {
                screen: 'PostDetail',
                params: { postId: post._id }
              })}
            >
              <Text style={[styles.urgentTitle, { color: theme.text }]}>{post.title}</Text>
              <Text style={[styles.urgentMeta, { color: theme.textSecondary }]}>
                {post.created_by?.name} • {new Date(post.created_at).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Upcoming Events */}
      {stats.upcomingEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Upcoming Events</Text>
          {stats.upcomingEvents.map((event) => (
            <TouchableOpacity
              key={event._id}
              style={[styles.eventCard, { backgroundColor: theme.surface }]}
              onPress={() => {
                if (event.isFromPost) {
                  navigation.navigate('Feed', {
                    screen: 'PostDetail',
                    params: { postId: event._id }
                  });
                } else {
                  navigation.navigate('Events', {
                    screen: 'EventDetail',
                    params: { eventId: event._id }
                  });
                }
              }}
            >
              <View style={[styles.eventDate, { backgroundColor: theme.primary }]}>
                <Text style={styles.eventDay}>
                  {new Date(event.date).getDate()}
                </Text>
                <Text style={styles.eventMonth}>
                  {new Date(event.date).toLocaleString('default', { month: 'short' })}
                </Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>
                <Text style={[styles.eventMeta, { color: theme.textSecondary }]}>{event.location}</Text>
                {event.isFromPost && (
                  <Text style={[styles.fromPostBadge, { color: theme.info }]}>From Post</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Admin Quick Access */}
      {user?.role === ROLES.ADMIN && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Admin Tools</Text>
          <TouchableOpacity
            style={[styles.adminButton, { backgroundColor: theme.primary, shadowColor: theme.shadow }]}
            onPress={() => navigation.navigate('Profile', { screen: 'Analytics' })}
          >
            <Ionicons name="analytics" size={24} color={COLORS.white} />
            <Text style={styles.adminButtonText}>View Analytics Dashboard</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.footer, { backgroundColor: theme.background }]} />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text,
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
  resultGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  resultGroupSpacing: {
    marginTop: 12,
  },
  searchResultCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  searchResultTextWrap: {
    marginLeft: 10,
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  searchResultMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  noSearchResultText: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 4,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
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
  fromPostBadge: {
    fontSize: 10,
    color: COLORS.info,
    fontWeight: '600',
    marginTop: 4,
  },
  adminButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
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
