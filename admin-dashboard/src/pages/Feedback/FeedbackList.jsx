import React, { useState, useEffect } from "react";
import AdminService from "../../api/adminApi";
import DataTable from "../../components/common/DataTable";
import { toast } from "react-toastify";

const FeedbackList = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    userId: "",
    sortBy: "recent",
  });

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.userId) params.user_id = filters.userId;
      if (filters.sortBy === "recent") params.order_by = "created_at_desc";
      else if (filters.sortBy === "oldest") params.order_by = "created_at_asc";

      const data = await AdminService.getFeedbacks(params);
      console.log("Feedback API Response:", data);
      setFeedbacks(data);
      if (data.length === 0) {
        toast.warn("No feedback data available");
      }
    } catch (error) {
      console.error("Fetch Feedback Error:", error);
      toast.error("Failed to fetch feedback: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const columns = [
    { header: "ID", accessorKey: "feedback_id" },
    { header: "User ID", accessorKey: "user_id" },
    { header: "Name", accessorKey: "name" },
    { header: "Info", accessorKey: "info" },
    { header: "Stars", accessorKey: "stars" },
    {
      header: "File",
      accessorKey: "file_path",
      cell: ({ row }) =>
        row.original.file_path ? (
          <a
            href={`http://localhost:8002/${row.original.file_path.replace(/\\/g, "/")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View File
          </a>
        ) : (
          "No File"
        ),
    },
    {
      header: "Created At",
      accessorKey: "created_at",
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
    },
  ];

  return (
    <div>
      <h1>Feedback Management</h1>
      <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}>
        <input
          type="text"
          name="userId"
          value={filters.userId}
          onChange={handleFilterChange}
          placeholder="Filter by User ID"
          style={{ padding: "0.5rem", width: "200px" }}
        />
        <select
          name="sortBy"
          value={filters.sortBy}
          onChange={handleFilterChange}
          style={{ padding: "0.5rem" }}
        >
          <option value="recent">Most Recent</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : feedbacks.length === 0 ? (
        <p>No feedback data available</p>
      ) : (
        <DataTable
          columns={columns}
          data={feedbacks}
        />
      )}
    </div>
  );
};

export default FeedbackList;