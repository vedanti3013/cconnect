/**
 * Event Detail Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../context/AuthContext';
import { eventAPI, registrationAPI } from '../services/api';
import { COLORS, ROLES } from '../config/constants';

const EventDetailScreen = ({ route, navigation }) => {
  const { eventId } = route.params;
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [showQR, setShowQR] = useState(false);

  const canManageEvent = [ROLES.COMMITTEE, ROLES.ADMIN].includes(user?.role);
  const isStudentOrTeacher = [ROLES.STUDENT, ROLES.TEACHER].includes(user?.role);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  useEffect(() => {
    if (event && isStudentOrTeacher) {
      fetchRegistrationStatus();
    }
  }, [event]);

  const fetchEventDetails = async () => {
    try {
      const response = await eventAPI.getById(eventId);
      setEvent(response.data.data.event);
    } catch (error) {
      console.error('Error fetching event:', error);
      Alert.alert('Error', 'Failed to load event');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrationStatus = async () => {
    try {
      const response = await registrationAPI.getStatus(eventId);
      setRegistrationStatus(response.data.data);
    } catch (error) {
      console.error('Error fetching registration status:', error);
      // Set default unregistered status so buttons still render
      setRegistrationStatus({ is_registered: false, registration: null });
    }
  };

  const handleRegisterForEvent = async () => {
    setRegisterLoading(true);
    try {
      await registrationAPI.register(eventId);
      await fetchRegistrationStatus();
      Alert.alert(
        'Registered!',
        'You have been registered for this event. You can now view your personalized QR code.',
        [
          { text: 'View My QR', onPress: () => navigation.navigate('EventQR', { eventId: event._id, eventTitle: event.title }) },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.error('Error registering:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to register');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleUnregister = async () => {
    Alert.alert(
      'Unregister',
      'Are you sure you want to unregister from this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unregister',
          style: 'destructive',
          onPress: async () => {
            try {
              await registrationAPI.unregister(eventId);
              Alert.alert('Success', 'You have been unregistered from this event');
              setRegistrationStatus({ is_registered: false, registration: null });
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to unregister');
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this event: ${event.title}\n\nDate: ${new Date(event.date).toLocaleDateString()}\nLocation: ${event.location}\n\n${event.description}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Text>Event not found</Text>
      </View>
    );
  }

  const eventDate = new Date(event.date);
  const isPast = eventDate < new Date();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Event Header */}
        <View style={styles.header}>
          <View style={styles.dateCard}>
            <Text style={styles.dateDay}>{eventDate.getDate()}</Text>
            <Text style={styles.dateMonth}>
              {eventDate.toLocaleString('default', { month: 'short' })}
            </Text>
            <Text style={styles.dateYear}>{eventDate.getFullYear()}</Text>
          </View>
          <View style={styles.headerInfo}>
            <View style={[styles.statusBadge, { backgroundColor: isPast ? COLORS.gray : COLORS.success }]}>
              <Text style={styles.statusText}>{isPast ? 'Past Event' : 'Upcoming'}</Text>
            </View>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.organizer}>
              Organized by {event.created_by?.name}
            </Text>
          </View>
        </View>

        {/* Event Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={24} color={COLORS.primary} />
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>
                {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={24} color={COLORS.primary} />
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{event.location}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="business-outline" size={24} color={COLORS.primary} />
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Department</Text>
              <Text style={styles.detailValue}>{event.department}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={24} color={COLORS.primary} />
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Attendees</Text>
              <Text style={styles.detailValue}>{event.attendees_count || 0} people attending</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Event</Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>

        {/* QR Code Section — Committee/Admin can show event QR for display */}
        {canManageEvent && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.qrToggle}
              onPress={() => setShowQR(!showQR)}
            >
              <Ionicons name="qr-code-outline" size={24} color={COLORS.primary} />
              <Text style={styles.qrToggleText}>
                {showQR ? 'Hide' : 'Show'} Event QR Code
              </Text>
              <Ionicons
                name={showQR ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.gray}
              />
            </TouchableOpacity>

            {showQR && (
              <View style={styles.qrContainer}>
                <QRCode
                  value={event.qr_code || event._id}
                  size={200}
                  backgroundColor={COLORS.white}
                />
                <Text style={styles.qrHint}>
                  Event QR code (for display purposes)
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {/* Student/Teacher: Register / View QR / Unregister */}
          {!isPast && isStudentOrTeacher && (
            <>
              {registrationStatus?.is_registered ? (
                <TouchableOpacity
                  style={[styles.rsvpButton, styles.rsvpButtonActive]}
                  onPress={handleUnregister}
                >
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                  <Text style={[styles.rsvpText, styles.rsvpTextActive]}>Registered</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.rsvpButton}
                  onPress={handleRegisterForEvent}
                  disabled={registerLoading}
                >
                  {registerLoading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="add-circle-outline" size={24} color={COLORS.white} />
                      <Text style={styles.rsvpText}>Register for Event</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* View My QR Button — only for registered students/teachers */}
        {isStudentOrTeacher && registrationStatus?.is_registered && (
          <TouchableOpacity
            style={[styles.checkInButton, styles.qrButton]}
            onPress={() => navigation.navigate('EventQR', { eventId: event._id, eventTitle: event.title })}
          >
            <Ionicons name="qr-code-outline" size={24} color={COLORS.white} />
            <Text style={styles.checkInText}>View My QR Code</Text>
          </TouchableOpacity>
        )}

        {/* Committee/Admin: Scan QR to mark attendance */}
        {!isPast && canManageEvent && (
          <TouchableOpacity
            style={[styles.checkInButton, { backgroundColor: COLORS.success }]}
            onPress={() => navigation.navigate('QRScanner', { eventId: event._id })}
          >
            <Ionicons name="scan-outline" size={24} color={COLORS.white} />
            <Text style={styles.checkInText}>Scan QR to Mark Attendance</Text>
          </TouchableOpacity>
        )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  dateCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
  },
  dateDay: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  dateMonth: {
    fontSize: 14,
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  dateYear: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  organizer: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailInfo: {
    marginLeft: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
  detailValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  qrToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  qrToggleText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 24,
    marginTop: 12,
  },
  qrHint: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  rsvpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
  },
  rsvpButtonActive: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  rsvpText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  rsvpTextActive: {
    color: COLORS.primary,
  },
  shareButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  qrButton: {
    backgroundColor: COLORS.primary,
    marginBottom: 16,
  },
  checkInText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default EventDetailScreen;
