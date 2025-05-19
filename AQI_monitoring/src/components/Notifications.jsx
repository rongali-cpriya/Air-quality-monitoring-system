// src/components/Notifications.jsx
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './Notifications.css';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();

  const fetchNotifications = async () => {
    try {
      const response = await fetch('http://localhost:8002/notifications/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const sortedData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setNotifications(sortedData);
      } else {
        setError('Failed to fetch notifications');
      }
    } catch (err) {
      setError('Error fetching notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [location]); // Refresh when navigating to this page

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`http://localhost:8002/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (response.ok) {
        setNotifications(notifications.map(notif =>
          notif.notification_id === notificationId ? { ...notif, is_read: true } : notif
        ));
      } else {
        console.error('Failed to mark as read');
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="notifications-container">
      <h2>Notifications</h2>
      {notifications.length === 0 ? (
        <p>No notifications</p>
      ) : (
        <ul>
          {notifications.map(notif => (
            <li
              key={notif.notification_id}
              className={`${notif.is_read ? 'read' : 'unread'} ${
                notif.notification_type === 'threshold_alert' ? 'threshold-alert' : ''
              }`}
            >
              <div>
                <strong>{notif.title}</strong>
                <p>{notif.message}</p>
                <small>{new Date(notif.created_at).toLocaleString()}</small>
              </div>
              <div className="notification-actions">
                {!notif.is_read && (
                  <button onClick={() => markAsRead(notif.notification_id)}>Mark as Read</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;