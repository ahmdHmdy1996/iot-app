import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AUTH_TOKEN_KEY } from "../config/constants";

/**
 * Protects routes that require authentication.
 * If token exists in localStorage, renders children (Outlet or wrapped content).
 * Otherwise redirects to /login.
 */
function PrivateRoute({ children }) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
}

export default PrivateRoute;
