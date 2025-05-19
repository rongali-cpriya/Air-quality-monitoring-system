import React, { useState, useEffect } from "react";
import AdminService from "../../api/adminApi";
import { FiX } from "react-icons/fi";
import Loader from "../../components/common/Loader";

const StationForm = ({ station, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    station_name: "",
    latitude: "",
    longitude: "",
    is_active: true,
    source: "official",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (station) {
      setFormData({
        station_name: station.station_name || "",
        latitude: station.latitude || "",
        longitude: station.longitude || "",
        is_active: station.is_active !== undefined ? station.is_active : true,
        source: station.source || "official",
      });
    }
  }, [station]);

  const validateForm = () => {
    if (!formData.station_name.trim()) {
      setError("Station name is required");
      return false;
    }

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError("Latitude must be between -90 and 90");
      return false;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError("Longitude must be between -180 and 180");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
      };
      const data = station?.station_id
        ? await AdminService.updateStation(station.station_id, payload)
        : await AdminService.createStation(payload);

      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save station");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>
            {station ? "Edit Station" : "Add New Station"}
          </h3>
          <button
            onClick={onClose}
            style={styles.closeButton}
            aria-label="Close modal"
            disabled={loading}
          >
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Station Name</label>
            <input
              type="text"
              value={formData.station_name}
              onChange={(e) =>
                setFormData({ ...formData, station_name: e.target.value })
              }
              style={styles.input}
              required
              disabled={loading}
              placeholder="Enter station name"
            />
          </div>

          <div style={styles.grid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Latitude</label>
              <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) =>
                  setFormData({ ...formData, latitude: e.target.value })
                }
                style={styles.input}
                required
                disabled={loading}
                placeholder="-90 to 90"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Longitude</label>
              <input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) =>
                  setFormData({ ...formData, longitude: e.target.value })
                }
                style={styles.input}
                required
                disabled={loading}
                placeholder="-180 to 180"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Status</label>
            <select
              value={formData.is_active}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  is_active: e.target.value === "true",
                })
              }
              style={styles.select}
              disabled={loading}
            >
              <option value={true}>Active</option>
              <option value={false}>Inactive</option>
            </select>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.buttonGroup}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                ...styles.submitButton,
                ...(loading ? styles.submitButtonDisabled : {}),
              }}
              disabled={loading}
            >
              {loading ? <Loader size="small" /> : "Save Station"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "2rem",
    width: "100%",
    maxWidth: "500px",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  },
  modalTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#1e293b",
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "1.25rem",
    cursor: "pointer",
    color: "#64748b",
    "&:hover": {
      color: "#1e293b",
    },
  },
  form: {
    display: "flex",
    flexDirection: "column",
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
    fontSize: "1rem",
    backgroundColor: "white",
    cursor: "pointer",
  },
  buttonGroup: {
    display: "flex",
    gap: "1rem",
    marginTop: "1rem",
    justifyContent: "flex-end",
  },
  cancelButton: {
    padding: "0.75rem 1.5rem",
    backgroundColor: "#e2e8f0",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    color: "#475569",
    "&:hover": {
      backgroundColor: "#d1d5db",
    },
  },
  submitButton: {
    padding: "0.75rem 1.5rem",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    "&:hover": {
      backgroundColor: "#1d4ed8",
    },
  },
  submitButtonDisabled: {
    backgroundColor: "#93c5fd",
    cursor: "not-allowed",
  },
  error: {
    color: "#dc2626",
    padding: "0.5rem",
    backgroundColor: "#fee2e2",
    borderRadius: "4px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
  },
};

export default StationForm;