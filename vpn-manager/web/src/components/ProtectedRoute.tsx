import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Обёртка для защищённых маршрутов
 * Если нет токена — редирект на /login с сохранением location.state.from
 * для возврата после успешного логина
 */
export function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  const location = useLocation();
  const isAuthenticated = !!sessionStorage.getItem('accessToken');

  if (!isAuthenticated) {
    // Сохраняем текущий путь в state.from для возврата после логина
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
