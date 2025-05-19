import React, { useState, useEffect } from "react";
import AdminService from "../../api/adminApi";
import UserForm from "./UserForm";
import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import { FiEdit, FiTrash2, FiPlus, FiUsers } from "react-icons/fi";

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const columns = [
    { header: "Username", accessorKey: "username" },
    { header: "Email", accessorKey: "email" },
    {
      header: "Role",
      accessorKey: "role",
      cell: ({ row }) => (
        <span style={styles.role(row.original.role)}>
          {row.original.role}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div style={styles.actions}>
          <button
            onClick={() => {
              setSelectedUser(row.original);
              setShowForm(true);
            }}
            style={styles.editButton}
            aria-label={`Edit user ${row.original.username}`}
          >
            <FiEdit />
          </button>
          <button
            onClick={() => handleDelete(row.original.user_id)}
            style={styles.deleteButton}
            aria-label={`Delete user ${row.original.username}`}
          >
            <FiTrash2 />
          </button>
        </div>
      ),
    },
  ];

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await AdminService.getUsers();
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load users");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    setError("");
    try {
      await AdminService.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete user");
    }
  };

  const handleSuccess = (newUser) => {
    setUsers((prev) =>
      selectedUser
        ? prev.map((u) =>
            u.user_id === newUser.user_id ? newUser : u
          )
        : [...prev, newUser]
    );
    setShowForm(false);
    setSelectedUser(null);
  };

  if (loading) return <Loader />;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          <FiUsers style={styles.titleIcon} /> Users
        </h2>
        <button
          onClick={() => setShowForm(true)}
          style={styles.addButton}
          aria-label="Add new user"
        >
          <FiPlus /> Add User
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <DataTable columns={columns} data={users} />

      {showForm && (
        <UserForm
          user={selectedUser}
          onClose={() => {
            setShowForm(false);
            setSelectedUser(null);
          }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "2rem",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
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
    fontSize: "1.4rem",
    color: "#3b82f6",
  },
  addButton: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 1rem",
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    "&:hover": {
      backgroundColor: "#059669",
    },
  },
  actions: {
    display: "flex",
    gap: "0.5rem",
  },
  editButton: {
    background: "none",
    border: "none",
    color: "#3b82f6",
    cursor: "pointer",
    padding: "0.25rem",
    transition: "color 0.2s",
    "&:hover": {
      color: "#2563eb",
    },
  },
  deleteButton: {
    background: "none",
    border: "none",
    color: "#ef4444",
    cursor: "pointer",
    padding: "0.25rem",
    transition: "color 0.2s",
    "&:hover": {
      color: "#dc2626",
    },
  },
  error: {
    color: "#dc2626",
    padding: "1rem",
    backgroundColor: "#fee2e2",
    borderRadius: "4px",
    marginBottom: "1rem",
  },
  role: (role) => ({
    color:
      role === "admin" ? "#2563eb" : role === "data_contributor" ? "#f59e0b" : "#10b981",
    fontWeight: "500",
    textTransform: "capitalize",
  }),
};

export default UsersList;