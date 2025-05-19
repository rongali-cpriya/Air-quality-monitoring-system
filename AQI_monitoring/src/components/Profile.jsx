import React, { useState, useEffect } from 'react';
import './Profile.css';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const Profile = () => {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [editingPost, setEditingPost] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editPostContent, setEditPostContent] = useState({ title: '', content: '' });
  const [editCommentContent, setEditCommentContent] = useState('');

  // Initial profile fetch - runs once on mount
  useEffect(() => {
    let mounted = true;
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('access_token');

        if (!token) {
          if (mounted) {
            setUser(getMockUser());
            setLoading(false);
          }
          return;
        }

        const userResponse = await fetch('http://localhost:8002/auth/me', {
          headers: getAuthHeaders(),
          credentials: 'include'
        });

        if (!userResponse.ok) {
          console.error(`User data fetch failed with status: ${userResponse.status}`);
          if (mounted) {
            setUser(getMockUser());
            setLoading(false);
          }
          return;
        }

        const userData = await userResponse.json();
        let reputationData = { streak_points: 0, aura_points: 0, credibility_points: 0 };
        try {
          const reputationResponse = await fetch(`http://localhost:8002/forum/reputation/${userData.user_id}`, {
            headers: getAuthHeaders(),
            credentials: 'include'
          });
          if (reputationResponse.ok) {
            reputationData = await reputationResponse.json();
          }
        } catch (repError) {
          console.warn("Failed to fetch reputation data:", repError);
        }

        let userPosts = [];
        try {
          const postsResponse = await fetch('http://localhost:8002/forum/posts', {
            headers: getAuthHeaders(),
            credentials: 'include'
          });
          if (postsResponse.ok) {
            const posts = await postsResponse.json();
            userPosts = posts.filter(post => post.user_id === userData.user_id);
          }
        } catch (postsError) {
          console.warn("Failed to fetch posts data:", postsError);
        }

        if (mounted) {
          setUser({
            user_id: userData.user_id,
            username: userData.username || "User",
            avatar: "/api/placeholder/150/150",
            joinDate: userData.created_at ? new Date(userData.created_at).toLocaleDateString() : "Unknown",
            scores: {
              streak: reputationData.streak_points || 0,
              aura: reputationData.aura_points || 0,
              credibility: reputationData.credibility_points || 0
            },
            stats: {
              posts: userPosts.length,
              comments: 0,
              upvotesReceived: userPosts.reduce((sum, post) => sum + (post.upvotes || 0), 0),
              downvotesReceived: userPosts.reduce((sum, post) => sum + (post.downvotes || 0), 0),
              reports: 0
            },
            badges: ["Air Quality Advocate", "Active Contributor", "Community Explorer"],
            recentActivity: userPosts.slice(0, 3).map(post => ({
              type: "post",
              title: post.title || "Untitled Post",
              timestamp: post.created_at ? new Date(post.created_at).toLocaleString() : "Unknown date",
              upvotes: post.upvotes || 0
            }))
          });
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        if (mounted) {
          setUser(getMockUser());
          setLoading(false);
        }
      }
    };

    loadInitialData();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch posts when user_id changes
  useEffect(() => {
    if (!user?.user_id) return;

    const fetchUserPosts = async () => {
      setPostsLoading(true);
      try {
        const response = await fetch('http://localhost:8002/forum/posts', {
          headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch posts');
        const data = await response.json();
        const userPosts = data.filter(post => post.user_id === user.user_id).map(post => ({
          ...post,
          id: post.post_id,
        }));
        setPosts(userPosts);
      } catch (error) {
        console.error('Error fetching posts:', error);
        setError('Failed to fetch posts.');
      } finally {
        setPostsLoading(false);
      }
    };

    fetchUserPosts();
  }, [user?.user_id]);

  // Fetch comments when user_id changes
  useEffect(() => {
    if (!user?.user_id) return;

    const fetchUserComments = async () => {
      setCommentsLoading(true);
      try {
        const response = await fetch('http://localhost:8002/forum/posts', {
          headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch posts');
        const postsData = await response.json();
        let allComments = [];
        for (const post of postsData) {
          const commentsResponse = await fetch(`http://localhost:8002/forum/posts/${post.post_id}/comments`, {
            headers: getAuthHeaders(),
          });
          if (commentsResponse.ok) {
            const comments = await commentsResponse.json();
            allComments = [...allComments, ...comments.filter(c => c.user_id === user.user_id)];
          }
        }
        setComments(allComments);
      } catch (error) {
        console.error('Error fetching comments:', error);
        setError('Failed to fetch comments.');
      } finally {
        setCommentsLoading(false);
      }
    };

    fetchUserComments();
  }, [user?.user_id]);

  const handleEditPost = (post) => {
    setEditingPost(post);
    setEditPostContent({ title: post.title, content: post.content });
  };

  const handleUpdatePost = async () => {
    if (!editPostContent.title.trim() || !editPostContent.content.trim()) {
      if (window.confirm("Post is empty. Delete it instead?")) {
        await handleDeletePost(editingPost.id);
      }
      return;
    }
    try {
      const response = await fetch(`http://localhost:8002/forum/posts/${editingPost.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(editPostContent),
      });
      if (!response.ok) throw new Error('Failed to update post');
      const updatedPost = await response.json();
      setPosts(posts.map(p => p.id === editingPost.id ? { ...p, ...updatedPost, id: updatedPost.post_id } : p));
      setEditingPost(null);
    } catch (error) {
      console.error('Error updating post:', error);
      setError('Failed to update post.');
    }
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        const response = await fetch(`http://localhost:8002/forum/posts/${postId}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete post');
        setPosts(posts.filter(p => p.id !== postId));
      } catch (error) {
        console.error('Error deleting post:', error);
        setError('Failed to delete post.');
      }
    }
  };

  const handleEditComment = (comment) => {
    setEditingComment(comment);
    setEditCommentContent(comment.content);
  };

  const handleUpdateComment = async () => {
    if (!editCommentContent.trim()) {
      if (window.confirm("Comment is empty. Delete it instead?")) {
        await handleDeleteComment(editingComment.comment_id);
      }
      return;
    }
    try {
      const response = await fetch(`http://localhost:8002/forum/comments/${editingComment.comment_id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content: editCommentContent, post_id: editingComment.post_id }),
      });
      if (!response.ok) throw new Error('Failed to update comment');
      const updatedComment = await response.json();
      setComments(comments.map(c => c.comment_id === editingComment.comment_id ? updatedComment : c));
      setEditingComment(null);
    } catch (error) {
      console.error('Error updating comment:', error);
      setError('Failed to update comment.');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      try {
        const response = await fetch(`http://localhost:8002/forum/comments/${commentId}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete comment');
        setComments(comments.filter(c => c.comment_id !== commentId));
      } catch (error) {
        console.error('Error deleting comment:', error);
        setError('Failed to delete comment.');
      }
    }
  };

  const getMockUser = () => {
    return {
      user_id: 'mockUserId',
      username: "DemoUser",
      avatar: "/api/placeholder/150/150",
      joinDate: "01/10/2024",
      scores: {
        streak: 12,
        aura: 85,
        credibility: 92
      },
      stats: {
        posts: 24,
        comments: 73,
        upvotesReceived: 128,
        downvotesReceived: 5,
        reports: 0
      },
      badges: ["Air Quality Advocate", "Active Contributor", "Community Explorer"],
      recentActivity: [
        {
          type: "post",
          title: "How to reduce carbon footprint in urban areas",
          timestamp: "03/15/2025, 10:30:45 AM",
          upvotes: 32
        },
        {
          type: "post",
          title: "Results from my neighborhood air quality study",
          timestamp: "03/10/2025, 2:15:30 PM",
          upvotes: 47
        },
        {
          type: "post",
          title: "Proposal for community green space initiative",
          timestamp: "03/05/2025, 9:45:12 AM",
          upvotes: 21
        }
      ]
    };
  };

  const getScoreClass = (score) => {
    if (score >= 90) return "excellent";
    if (score >= 70) return "good";
    if (score >= 50) return "average";
    return "needs-improvement";
  };

  if (loading) return (
    <div className="profile-loading">
      <div className="loader"></div>
      <p>Loading your profile...</p>
    </div>
  );

  if (!user) return null;

  return (
    <div className="profile-container">
      {error && <div className="error-message">{error}</div>}
      <div className="profile-header">
        <div className="profile-avatar-section">
          <div className="avatar-container">
            <img src={user.avatar} alt={`${user.username}'s avatar`} className="profile-avatar" />
          </div>
          <div className="profile-info">
            <h2 className="profile-username">{user.username}</h2>
            <p className="profile-join-date">
              <i className="fas fa-calendar-alt"></i> Member since {user.joinDate}
            </p>
          </div>
        </div>
        <div className="profile-scores">
          <div className="score-card">
            <div className="score-value streak">{user.scores.streak}</div>
            <div className="score-label">
              <i className="fas fa-fire"></i> Day Streak
            </div>
          </div>
          <div className="score-card">
            <div className={`score-value ${getScoreClass(user.scores.aura)}`}>
              {user.scores.aura}
            </div>
            <div className="score-label">
              <i className="fas fa-star"></i> Aura Score
            </div>
          </div>
          <div className="score-card">
            <div className={`score-value ${getScoreClass(user.scores.credibility)}`}>
              {user.scores.credibility}
            </div>
            <div className="score-label">
              <i className="fas fa-award"></i> Credibility
            </div>
          </div>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <h3 className="section-title">
            <i className="fas fa-chart-line"></i> Activity Stats
          </h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{user.stats.posts}</div>
              <div className="stat-label">
                <i className="fas fa-file-alt"></i> Posts
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{user.stats.comments}</div>
              <div className="stat-label">
                <i className="fas fa-comment"></i> Comments
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{user.stats.upvotesReceived}</div>
              <div className="stat-label">
                <i className="fas fa-arrow-up"></i> Upvotes
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{user.stats.downvotesReceived}</div>
              <div className="stat-label">
                <i className="fas fa-arrow-down"></i> Downvotes
              </div>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h3 className="section-title">
            <i className="fas fa-medal"></i> Badges
          </h3>
          <div className="badges-container">
            {user.badges.map((badge, index) => (
              <div className="badge" key={index}>
                <i className="fas fa-award"></i>
                <span>{badge}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="profile-section">
          <h3 className="section-title">
            <i className="fas fa-history"></i> Recent Activity
          </h3>
          <div className="activity-tabs">
            <button onClick={() => setActiveTab('posts')} className={activeTab === 'posts' ? 'active' : ''}>
              Posts
            </button>
            <button onClick={() => setActiveTab('comments')} className={activeTab === 'comments' ? 'active' : ''}>
              Comments
            </button>
          </div>
          {activeTab === 'posts' && (
            <div className="activity-list">
              {postsLoading ? (
                <div className="loading">Loading posts...</div>
              ) : posts.length === 0 ? (
                <div className="empty-activity">
                  <p>No posts to display.</p>
                </div>
              ) : (
                posts.map(post => (
                  <div className="activity-item" key={post.id}>
                    {editingPost?.id === post.id ? (
                      <>
                        <input
                          value={editPostContent.title}
                          onChange={(e) => setEditPostContent({ ...editPostContent, title: e.target.value })}
                        />
                        <textarea
                          value={editPostContent.content}
                          onChange={(e) => setEditPostContent({ ...editPostContent, content: e.target.value })}
                        />
                        <button onClick={handleUpdatePost}>Save</button>
                        <button onClick={() => setEditingPost(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <h4>{post.title}</h4>
                        <p>{post.content}</p>
                        <button onClick={() => handleEditPost(post)}>
                          <i className="fas fa-edit"></i> Edit
                        </button>
                        <button onClick={() => handleDeletePost(post.id)}>
                          <i className="fas fa-trash"></i> Delete
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
          {activeTab === 'comments' && (
            <div className="activity-list">
              {commentsLoading ? (
                <div className="loading">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="empty-activity">
                  <p>No comments to display.</p>
                </div>
              ) : (
                comments.map(comment => (
                  <div className="activity-item" key={comment.comment_id}>
                    {editingComment?.comment_id === comment.comment_id ? (
                      <>
                        <textarea
                          value={editCommentContent}
                          onChange={(e) => setEditCommentContent(e.target.value)}
                        />
                        <button onClick={handleUpdateComment}>Save</button>
                        <button onClick={() => setEditingComment(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <p>{comment.content}</p>
                        <button onClick={() => handleEditComment(comment)}>
                          <i className="fas fa-edit"></i> Edit
                        </button>
                        <button onClick={() => handleDeleteComment(comment.comment_id)}>
                          <i className="fas fa-trash"></i> Delete
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;