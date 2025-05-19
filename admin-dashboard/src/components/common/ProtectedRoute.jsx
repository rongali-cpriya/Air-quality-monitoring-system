import { Navigate, useLocation } from "react-router-dom";
import { getTokenData } from "../../api/adminApi";

const ProtectedRoute = ({ children }) => {
  const tokenData = getTokenData();
  const location = useLocation();

  // If no valid token, redirect to login with the current location as state
  if (!tokenData) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;