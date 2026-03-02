/**
 * Web Time Picker
 * A dropdown time picker component for web platform
 */

import React, { useState, useRef, useEffect } from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#4F46E5',
  white: '#FFFFFF',
  gray: '#6B7280',
  dark: '#1F2937',
  border: '#E5E7EB',
  background: '#F9FAFB',
};

const WebTimePicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const hours = value ? value.getHours() : 0;
  const minutes = value ? value.getMinutes() : 0;

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const formatTime = (h, m) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const setTime = (h, m) => {
    const newDate = new Date(value);
    newDate.setHours(h);
    newDate.setMinutes(m);
    onChange(newDate);
  };

  // Generate time slots every 30 minutes
  const timeSlots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      timeSlots.push({ hours: h, minutes: m });
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: COLORS.background,
          borderRadius: 10,
          padding: 14,
          borderWidth: 1,
          borderColor: COLORS.border,
          gap: 10,
        }}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Ionicons name="time-outline" size={20} color={COLORS.primary} />
        <Text style={{ flex: 1, fontSize: 15, color: COLORS.dark }}>
          {formatTime(hours, minutes)}
        </Text>
        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.gray} />
      </TouchableOpacity>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 4,
          backgroundColor: '#fff',
          borderRadius: 12,
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          padding: 8,
          zIndex: 9999,
          border: `1px solid ${COLORS.border}`,
          maxHeight: 250,
          overflowY: 'auto',
        }}>
          {timeSlots.map(({ hours: h, minutes: m }) => {
            const isSelected = h === hours && m === minutes;
            return (
              <div
                key={`${h}-${m}`}
                onClick={() => {
                  setTime(h, m);
                  setIsOpen(false);
                }}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  borderRadius: 8,
                  backgroundColor: isSelected ? COLORS.primary : 'transparent',
                  marginBottom: 2,
                }}
              >
                <span style={{
                  color: isSelected ? '#fff' : COLORS.dark,
                  fontWeight: isSelected ? 'bold' : 'normal',
                  fontSize: 14,
                }}>
                  {formatTime(h, m)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WebTimePicker;
