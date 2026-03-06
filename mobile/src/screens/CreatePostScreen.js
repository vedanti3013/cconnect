/**
 * Create Post Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { postAPI } from '../services/api';
import { COLORS, DEPARTMENTS } from '../config/constants';
import WebCalendarPicker from '../components/WebCalendarPicker';

const CreatePostScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: 'All',
    is_urgent: false,
    is_event: false,
    event_date: null,
    external_link: '',
  });
  const [attachment, setAttachment] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const showError = (msg) => {
    if (Platform.OS === 'web') {
      setFormError(msg);
    } else {
      Alert.alert('Error', msg);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showError('Please grant camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setAttachment(result.assets[0]);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!formData.title.trim()) {
      showError('Please enter a title');
      return;
    }
    if (!formData.description.trim()) {
      showError('Please enter a description');
      return;
    }

    setLoading(true);
    try {
      console.log('Starting post submission...');
      const submitData = new FormData();
      submitData.append('title', formData.title.trim());
      submitData.append('description', formData.description.trim());
      submitData.append('department', formData.department);
      submitData.append('is_urgent', formData.is_urgent.toString());
      submitData.append('is_event', formData.is_event.toString());
      
      if (formData.event_date) {
        submitData.append('event_date', formData.event_date.toISOString());
      }
      if (formData.external_link.trim()) {
        submitData.append('external_link', formData.external_link.trim());
      }
      if (attachment) {
        console.log('Attachment URI:', attachment.uri?.substring(0, 50));
        if (Platform.OS === 'web') {
          try {
            const response = await fetch(attachment.uri);
            const blob = await response.blob();
            console.log('Blob created:', blob.size, blob.type);
            const file = new File([blob], 'attachment.jpg', { type: blob.type || 'image/jpeg' });
            submitData.append('attachment', file);
          } catch (blobErr) {
            console.error('Blob conversion error:', blobErr);
            showError('Failed to process image. Please try again.');
            setLoading(false);
            return;
          }
        } else {
          submitData.append('attachment', {
            uri: attachment.uri,
            type: 'image/jpeg',
            name: 'attachment.jpg',
          });
        }
      }

      console.log('Sending request...');
      await postAPI.createWithFile(submitData);
      console.log('Post created successfully!');
      if (Platform.OS === 'web') {
        window.alert('Post created successfully!');
        navigation.goBack();
      } else {
        Alert.alert('Success', 'Post created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      showError(error.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        {formError ? (
          <View style={{ backgroundColor: '#ffe0e0', padding: 12, borderRadius: 8, marginBottom: 12 }}>
            <Text style={{ color: '#c00', textAlign: 'center' }}>{formError}</Text>
          </View>
        ) : null}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter post title"
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
            placeholder="Enter post description"
            placeholderTextColor={COLORS.gray}
            value={formData.description}
            onChangeText={(value) => handleChange('description', value)}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
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

        <View style={styles.switchContainer}>
          <View>
            <Text style={styles.label}>Mark as Urgent</Text>
            <Text style={styles.switchHint}>Urgent posts appear at the top</Text>
          </View>
          <Switch
            value={formData.is_urgent}
            onValueChange={(value) => handleChange('is_urgent', value)}
            trackColor={{ false: COLORS.gray, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>

        <View style={styles.switchContainer}>
          <View>
            <Text style={styles.label}>Mark as Event</Text>
            <Text style={styles.switchHint}>Event posts also appear in Events tab</Text>
          </View>
          <Switch
            value={formData.is_event}
            onValueChange={(value) => handleChange('is_event', value)}
            trackColor={{ false: COLORS.gray, true: COLORS.secondary }}
            thumbColor={COLORS.white}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Event Date (Optional)</Text>
          {Platform.OS === 'web' ? (
            <WebCalendarPicker
              value={formData.event_date}
              onChange={(date) => handleChange('event_date', date)}
              minimumDate={new Date()}
              placeholder="Select event date"
            />
          ) : (
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              <Text style={styles.dateText}>
                {formData.event_date
                  ? formData.event_date.toLocaleDateString()
                  : 'Select event date'}
              </Text>
            </TouchableOpacity>
          )}
          {formData.event_date && (
            <TouchableOpacity
              onPress={() => handleChange('event_date', null)}
              style={styles.clearButton}
            >
              <Text style={styles.clearText}>Clear date</Text>
            </TouchableOpacity>
          )}
        </View>

        {Platform.OS !== 'web' && showDatePicker && (
          <DateTimePicker
            value={formData.event_date || new Date()}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) {
                handleChange('event_date', date);
              }
            }}
            minimumDate={new Date()}
          />
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>External Link (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="https://example.com"
            placeholderTextColor={COLORS.gray}
            value={formData.external_link}
            onChangeText={(value) => handleChange('external_link', value)}
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Attachment (Optional)</Text>
          {attachment ? (
            <View style={styles.attachmentPreview}>
              <Image source={{ uri: attachment.uri }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeButton} onPress={removeAttachment}>
                <Ionicons name="close-circle" size={28} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Ionicons name="image-outline" size={24} color={COLORS.primary} />
              <Text style={styles.uploadText}>Add Image</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitButtonText}>Create Post</Text>
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
    minHeight: 120,
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  switchHint: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
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
  clearButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  clearText: {
    color: COLORS.danger,
    fontSize: 14,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
  },
  uploadText: {
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
  },
  attachmentPreview: {
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.white,
    borderRadius: 14,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
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

export default CreatePostScreen;
