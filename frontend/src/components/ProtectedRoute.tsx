import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export type UserRole = 'admin' | 'judge' | 'mentor' | 'participant' | 'candidate';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  requiredApprovalStatus?: ApprovalStatus;
}

const getCurrentUser = () => {
  return {
    id: '1',
    name: 'User Test',
    email: 'test@example.com',
    role: 'participant' as UserRole,
    approval_status: 'approved' as ApprovalStatus,
  };
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  requiredApprovalStatus,
}) => {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredApprovalStatus && user.approval_status !== requiredApprovalStatus) {
    if (user.approval_status === 'pending') {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};