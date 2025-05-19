import React, { useState, useEffect } from "react";
import AdminService from "../api/adminApi";
import DataTable from "../components/common/DataTable";
import Loader from "../components/common/Loader";
import { FiHome, FiUsers, FiMapPin, FiAlertCircle } from "react-icons/fi";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStations: 0,
    pendingContributions: 0,
    criticalAQI: 0,
  });
  const [pendingContributions, setPendingContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const columns = [
    { header: "ID", accessorKey: "contribution_id" },
    { header: "User", accessorKey: "user.username" },
    { header: "PM2.5", accessorKey: "pm25" },
    { header: "PM10", accessorKey: "pm10" },
    { header: "NO2", accessorKey: "no2" },
    { header: "CO", accessorKey: "co" },
    { header: "SO2", accessorKey: "so2" },
    { header: "Ozone", accessorKey: "ozone" },
    { header: "AQI", accessorKey: "overall_aqi" },
    { header: "Station", accessorKey: "station.station_name" },
    { header: "Station ID", accessorKey: "station.station_id" },
    { header: "Date", accessorKey: "created_at" },
  ];

  const formatDateTime = (isoString) => {
      const date = new Date(isoString);
      return date.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    };
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError("");
      try {
  const [users, stations, contributions, criticalMeasurements] = await Promise.all([
    AdminService.getUsers(),
    AdminService.getStations(),
    AdminService.getContributions("pending"),
    AdminService.getCriticalMeasurements(100)
  ]);

  setStats({
    totalUsers: Array.isArray(users) ? users.length : 0,
    totalStations: Array.isArray(stations) ? stations.length : 0,
    pendingContributions: Array.isArray(contributions) ? contributions.length : 0,
    criticalAQI: Array.isArray(criticalMeasurements)
      ? criticalMeasurements.filter((station) => station.aqi > 100).length
      : 0,
  });

  setPendingContributions(
  Array.isArray(contributions)
    ? contributions.map((contribution) => ({
        ...contribution,
        created_at: formatDateTime(contribution.created_at),
      }))
    : []
);

} catch (err) {
  setError(err.response?.data?.detail || "Failed to load dashboard data");
  setPendingContributions([]);
}
 finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);  

  if (loading) return <Loader />;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          <FiHome style={styles.titleIcon} /> Dashboard
        </h2>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <FiUsers style={styles.statIcon} />
          <div>
            <h3 style={styles.statValue}>{stats.totalUsers}</h3>
            <p style={styles.statLabel}>Total Users</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <FiMapPin style={styles.statIcon} />
          <div>
            <h3 style={styles.statValue}>{stats.totalStations}</h3>
            <p style={styles.statLabel}>Total Stations</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <FiAlertCircle style={styles.statIcon} />
          <div>
            <h3 style={styles.statValue}>{stats.pendingContributions}</h3>
            <p style={styles.statLabel}>Pending Contributions</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <FiAlertCircle style={styles.statIcon} />
          <div>
            <h3 style={styles.statValue}>{stats.criticalAQI}</h3>
            <p style={styles.statLabel}>Critical AQI Stations</p>
          </div>
        </div>
      </div>

      <div style={styles.contributionsSection}>
        <h3 style={styles.sectionTitle}>Pending Contributions</h3>
        <DataTable columns={columns} data={pendingContributions} />
      </div>
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
    marginBottom: "2rem",
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
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1.5rem",
    marginBottom: "2rem",
  },
  statCard: {
    backgroundColor: "#f8fafc",
    padding: "1.5rem",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  statIcon: {
    fontSize: "2rem",
    color: "#2563eb",
  },
  statValue: {
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "#1e293b",
    margin: 0,
  },
  statLabel: {
    fontSize: "0.9rem",
    color: "#64748b",
    margin: 0,
  },
  contributionsSection: {
    marginTop: "2rem",
  },
  sectionTitle: {
    fontSize: "1.1rem",
    fontWeight: "500",
    color: "#1e293b",
    marginBottom: "1rem",
  },
  error: {
    color: "#dc2626",
    padding: "1rem",
    backgroundColor: "#fee2e2",
    borderRadius: "4px",
    marginBottom: "1rem",
  },
};

export default Dashboard;