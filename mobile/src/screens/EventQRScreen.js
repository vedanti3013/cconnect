/**
 * Event QR Screen
 * Displays the personalized QR code for a registered event
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { registrationAPI } from '../services/api';
import { COLORS } from '../config/constants';

const EventQRScreen = ({ route, navigation }) => {
  const { eventId, eventTitle } = route.params;
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyQR();
  }, [eventId]);

  const fetchMyQR = async () => {
    try {
      const response = await registrationAPI.getMyQR(eventId);
      setQrData(response.data.data);
    } catch (error) {
      console.error('Error fetching QR:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to load QR code',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your QR code...</Text>
      </View>
    );
  }

  if (!qrData) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.danger} />
        <Text style={styles.errorText}>Could not load QR code</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="ticket-outline" size={32} color={COLORS.primary} />
          <Text style={styles.title}>{eventTitle || qrData.event_title}</Text>
          {qrData.event_date && (
            <Text style={styles.date}>
              {new Date(qrData.event_date).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.qrWrapper}>
          {qrData.qr_code && (
            <Image
              source={{ uri: qrData.qr_code }}
              style={styles.qrImage}
              resizeMode="contain"
            />
          )}
        </View>

        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  qrData.attendance_status === 'present'
                    ? COLORS.success
                    : COLORS.primary,
              },
            ]}
          >
            <Ionicons
              name={
                qrData.attendance_status === 'present'
                  ? 'checkmark-circle'
                  : 'time-outline'
              }
              size={18}
              color={COLORS.white}
            />
            <Text style={styles.statusText}>
              {qrData.attendance_status === 'present'
                ? 'Attendance Marked'
                : 'Registered — Show this QR to the committee'}
            </Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            This QR code is unique to you for this event. Show it to a committee member when you arrive for attendance.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: COLORS.danger,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 12,
  },
  date: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  qrWrapper: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  qrImage: {
    width: 260,
    height: 260,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: COLORS.info,
    lineHeight: 20,
  },
});

export default EventQRScreen;
