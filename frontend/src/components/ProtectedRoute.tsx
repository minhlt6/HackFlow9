import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import type { ApprovalStatus, UserRole } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  requiredApprovalStatus?: ApprovalStatus;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  requiredApprovalStatus,
}) => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredApprovalStatus && user.approvalStatus !== requiredApprovalStatus) {
    if (user.approvalStatus === 'pending') {
      return <Navigate to="/onboarding" replace />;
    }
    if (user.approvalStatus === 'rejected') {
      return <Navigate to="/rejected" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};