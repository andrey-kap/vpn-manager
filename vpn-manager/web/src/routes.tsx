import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';

// Lazy-компоненты для страниц
const Dashboard = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
    <p className="mt-2 text-gray-600">Welcome to VPN Manager</p>
  </div>
);

const Users = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900">Users</h1>
    <p className="mt-2 text-gray-600">User management page</p>
  </div>
);

const Traffic = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900">Traffic</h1>
    <p className="mt-2 text-gray-600">Traffic statistics page</p>
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/users',
    element: (
      <ProtectedRoute>
        <Users />
      </ProtectedRoute>
    ),
  },
  {
    path: '/traffic',
    element: (
      <ProtectedRoute>
        <Traffic />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
