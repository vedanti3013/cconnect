/**
 * Calendar Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { eventAPI, postAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../config/constants';

const CalendarScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [events, setEvents] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [eventsForDate, setEventsForDate] = useState([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    // Filter events for selected date using local time (not UTC)
    const filtered = events.filter(event => {
      const d = new Date(event.date);
      const eventDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return eventDate === selectedDate;
    });
    setEventsForDate(filtered);
  }, [selectedDate, events]);

  const toLocalDateString = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const fetchEvents = async () => {
    try {
      // Fetch both regular events AND posts with event_date
      const [eventsRes, postsRes] = await Promise.all([
        eventAPI.getAll({ limit: 100 }),
        postAPI.getAll({ limit: 200 }),
      ]);

      const regularEvents = eventsRes.data.data.events || [];
      const allPosts = postsRes.data.data.posts || [];

      // Convert posts with event_date to event format
      const eventPosts = allPosts
        .filter(post => post.event_date)
        .map(post => ({
          _id: post._id,
          title: post.title,
          description: post.description,
          date: post.event_date,
          location: post.department,
          department: post.department,
          created_by: post.created_by,
          isFromPost: true,
        }));

      // Combine both sources
      const combinedEvents = [...regularEvents, ...eventPosts];
      combinedEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
      setEvents(combinedEvents);

      // Create marked dates object using local time
      const marked = {};
      combinedEvents.forEach(event => {
        const dateStr = toLocalDateString(event.date);
        if (!marked[dateStr]) {
          marked[dateStr] = {
            marked: true,
            dotColor: COLORS.primary,
          };
        }
      });
      setMarkedDates(marked);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
  };

  const renderEventItem = ({ item }) => {
    const eventDate = new Date(item.date);
    
    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => navigation.navigate('EventDetail', { eventId: item._id })}
      >
        <View style={styles.eventTime}>
          <Text style={styles.timeText}>
            {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <View style={styles.eventMeta}>
            <Ionicons name="location-outline" size={14} color={COLORS.gray} />
            <Text style={styles.eventLocation}>{item.location}</Text>
          </View>
          <View style={styles.departmentBadge}>
            <Text style={styles.departmentText}>{item.department}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={onDayPress}
        markedDates={{
          ...markedDates,
          [selectedDate]: {
            ...markedDates[selectedDate],
            selected: true,
            selectedColor: COLORS.primary,
          },
        }}
        theme={{
          backgroundColor: COLORS.white,
          calendarBackground: COLORS.white,
          textSectionTitleColor: COLORS.textSecondary,
          selectedDayBackgroundColor: COLORS.primary,
          selectedDayTextColor: COLORS.white,
          todayTextColor: COLORS.primary,
          dayTextColor: COLORS.text,
          textDisabledColor: COLORS.gray,
          dotColor: COLORS.primary,
          selectedDotColor: COLORS.white,
          arrowColor: COLORS.primary,
          monthTextColor: COLORS.text,
          textDayFontWeight: '400',
          textMonthFontWeight: '600',
          textDayHeaderFontWeight: '500',
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 12,
        }}
        style={styles.calendar}
      />

      <View style={styles.eventsSection}>
        <Text style={styles.dateHeader}>
          {new Date(selectedDate).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>

        {eventsForDate.length > 0 ? (
          <FlatList
            data={eventsForDate}
            renderItem={renderEventItem}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.eventsList}
          />
        ) : (
          <View style={styles.noEvents}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.gray} />
            <Text style={styles.noEventsText}>No events on this day</Text>
          </View>
        )}
      </View>
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
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  eventsSection: {
    flex: 1,
    padding: 16,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  eventsList: {
    paddingBottom: 20,
  },
  eventCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventTime: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  eventContent: {
    flex: 1,
    marginLeft: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventLocation: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 4,
  },
  departmentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  departmentText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  noEvents: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noEventsText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray,
  },
});

export default CalendarScreen;
