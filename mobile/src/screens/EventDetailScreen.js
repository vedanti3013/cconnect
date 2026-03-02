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
import { eventAPI } from '../services/api';
import { COLORS, ROLES } from '../config/constants';

const EventDetailScreen = ({ route, navigation }) => {
  const { eventId } = route.params;
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const canManageEvent = [ROLES.COMMITTEE, ROLES.ADMIN].includes(user?.role);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

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

  const handleRSVP = async () => {
    setRsvpLoading(true);
    try {
      const response = await eventAPI.rsvp(eventId);
      setEvent(prev => ({
        ...prev,
        has_rsvp: response.data.data.has_rsvp,
        attendees_count: response.data.data.attendees_count,
      }));
      Alert.alert(
        'Success',
        response.data.data.has_rsvp
          ? 'You have RSVPed to this event!'
          : 'RSVP cancelled'
      );
    } catch (error) {
      console.error('Error RSVPing:', error);
      Alert.alert('Error', 'Failed to update RSVP');
    } finally {
      setRsvpLoading(false);
    }
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

        {/* QR Code Section */}
        {canManageEvent && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.qrToggle}
              onPress={() => setShowQR(!showQR)}
            >
              <Ionicons name="qr-code-outline" size={24} color={COLORS.primary} />
              <Text style={styles.qrToggleText}>
                {showQR ? 'Hide' : 'Show'} Check-in QR Code
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
                  Display this QR code for attendees to scan
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {!isPast && (
            <TouchableOpacity
              style={[
                styles.rsvpButton,
                event.has_rsvp && styles.rsvpButtonActive,
              ]}
              onPress={handleRSVP}
              disabled={rsvpLoading}
            >
              {rsvpLoading ? (
                <ActivityIndicator color={event.has_rsvp ? COLORS.primary : COLORS.white} />
              ) : (
                <>
                  <Ionicons
                    name={event.has_rsvp ? 'checkmark-circle' : 'add-circle-outline'}
                    size={24}
                    color={event.has_rsvp ? COLORS.primary : COLORS.white}
                  />
                  <Text
                    style={[
                      styles.rsvpText,
                      event.has_rsvp && styles.rsvpTextActive,
                    ]}
                  >
                    {event.has_rsvp ? 'RSVPed' : 'RSVP'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Check-in Button for Attendees */}
        {!isPast && event.has_rsvp && (
          <TouchableOpacity
            style={styles.checkInButton}
            onPress={() => navigation.navigate('QRScanner', { eventId: event._id })}
          >
            <Ionicons name="scan-outline" size={24} color={COLORS.white} />
            <Text style={styles.checkInText}>Scan QR to Check In</Text>
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
    marginBottom: 40,
  },
  checkInText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default EventDetailScreen;
