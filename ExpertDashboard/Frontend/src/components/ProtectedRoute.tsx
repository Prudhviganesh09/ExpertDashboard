
import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuthentication = () => {
      const userData = localStorage.getItem('userData');
      
      if (!userData) {
        setIsAuthenticated(false);
        return;
      }

      try {
        // Check if userData is valid JSON
        const user = JSON.parse(userData);
        console.log('🔍 ProtectedRoute - User data:', user);
        if (user && user.email) {
          const normalizedEmail = (user.email || '').toLowerCase();
          const preSaleEmails = [
            'vaishnavig@relai.world',
            'angaleenaj@relai.world',
            'angelinak@relai.world',
            'subscriptions@relai.world',
            'sindhua@relai.world',
            'sindhu@relai.world',
          ];
          const effectiveRole = user.role || (preSaleEmails.includes(normalizedEmail) ? 'pre-sale' : undefined);
          console.log('🔍 ProtectedRoute - Email:', normalizedEmail);
          console.log('🔍 ProtectedRoute - User role from data:', user.role);
          console.log('🔍 ProtectedRoute - Effective role:', effectiveRole);
          setIsAuthenticated(true);
          setUserRole(effectiveRole || 'user');
        } else {
          localStorage.removeItem('userData');
          setIsAuthenticated(false);
          setUserRole(null);
        }
      } catch (error) {
        console.error('User data parse error:', error);
        localStorage.removeItem('userData');
        setIsAuthenticated(false);
        setUserRole(null);
      }
    };

    checkAuthentication();
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to access this page",
        variant: "destructive",
      });
      navigate('/signin');
    }
  }, [isAuthenticated, navigate, toast]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated && userRole === 'pre-sale' && location.pathname !== '/pre-sale-dashboard') {
    console.log('🔄 ProtectedRoute - Redirecting pre-sale user to /pre-sale-dashboard from', location.pathname);
    return <Navigate to="/pre-sale-dashboard" replace />;
  }

  if (isAuthenticated && userRole === 'expert' && location.pathname !== '/expert-dashboard') {
    console.log('🔄 ProtectedRoute - Redirecting expert user to /expert-dashboard from', location.pathname);
    return <Navigate to="/expert-dashboard" replace />;
  }

  console.log('✅ ProtectedRoute - Rendering children. Auth:', isAuthenticated, 'Role:', userRole, 'Path:', location.pathname);
  return isAuthenticated ? <>{children}</> : null;
}
