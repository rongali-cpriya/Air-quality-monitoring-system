import React, { useState, useEffect } from "react";
import AdminService from "../../api/adminApi";
import { FiX } from "react-icons/fi";
import Loader from "../../components/common/Loader";

const UserForm = ({ user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    role: "user",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        email: user.email || "",
        role: user.role || "user",
        password: "", // Password remains empty for edits
      });
    }
  }, [user]);

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError("Username is required");
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      setError("Valid email is required");
      return false;
    }
    if (!user && !formData.password) {
      setError("Password is required for new users");
      return false;
    }
    if (!user && formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
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
      const payload = { ...formData };
      if (user && !payload.password) delete payload.password; // Don’t send empty password on update

      const data = user?.user_id
        ? await AdminService.updateUser(user.user_id, payload)
        : await AdminService.createUser(payload);

      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>
            {user ? "Edit User" : "Create New User"}
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
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value.trim() })
              }
              style={styles.input}
              required
              disabled={loading}
              placeholder="Enter username"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value.trim() })
              }
              style={styles.input}
              required
              disabled={loading}
              placeholder="Enter email"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Role</label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              style={styles.select}
              disabled={loading || !user} // Only editable for existing users
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="data_contributor">Data Contributor</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Password {user ? "(Leave blank to keep unchanged)" : ""}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              style={styles.input}
              required={!user}
              disabled={loading}
              placeholder={user ? "Enter new password" : "Enter password"}
            />
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
              {loading ? <Loader size="small" /> : "Save Changes"}
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
};

export default UserForm;