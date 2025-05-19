import React, { useState, useEffect } from "react";
import AdminService from "../../api/adminApi";
import StationForm from "./StationForm";
import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import { FiEdit, FiTrash2, FiPlus, FiMapPin } from "react-icons/fi";

const StationsList = () => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);

  const columns = [
    { header: "Name", accessorKey: "station_name" },
    { header: "Latitude", accessorKey: "latitude" },
    { header: "Longitude", accessorKey: "longitude" },
    {
      header: "Status",
      accessorKey: "is_active",
      cell: ({ row }) => (
        <span style={row.original.is_active ? styles.active : styles.inactive}>
          {row.original.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div style={styles.actions}>
          <button
            onClick={() => {
              setSelectedStation(row.original);
              setShowForm(true);
            }}
            style={styles.editButton}
            aria-label={`Edit station ${row.original.station_name}`}
          >
            <FiEdit />
          </button>
          <button
            onClick={() => handleDelete(row.original.station_id)}
            style={styles.deleteButton}
            aria-label={`Delete station ${row.original.station_name}`}
          >
            <FiTrash2 />
          </button>
        </div>
      ),
    },
  ];

  useEffect(() => {
    const fetchStations = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await AdminService.getStations();
        setStations(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load stations");
        setStations([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStations();
  }, []);

  const handleDelete = async (stationId) => {
    if (!window.confirm("Are you sure you want to delete this station?")) return;

    setError("");
    try {
      await AdminService.deleteStation(stationId);
      setStations((prev) =>
        prev.filter((s) => s.station_id !== stationId)
      );
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete station");
    }
  };

  const handleSuccess = (newStation) => {
    setStations((prev) =>
      selectedStation
        ? prev.map((s) =>
            s.station_id === newStation.station_id ? newStation : s
          )
        : [...prev, newStation]
    );
    setShowForm(false);
    setSelectedStation(null);
  };

  if (loading) return <Loader />;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          <FiMapPin style={styles.titleIcon} /> Air Quality Stations
        </h2>
        <button
          onClick={() => setShowForm(true)}
          style={styles.addButton}
          aria-label="Add new station"
        >
          <FiPlus /> Add Station
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <DataTable columns={columns} data={stations} />

      {showForm && (
        <StationForm
          station={selectedStation}
          onClose={() => {
            setShowForm(false);
            setSelectedStation(null);
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
  active: {
    color: "#10b981",
    fontWeight: "500",
  },
  inactive: {
    color: "#ef4444",
    fontWeight: "500",
  },
};

export default StationsList;