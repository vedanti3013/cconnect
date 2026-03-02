/**
 * Create Poll Screen
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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { pollAPI } from '../services/api';
import { COLORS, DEPARTMENTS } from '../config/constants';

const CreatePollScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    question: '',
    department: 'All',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  });
  const [options, setOptions] = useState(['', '']);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const validateForm = () => {
    if (!formData.question.trim()) {
      Alert.alert('Error', 'Please enter a poll question');
      return false;
    }

    const validOptions = options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      Alert.alert('Error', 'Please provide at least 2 options');
      return false;
    }

    if (formData.expires_at <= new Date()) {
      Alert.alert('Error', 'Expiry date must be in the future');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const validOptions = options.filter(opt => opt.trim());
      
      await pollAPI.create({
        question: formData.question.trim(),
        options: validOptions.map(text => ({ text: text.trim() })),
        department: formData.department,
        expires_at: formData.expires_at.toISOString(),
      });

      Alert.alert('Success', 'Poll created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Error creating poll:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create poll');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Poll Question *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Ask a question..."
            placeholderTextColor={COLORS.gray}
            value={formData.question}
            onChangeText={(value) => handleChange('question', value)}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{formData.question.length}/500</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Options * (2-6)</Text>
          {options.map((option, index) => (
            <View key={index} style={styles.optionRow}>
              <View style={styles.optionNumber}>
                <Text style={styles.optionNumberText}>{index + 1}</Text>
              </View>
              <TextInput
                style={styles.optionInput}
                placeholder={`Option ${index + 1}`}
                placeholderTextColor={COLORS.gray}
                value={option}
                onChangeText={(value) => handleOptionChange(index, value)}
                maxLength={100}
              />
              {options.length > 2 && (
                <TouchableOpacity
                  style={styles.removeOptionButton}
                  onPress={() => removeOption(index)}
                >
                  <Ionicons name="close-circle" size={24} color={COLORS.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {options.length < 6 && (
            <TouchableOpacity style={styles.addOptionButton} onPress={addOption}>
              <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
              <Text style={styles.addOptionText}>Add Option</Text>
            </TouchableOpacity>
          )}
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

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Poll Expiry Date *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            <Text style={styles.dateText}>
              {formData.expires_at.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            Poll will automatically close on this date
          </Text>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={formData.expires_at}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                handleChange('expires_at', selectedDate);
              }
            }}
            minimumDate={new Date()}
          />
        )}

        {/* Preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Poll Preview</Text>
          <Text style={styles.previewQuestion}>
            {formData.question || 'Your question here...'}
          </Text>
          <View style={styles.previewOptions}>
            {options.filter(o => o.trim()).map((option, index) => (
              <View key={index} style={styles.previewOption}>
                <View style={styles.previewRadio} />
                <Text style={styles.previewOptionText}>{option}</Text>
              </View>
            ))}
          </View>
          <View style={styles.previewFooter}>
            <Text style={styles.previewMeta}>
              Expires: {formData.expires_at.toLocaleDateString()}
            </Text>
            <Text style={styles.previewMeta}>{formData.department}</Text>
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
            <Text style={styles.submitButtonText}>Create Poll</Text>
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
    minHeight: 80,
  },
  charCount: {
    alignSelf: 'flex-end',
    marginTop: 4,
    fontSize: 12,
    color: COLORS.gray,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  optionNumberText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  optionInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  removeOptionButton: {
    padding: 8,
    marginLeft: 4,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
    marginTop: 4,
  },
  addOptionText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
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
  hint: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.gray,
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
  previewQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  previewOptions: {
    marginBottom: 12,
  },
  previewOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  previewRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.gray,
    marginRight: 12,
  },
  previewOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  previewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  previewMeta: {
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

export default CreatePollScreen;
