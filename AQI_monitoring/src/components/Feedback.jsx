import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Feedback.css';

const Feedback = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    info: '',
    stars: 5
  });
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setMessage({ type: 'error', text: 'File size must be less than 10MB' });
        return;
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setMessage({ type: 'error', text: 'Invalid file type. Please upload an image, PDF, or Word document.' });
        return;
      }
      setFile(file);
      setMessage({ type: '', text: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('info', formData.info);
      formDataToSend.append('stars', formData.stars);
      if (file) {
        formDataToSend.append('file', file);
      }

      const response = await fetch('http://localhost:8002/feedback/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formDataToSend
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Thank you for your feedback!' });
        setTimeout(() => navigate('/'), 2000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Failed to submit feedback' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while submitting feedback' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="feedback-container">
      <h2>Share Your Feedback</h2>
      <form onSubmit={handleSubmit} className="feedback-form">
        <div className="form-group">
          <label htmlFor="name">Your Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            minLength={1}
            maxLength={100}
          />
        </div>

        <div className="form-group">
          <label htmlFor="info">Your Feedback</label>
          <textarea
            id="info"
            name="info"
            value={formData.info}
            onChange={handleInputChange}
            required
            minLength={1}
            rows={5}
          />
        </div>

        <div className="form-group">
          <label htmlFor="stars">Rating</label>
          <div className="star-rating">
            {[5, 4, 3, 2, 1].map((star) => (
              <label key={star}>
                <input
                  type="radio"
                  name="stars"
                  value={star}
                  checked={parseInt(formData.stars) === star}
                  onChange={handleInputChange}
                />
                <span className={`star ${parseInt(formData.stars) >= star ? 'filled' : ''}`}>★</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="file">Attachment (optional)</label>
          <input
            type="file"
            id="file"
            onChange={handleFileChange}
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
          />
          <small>Max size: 10MB. Allowed types: Images, PDF, Word documents</small>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className="submit-button">
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
};

export default Feedback;