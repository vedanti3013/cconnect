/**
 * Analytics Screen (Admin Only)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { analyticsAPI } from '../services/api';
import { COLORS } from '../config/constants';

const { width } = Dimensions.get('window');

const AnalyticsScreen = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      const response = await analyticsAPI.getDashboard({ period: selectedPeriod });
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, change }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {change !== undefined && (
        <View style={styles.changeContainer}>
          <Ionicons
            name={change >= 0 ? 'arrow-up' : 'arrow-down'}
            size={12}
            color={change >= 0 ? COLORS.success : COLORS.danger}
          />
          <Text style={[styles.changeText, { color: change >= 0 ? COLORS.success : COLORS.danger }]}>
            {Math.abs(change)}%
          </Text>
        </View>
      )}
    </View>
  );

  const BarChart = ({ data, title }) => {
    if (!data || data.length === 0) return null;
    
    const maxValue = Math.max(...data.map(d => d.value));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.barChart}>
          {data.map((item, index) => (
            <View key={index} style={styles.barItem}>
              <View style={styles.barBackground}>
                <View
                  style={[
                    styles.barFill,
                    { height: `${(item.value / maxValue) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{item.label}</Text>
              <Text style={styles.barValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const PeriodButton = ({ label, value }) => (
    <TouchableOpacity
      style={[styles.periodButton, selectedPeriod === value && styles.periodButtonActive]}
      onPress={() => setSelectedPeriod(value)}
    >
      <Text style={[styles.periodText, selectedPeriod === value && styles.periodTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Mock data for demonstration
  const mockAnalytics = analytics || {
    totalUsers: 1250,
    activeUsers: 876,
    totalPosts: 324,
    totalEvents: 48,
    totalPolls: 86,
    engagementRate: 72,
    userGrowth: 12,
    postGrowth: 8,
    departmentActivity: [
      { label: 'CSE', value: 320 },
      { label: 'ECE', value: 280 },
      { label: 'ME', value: 190 },
      { label: 'CE', value: 160 },
      { label: 'EE', value: 140 },
    ],
    weeklyPosts: [
      { label: 'Mon', value: 45 },
      { label: 'Tue', value: 52 },
      { label: 'Wed', value: 38 },
      { label: 'Thu', value: 64 },
      { label: 'Fri', value: 71 },
      { label: 'Sat', value: 28 },
      { label: 'Sun', value: 22 },
    ],
  };

  return (
    <ScrollView style={styles.container}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <PeriodButton label="Week" value="week" />
        <PeriodButton label="Month" value="month" />
        <PeriodButton label="Year" value="year" />
      </View>

      {/* Overview Stats */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Users"
          value={mockAnalytics.totalUsers}
          icon="people"
          color={COLORS.primary}
          change={mockAnalytics.userGrowth}
        />
        <StatCard
          title="Active Users"
          value={mockAnalytics.activeUsers}
          icon="pulse"
          color={COLORS.success}
        />
        <StatCard
          title="Total Posts"
          value={mockAnalytics.totalPosts}
          icon="document-text"
          color={COLORS.secondary}
          change={mockAnalytics.postGrowth}
        />
        <StatCard
          title="Events"
          value={mockAnalytics.totalEvents}
          icon="calendar"
          color={COLORS.accent}
        />
      </View>

      {/* Engagement Overview */}
      <View style={styles.engagementCard}>
        <View style={styles.engagementHeader}>
          <Text style={styles.engagementTitle}>Engagement Rate</Text>
          <Text style={styles.engagementValue}>{mockAnalytics.engagementRate}%</Text>
        </View>
        <View style={styles.engagementBar}>
          <View
            style={[styles.engagementFill, { width: `${mockAnalytics.engagementRate}%` }]}
          />
        </View>
        <Text style={styles.engagementSubtitle}>
          Based on user interactions (likes, comments, votes)
        </Text>
      </View>

      {/* Charts */}
      <BarChart data={mockAnalytics.weeklyPosts} title="Posts This Week" />
      <BarChart data={mockAnalytics.departmentActivity} title="Activity by Department" />

      {/* Top Content */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Performing Content</Text>
        <View style={styles.topContent}>
          <View style={styles.topItem}>
            <View style={[styles.rankBadge, { backgroundColor: '#FFD700' }]}>
              <Text style={styles.rankText}>1</Text>
            </View>
            <View style={styles.topItemContent}>
              <Text style={styles.topItemTitle}>Annual Tech Fest Announcement</Text>
              <Text style={styles.topItemMeta}>245 likes • 89 comments</Text>
            </View>
          </View>
          <View style={styles.topItem}>
            <View style={[styles.rankBadge, { backgroundColor: '#C0C0C0' }]}>
              <Text style={styles.rankText}>2</Text>
            </View>
            <View style={styles.topItemContent}>
              <Text style={styles.topItemTitle}>Exam Schedule Released</Text>
              <Text style={styles.topItemMeta}>198 likes • 56 comments</Text>
            </View>
          </View>
          <View style={styles.topItem}>
            <View style={[styles.rankBadge, { backgroundColor: '#CD7F32' }]}>
              <Text style={styles.rankText}>3</Text>
            </View>
            <View style={styles.topItemContent}>
              <Text style={styles.topItemTitle}>Sports Day Results</Text>
              <Text style={styles.topItemMeta}>156 likes • 42 comments</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.quickStatItem}>
          <Ionicons name="chatbubbles" size={20} color={COLORS.primary} />
          <Text style={styles.quickStatValue}>1.2K</Text>
          <Text style={styles.quickStatLabel}>Comments</Text>
        </View>
        <View style={styles.quickStatItem}>
          <Ionicons name="heart" size={20} color={COLORS.danger} />
          <Text style={styles.quickStatValue}>3.4K</Text>
          <Text style={styles.quickStatLabel}>Likes</Text>
        </View>
        <View style={styles.quickStatItem}>
          <Ionicons name="checkmark-done" size={20} color={COLORS.success} />
          <Text style={styles.quickStatValue}>892</Text>
          <Text style={styles.quickStatLabel}>Votes</Text>
        </View>
        <View style={styles.quickStatItem}>
          <Ionicons name="qr-code" size={20} color={COLORS.secondary} />
          <Text style={styles.quickStatValue}>456</Text>
          <Text style={styles.quickStatLabel}>Check-ins</Text>
        </View>
      </View>

      <View style={styles.footer} />
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
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: COLORS.background,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  periodText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  periodTextActive: {
    color: COLORS.white,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    margin: 4,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statTitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  engagementCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    margin: 16,
  },
  engagementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  engagementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  engagementValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  engagementBar: {
    height: 12,
    backgroundColor: COLORS.background,
    borderRadius: 6,
    overflow: 'hidden',
  },
  engagementFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  engagementSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 12,
  },
  chartContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    margin: 16,
    marginTop: 0,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 20,
  },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
  },
  barItem: {
    alignItems: 'center',
    flex: 1,
  },
  barBackground: {
    width: 24,
    height: 120,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  barLabel: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 8,
  },
  barValue: {
    fontSize: 10,
    color: COLORS.text,
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  topContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
  },
  topItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  topItemContent: {
    flex: 1,
  },
  topItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  topItemMeta: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    margin: 16,
    padding: 16,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
  },
  quickStatLabel: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 4,
  },
  footer: {
    height: 40,
  },
});

export default AnalyticsScreen;
