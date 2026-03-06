/**
 * Events Screen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { eventAPI, postAPI, registrationAPI } from '../services/api';
import { COLORS, ROLES } from '../config/constants';

const EventsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('upcoming'); // upcoming, past, all
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set());

  const canCreateEvent = [ROLES.COMMITTEE, ROLES.ADMIN].includes(user?.role);
  const isStudentOrTeacher = [ROLES.STUDENT, ROLES.TEACHER].includes(user?.role);

  const fetchEvents = async () => {
    try {
      const params = {};
      if (filter === 'upcoming') {
        params.upcoming = 'true';
      } else if (filter === 'past') {
        params.past = 'true';
      }

      // Fetch both events and posts marked as events
      const [eventsRes, eventPostsRes] = await Promise.all([
        eventAPI.getAll(params),
        postAPI.getAll({ limit: 200 })
      ]);

      const regularEvents = eventsRes.data.data.events || [];
      const eventPosts = eventPostsRes.data.data.posts || [];

      // Convert event posts to event format and filter by date
      const now = new Date();
      const formattedEventPosts = eventPosts
        .filter(post => post.event_date) // Only include posts with event_date
        .map(post => ({
          _id: post.linked_event_id || post._id,
          postId: post._id,
          title: post.title,
          description: post.description,
          date: post.event_date,
          location: post.department,
          department: post.department,
          created_by: post.created_by,
          isFromPost: true,
          hasLinkedEvent: !!post.linked_event_id,
        }));

      // Combine and filter based on selected filter
      let combinedEvents = [...regularEvents, ...formattedEventPosts];

      if (filter === 'upcoming') {
        combinedEvents = combinedEvents.filter(event => new Date(event.date) >= now);
      } else if (filter === 'past') {
        combinedEvents = combinedEvents.filter(event => new Date(event.date) < now);
      }

      // Sort by date
      combinedEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

      setEvents(combinedEvents);

      // Check registration status for all events with valid event IDs (students/teachers)
      if (isStudentOrTeacher) {
        const eventIdsToCheck = combinedEvents
          .filter(e => !e.isFromPost || e.hasLinkedEvent)
          .map(e => e._id);
        if (eventIdsToCheck.length > 0) {
          fetchRegistrationStatuses(eventIdsToCheck);
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrationStatuses = async (eventIds) => {
    try {
      const statuses = await Promise.all(
        eventIds.map(id =>
          registrationAPI.getStatus(id)
            .then(res => res.data.data.is_registered ? id : null)
            .catch(() => null)
        )
      );
      setRegisteredEventIds(new Set(statuses.filter(Boolean)));
    } catch (error) {
      console.error('Error fetching registration statuses:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  // Re-fetch registration statuses when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      if (events.length > 0 && isStudentOrTeacher) {
        const eventIdsToCheck = events
          .filter(e => !e.isFromPost || e.hasLinkedEvent)
          .map(e => e._id);
        if (eventIdsToCheck.length > 0) {
          fetchRegistrationStatuses(eventIdsToCheck);
        }
      }
    }, [events])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  }, [filter]);

  const getEventStatus = (event) => {
    const eventDate = new Date(event.date);
    const now = new Date();
    const diff = eventDate - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { label: 'Past', color: COLORS.gray };
    if (days === 0) return { label: 'Today!', color: COLORS.danger };
    if (days === 1) return { label: 'Tomorrow', color: COLORS.warning };
    if (days <= 7) return { label: `${days} days left`, color: COLORS.secondary };
    return { label: `${days} days left`, color: COLORS.primary };
  };

  const FilterButton = ({ label, value }) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === value && [styles.filterButtonActive, { backgroundColor: theme.primary }], filter !== value && { backgroundColor: isDarkMode ? '#374151' : '#f3f4f6' }]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterText, filter === value ? styles.filterTextActive : { color: theme.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const EventItem = ({ item }) => {
    const status = getEventStatus(item);
    const eventDate = new Date(item.date);
    const isRegistered = registeredEventIds.has(item._id);

    const handlePress = () => {
      if (item.isFromPost && !item.hasLinkedEvent) {
        // Old-style post event without linked event — go to post detail
        navigation.navigate('Feed', {
          screen: 'PostDetail',
          params: { postId: item.postId || item._id }
        });
      } else {
        // Regular event or post with linked event — go to event detail for registration/QR
        navigation.navigate('EventDetail', { eventId: item._id });
      }
    };

    const handleQRPress = () => {
      navigation.navigate('EventQR', { eventId: item._id, eventTitle: item.title });
    };

    return (
      <TouchableOpacity
        style={[styles.eventCard, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}
        onPress={handlePress}
      >
        <View style={[styles.dateContainer, { backgroundColor: theme.primary }]}>
          <Text style={styles.dateDay}>{eventDate.getDate()}</Text>
          <Text style={styles.dateMonth}>
            {eventDate.toLocaleString('default', { month: 'short' })}
          </Text>
        </View>

        <View style={styles.eventInfo}>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <Text style={styles.statusText}>{status.label}</Text>
          </View>
          {item.isFromPost && (
            <View style={[styles.postBadge, { backgroundColor: isDarkMode ? '#1e3a5f' : '#e0f2fe' }]}>
              <Ionicons name="newspaper" size={12} color={theme.info} />
              <Text style={[styles.postBadgeText, { color: theme.info }]}>From Post</Text>
            </View>
          )}
          <Text style={[styles.eventTitle, { color: theme.text }]}>{item.title}</Text>
          <View style={styles.eventMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>{item.location || 'TBA'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
          <View style={styles.eventFooter}>
            <View style={[styles.departmentBadge, { backgroundColor: theme.surface === theme.background ? theme.surface : isDarkMode ? '#374151' : '#f3f4f6' }]}>
              <Text style={[styles.departmentText, { color: theme.textSecondary }]}>{item.department}</Text>
            </View>
            {!item.isFromPost && (
              <View style={styles.attendeeInfo}>
                <Ionicons name="people-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.attendeeText, { color: theme.textSecondary }]}>
                  {item.attendees_count || 0} attending
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardActions}>
          {isStudentOrTeacher && isRegistered && (
            <TouchableOpacity
              style={[styles.qrIconButton, { backgroundColor: theme.primary }]}
              onPress={handleQRPress}
            >
              <Ionicons name="qr-code-outline" size={18} color={COLORS.white} />
            </TouchableOpacity>
          )}
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Filter Bar */}
      <View style={[styles.filterBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <FilterButton label="Upcoming" value="upcoming" />
        <FilterButton label="Past" value="past" />
        <FilterButton label="All" value="all" />
        <TouchableOpacity
          style={styles.calendarButton}
          onPress={() => navigation.navigate('Calendar')}
        >
          <Ionicons name="calendar" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        renderItem={({ item }) => <EventItem item={item} />}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={theme.gray} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No events found</Text>
          </View>
        }
      />

      {canCreateEvent && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.shadow }]}
          onPress={() => navigation.navigate('CreateEvent')}
        >
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
      )}
    </View>
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
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: COLORS.background,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.white,
  },
  calendarButton: {
    marginLeft: 'auto',
    padding: 8,
  },
  listContent: {
    padding: 16,
  },
  eventCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateContainer: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minWidth: 56,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  dateMonth: {
    fontSize: 12,
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  eventInfo: {
    flex: 1,
    marginLeft: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 6,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  postBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#e0f2fe',
    marginBottom: 6,
    gap: 4,
  },
  postBadgeText: {
    fontSize: 10,
    color: COLORS.info,
    fontWeight: '600',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    marginLeft: 4,
    fontSize: 12,
    color: COLORS.gray,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  departmentBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  departmentText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  attendeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeText: {
    marginLeft: 4,
    fontSize: 12,
    color: COLORS.gray,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  cardActions: {
    alignItems: 'center',
    gap: 8,
  },
  qrIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray,
  },
});

export default EventsScreen;
