import React, { useState, useEffect } from "react";
import AdminService from "../../api/adminApi";
import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import { FiCheck, FiX, FiAlertCircle, FiFilter, FiCalendar, FiMapPin, FiInfo } from "react-icons/fi";

const ContributionsList = () => {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  const columns = [
    {
      header: "Submission",
      cell: ({ row }) => (
        <div style={styles.submissionCell}>
          <div style={styles.source}>
            <FiInfo style={styles.cellIcon} />
            <span style={styles.sourceLabel}>From:</span>
            <span style={styles.sourceValue}>{row.original.source}</span>
          </div>
          {row.original.additional_info && (
            <div style={styles.additionalInfo}>
              "{row.original.additional_info}"
            </div>
          )}
          <div style={styles.submitter}>
            Submitted by: <span style={styles.submitterName}>{row.original.user?.username || "Anonymous"}</span>
          </div>
        </div>
      )
    },
    {
      header: "Pollutants",
      cell: ({ row }) => {
        const pollutants = [
          { label: "PM2.5", value: row.original.pm25, color: "#8b5cf6" },
          { label: "PM10", value: row.original.pm10, color: "#6366f1" },
          { label: "NO2", value: row.original.no2, color: "#ec4899" },
          { label: "CO", value: row.original.co, color: "#f59e0b" },
          { label: "SO2", value: row.original.so2, color: "#84cc16" },
          { label: "O3", value: row.original.ozone, color: "#06b6d4" },
          { label: "AQI", value: row.original.overall_aqi, color: "#ef4444", highlight: true },
        ].filter(p => p.value !== null && p.value !== undefined);

        return (
          <div style={styles.pollutantsContainer}>
            {pollutants.length > 0 ? (
              <div style={styles.pollutantsGrid}>
                {pollutants.map((p) => (
                  <div
                    key={p.label}
                    style={{
                      ...styles.pollutantBadge,
                      ...(p.highlight ? styles.highlightPollutant : {}),
                      borderLeft: `3px solid ${p.color}`
                    }}
                  >
                    <span style={styles.pollutantLabel}>{p.label}</span>
                    <span style={styles.pollutantValue}>{p.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.noData}>No pollutant data</div>
            )}
          </div>
        );
      }
    },
    {
      header: "Location & Date",
      cell: ({ row }) => (
        <div style={styles.locationDateCell}>
          <div style={styles.location}>
            <FiMapPin style={styles.cellIcon} />
            {row.original.station?.station_name ? (
              <div>
                <span style={styles.stationName}>{row.original.station.station_name}</span>
                <span style={styles.stationId}>ID: {row.original.station.station_id}</span>
              </div>
            ) : (
              <span style={styles.noData}>No station specified</span>
            )}
          </div>
          <div style={styles.date}>
            <FiCalendar style={styles.cellIcon} />
            <span>
              {new Date(row.original.created_at).toLocaleDateString("en-US", {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      )
    },
    {
      header: "Status",
      cell: ({ row }) => {
        const statusIcons = {
          pending: <FiAlertCircle style={styles.statusIcon} />,
          approved: <FiCheck style={styles.statusIcon} />,
          rejected: <FiX style={styles.statusIcon} />
        };

        return (
          <div style={{
            ...styles.statusPill,
            ...(row.original.status === "pending" ? styles.statusPending :
                row.original.status === "approved" ? styles.statusApproved :
                styles.statusRejected)
          }}>
            {statusIcons[row.original.status]}
            <span>{row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}</span>
          </div>
        );
      }
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div style={styles.actions}>
          <button
            onClick={() => handleStatusChange(row.original.contribution_id, "approved")}
            style={{
              ...styles.actionButton,
              ...styles.approveButton,
              ...(row.original.status !== "pending" ? styles.disabledButton : {})
            }}
            disabled={row.original.status !== "pending"}
            title="Approve"
          >
            <FiCheck style={styles.buttonIcon} />
            <span>Approve</span>
          </button>
          <button
            onClick={() => handleStatusChange(row.original.contribution_id, "rejected")}
            style={{
              ...styles.actionButton,
              ...styles.rejectButton,
              ...(row.original.status !== "pending" ? styles.disabledButton : {})
            }}
            disabled={row.original.status !== "pending"}
            title="Reject"
          >
            <FiX style={styles.buttonIcon} />
            <span>Reject</span>
          </button>
        </div>
      )
    }
  ];

  useEffect(() => {
    const fetchContributions = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await AdminService.getContributions(statusFilter);
        setContributions(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(
          err.response?.data?.detail || "Failed to load contributions"
        );
        setContributions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchContributions();
  }, [statusFilter]);

  const handleStatusChange = async (contributionId, newStatus) => {
    setError("");
    try {
      await AdminService.approveContribution(contributionId, newStatus);
      setContributions((prev) =>
        prev.map((c) =>
          c.contribution_id === contributionId ? { ...c, status: newStatus } : c
        )
      );
    } catch (err) {
      setError(
        err.response?.data?.detail?.[0]?.msg || "Failed to update contribution status"
      );
    }
  };

  if (loading) return <Loader />;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Public Contributions</h2>
        <div style={styles.filterContainer}>
          <FiFilter style={styles.filterIcon} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.filterSelect}
            aria-label="Filter contributions by status"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={styles.error}>
          <FiAlertCircle style={styles.errorIcon} />
          <span>{error}</span>
        </div>
      )}

      {contributions.length === 0 ? (
        <div style={styles.emptyState}>
          No {statusFilter} contributions found
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <DataTable columns={columns} data={contributions} />
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "2rem",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: "1rem",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
  },
  filterContainer: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    padding: "0.25rem 0.75rem",
    border: "1px solid #e2e8f0",
  },
  filterIcon: {
    color: "#64748b",
    fontSize: "1rem",
  },
  filterSelect: {
    padding: "0.5rem",
    fontSize: "0.95rem",
    color: "#334155",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    outline: "none",
    fontWeight: "500",
    minWidth: "120px",
  },
  tableContainer: {
    border: "1px solid #f1f5f9",
    borderRadius: "8px",
    overflow: "hidden",
  },
  emptyState: {
    padding: "3rem",
    textAlign: "center",
    color: "#64748b",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    fontStyle: "italic",
  },
  error: {
    color: "#dc2626",
    padding: "1rem",
    backgroundColor: "#fee2e2",
    borderRadius: "8px",
    marginBottom: "1.5rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  errorIcon: {
    fontSize: "1.25rem",
  },
  cellIcon: {
    color: "#64748b",
    marginRight: "0.5rem",
    fontSize: "1rem",
    flexShrink: 0,
  },

  // Submission cell styles
  submissionCell: {
    padding: "0.75rem 0",
    maxWidth: "300px",
  },
  source: {
    fontSize: "0.95rem",
    color: "#475569",
    marginBottom: "0.5rem",
    display: "flex",
    alignItems: "center",
  },
  sourceLabel: {
    color: "#64748b",
    marginRight: "0.5rem",
  },
  sourceValue: {
    fontWeight: "600",
    color: "#1e293b",
  },
  additionalInfo: {
    fontStyle: "italic",
    color: "#64748b",
    margin: "0.5rem 0",
    fontSize: "0.95rem",
    lineHeight: "1.5",
    backgroundColor: "#f8fafc",
    padding: "0.75rem",
    borderRadius: "6px",
    borderLeft: "3px solid #cbd5e1",
  },
  submitter: {
    fontSize: "0.85rem",
    color: "#64748b",
    marginTop: "0.5rem",
  },
  submitterName: {
    color: "#475569",
    fontWeight: "500",
  },

  // Pollutants styles
  pollutantsContainer: {
    padding: "0.5rem 0",
  },
  pollutantsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
    gap: "0.5rem",
  },
  pollutantBadge: {
    backgroundColor: "#f8fafc",
    borderRadius: "6px",
    padding: "0.5rem",
    textAlign: "center",
    transition: "transform 0.2s ease",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    ":hover": {
      transform: "translateY(-2px)",
    },
  },
  highlightPollutant: {
    backgroundColor: "#fef2f2",
    fontWeight: "600",
  },
  pollutantLabel: {
    display: "block",
    fontSize: "0.75rem",
    color: "#64748b",
    marginBottom: "0.25rem",
  },
  pollutantValue: {
    display: "block",
    fontWeight: "600",
    color: "#0f172a",
    fontSize: "0.95rem",
  },

  // Location & Date styles
  locationDateCell: {
    minWidth: "200px",
    padding: "0.5rem 0",
  },
  location: {
    marginBottom: "0.75rem",
    display: "flex",
    alignItems: "flex-start",
  },
  stationName: {
    display: "block",
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: "0.25rem",
  },
  stationId: {
    fontSize: "0.8rem",
    color: "#64748b",
    display: "block",
  },
  date: {
    fontSize: "0.9rem",
    color: "#475569",
    display: "flex",
    alignItems: "center",
  },

  // Status styles
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.35rem 0.85rem",
    borderRadius: "999px",
    fontSize: "0.9rem",
    fontWeight: "600",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  statusPending: {
    backgroundColor: "#fff7ed",
    color: "#ea580c",
  },
  statusApproved: {
    backgroundColor: "#f0fdf4",
    color: "#16a34a",
  },
  statusRejected: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
  },
  statusIcon: {
    fontSize: "0.85rem",
  },

  // Actions styles
  actions: {
    display: "flex",
    gap: "0.75rem",
  },
  actionButton: {
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
    border: "none",
    borderRadius: "6px",
    padding: "0.5rem 0.85rem",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "0.85rem",
    transition: "all 0.2s",
  },
  approveButton: {
    backgroundColor: "#dcfce7",
    color: "#16a34a",
    ":hover": {
      backgroundColor: "#bbf7d0",
    },
  },
  rejectButton: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    ":hover": {
      backgroundColor: "#fecaca",
    },
  },
  disabledButton: {
    opacity: 0.5,
    cursor: "not-allowed",
    ":hover": {
      backgroundColor: "inherit",
    },
  },
  buttonIcon: {
    fontSize: "1rem",
  },
  noData: {
    color: "#94a3b8",
    fontStyle: "italic",
    fontSize: "0.9rem",
    padding: "0.5rem",
    textAlign: "center",
  },
};

export default ContributionsList;