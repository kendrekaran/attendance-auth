import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'employee';
}

function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }

    const handleUpdate = (e: CustomEvent<User>) => {
      setUser(e.detail);
    };

    window.addEventListener('user-updated', handleUpdate as EventListener);
    return () => window.removeEventListener('user-updated', handleUpdate as EventListener);
  }, []);

  return (
    <BrowserRouter>
      <Navbar user={user} onLogout={() => { setUser(null); localStorage.clear(); }} />
      <div style={{ padding: '20px' }}>
        <Routes>
          <Route path="/login" element={<Login onLogin={setUser} />} />
          <Route path="/register" element={<Register onLogin={setUser} />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user}>
                <Dashboard user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute user={user}>
                <Profile user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute user={user} requireAdmin>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
