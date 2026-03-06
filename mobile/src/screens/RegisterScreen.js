/**
 * Register Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { COLORS, DEPARTMENTS, ROLES } from '../config/constants';

const RegisterScreen = ({ navigation }) => {
  const { register, error, clearError } = useAuth();
  const [name, setName] = useState('');
  const [pid, setPid] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(ROLES.STUDENT);
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [admissionYear, setAdmissionYear] = useState(new Date().getFullYear().toString());
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showError = (message) => {
    setFormError(message);
    if (Platform.OS !== 'web') {
      Alert.alert('Error', message);
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !pid.trim() || !email.trim() || !password.trim()) {
      showError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }

    setFormError('');
    clearError();
    setIsSubmitting(true);

    const userData = {
      name: name.trim(),
      pid: pid.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      password,
      role,
      department,
      admission_year: parseInt(admissionYear, 10),
    };

    const result = await register(userData);
    setIsSubmitting(false);

    if (!result.success) {
      showError(result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Campus Connect</Text>
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        <View style={styles.form}>
          {formError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={COLORS.gray}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>PID *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your PID"
              placeholderTextColor={COLORS.gray}
              value={pid}
              onChangeText={setPid}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={COLORS.gray}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Role</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={role}
                onValueChange={setRole}
                style={styles.picker}
              >
                <Picker.Item label="Student" value={ROLES.STUDENT} />
                <Picker.Item label="Teacher" value={ROLES.TEACHER} />
                <Picker.Item label="Committee" value={ROLES.COMMITTEE} />
              </Picker>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Department</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={department}
                onValueChange={setDepartment}
                style={styles.picker}
              >
                {DEPARTMENTS.filter(d => d !== 'All').map((dept) => (
                  <Picker.Item key={dept} label={dept} value={dept} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Admission Year</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2024"
              placeholderTextColor={COLORS.gray}
              value={admissionYear}
              onChangeText={setAdmissionYear}
              keyboardType="numeric"
              maxLength={4}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.gray}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              placeholderTextColor={COLORS.gray}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.registerButton, isSubmitting && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.registerButtonText}>Register</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  form: {
    width: '100%',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
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
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
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
    color: COLORS.text,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  eyeButton: {
    padding: 16,
  },
  eyeText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  loginText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  loginLink: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RegisterScreen;
