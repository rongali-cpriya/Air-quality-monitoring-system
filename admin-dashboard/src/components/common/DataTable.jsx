import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";

const DataTable = ({ columns, data }) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div style={styles.tableContainer}>
      {/* Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr className="table-row" key={headerGroup.id}>
                {headerGroup.headers.map((column) => (
                  <th
                    key={column.id}
                    onClick={column.column.getToggleSortingHandler()}
                    style={{ ...styles.th, cursor: "pointer" }}
                  >
                    {flexRender(
                      column.column.columnDef.header,
                      column.getContext()
                    )}
                    <span style={styles.sortIcon}>
                      {column.column.getIsSorted() === "asc"
                        ? " ↑"
                        : column.column.getIsSorted() === "desc"
                        ? " ↓"
                        : ""}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr className="table-row" key={row.id} style={styles.tr}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} style={styles.td}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} style={styles.emptyState}>
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {table.getRowModel().rows.length > 0 && (
        <div style={styles.pagination}>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            style={styles.paginationButton}
          >
            Previous
          </button>
          <span style={styles.pageInfo}>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            style={styles.paginationButton}
          >
            Next
          </button>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            style={styles.pageSizeSelect}
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                Show {size}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

const styles = {
  tableContainer: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "1rem",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    padding: "1rem",
    textAlign: "left",
    borderBottom: "2px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    fontWeight: "600",
    color: "#475569",
  },
  tr: {
    borderBottom: "1px solid #e2e8f0",
  },
  td: {
    padding: "1rem",
    color: "#475569",
  },
  sortIcon: {
    marginLeft: "0.5rem",
  },
  emptyState: {
    padding: "2rem",
    textAlign: "center",
    color: "#64748b",
    fontStyle: "italic",
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "1rem",
    padding: "1rem 0",
  },
  paginationButton: {
    padding: "0.5rem 1rem",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    opacity: (props) => (props.disabled ? "0.5" : "1"),
  },
  pageInfo: {
    color: "#475569",
  },
  pageSizeSelect: {
    padding: "0.5rem",
    borderRadius: "4px",
    border: "1px solid #e2e8f0",
  },
};

export default DataTable;