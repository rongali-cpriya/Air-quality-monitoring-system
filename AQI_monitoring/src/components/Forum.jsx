import React, { useState, useEffect } from 'react';
import './Forum.css';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return token
    ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
};

const buildCommentTree = (comments) => {
  const commentMap = {};
  comments.forEach((comment) => {
    comment.replies = [];
    commentMap[comment.comment_id] = comment;
  });
  const roots = [];
  comments.forEach((comment) => {
    if (comment.parent_comment_id) {
      const parent = commentMap[comment.parent_comment_id];
      if (parent) {
        parent.replies.push(comment);
      } else {
        console.warn(`Parent comment ${comment.parent_comment_id} not found for comment ${comment.comment_id}`);
        roots.push(comment); // Fallback to root
      }
    } else {
      roots.push(comment);
    }
  });
  console.log('Built comment tree:', roots);
  return roots;
};

const linkify = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="post-link"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

const Comment = ({ comment, postId, currentUserId, onReply, onUpvote, onDownvote, onEdit, onDelete }) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const handleReply = () => {
    if (replyContent.trim()) {
      onReply(comment.comment_id, replyContent);
      setReplyContent('');
      setShowReplyInput(false);
    }
  };

  const handleEditSubmit = () => {
    if (editContent.trim()) {
      onEdit(postId, comment.comment_id, editContent);
      setIsEditing(false);
    } else if (window.confirm("Comment is empty. Delete it instead?")) {
      onDelete(comment.comment_id);
    }
  };

  return (
    <div className="comment">
      <div className="comment-header">
        <span className="comment-author">
          <i className="fas fa-user-circle"></i> {comment.author || comment.username}
        </span>
        <span className="comment-time">{new Date(comment.created_at).toLocaleString()}</span>
      </div>
      {isEditing ? (
        <div className="edit-comment-section">
          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} />
          <button onClick={handleEditSubmit}>Save</button>
          <button onClick={() => setIsEditing(false)}>Cancel</button>
        </div>
      ) : (
        <p className="comment-text">{comment.content}</p>
      )}
      <div className="comment-actions">
        <button
          className={`comment-vote up ${comment.userVote === 'up' ? 'voted' : ''}`}
          onClick={() => onUpvote(comment.comment_id)}
        >
          <i className="fas fa-arrow-up"></i> {comment.upvotes || 0}
        </button>
        <button
          className={`comment-vote down ${comment.userVote === 'down' ? 'voted' : ''}`}
          onClick={() => onDownvote(comment.comment_id)}
        >
          <i className="fas fa-arrow-down"></i> {comment.downvotes || 0}
        </button>
        <button className="comment-reply" onClick={() => setShowReplyInput(!showReplyInput)}>
          <i className="fas fa-reply"></i> Reply
        </button>
        {comment.user_id === currentUserId && (
          <>
            <button onClick={() => setIsEditing(true)}>
              <i className="fas fa-edit"></i> Edit
            </button>
            <button onClick={() => onDelete(comment.comment_id)}>
              <i className="fas fa-trash"></i> Delete
            </button>
          </>
        )}
      </div>
      {showReplyInput && (
        <div className="reply-input-section">
          <textarea
            placeholder="Write a reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
          />
          <button onClick={handleReply}>
            <i className="fas fa-paper-plane"></i> Submit
          </button>
        </div>
      )}
      {comment.replies && comment.replies.length > 0 && (
        <div className="replies">
          {comment.replies.map((reply) => (
            <Comment
              key={reply.comment_id}
              comment={reply}
              postId={postId}
              currentUserId={currentUserId}
              onReply={onReply}
              onUpvote={onUpvote}
              onDownvote={onDownvote}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Forum = () => {
  const [posts, setPosts] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [activeFilter, setActiveFilter] = useState('new');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingPost, setReportingPost] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [editingPostId, setEditingPostId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchPostsAndVotes();
  }, [activeFilter]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('http://localhost:8002/auth/me', {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const userData = await response.json();
        setCurrentUserId(userData.user_id);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchUserVotes = async () => {
    try {
      const response = await fetch('http://localhost:8002/forum/user/votes', {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch user votes');
      return await response.json();
    } catch (error) {
      console.error('Error fetching user votes:', error);
      return { post_votes: [], comment_votes: [] };
    }
  };

  const fetchPostsAndVotes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userVotes = await fetchUserVotes();
      const postVotesMap = new Map(userVotes.post_votes.map(v => [v.post_id, v.vote_type]));
      const commentVotesMap = new Map(userVotes.comment_votes.map(v => [v.comment_id, v.vote_type]));

      const response = await fetch(`http://localhost:8002/forum/posts?sort=${activeFilter}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch posts');
      const data = await response.json();

      const postsWithComments = await Promise.all(
        data.map(async (post) => {
          const commentsResponse = await fetch(
            `http://localhost:8002/forum/posts/${post.post_id}/comments`,
            { headers: getAuthHeaders() }
          );
          const comments = commentsResponse.ok ? await commentsResponse.json() : [];
          console.log('Fetched comments for post', post.post_id, comments);
          const commentsWithVotes = comments.map(comment => ({
            ...comment,
            userVote: commentVotesMap.get(comment.comment_id) || comment.user_vote || null,
            downvotes: comment.downvotes || 0,
          }));
          const commentTree = buildCommentTree(commentsWithVotes);
          console.log('Comment tree for post', post.post_id, JSON.stringify(commentTree, null, 2));
          return {
            ...post,
            id: post.post_id,
            author: post.username,
            timestamp: new Date(post.created_at).toLocaleString(),
            userVote: postVotesMap.get(post.post_id) || post.user_vote || null,
            comments: commentTree,
            showFullContent: false,
          };
        })
      );
      setPosts(postsWithComments);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Failed to load posts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateCommentInTree = (comments, commentId, updateFn) => {
    return comments.map(comment => {
      if (comment.comment_id === commentId) {
        return updateFn(comment);
      } else if (comment.replies && comment.replies.length > 0) {
        return { ...comment, replies: updateCommentInTree(comment.replies, commentId, updateFn) };
      }
      return comment;
    });
  };

  const handleEditPost = (post) => {
    setEditingPostId(post.id);
    setNewPost({ title: post.title, content: post.content });
    setShowCreatePostModal(true);
  };

  const handleUpdatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      if (window.confirm("Post is empty. Delete it instead?")) {
        await handleDeletePost(editingPostId);
      }
      return;
    }
    try {
      const response = await fetch(`http://localhost:8002/forum/posts/${editingPostId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(newPost),
      });
      if (!response.ok) throw new Error('Failed to update post');
      const updatedPost = await response.json();
      setPosts(posts.map(p => p.id === editingPostId ? { ...p, ...updatedPost, id: updatedPost.post_id } : p));
      setShowCreatePostModal(false);
      setEditingPostId(null);
      setNewPost({ title: '', content: '' });
    } catch (error) {
      console.error('Error updating post:', error);
      setError('Failed to update post. Please try again.');
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
        setError('Failed to delete post. Please try again.');
      }
    }
  };

  const handleEditComment = async (postId, commentId, content) => {
    try {
      const response = await fetch(`http://localhost:8002/forum/comments/${commentId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content, post_id: postId }),
      });
      if (!response.ok) throw new Error('Failed to update comment');
      const updatedComment = await response.json();
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: updateCommentInTree(post.comments, commentId, () => ({
              ...updatedComment,
              userVote: updatedComment.user_vote || null,
            })),
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error updating comment:', error);
      setError('Failed to update comment. Please try again.');
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
        setPosts(posts.map(post => ({
          ...post,
          comments: removeCommentFromTree(post.comments, commentId),
        })));
      } catch (error) {
        console.error('Error deleting comment:', error);
        setError('Failed to delete comment. Please try again.');
      }
    }
  };

  const removeCommentFromTree = (comments, commentId) => {
    return comments.filter(c => c.comment_id !== commentId).map(c => ({
      ...c,
      replies: removeCommentFromTree(c.replies, commentId),
    }));
  };

  const handleVote = async (postId, isUpvote) => {
    try {
      const endpoint = isUpvote
        ? `/forum/posts/${postId}/upvote`
        : `/forum/posts/${postId}/downvote`;
      const response = await fetch(`http://localhost:8002${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to vote');
      const data = await response.json();
      setPosts(posts.map(p => p.id === postId ? {
        ...p,
        upvotes: data.upvotes,
        downvotes: data.downvotes,
        userVote: data.user_vote
      } : p));
    } catch (error) {
      console.error('Error voting on post:', error);
      setError('Failed to vote on post. Please try again.');
    }
  };

  const handleCommentVote = async (commentId, isUpvote) => {
    try {
      const endpoint = isUpvote
        ? `/forum/comments/${commentId}/upvote`
        : `/forum/comments/${commentId}/downvote`;
      const response = await fetch(`http://localhost:8002${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to vote on comment: ${errorText}`);
      }
      const data = await response.json();
      console.log('Vote response:', data);
      setPosts(posts.map(post => ({
        ...post,
        comments: updateCommentInTree(post.comments, commentId, (comment) => ({
          ...comment,
          upvotes: data.upvotes,
          downvotes: data.downvotes,
          userVote: data.user_vote
        }))
      })));
    } catch (error) {
      console.error('Error voting on comment:', error);
      setError(`Failed to vote on comment: ${error.message}`);
    }
  };

  const handleAddComment = async (postId, parentCommentId, content) => {
    if (!content.trim()) return;
    try {
      const response = await fetch('http://localhost:8002/forum/comments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ post_id: postId, content, parent_comment_id: parentCommentId }),
      });
      if (!response.ok) throw new Error('Failed to add comment');
      const newCommentData = await response.json();
      const newComment = {
        ...newCommentData,
        comment_id: newCommentData.comment_id,
        author: newCommentData.username,
        created_at: newCommentData.created_at,
        upvotes: newCommentData.upvotes || 0,
        downvotes: newCommentData.downvotes || 0,
        userVote: newCommentData.user_vote || null,
        replies: [],
      };
      setPosts(posts.map(post => {
        if (post.id === postId) {
          if (parentCommentId) {
            const updatedComments = updateCommentInTree(post.comments, parentCommentId, (comment) => ({
              ...comment,
              replies: [...comment.replies, newComment]
            }));
            return { ...post, comments: updatedComments };
          } else {
            return { ...post, comments: [...post.comments, newComment] };
          }
        }
        return post;
      }));
      if (!parentCommentId) setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      setError('Failed to add comment. Please try again.');
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) return;
    if (editingPostId) {
      await handleUpdatePost();
    }else{
      try {
        const response = await fetch('http://localhost:8002/forum/posts', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ title: newPost.title, content: newPost.content }),
        });
        if (!response.ok) throw new Error('Failed to create post');
        const createdPost = await response.json();
        const formattedPost = {
          ...createdPost,
          id: createdPost.post_id,
          author: createdPost.username,
          timestamp: new Date(createdPost.created_at).toLocaleString(),
          userVote: null,
          comments: [],
          showFullContent: false,
        };
        setPosts([formattedPost, ...posts]);
        setShowCreatePostModal(false);
        setNewPost({ title: '', content: '' });
      } catch (error) {
        console.error('Error creating post:', error);
        setError('Failed to create post. Please try again.');
      }
    }
  };

  const handleSubmitReport = async () => {
    if (!reportReason.trim()) {
      alert('Please provide a reason for reporting.');
      return;
    }
    try {
      const response = await fetch('http://localhost:8002/forum/reports', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reported_user_id: reportingPost.user_id, reason: reportReason }),
      });
      if (response.ok) {
        alert('Thank you. This post has been reported for review.');
        setShowReportModal(false);
        setReportReason('');
      } else {
        throw new Error('Failed to report post');
      }
    } catch (error) {
      console.error('Error reporting:', error);
      alert('Failed to report post. Please try again.');
    }
  };

  const toggleContentExpansion = (postId) => {
    setPosts(posts.map(post =>
      post.id === postId ? { ...post, showFullContent: !post.showFullContent } : post
    ));
  };

  return (
    <div className="forum-container content-container">
      {error && <div className="error-message">{error}</div>}
      <div className="forum-header">
        <h1>EcoForum</h1>
        <p>Discuss air quality improvement initiatives and share your ideas</p>
        <button className="new-post-btn" onClick={() => setShowCreatePostModal(true)}>
          <i className="fas fa-plus-circle"></i> Create New Post
        </button>
      </div>

      <div className="filter-options">
        <button
          className={`filter-btn ${activeFilter === 'new' ? 'active' : ''}`}
          onClick={() => setActiveFilter('new')}
        >
          <i className="fas fa-clock"></i> New
        </button>
        <button
          className={`filter-btn ${activeFilter === 'top' ? 'active' : ''}`}
          onClick={() => setActiveFilter('top')}
        >
          <i className="fas fa-award"></i> Top
        </button>
      </div>

      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading posts...</p>
        </div>
      ) : (
        <div className="posts-container">
          {posts.length === 0 ? (
            <div className="no-posts-message">
              <i className="fas fa-comment-slash"></i>
              <p>No posts yet. Be the first to create a discussion!</p>
            </div>
          ) : (
            posts.map((post) => (
              <div className="post-card" key={post.id}>
                <div className="vote-section">
                  <button
                    className={`vote-btn up ${post.userVote === 'up' ? 'voted' : ''}`}
                    onClick={() => handleVote(post.id, true)}
                  >
                    <i className="fas fa-arrow-up"></i>
                  </button>
                  <span className="vote-count">{post.upvotes - post.downvotes}</span>
                  <button
                    className={`vote-btn down ${post.userVote === 'down' ? 'voted' : ''}`}
                    onClick={() => handleVote(post.id, false)}
                  >
                    <i className="fas fa-arrow-down"></i>
                  </button>
                </div>

                <div className="post-content">
                  <h3>{post.title}</h3>
                  <p className="post-author">
                    <i className="fas fa-user-circle"></i> {post.author} • {post.timestamp}
                  </p>

                  <div className="post-text">
                    {post.content.length > 200 && !post.showFullContent ? (
                      <>
                        <p>{linkify(post.content.substring(0, 200))}...</p>
                        <button
                          className="read-more-btn"
                          onClick={() => toggleContentExpansion(post.id)}
                        >
                          Read More <i className="fas fa-chevron-down"></i>
                        </button>
                      </>
                    ) : (
                      <>
                        <p>{linkify(post.content)}</p>
                        {post.content.length > 200 && (
                          <button
                            className="read-more-btn"
                            onClick={() => toggleContentExpansion(post.id)}
                          >
                            Show Less <i className="fas fa-chevron-up"></i>
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="post-actions">
                    <button
                      className="action-btn comment"
                      onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)}
                    >
                      <i className="fas fa-comment"></i> {post.comments.length} Comments
                    </button>
                    <button
                      className="action-btn report"
                      onClick={() => {
                        setReportingPost(post);
                        setShowReportModal(true);
                      }}
                    >
                      <i className="fas fa-flag"></i> Report
                    </button>
                    {post.user_id === currentUserId && (
                      <>
                        <button onClick={() => handleEditPost(post)}>
                          <i className="fas fa-edit"></i> Edit
                        </button>
                        <button onClick={() => handleDeletePost(post.id)}>
                          <i className="fas fa-trash"></i> Delete
                        </button>
                      </>
                    )}
                  </div>

                  {activeCommentPost === post.id && (
                    <>
                      <div className="comment-input-section">
                        <textarea
                          placeholder="Write a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                        />
                        <button onClick={() => handleAddComment(post.id, null, newComment)}>
                          <i className="fas fa-paper-plane"></i> Submit
                        </button>
                      </div>

                      <div className="comments-section">
                        {post.comments.length === 0 ? (
                          <p className="no-comments">No comments yet. Be the first to share your thoughts!</p>
                        ) : (
                          post.comments.map((comment) => (
                            <Comment
                              key={comment.comment_id}
                              comment={comment}
                              onReply={(parentId, content) => handleAddComment(post.id, parentId, content)}
                              onUpvote={(commentId) => handleCommentVote(commentId, true)}
                              onDownvote={(commentId) => handleCommentVote(commentId, false)}
                              onEdit={handleEditComment}
                              onDelete={handleDeleteComment}
                            />
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showCreatePostModal && (
        <div className="modal-overlay">
          <div className="create-post-modal">
            <div className="modal-header">
              <h2>Create a New Post</h2>
              <button className="close-modal-btn" onClick={() => setShowCreatePostModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="post-title">Title</label>
                <input
                  id="post-title"
                  type="text"
                  placeholder="Give your post a title"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="post-content">Content</label>
                <textarea
                  id="post-content"
                  placeholder="What would you like to discuss?"
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  rows={6}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowCreatePostModal(false)}>
                Cancel
              </button>
              <button
                className="submit-post-btn"
                onClick={handleCreatePost}
                disabled={!newPost.title.trim() || !newPost.content.trim()}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="modal-overlay">
          <div className="report-modal">
            <div className="modal-header">
              <h2>Report Post</h2>
              <button className="close-modal-btn" onClick={() => setShowReportModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>Post Title: {reportingPost.title}</p>
              <div className="form-group">
                <label htmlFor="report-reason">Reason for Reporting</label>
                <textarea
                  id="report-reason"
                  placeholder="Please provide a detailed reason for reporting this post."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowReportModal(false)}>
                Cancel
              </button>
              <button className="submit-report-btn" onClick={handleSubmitReport}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Forum;