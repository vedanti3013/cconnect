/**
 * Web Calendar Picker
 * A dropdown calendar component for web platform
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#4F46E5',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#E5E7EB',
  dark: '#1F2937',
  border: '#E5E7EB',
  background: '#F9FAFB',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const WebCalendarPicker = ({ value, onChange, minimumDate, placeholder = 'Select date' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value || new Date());
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const containerRef = useRef(null);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const isSameDay = (d1, d2) =>
    d1 && d2 &&
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const isBeforeMin = (date) => {
    if (!minimumDate) return false;
    const min = new Date(minimumDate);
    min.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d < min;
  };

  const isToday = (year, month, day) => {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  };

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const selectDate = (day) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (isBeforeMin(selected)) return;
    onChange(selected);
    setIsOpen(false);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const renderCalendar = () => {
    const cells = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} style={cellStyles.emptyCell} />);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const disabled = isBeforeMin(dateObj);
      const selected = isSameDay(value, dateObj);
      const today = isToday(year, month, day);

      cells.push(
        <div
          key={day}
          onClick={() => !disabled && selectDate(day)}
          style={{
            ...cellStyles.dayCell,
            ...(selected ? cellStyles.selectedCell : {}),
            ...(today && !selected ? cellStyles.todayCell : {}),
            ...(disabled ? cellStyles.disabledCell : {}),
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          <span style={{
            color: selected ? '#fff' : disabled ? '#ccc' : today ? COLORS.primary : COLORS.dark,
            fontWeight: selected || today ? 'bold' : 'normal',
            fontSize: 12,
          }}>
            {day}
          </span>
        </div>
      );
    }

    return cells;
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger button */}
      <div ref={triggerRef}>
        <TouchableOpacity
          style={pickerStyles.triggerButton}
          onPress={() => {
            if (value) setViewDate(value);
            if (!isOpen && triggerRef.current) {
              const rect = triggerRef.current.getBoundingClientRect();
              setDropdownPos({ top: rect.bottom + 4, left: rect.left });
            }
            setIsOpen(!isOpen);
          }}
        >
          <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
          <Text style={pickerStyles.triggerText}>
            {value
              ? value.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : placeholder}
          </Text>
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.gray} />
        </TouchableOpacity>
      </div>

      {/* Fixed-position calendar overlay */}
      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} style={pickerStyles.backdrop} />
          <div style={{ ...pickerStyles.dropdown, top: dropdownPos.top, left: dropdownPos.left }}>
          {/* Header with month/year nav */}
          <div style={pickerStyles.header}>
            <div onClick={prevMonth} style={pickerStyles.navButton}>
              <Ionicons name="chevron-back" size={20} color={COLORS.dark} />
            </div>
            <span style={pickerStyles.monthLabel}>
              {MONTHS[month]} {year}
            </span>
            <div onClick={nextMonth} style={pickerStyles.navButton}>
              <Ionicons name="chevron-forward" size={20} color={COLORS.dark} />
            </div>
          </div>

          {/* Day of week headers */}
          <div style={pickerStyles.weekRow}>
            {DAYS.map((d) => (
              <div key={d} style={cellStyles.weekHeader}>
                <span style={{ color: COLORS.gray, fontSize: 11, fontWeight: '600' }}>{d}</span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={pickerStyles.grid}>
            {renderCalendar()}
          </div>

          {/* Today shortcut */}
          <div style={pickerStyles.footer}>
            <div
              onClick={() => {
                const today = new Date();
                if (!isBeforeMin(today)) {
                  onChange(today);
                  setIsOpen(false);
                }
              }}
              style={pickerStyles.todayButton}
            >
              <span style={{ color: COLORS.primary, fontWeight: '600', fontSize: 12 }}>Today</span>
            </div>
          </div>
          </div>
        </>
      )}
    </div>
  );
};

const pickerStyles = {
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
  },
  dropdown: {
    position: 'fixed',
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 10,
    boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
    padding: 12,
    zIndex: 100001,
    border: `1px solid ${COLORS.border}`,
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100000,
    backgroundColor: 'transparent',
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  navButton: {
    cursor: 'pointer',
    padding: 4,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  weekRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    marginBottom: 2,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 1,
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 6,
    borderTop: `1px solid ${COLORS.lightGray}`,
    paddingTop: 6,
  },
  todayButton: {
    cursor: 'pointer',
    padding: '3px 12px',
    borderRadius: 6,
    textAlign: 'center',
  },
};

const cellStyles = {
  emptyCell: {
    width: 36,
    height: 32,
  },
  weekHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  dayCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    width: 36,
    height: 32,
    transition: 'background-color 0.15s',
  },
  selectedCell: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  todayCell: {
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
  },
  disabledCell: {
    opacity: 0.4,
  },
};

export default WebCalendarPicker;
