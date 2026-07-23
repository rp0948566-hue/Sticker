import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/api/client';

export const Admin: React.FC = () => {
  const { token, setToken, isAuthenticated, clearToken } = useAuthStore();
  const [orders, setOrders] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isAuthenticated()) {
      fetchOrders();
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.pingAdmin(password);
      if (res.success) {
        setToken(password);
      } else {
        setAuthError('Invalid Admin Key');
      }
    } catch (err) {
      setAuthError('Network Error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.fetchOrders(token!);
      if (res.success && res.orders) {
        setOrders(res.orders);
      } else {
        clearToken();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated()) {
    return (
      <div id="ap-gate">
        <div className="ap-gate-box">
          <form id="ap-gate-form" onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Enter Admin Key"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" disabled={loading}>Unlock</button>
          </form>
          {authError && <div id="ap-gate-error">{authError}</div>}
        </div>
      </div>
    );
  }

  return (
    <div id="ap-app">
      <header className="ap-header">
        <h1>Admin Dashboard</h1>
        <button onClick={clearToken}>Logout</button>
      </header>
      <div className="ap-table-wrapper">
         <table className="ap-table">
            <thead>
               <tr>
                 <th>Order ID</th>
                 <th>Date</th>
                 <th>Customer</th>
                 <th>Status</th>
               </tr>
            </thead>
            <tbody>
               {orders.map((row: any, idx: number) => (
                 <tr key={idx}>
                   <td>{row[0]}</td>
                   <td>{row[1]}</td>
                   <td>{row[3]} - {row[4]}</td>
                   <td>{row[15]}</td>
                 </tr>
               ))}
            </tbody>
         </table>
      </div>
    </div>
  );
};
