import React, { useState } from "react";
import AdminService from "../../api/adminApi";
import Loader from "../../components/common/Loader";
import { FiAlertTriangle, FiSend } from "react-icons/fi";

const SendNotification = () => {
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    notification_type: "system_update",
    station_id: "",
    aqi_category: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Validation
    if (!formData.title.trim() || !formData.message.trim()) {
      setError("Title and message are required");
      setLoading(false);
      return;
    }
    if (
      formData.notification_type === "threshold_alert" &&
      (!formData.station_id || !formData.aqi_category)
    ) {
      setError("Station ID and AQI Category are required for threshold alerts");
      setLoading(false);
      return;
    }

    try {
      await AdminService.sendNotification({
        ...formData,
        user_ids: [], // Send to all users
        station_id: formData.station_id ? Number(formData.station_id) : null,
      });
      setSuccess("Notification sent successfully!");
      setFormData({
        title: "",
        message: "",
        notification_type: "system_update",
        station_id: "",
        aqi_category: "",
      });
    } catch (err) {
      const errorDetail = err.response?.data?.detail;
  // Check if errorDetail is an array (common in validation errors) and extract the first message
  let message = "Failed to send notification";
  if (Array.isArray(errorDetail) && errorDetail.length > 0) {
    message = errorDetail[0].msg;
  } else if (typeof errorDetail === "object") {
    message = errorDetail.msg || message;
  } else if (typeof errorDetail === "string") {
    message = errorDetail;
  }
  setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          <FiAlertTriangle style={styles.titleIcon} /> Send System Notification
        </h2>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Notification Type</label>
          <select
            value={formData.notification_type}
            onChange={(e) =>
              setFormData({ ...formData, notification_type: e.target.value })
            }
            style={styles.select}
            disabled={loading}
          >
            <option value="system_update">System Update</option>
            <option value="threshold_alert">AQI Threshold Alert</option>
            <option value="forecast_alert">Forecast Alert</option>
          </select>
        </div>

        {formData.notification_type === "threshold_alert" && (
          <div style={styles.grid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Station ID</label>
              <input
                type="number"
                value={formData.station_id}
                onChange={(e) =>
                  setFormData({ ...formData, station_id: e.target.value })
                }
                style={styles.input}
                disabled={loading}
                placeholder="Enter station ID"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>AQI Category</label>
              <select
                value={formData.aqi_category}
                onChange={(e) =>
                  setFormData({ ...formData, aqi_category: e.target.value })
                }
                style={styles.select}
                disabled={loading}
              >
                <option value="">Select AQI Category</option>
                <option value="good">Good</option>
                <option value="moderate">Moderate</option>
                <option value="unhealthy">Unhealthy</option>
                <option value="hazardous">Hazardous</option>
              </select>
            </div>
          </div>
        )}

        <div style={styles.formGroup}>
          <label style={styles.label}>Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            style={styles.input}
            required
            disabled={loading}
            placeholder="Enter notification title"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Message</label>
          <textarea
            value={formData.message}
            onChange={(e) =>
              setFormData({ ...formData, message: e.target.value })
            }
            style={styles.textarea}
            required
            disabled={loading}
            rows="4"
            placeholder="Enter notification message"
          />
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <button
          type="submit"
          style={{
            ...styles.submitButton,
            ...(loading ? styles.submitButtonDisabled : {}),
          }}
          disabled={loading}
        >
          {loading ? (
            <Loader size="small" />
          ) : (
            <>
              <FiSend style={styles.buttonIcon} /> Send Notification
            </>
          )}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "2rem",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    maxWidth: "600px",
    margin: "0 auto",
  },
  header: {
    marginBottom: "1.5rem",
  },
  title: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#1e293b",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  titleIcon: {
    color: "#f59e0b",
    fontSize: "1.4rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  label: {
    fontSize: "0.9rem",
    color: "#555",
  },
  input: {
    padding: "0.75rem",
    border: "1px solid #e2e8f0",
    borderRadius: "4px",
    width: "100%",
    fontSize: "1rem",
    outline: "none",
    "&:focus": {
      borderColor: "#2563eb",
    },
  },
  select: {
    padding: "0.75rem",
    border: "1px solid #e2e8f0",
    borderRadius: "4px",
    width: "100%",
    fontSize: "1rem",
    backgroundColor: "white",
    cursor: "pointer",
  },
  textarea: {
    padding: "0.75rem",
    border: "1px solid #e2e8f0",
    borderRadius: "4px",
    width: "100%",
    fontSize: "1rem",
    resize: "vertical",
    outline: "none",
    "&:focus": {
      borderColor: "#2563eb",
    },
  },
  submitButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "1rem",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "500",
    transition: "background-color 0.2s",
    "&:hover": {
      backgroundColor: "#2563eb",
    },
  },
  submitButtonDisabled: {
    backgroundColor: "#93c5fd",
    cursor: "not-allowed",
  },
  error: {
    color: "#dc2626",
    padding: "1rem",
    backgroundColor: "#fee2e2",
    borderRadius: "4px",
  },
  success: {
    color: "#10b981",
    padding: "1rem",
    backgroundColor: "#d1fae5",
    borderRadius: "4px",
  },
  buttonIcon: {
    fontSize: "1.2rem",
  },
};

export default SendNotification;