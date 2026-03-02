/**
 * Post Detail Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { postAPI, commentAPI } from '../services/api';
import { COLORS, SERVER_URL } from '../config/constants';

const PostDetailScreen = ({ route, navigation }) => {
  const { postId } = route.params;
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPostDetails();
  }, [postId]);

  const fetchPostDetails = async () => {
    try {
      const response = await postAPI.getById(postId);
      setPost(response.data.data.post);
      setComments(response.data.data.comments || []);
    } catch (error) {
      console.error('Error fetching post:', error);
      Alert.alert('Error', 'Failed to load post');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      const response = await postAPI.toggleLike(postId);
      setPost(prev => ({
        ...prev,
        likes: response.data.data.likes,
        has_liked: response.data.data.has_liked,
      }));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await commentAPI.create(postId, { text: newComment.trim() });
      setComments(prev => [response.data.data.comment, ...prev]);
      setPost(prev => ({ ...prev, comments_count: prev.comments_count + 1 }));
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await commentAPI.delete(commentId);
              setComments(prev => prev.filter(c => c._id !== commentId));
              setPost(prev => ({ ...prev, comments_count: prev.comments_count - 1 }));
            } catch (error) {
              console.error('Error deleting comment:', error);
            }
          },
        },
      ]
    );
  };

  const handleDeletePost = async () => {
    const deleteAction = async () => {
      try {
        await postAPI.delete(postId);
        navigation.goBack();
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Text>Post not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Urgent Badge */}
          {post.is_urgent && (
            <View style={styles.urgentBadge}>
              <Ionicons name="alert-circle" size={14} color={COLORS.white} />
              <Text style={styles.urgentText}>URGENT</Text>
            </View>
          )}

          {/* Author Info */}
          <View style={styles.authorSection}>
            <View style={styles.authorInfoLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {post.created_by?.name?.charAt(0) || '?'}
                </Text>
              </View>
              <View>
                <Text style={styles.authorName}>{post.created_by?.name}</Text>
                <Text style={styles.postMeta}>
                  {post.created_by?.role} • {post.department}
                </Text>
                <Text style={styles.postDate}>
                  {new Date(post.created_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>
            {post.created_by?._id === user?._id && (
              <TouchableOpacity
                onPress={handleDeletePost}
                style={styles.postDeleteButton}
              >
                <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
              </TouchableOpacity>
            )}
          </View>

          {/* Post Content */}
          <Text style={styles.postTitle}>{post.title}</Text>
          <Text style={styles.postDescription}>{post.description}</Text>

          {/* Attachment */}
          {post.attachment_url && post.attachment_type === 'image' && (
            <Image
              source={{ uri: post.attachment_url.startsWith('http') ? post.attachment_url : `${SERVER_URL}${post.attachment_url}` }}
              style={styles.postImage}
              resizeMode="contain"
            />
          )}

          {/* Event Date */}
          {post.event_date && (
            <View style={styles.eventDateContainer}>
              <Ionicons name="calendar" size={20} color={COLORS.primary} />
              <Text style={styles.eventDateText}>
                Event Date: {new Date(post.event_date).toLocaleDateString()}
              </Text>
            </View>
          )}

          {/* External Link */}
          {post.external_link && (
            <TouchableOpacity style={styles.linkContainer}>
              <Ionicons name="link" size={20} color={COLORS.primary} />
              <Text style={styles.linkText} numberOfLines={1}>
                {post.external_link}
              </Text>
            </TouchableOpacity>
          )}

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Ionicons
                name={post.has_liked ? 'heart' : 'heart-outline'}
                size={24}
                color={post.has_liked ? COLORS.danger : COLORS.gray}
              />
              <Text style={styles.actionText}>{post.likes} likes</Text>
            </TouchableOpacity>
            <View style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={24} color={COLORS.gray} />
              <Text style={styles.actionText}>{post.comments_count} comments</Text>
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Comments</Text>
            {comments.length === 0 ? (
              <Text style={styles.noComments}>No comments yet. Be the first to comment!</Text>
            ) : (
              comments.map((comment) => (
                <View key={comment._id} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {comment.user_id?.name?.charAt(0) || '?'}
                      </Text>
                    </View>
                    <View style={styles.commentInfo}>
                      <Text style={styles.commentAuthor}>{comment.user_id?.name}</Text>
                      <Text style={styles.commentDate}>
                        {new Date(comment.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    {(comment.user_id?._id === user?._id || user?.role === 'admin') && (
                      <TouchableOpacity
                        onPress={() => handleDeleteComment(comment._id)}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.commentText}>{comment.text}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Comment Input */}
      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor={COLORS.gray}
          value={newComment}
          onChangeText={setNewComment}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
          onPress={handleComment}
          disabled={!newComment.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Ionicons name="send" size={20} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  urgentText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  authorInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  postMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  postDate: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  postTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  postDescription: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  postImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginTop: 20,
  },
  eventDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  eventDateText: {
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  linkText: {
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.primary,
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 32,
  },
  actionText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.gray,
  },
  commentsSection: {
    marginTop: 24,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  noComments: {
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  commentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  commentAvatarText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  commentInfo: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  commentDate: {
    fontSize: 12,
    color: COLORS.gray,
  },
  deleteButton: {
    padding: 4,
  },
  postDeleteButton: {
    padding: 6,
  },
  commentText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  commentInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
});

export default PostDetailScreen;
