import { Navigate } from 'react-router-dom';
import { User } from '../App';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  user: User | null;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, user, requireAdmin }: Props) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
