/**
 * Registrations Screen
 * Tabular view of event registrations for committee, admin, and teacher users
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
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { eventAPI, registrationAPI } from '../services/api';
import { COLORS } from '../config/constants';

const RegistrationsScreen = () => {
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [regStats, setRegStats] = useState(null);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [regLoading, setRegLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyEvents = async () => {
    try {
      const res = await eventAPI.getAll({ created_by: user._id, limit: 100 });
      const myEvents = res.data.data.events || [];
      setEvents(myEvents);
      if (myEvents.length > 0 && !selectedEventId) {
        setSelectedEventId(myEvents[0]._id);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchRegistrations = async (eventId) => {
    if (!eventId) return;
    setRegLoading(true);
    try {
      const res = await registrationAPI.getList(eventId, { limit: 500 });
      setRegistrations(res.data.data.registrations || []);
      setRegStats(res.data.data.stats || null);
    } catch (err) {
      console.error('Error fetching registrations:', err);
      setRegistrations([]);
      setRegStats(null);
    } finally {
      setRegLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyEvents();
    }, [])
  );

  useEffect(() => {
    if (selectedEventId) {
      fetchRegistrations(selectedEventId);
    }
  }, [selectedEventId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMyEvents();
    if (selectedEventId) {
      await fetchRegistrations(selectedEventId);
    }
    setRefreshing(false);
  }, [selectedEventId]);

  const selectedEvent = events.find((e) => e._id === selectedEventId);

  if (eventsLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.centered}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Ionicons name="document-text-outline" size={64} color={theme.gray} />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>No Events Created</Text>
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          Create an event first to view registrations here.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Event Selector */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>SELECT EVENT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {events.map((evt) => {
            const isSelected = selectedEventId === evt._id;
            return (
              <TouchableOpacity
                key={evt._id}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.surface,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setSelectedEventId(evt._id)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={isSelected ? COLORS.white : theme.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? COLORS.white : theme.text },
                  ]}
                  numberOfLines={1}
                >
                  {evt.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Selected Event Info */}
      {selectedEvent && (
        <View style={[styles.eventInfoCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.eventTitle, { color: theme.text }]}>{selectedEvent.title}</Text>
          <View style={styles.eventMetaRow}>
            <Ionicons name="calendar" size={14} color={theme.textSecondary} />
            <Text style={[styles.eventMeta, { color: theme.textSecondary }]}>
              {new Date(selectedEvent.date).toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <Ionicons name="location" size={14} color={theme.textSecondary} style={{ marginLeft: 12 }} />
            <Text style={[styles.eventMeta, { color: theme.textSecondary }]}>
              {selectedEvent.location}
            </Text>
          </View>
        </View>
      )}

      {/* Stats Cards */}
      {regStats && (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <Ionicons name="people" size={22} color={theme.primary} />
            <Text style={[styles.statNumber, { color: theme.primary }]}>{regStats.total_registered}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Registered</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{regStats.total_present}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Present</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <Ionicons name="close-circle" size={22} color="#EF4444" />
            <Text style={[styles.statNumber, { color: '#EF4444' }]}>{regStats.total_absent}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Absent</Text>
          </View>
        </View>
      )}

      {/* Registrations Table */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          REGISTRATIONS {registrations.length > 0 ? `(${registrations.length})` : ''}
        </Text>

        {regLoading ? (
          <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 24 }} />
        ) : registrations.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
            <Ionicons name="person-outline" size={32} color={theme.gray} />
            <Text style={[styles.emptyCardText, { color: theme.gray }]}>
              No registrations yet for this event.
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              {/* Table Header */}
              <View style={[styles.tableRow, styles.tableHeader, { backgroundColor: theme.primary }]}>
                <Text style={[styles.thCell, styles.colSr]}>#</Text>
                <Text style={[styles.thCell, styles.colPid]}>PID</Text>
                <Text style={[styles.thCell, styles.colName]}>Name</Text>
                <Text style={[styles.thCell, styles.colEmail]}>Email</Text>
                <Text style={[styles.thCell, styles.colDept]}>Department</Text>
                <Text style={[styles.thCell, styles.colSection]}>Section</Text>
                <Text style={[styles.thCell, styles.colYear]}>Year</Text>
                <Text style={[styles.thCell, styles.colStatus]}>Status</Text>
              </View>

              {/* Table Body */}
              {registrations.map((reg, idx) => (
                <View
                  key={reg._id}
                  style={[
                    styles.tableRow,
                    {
                      backgroundColor: idx % 2 === 0 ? theme.surface : theme.background,
                      borderBottomColor: isDarkMode ? '#374151' : '#E5E7EB',
                    },
                  ]}
                >
                  <Text style={[styles.tdCell, styles.colSr, { color: theme.textSecondary }]}>{idx + 1}</Text>
                  <Text style={[styles.tdCell, styles.colPid, { color: theme.text, fontWeight: '600' }]}>{reg.pid}</Text>
                  <Text style={[styles.tdCell, styles.colName, { color: theme.text }]}>{reg.name}</Text>
                  <Text style={[styles.tdCell, styles.colEmail, { color: theme.textSecondary }]}>{reg.email || '-'}</Text>
                  <Text style={[styles.tdCell, styles.colDept, { color: theme.textSecondary }]}>{reg.department}</Text>
                  <Text style={[styles.tdCell, styles.colSection, { color: theme.textSecondary }]}>{reg.section || '-'}</Text>
                  <Text style={[styles.tdCell, styles.colYear, { color: theme.textSecondary }]}>{reg.year || '-'}</Text>
                  <View style={[styles.colStatus, styles.statusCellWrap]}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: reg.attendance_status === 'present'
                            ? (isDarkMode ? '#064E3B' : '#D1FAE5')
                            : (isDarkMode ? '#7F1D1D' : '#FEE2E2'),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color: reg.attendance_status === 'present' ? '#10B981' : '#EF4444',
                          },
                        ]}
                      >
                        {reg.attendance_status === 'present' ? 'Present' : 'Absent'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  chipRow: {
    marginBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 170,
  },
  eventInfoCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventMeta: {
    fontSize: 13,
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: 12,
    padding: 32,
  },
  emptyCardText: {
    fontSize: 14,
    marginTop: 10,
  },
  // Table styles
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableHeader: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomWidth: 0,
  },
  thCell: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  tdCell: {
    fontSize: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  colSr: {
    width: 40,
    textAlign: 'center',
  },
  colPid: {
    width: 110,
  },
  colName: {
    width: 150,
  },
  colEmail: {
    width: 200,
  },
  colDept: {
    width: 130,
  },
  colSection: {
    width: 70,
    textAlign: 'center',
  },
  colYear: {
    width: 50,
    textAlign: 'center',
  },
  colStatus: {
    width: 90,
  },
  statusCellWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default RegistrationsScreen;
