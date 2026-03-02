/**
 * Polls Screen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { pollAPI } from '../services/api';
import { COLORS, ROLES } from '../config/constants';

const PollsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('active'); // active, closed, all

  const canCreatePoll = [ROLES.TEACHER, ROLES.COMMITTEE, ROLES.ADMIN].includes(user?.role);

  const fetchPolls = async () => {
    try {
      const params = {};
      if (filter === 'active') {
        params.active = 'true';
      } else if (filter === 'closed') {
        params.closed = 'true';
      }

      const response = await pollAPI.getAll(params);
      setPolls(response.data.data.polls || []);
    } catch (error) {
      console.error('Error fetching polls:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, [filter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPolls();
    setRefreshing(false);
  }, [filter]);

  const handleVote = async (pollId, optionIndex) => {
    try {
      const response = await pollAPI.vote(pollId, optionIndex);
      setPolls(prev =>
        prev.map(poll =>
          poll._id === pollId ? response.data.data.poll : poll
        )
      );
    } catch (error) {
      console.error('Error voting:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to vote');
    }
  };

  const FilterButton = ({ label, value }) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === value && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const PollItem = ({ poll }) => {
    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
    const isExpired = new Date(poll.expires_at) < new Date();
    const hasVoted = poll.has_voted;

    return (
      <View style={styles.pollCard}>
        <View style={styles.pollHeader}>
          <View style={styles.authorInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {poll.created_by?.name?.charAt(0) || '?'}
              </Text>
            </View>
            <View>
              <Text style={styles.authorName}>{poll.created_by?.name}</Text>
              <Text style={styles.pollMeta}>
                {poll.department} • {new Date(poll.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isExpired ? COLORS.gray : COLORS.success }]}>
            <Text style={styles.statusText}>{isExpired ? 'Closed' : 'Active'}</Text>
          </View>
        </View>

        <Text style={styles.pollQuestion}>{poll.question}</Text>

        <View style={styles.optionsContainer}>
          {poll.options.map((option, index) => {
            const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
            const isSelected = poll.user_vote === index;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  (hasVoted || isExpired) && styles.optionButtonVoted,
                  isSelected && styles.optionButtonSelected,
                ]}
                onPress={() => !hasVoted && !isExpired && handleVote(poll._id, index)}
                disabled={hasVoted || isExpired}
              >
                {(hasVoted || isExpired) && (
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${percentage}%` },
                      isSelected && styles.progressBarSelected,
                    ]}
                  />
                )}
                <View style={styles.optionContent}>
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {option.text}
                  </Text>
                  {(hasVoted || isExpired) && (
                    <Text style={[styles.percentageText, isSelected && styles.percentageTextSelected]}>
                      {percentage}%
                    </Text>
                  )}
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.pollFooter}>
          <View style={styles.votesInfo}>
            <Ionicons name="people-outline" size={16} color={COLORS.gray} />
            <Text style={styles.votesText}>{totalVotes} votes</Text>
          </View>
          {!isExpired && (
            <Text style={styles.expiresText}>
              Expires: {new Date(poll.expires_at).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <FilterButton label="Active" value="active" />
        <FilterButton label="Closed" value="closed" />
        <FilterButton label="All" value="all" />
      </View>

      <FlatList
        data={polls}
        renderItem={({ item }) => <PollItem poll={item} />}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bar-chart-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyText}>No polls found</Text>
          </View>
        }
      />

      {canCreatePoll && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreatePoll')}
        >
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
      )}
    </View>
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
  filterBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: COLORS.background,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: 16,
  },
  pollCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  pollMeta: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  pollQuestion: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  optionsContainer: {
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  optionButtonVoted: {
    backgroundColor: COLORS.white,
  },
  optionButtonSelected: {
    borderColor: COLORS.primary,
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  progressBarSelected: {
    backgroundColor: `${COLORS.primary}20`,
  },
  optionContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  optionText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  percentageText: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '600',
  },
  percentageTextSelected: {
    color: COLORS.primary,
  },
  pollFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  votesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  votesText: {
    marginLeft: 6,
    fontSize: 12,
    color: COLORS.gray,
  },
  expiresText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray,
  },
});

export default PollsScreen;
