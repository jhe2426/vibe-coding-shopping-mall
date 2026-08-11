import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { fetchMyProfile } from "../api/auth.js";
import { clearAuthSession, getAuthToken } from "../utils/auth-storage.js";

function AdminRoute() {
  const [accessState, setAccessState] = useState(() => (getAuthToken() ? "checking" : "unauthenticated"));

  useEffect(() => {
    let isMounted = true;

    const verifyAdminAccess = async () => {
      if (!getAuthToken()) {
        if (isMounted) setAccessState("unauthenticated");
        return;
      }

      try {
        const user = await fetchMyProfile();

        if (isMounted) {
          setAccessState(user.userType === "admin" ? "authorized" : "forbidden");
        }
      } catch {
        clearAuthSession();

        if (isMounted) setAccessState("unauthenticated");
      }
    };

    verifyAdminAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  if (accessState === "checking") return null;

  if (accessState === "unauthenticated") {
    return <Navigate to="/" replace />;
  }

  if (accessState === "forbidden") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default AdminRoute;
