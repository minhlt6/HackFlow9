import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import type { ApprovalStatus, UserRole } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  requiredApprovalStatus?: ApprovalStatus;
}

const roleDashboardMap: Record<UserRole, string> = {
  admin: '/admin/dashboard',
  judge: '/judge/dashboard',
  mentor: '/mentor/dashboard',
  candidate: '/dashboard',
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  requiredApprovalStatus,
}) => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Internal staff roles (admin, judge, mentor) are always treated as approved
  const effectiveApprovalStatus: ApprovalStatus =
    user.role !== 'candidate' ? 'approved' : user.approvalStatus;

  if (requiredApprovalStatus && effectiveApprovalStatus !== requiredApprovalStatus) {
    if (effectiveApprovalStatus === 'pending') {
      return <Navigate to="/onboarding" replace />;
    }
    if (effectiveApprovalStatus === 'rejected') {
      return <Navigate to="/rejected" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleDashboardMap[user.role] || '/dashboard'} replace />;
  }

  return <Outlet />;
};