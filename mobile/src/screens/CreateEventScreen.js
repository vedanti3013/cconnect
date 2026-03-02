/**
 * Create Event Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { eventAPI } from '../services/api';
import { COLORS, DEPARTMENTS } from '../config/constants';
import WebCalendarPicker from '../components/WebCalendarPicker';
import WebTimePicker from '../components/WebTimePicker';

const CreateEventScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    department: 'All',
    date: new Date(),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const currentDate = formData.date;
      selectedDate.setHours(currentDate.getHours());
      selectedDate.setMinutes(currentDate.getMinutes());
      handleChange('date', selectedDate);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const currentDate = formData.date;
      currentDate.setHours(selectedTime.getHours());
      currentDate.setMinutes(selectedTime.getMinutes());
      handleChange('date', new Date(currentDate));
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter event title');
      return false;
    }
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter event description');
      return false;
    }
    if (!formData.location.trim()) {
      Alert.alert('Error', 'Please enter event location');
      return false;
    }
    if (formData.date <= new Date()) {
      Alert.alert('Error', 'Event date must be in the future');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await eventAPI.create({
        title: formData.title.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        department: formData.department,
        date: formData.date.toISOString(),
      });

      Alert.alert('Success', 'Event created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Event Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter event title"
            placeholderTextColor={COLORS.gray}
            value={formData.title}
            onChangeText={(value) => handleChange('title', value)}
            maxLength={200}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter event description"
            placeholderTextColor={COLORS.gray}
            value={formData.description}
            onChangeText={(value) => handleChange('description', value)}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Location *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter event location"
            placeholderTextColor={COLORS.gray}
            value={formData.location}
            onChangeText={(value) => handleChange('location', value)}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Target Department</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.department}
              onValueChange={(value) => handleChange('department', value)}
              style={styles.picker}
            >
              {DEPARTMENTS.map((dept) => (
                <Picker.Item key={dept} label={dept} value={dept} />
              ))}
            </Picker>
          </View>
        </View>

        {Platform.OS !== 'web' && (
        <>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Event Date *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            <Text style={styles.dateText}>
              {formData.date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Event Time *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
            <Text style={styles.dateText}>
              {formData.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
        </View>
        </>
        )}

        {Platform.OS === 'web' ? (
          <View style={{ marginBottom: 15 }}>
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.label}>Event Date *</Text>
              <WebCalendarPicker
                value={formData.date}
                onChange={(date) => {
                  date.setHours(formData.date.getHours());
                  date.setMinutes(formData.date.getMinutes());
                  handleChange('date', date);
                }}
                minimumDate={new Date()}
              />
            </View>
            <View>
              <Text style={styles.label}>Event Time *</Text>
              <WebTimePicker
                value={formData.date}
                onChange={(date) => handleChange('date', date)}
              />
            </View>
          </View>
        ) : (
          <>
        {showDatePicker && (
          <DateTimePicker
            value={formData.date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={formData.date}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}
          </>
        )}

        {/* Event Preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Event Preview</Text>
          <View style={styles.previewContent}>
            <View style={styles.previewDate}>
              <Text style={styles.previewDay}>{formData.date.getDate()}</Text>
              <Text style={styles.previewMonth}>
                {formData.date.toLocaleString('default', { month: 'short' })}
              </Text>
            </View>
            <View style={styles.previewInfo}>
              <Text style={styles.previewEventTitle}>
                {formData.title || 'Event Title'}
              </Text>
              <View style={styles.previewMeta}>
                <Ionicons name="location" size={12} color={COLORS.gray} />
                <Text style={styles.previewMetaText}>
                  {formData.location || 'Location'}
                </Text>
              </View>
              <View style={styles.previewMeta}>
                <Ionicons name="time" size={12} color={COLORS.gray} />
                <Text style={styles.previewMetaText}>
                  {formData.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitButtonText}>Create Event</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 100,
  },
  pickerContainer: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
  },
  dateText: {
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  previewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  previewTitle: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewDate: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    minWidth: 50,
  },
  previewDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  previewMonth: {
    fontSize: 10,
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  previewInfo: {
    flex: 1,
    marginLeft: 12,
  },
  previewEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  previewMetaText: {
    marginLeft: 4,
    fontSize: 12,
    color: COLORS.gray,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CreateEventScreen;
