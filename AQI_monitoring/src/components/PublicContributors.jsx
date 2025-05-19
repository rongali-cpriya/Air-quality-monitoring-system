import React, { useState } from 'react';
import './PublicContributors.css';

const PublicContributors = () => {
  const [activeTab, setActiveTab] = useState('AQI');
  const [formData, setFormData] = useState({
    station_id: '',
    pm25: '',
    pm10: '',
    no2: '',
    co: '',
    so2: '',
    ozone: '',
    overall_aqi: '',
    source: '',
    additional_info: ''
  });
  const [errors, setErrors] = useState({});
  const [showPopup, setShowPopup] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: '' });
  };

  const validateForm = () => {
    const newErrors = {};
    // Require station_id only for AQI tab
    if (activeTab === 'AQI' && (!formData.station_id || isNaN(formData.station_id))) {
      newErrors.station_id = 'Station ID must be a number';
    }
    if (!formData.source) {
      newErrors.source = 'Source is required';
    }

    const numericFields = ['pm25', 'pm10', 'no2', 'co', 'so2', 'ozone', 'overall_aqi'];
    numericFields.forEach((field) => {
      if (formData[field] && isNaN(formData[field])) {
        newErrors[field] = `${field.toUpperCase()} must be a number`;
      } else if (formData[field] && parseFloat(formData[field]) < 0) {
        newErrors[field] = `${field.toUpperCase()} cannot be negative`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const payload = {
      source: formData.source
    };

    if (activeTab === 'AQI') {
      // For AQI tab, station_id is required and validated
      payload.station_id = parseInt(formData.station_id);
      payload.pm25 = formData.pm25 ? parseFloat(formData.pm25) : null;
      payload.pm10 = formData.pm10 ? parseFloat(formData.pm10) : null;
      payload.no2 = formData.no2 ? parseFloat(formData.no2) : null;
      payload.co = formData.co ? parseFloat(formData.co) : null;
      payload.so2 = formData.so2 ? parseFloat(formData.so2) : null;
      payload.ozone = formData.ozone ? parseFloat(formData.ozone) : null;
      payload.overall_aqi = formData.overall_aqi ? parseFloat(formData.overall_aqi) : null;
    } else if (activeTab === 'Other Info') {
      // For Other Info tab, station_id is optional
      payload.station_id = formData.station_id ? parseInt(formData.station_id) : null;
      payload.additional_info = formData.additional_info || null;
    }

    try {
      const response = await fetch('http://localhost:8002/contributions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          throw new Error("You don't have permissions. Only data contributors can submit contributions.");
        }
        throw new Error(errorData.detail || 'Failed to submit contribution');
      }

      setShowPopup(true);
      setFormData({
        station_id: '',
        pm25: '',
        pm10: '',
        no2: '',
        co: '',
        so2: '',
        ozone: '',
        overall_aqi: '',
        source: '',
        additional_info: ''
      });
      setTimeout(() => {
        setShowPopup(false);
        window.location.reload();
      }, 2000);
    } catch (error) {
      setErrors({ submit: error.message });
    }
  };

  return (
    <div className="public-contributors">
      <h1>Public Contributors</h1>
      <div className="tabs">
        <button
          className={activeTab === 'AQI' ? 'active' : ''}
          onClick={() => handleTabChange('AQI')}
        >
          AQI
        </button>
        <button
          className={activeTab === 'Other Info' ? 'active' : ''}
          onClick={() => handleTabChange('Other Info')}
        >
          Other Info
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Station ID {activeTab === 'AQI' ? '(Required)' : '(Optional)'}</label>
          <input
            type="number"
            name="station_id"
            value={formData.station_id}
            onChange={handleInputChange}
            required={activeTab === 'AQI'}  
            step="1"
          />
          {errors.station_id && <span className="error">{errors.station_id}</span>}
        </div>

        {activeTab === 'AQI' && (
          <>
            <div className="form-group">
              <label>PM2.5 (0-500 µg/m³)</label>
              <input
                type="number"
                name="pm25"
                value={formData.pm25}
                onChange={handleInputChange}
              />
              {errors.pm25 && <span className="error">{errors.pm25}</span>}
            </div>
            <div className="form-group">
              <label>PM10 (0-500 µg/m³)</label>
              <input
                type="number"
                name="pm10"
                value={formData.pm10}
                onChange={handleInputChange}
              />
              {errors.pm10 && <span className="error">{errors.pm10}</span>}
            </div>
            <div className="form-group">
              <label>NO2 (0-200 ppb)</label>
              <input
                type="number"
                name="no2"
                value={formData.no2}
                onChange={handleInputChange}
              />
              {errors.no2 && <span className="error">{errors.no2}</span>}
            </div>
            <div className="form-group">
              <label>CO (0-50 ppm)</label>
              <input
                type="number"
                name="co"
                value={formData.co}
                onChange={handleInputChange}
              />
              {errors.co && <span className="error">{errors.co}</span>}
            </div>
            <div className="form-group">
              <label>SO2 (0-100 ppb)</label>
              <input
                type="number"
                name="so2"
                value={formData.so2}
                onChange={handleInputChange}
              />
              {errors.so2 && <span className="error">{errors.so2}</span>}
            </div>
            <div className="form-group">
              <label>Ozone (0-200 ppb)</label>
              <input
                type="number"
                name="ozone"
                value={formData.ozone}
                onChange={handleInputChange}
              />
              {errors.ozone && <span className="error">{errors.ozone}</span>}
            </div>
            <div className="form-group">
              <label>Overall AQI (0-500)</label>
              <input
                type="number"
                name="overall_aqi"
                value={formData.overall_aqi}
                onChange={handleInputChange}
              />
              {errors.overall_aqi && <span className="error">{errors.overall_aqi}</span>}
            </div>
          </>
        )}

        {activeTab === 'Other Info' && (
          <div className="form-group">
            <label>Additional Information</label>
            <textarea
              name="additional_info"
              value={formData.additional_info}
              onChange={handleInputChange}
            />
          </div>
        )}

        <div className="form-group">
          <label>Source</label>
          <input
            type="text"
            name="source"
            value={formData.source}
            onChange={handleInputChange}
            required
          />
          {errors.source && <span className="error">{errors.source}</span>}
        </div>

        <button type="submit">Submit</button>
        {errors.submit && <span className="error">{errors.submit}</span>}
      </form>

      {showPopup && (
        <div className="popup">
          Thank you for your contribution!
        </div>
      )}
    </div>
  );
};

export default PublicContributors;