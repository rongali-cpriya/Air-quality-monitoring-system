import React, { useState, useEffect } from "react";
import AdminService from "../../api/adminApi";
import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import { FiTrash2 } from "react-icons/fi";

const MeasurementsList = () => {
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const columns = [
    { header: "ID", accessorKey: "measurement_id" },
    { header: "Station", accessorKey: "station.station_name" },
    { header: "Station ID", accessorKey: "station_id" },
    {
  header: "Timestamp",
  accessorKey: "time2",
  cell: ({ getValue }) => {
    const raw = getValue();
    const date = new Date(raw);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  },
},
    { header: "PM2.5", accessorKey: "pm25" },
    { header: "PM10", accessorKey: "pm10" },
    { header: "NO2", accessorKey: "no2" },
    { header: "CO", accessorKey: "co" },
    { header: "SO2", accessorKey: "so2" },
    { header: "Ozone", accessorKey: "ozone" },
    { header: "AQI", accessorKey: "aqi" },
    { header: "Source", accessorKey: "source" },
    {
  header: "Created At",
  accessorKey: "created_at",
  cell: ({ getValue }) => {
    const raw = getValue();
    const date = new Date(raw);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  },
},
    {
      header: "Actions",
      cell: ({ row }) => (
        <button
          onClick={() => handleDelete(row.original.measurement_id)}
          style={styles.deleteButton}
          aria-label="Delete measurement"
        >
          <FiTrash2 />
        </button>
      ),
    },
  ];

  useEffect(() => {
    const fetchMeasurements = async () => {
      setLoading(true);
      setError("");
      try {
        // You can pass query params like station_id, start_time, etc. if needed
        const data = await AdminService.getMeasurements();
        setMeasurements(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load measurements");
        setMeasurements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMeasurements();
  }, []);

  const handleDelete = async (measurementId) => {
    try {
      await AdminService.deleteMeasurement(measurementId);
      setMeasurements((prev) =>
        prev.filter((m) => m.measurement_id !== measurementId)
      );
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete measurement");
    }
  };

  if (loading) return <Loader />;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Measurements</h2>
      {error && <div style={styles.error}>{error}</div>}
      <DataTable columns={columns} data={measurements} />
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
  title: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: "1.5rem",
  },
  error: {
    color: "#dc2626",
    padding: "1rem",
    backgroundColor: "#fee2e2",
    borderRadius: "4px",
    marginBottom: "1rem",
  },
  deleteButton: {
    background: "transparent",
    border: "none",
    color: "#ef4444",
    cursor: "pointer",
    fontSize: "1.2rem",
  },
};

export default MeasurementsList;
