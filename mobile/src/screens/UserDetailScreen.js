/**
 * User Detail Screen
 * View any user's profile including their posts
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { postAPI, userAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { COLORS, ROLES } from '../config/constants';

const UserDetailScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const { theme, isDarkMode } = useTheme();
  const [userDetails, setUserDetails] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsCount, setPostsCount] = useState(0);

  useEffect(() => {
    fetchUserDetailsAndPosts();
  }, [userId]);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Dashboard');
            }
          }}
          style={{ marginRight: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const fetchUserDetailsAndPosts = async () => {
    try {
      const [userRes, postsRes] = await Promise.all([
        userAPI.getById(userId),
        postAPI.getAll({ created_by: userId, limit: 100 }),
      ]);

      setUserDetails(userRes.data.data.user);
      const posts = postsRes.data.data.posts || [];
      setUserPosts(posts);
      setPostsCount(posts.length);
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case ROLES.ADMIN: return COLORS.danger;
      case ROLES.TEACHER: return COLORS.secondary;
      case ROLES.COMMITTEE: return COLORS.accent;
      default: return COLORS.primary;
    }
  };

  const PostCard = ({ post }) => (
     <TouchableOpacity
       style={[styles.postCard, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}
       onPress={() => navigation.navigate('Feed', {
        screen: 'PostDetail',
        params: { postId: post._id }
      })}
    >
      <View style={styles.postHeader}>
        <View>
          <Text style={[styles.postTitle, { color: theme.text }]} numberOfLines={2}>{post.title}</Text>
          <Text style={[styles.postMeta, { color: theme.textSecondary }]}>
            {new Date(post.created_at).toLocaleDateString()}
          </Text>
        </View>
        {post.is_urgent && (
           <View style={[styles.urgentBadge, { backgroundColor: theme.danger }]}>
            <Ionicons name="alert-circle" size={14} color={COLORS.danger} />
          </View>
        )}
      </View>
      {post.description && (
        <Text style={[styles.postDescription, { color: theme.textSecondary }]} numberOfLines={2}>{post.description}</Text>
      )}
      <View style={styles.postFooter}>
        <View style={styles.postStat}>
          <Ionicons name="heart-outline" size={14} color={COLORS.gray} />
          <Ionicons name="heart-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.postStatText, { color: theme.textSecondary }]}>{post.likes?.length || 0}</Text>
        </View>
        <View style={styles.postStat}>
          <Ionicons name="chatbubble-outline" size={14} color={COLORS.gray} />
          <Ionicons name="chatbubble-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.postStatText, { color: theme.textSecondary }]}>{post.comments?.length || 0}</Text>
        </View>
        <Text style={[styles.department, { color: theme.textSecondary }]}>{post.department}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!userDetails) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>User not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* User Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={[styles.avatarLarge, { backgroundColor: theme.primary }]}>
          <Text style={styles.avatarLargeText}>
            {userDetails?.name?.charAt(0) || '?'}
          </Text>
        </View>
        <Text style={[styles.userName, { color: theme.text }]}>{userDetails?.name}</Text>
        <Text style={[styles.userPid, { color: theme.textSecondary }]}>{userDetails?.pid}</Text>
        <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(userDetails?.role) }]}>
          <Text style={styles.roleBadgeText}>{userDetails?.role?.toUpperCase()}</Text>
        </View>
        <Text style={[styles.department, { color: theme.textSecondary }]}>{userDetails?.department}</Text>
      </View>

      {/* Stats */}
      <View style={[styles.statsContainer, { backgroundColor: theme.surface }]}>
        <View style={[styles.statCard, { backgroundColor: isDarkMode ? '#374151' : '#f9fafb' }]}>
          <Text style={[styles.statValue, { color: theme.primary }]}>{postsCount}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Posts</Text>
        </View>
      </View>

      {/* Posts Section */}
      <View style={styles.postsSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Posts by {userDetails?.name}</Text>
        {userPosts.length > 0 ? (
          userPosts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))
        ) : (
          <Text style={[styles.noPostsText, { color: theme.textSecondary }]}>No posts yet</Text>
        )}
      </View>
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
    backgroundColor: COLORS.background,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: COLORS.gray,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingVertical: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light_bg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLargeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  userPid: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  roleBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  department: {
    fontSize: 13,
    color: COLORS.gray,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light_bg,
  },
  statCard: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  postsSection: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    marginLeft: 4,
  },
  postCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  postTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  postMeta: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  urgentBadge: {
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    padding: 6,
  },
  postDescription: {
    fontSize: 12,
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 18,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.light_bg,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postStatText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  noPostsText: {
    textAlign: 'center',
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 20,
  },
});

export default UserDetailScreen;
