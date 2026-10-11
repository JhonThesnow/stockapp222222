import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

export const ProtectedRoute = ({ children, requireRole }) => {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    if (requireRole && user.role !== requireRole) {
        // Si no tiene el rol requerido, redirige a una página segura según su rol
        return <Navigate to={user.role === 'admin' ? '/admin' : (user.role === 'caja' ? '/caja' : '/sales')} replace />;
    }

    return children;
};

export default ProtectedRoute;
