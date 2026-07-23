import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles';

const roleHierarchy: Record<string, number> = {
  admin: 6, owner: 5, manager: 4, receptionist: 3, housekeeping: 2, accountant: 1,
};

interface RoleBasedRouteProps {
  allowedRoles: string[];
  fallbackPath?: string;
}

export default function RoleBasedRoute({ allowedRoles, fallbackPath = '/dashboard' }: RoleBasedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: colors.slate }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userLevel = roleHierarchy[user.role] || 0;
  const minRequired = Math.max(...allowedRoles.map(r => roleHierarchy[r] || 0));

  if (userLevel < minRequired) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
}
