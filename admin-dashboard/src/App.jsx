import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Layout from "./components/Layout/Layout";
import Login from "./pages/Auth/Login";
import Dashboard from "./pages/Dashboard";
import UsersList from "./pages/Users/UsersList";
import StationsList from "./pages/Stations/StationsList";
import ContributionsList from "./pages/Contributions/ContributionsList";
import SendNotification from "./pages/Notifications/SendNotification";
import MeasurementsList from "./pages/Measurements/MeasurementsList";
import FeedbackList from "./pages/Feedback/FeedbackList";

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes with Layout */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<UsersList />} />
        <Route path="/stations" element={<StationsList />} />
        <Route path="/contributions" element={<ContributionsList />} />
        <Route path="/notifications" element={<SendNotification />} />
        <Route path="/measurements" element={<MeasurementsList />} />
        <Route path="/feedback" element={<FeedbackList />} />
      </Route>

      {/* Catch-All Route for 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// Simple 404 Component
function NotFound() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
    </div>
  );
}

export default App;