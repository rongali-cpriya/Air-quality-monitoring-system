import React, { useState, useEffect } from "react";
import "./Preferences.css";

const PreferenceItem = ({ preference, onUpdate, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Default harmful threshold values
  const defaultThresholds = {
    aqi: 150,    // Unhealthy AQI
    pm25: 100,   // High PM2.5
    pm10: 150,   // High PM10
    ozone: 120,  // Elevated Ozone
    no2: 80,     // Elevated NO2
    so2: 75,     // Elevated SO2
    co: 10,      // Elevated CO
  };

  // Use preference thresholds or defaults
  const initialThresholds = {
    aqi: preference.aqi || defaultThresholds.aqi,
    pm25: preference.pm25 || defaultThresholds.pm25,
    pm10: preference.pm10 || defaultThresholds.pm10,
    ozone: preference.ozone || defaultThresholds.ozone,
    no2: preference.no2 || defaultThresholds.no2,
    so2: preference.so2 || defaultThresholds.so2,
    co: preference.co || defaultThresholds.co,
  };

  const [editedThresholds, setEditedThresholds] = useState({ ...initialThresholds });

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      setEditedThresholds({ ...initialThresholds }); // Reset if canceling
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedThresholds((prev) => ({ ...prev, [name]: value === "" ? "" : parseFloat(value) }));
  };

  const handleSave = async () => {
    // Validate inputs
    for (const [key, value] of Object.entries(editedThresholds)) {
      if (value === "" || isNaN(value) || value < 0) {
        alert(`Please enter a valid number for ${key.toUpperCase()}`);
        return;
      }
    }

    try {
      const response = await fetch(`http://localhost:8002/preferences/${preference.preference_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify(editedThresholds),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update preference");
      }

      const updatedPref = await response.json();
      onUpdate(updatedPref);
      setIsEditing(false);
      alert("Preference updated successfully!");
    } catch (error) {
      console.error("Error updating preference:", error);
      alert(error.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete the preference for ${preference.station_name || "Unnamed Station"}?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8002/preferences/${preference.preference_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete preference");
      }

      onDelete(preference.preference_id);
      alert("Preference deleted successfully!");
    } catch (error) {
      console.error("Error deleting preference:", error);
      alert(error.message);
    }
  };

  return (
    <div className="preference-item">
      <div className="preference-header">
        <button className="delete-btn" onClick={handleDelete}>
          🗑️
        </button>
        <span className="location-icon">📍</span>
        <h3 onClick={toggleExpand}>{preference.station_name || "Unnamed Station"}</h3>
        <span className="toggle-icon" onClick={toggleExpand}>{isExpanded ? "▲" : "▼"}</span>
      </div>
      {isExpanded && (
        <div className="preference-details">
          {isEditing ? (
            <>
            <p>AQI :</p>
              <input
                type="number"
                name="aqi"
                value={editedThresholds.aqi}
                onChange={handleChange}
                placeholder="AQI Threshold"
                min="0"
              />
              <p>PM25 :</p>
              <input
                type="number"
                name="pm25"
                value={editedThresholds.pm25}
                onChange={handleChange}
                placeholder="PM2.5 Threshold (μg/m³)"
                min="0"
              />
              <p>PM10 :</p>
              <input
                type="number"
                name="pm10"
                value={editedThresholds.pm10}
                onChange={handleChange}
                placeholder="PM10 Threshold (μg/m³)"
                min="0"
              />
              <p>OZONE :</p>
              <input
                type="number"
                name="ozone"
                value={editedThresholds.ozone}
                onChange={handleChange}
                placeholder="O₃ Threshold (μg/m³)"
                min="0"
              />
              <p>NO2 :</p>
              <input
                type="number"
                name="no2"
                value={editedThresholds.no2}
                onChange={handleChange}
                placeholder="NO₂ Threshold (μg/m³)"
                min="0"
              />
              <p>SO2 :</p>
              <input
                type="number"
                name="so2"
                value={editedThresholds.so2}
                onChange={handleChange}
                placeholder="SO₂ Threshold (μg/m³)"
                min="0"
              />
              <p>CO :</p>
              <input
                type="number"
                name="co"
                value={editedThresholds.co}
                onChange={handleChange}
                placeholder="CO Threshold (μg/m³)"
                min="0"
              />
              <div className="preference-buttons">
                <button onClick={handleSave}>Save</button>
                <button onClick={handleEditToggle}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <p>AQI Threshold: {initialThresholds.aqi}</p>
              <p>PM2.5 Threshold: {initialThresholds.pm25} μg/m³</p>
              <p>PM10 Threshold: {initialThresholds.pm10} μg/m³</p>
              <p>O₃ Threshold: {initialThresholds.ozone} μg/m³</p>
              <p>NO₂ Threshold: {initialThresholds.no2} μg/m³</p>
              <p>SO₂ Threshold: {initialThresholds.so2} μg/m³</p>
              <p>CO Threshold: {initialThresholds.co} μg/m³</p>
              <button onClick={handleEditToggle}>Edit</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const Preferences = () => {
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:8002/preferences/", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch preferences");
      const data = await response.json();
      setPreferences(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreference = (updatedPref) => {
    setPreferences((prev) =>
      prev.map((pref) => (pref.preference_id === updatedPref.preference_id ? updatedPref : pref))
    );
  };

  const handleDeletePreference = (preferenceId) => {
    setPreferences((prev) => prev.filter((pref) => pref.preference_id !== preferenceId));
  };

  if (loading) return <div className="loading">Loading preferences...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="preferences-container">
      <h1>My Preferences</h1>
      {preferences.length === 0 ? (
        <p>No preferences added yet.</p>
      ) : (
        <div className="preferences-list">
          {preferences.map((pref) => (
            <PreferenceItem
              key={pref.preference_id}
              preference={pref}
              onUpdate={handleUpdatePreference}
              onDelete={handleDeletePreference}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Preferences;