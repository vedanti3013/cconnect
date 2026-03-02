/**
 * Feed Screen
 * Displays smart-ranked announcements
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
  Image,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { postAPI } from '../services/api';
import { COLORS, ROLES, SERVER_URL, DEPARTMENTS } from '../config/constants';

const FILTER_OPTIONS = ['All', ...DEPARTMENTS.filter(d => d !== 'All')];

const FeedScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedDept, setSelectedDept] = useState('All');
  const urgentOnly = route.params?.urgentOnly || false;

  const canCreatePost = [ROLES.TEACHER, ROLES.COMMITTEE, ROLES.ADMIN].includes(user?.role);

  const fetchPosts = async (pageNum = 1, refresh = false, department = selectedDept) => {
    try {
      const params = { page: pageNum, limit: 20 };
      if (urgentOnly) {
        params.is_urgent = 'true';
      } else if (department && department !== 'All') {
        params.department = department;
      }
      const response = await postAPI.getFeed(params);
      const newPosts = response.data.data.posts || [];
      const pagination = response.data.data.pagination;

      if (refresh || pageNum === 1) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }

      setHasMore(pagination?.has_more || false);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPosts(1, true, selectedDept);
    }, [selectedDept, urgentOnly])
  );

  const handleDeptFilter = (dept) => {
    setSelectedDept(dept);
    setPage(1);
    setPosts([]);
    setLoading(true);
    fetchPosts(1, true, dept);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchPosts(1, true, selectedDept);
    setRefreshing(false);
  }, [selectedDept]);

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage);
    }
  };

  const handleLike = async (postId) => {
    try {
      const response = await postAPI.toggleLike(postId);
      setPosts(prev =>
        prev.map(post =>
          post._id === postId
            ? {
                ...post,
                likes: response.data.data.likes,
                has_liked: response.data.data.has_liked,
              }
            : post
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleDeletePost = async (postId) => {
    const deleteAction = async () => {
      try {
        await postAPI.delete(postId);
        setPosts(prev => prev.filter(post => post._id !== postId));
      } catch (error) {
        const message = error.response?.data?.message || 'Failed to delete post';
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Error', message);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this post?')) {
        await deleteAction();
      }
      return;
    }

    Alert.alert('Delete Post', 'Delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: deleteAction },
    ]);
  };

  const PostItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.postCard, item.is_urgent && [styles.urgentPost, { borderLeftColor: theme.danger, backgroundColor: isDarkMode ? '#7F1D1D' : '#FEF2F2' }], !item.is_urgent && { backgroundColor: theme.surface, shadowColor: theme.shadow }]}
      onPress={() => navigation.navigate('PostDetail', { postId: item._id })}
    >
      {item.is_urgent && (
        <View style={[styles.urgentBadge, { backgroundColor: theme.danger }]}>
          <Ionicons name="alert-circle" size={14} color={COLORS.white} />
          <Text style={styles.urgentText}>URGENT</Text>
        </View>
      )}

      <View style={styles.postHeader}>
        <View style={styles.authorInfo}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>
              {item.created_by?.name?.charAt(0) || '?'}
            </Text>
          </View>
          <View>
            <Text style={[styles.authorName, { color: theme.text }]}>{item.created_by?.name}</Text>
            <Text style={[styles.postMeta, { color: theme.textSecondary }]}>
              {item.created_by?.role} • {item.department} •{' '}
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        {item.created_by?._id === user?._id && (
          <TouchableOpacity
            onPress={() => handleDeletePost(item._id)}
            style={styles.postDeleteButton}
          >
            <Ionicons name="trash-outline" size={18} color={theme.danger} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.postTitle, { color: theme.text }]}>{item.title}</Text>
      <Text style={[styles.postDescription, { color: theme.textSecondary }]} numberOfLines={3}>
        {item.description}
      </Text>

      {item.attachment_url && item.attachment_type === 'image' && (
        <Image
          source={{ uri: item.attachment_url.startsWith('http') ? item.attachment_url : `${SERVER_URL}${item.attachment_url}` }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      {item.event_date && (
        <View style={[styles.eventDateContainer, { backgroundColor: isDarkMode ? '#153e75' : '#eff6ff', borderLeftColor: theme.primary }]}>
          <Ionicons name="calendar-outline" size={16} color={theme.primary} />
          <Text style={[styles.eventDateText, { color: theme.primary }]}>
            Event: {new Date(item.event_date).toLocaleDateString()}
          </Text>
        </View>
      )}

      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLike(item._id)}
        >
          <Ionicons
            name={item.has_liked ? 'heart' : 'heart-outline'}
            size={20}
            color={item.has_liked ? theme.danger : theme.textSecondary}
          />
          <Text style={[styles.actionText, { color: theme.textSecondary }]}>{item.likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color={theme.textSecondary} />
          <Text style={[styles.actionText, { color: theme.textSecondary }]}>{item.comments_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading && posts.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {urgentOnly && (
        <View style={[styles.urgentFilterBanner, { backgroundColor: isDarkMode ? '#7F1D1D' : '#FEF2F2', borderBottomColor: theme.danger }]}>
          <Ionicons name="alert-circle" size={20} color={theme.danger} />
          <Text style={[styles.urgentFilterText, { color: theme.danger }]}>Showing Urgent Posts Only</Text>
          <TouchableOpacity
            onPress={() => navigation.setParams({ urgentOnly: false })}
            style={styles.clearFilterButton}
          >
            <Ionicons name="close-circle" size={20} color={theme.danger} />
          </TouchableOpacity>
        </View>
      )}
      {!urgentOnly && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.filterBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
          contentContainerStyle={styles.filterBarContent}
        >
          {FILTER_OPTIONS.map((dept) => (
            <TouchableOpacity
              key={dept}
              style={[
                styles.filterChip,
                selectedDept === dept && [styles.filterChipActive, { backgroundColor: theme.primary, borderColor: theme.primary }],
                selectedDept !== dept && { backgroundColor: isDarkMode ? '#374151' : '#f3f4f6', borderColor: isDarkMode ? '#4b5563' : '#e5e7eb' },
              ]}
              onPress={() => handleDeptFilter(dept)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedDept === dept && styles.filterChipTextActive,
                  selectedDept !== dept && { color: theme.text },
                ]}
              >
                {dept}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <FlatList
        data={posts}
        renderItem={({ item }) => <PostItem item={item} />}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && hasMore ? (
            <ActivityIndicator size="small" color={theme.primary} style={styles.footerLoader} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={64} color={theme.gray} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No posts yet</Text>
          </View>
        }
      />

      {canCreatePost && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.shadow }]}
          onPress={() => navigation.navigate('CreatePost')}
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
  filterBar: {
    maxHeight: 48,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  postCard: {
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
  urgentPost: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  urgentText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postDeleteButton: {
    padding: 6,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  postMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  postDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 12,
  },
  eventDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  eventDateText: {
    marginLeft: 8,
    color: COLORS.primary,
    fontWeight: '500',
  },
  postActions: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    marginLeft: 6,
    color: COLORS.gray,
    fontSize: 14,
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
  footerLoader: {
    marginVertical: 20,
  },
  urgentFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.danger,
    gap: 8,
  },
  urgentFilterText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.danger,
    marginLeft: 4,
  },
  clearFilterButton: {
    padding: 4,
  },
});

export default FeedScreen;
