/**
 * QR Scanner Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { registrationAPI } from '../services/api';
import { COLORS } from '../config/constants';

const QRScannerScreen = ({ route, navigation }) => {
  const eventId = route.params?.eventId;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    requestPermission();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || processing) return;
    
    setScanned(true);
    setProcessing(true);
    setLastResult(null);

    try {
      // Parse the QR code data (contains token, eventId, pid)
      let qrPayload;
      try {
        qrPayload = JSON.parse(data);
      } catch {
        throw new Error('Invalid QR code format');
      }

      if (!qrPayload.token) {
        throw new Error('Invalid QR code — no token found');
      }

      // Call the validate-qr endpoint (committee/admin only)
      const response = await registrationAPI.validateQR({
        token: qrPayload.token,
        eventId: eventId || qrPayload.eventId,
        pid: qrPayload.pid
      });
      
      const regData = response.data.data.registration;
      setLastResult({
        success: true,
        name: regData.name,
        pid: regData.pid,
        department: regData.department,
        section: regData.section,
        year: regData.year,
        message: response.data.message
      });

      Alert.alert(
        'Attendance Marked!',
        `${regData.name} (${regData.pid})\nDept: ${regData.department}${regData.section ? ` | Sec: ${regData.section}` : ''}${regData.year ? ` | Year: ${regData.year}` : ''}`,
        [
          {
            text: 'Scan Next',
            onPress: () => {
              setScanned(false);
              setLastResult(null);
            },
          },
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Scan error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to validate QR code';
      setLastResult({ success: false, message: errorMsg });

      Alert.alert(
        'Scan Failed',
        errorMsg,
        [
          {
            text: 'Scan Again',
            onPress: () => setScanned(false),
          },
          {
            text: 'Cancel',
            onPress: () => navigation.goBack(),
            style: 'cancel',
          },
        ]
      );
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={64} color={COLORS.gray} />
        <Text style={styles.text}>No access to camera</Text>
        <Text style={styles.subText}>
          Please enable camera permissions in settings to scan QR codes
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={flashOn}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          {/* Top */}
          <View style={styles.overlaySection} />
          
          {/* Middle */}
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySection} />
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <View style={styles.overlaySection} />
          </View>
          
          {/* Bottom */}
          <View style={styles.overlaySection}>
            <Text style={styles.instructionText}>
              Position the QR code within the frame
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setFlashOn(!flashOn)}
          >
            <Ionicons
              name={flashOn ? 'flash' : 'flash-outline'}
              size={28}
              color={COLORS.white}
            />
          </TouchableOpacity>

          {scanned && !processing && (
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={() => setScanned(false)}
            >
              <Ionicons name="refresh" size={24} color={COLORS.white} />
              <Text style={styles.rescanText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>

        {processing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={COLORS.white} />
            <Text style={styles.processingText}>Validating attendance...</Text>
          </View>
        )}

        {/* Last result banner */}
        {lastResult && !processing && (
          <View style={[
            styles.resultBanner,
            { backgroundColor: lastResult.success ? COLORS.success : COLORS.danger }
          ]}>
            <Ionicons
              name={lastResult.success ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={COLORS.white}
            />
            <Text style={styles.resultText}>
              {lastResult.success
                ? `${lastResult.name} (${lastResult.pid})`
                : lastResult.message}
            </Text>
          </View>
        )}
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.black,
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
  },
  overlaySection: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayMiddle: {
    flexDirection: 'row',
  },
  scanArea: {
    width: 250,
    height: 250,
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: COLORS.white,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructionText: {
    color: COLORS.white,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginHorizontal: 16,
  },
  rescanText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: COLORS.white,
    fontSize: 18,
    marginTop: 16,
  },
  text: {
    color: COLORS.text,
    fontSize: 18,
    marginTop: 20,
    textAlign: 'center',
  },
  subText: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  resultBanner: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
  },
  resultText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
});

export default QRScannerScreen;
