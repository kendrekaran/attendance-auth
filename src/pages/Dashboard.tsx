import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { User } from '../App';

interface AttendanceRecord {
  id: number;
  user_id: number;
  user_name: string;
  type: 'checkin' | 'checkout';
  timestamp: string;
}

interface Props {
  user: User | null;
}

export default function Dashboard({ user }: Props) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(true);

  const loadRecords = async () => {
    try {
      const data = await api<AttendanceRecord[]>('/attendance/me');
      setRecords(data);
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleCheckin = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await api<{ message: string }>('/attendance/checkin', { method: 'POST' });
      setMessage(result.message);
      loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await api<{ message: string }>('/attendance/checkout', { method: 'POST' });
      setMessage(result.message);
      loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-out failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2>Welcome, {user?.name}!</h2>
      <p>Role: <strong>{user?.role}</strong></p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={handleCheckin}
          disabled={loading}
          style={{ padding: '12px 24px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}
        >
          Check In
        </button>
        <button
          onClick={handleCheckout}
          disabled={loading}
          style={{ padding: '12px 24px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}
        >
          Check Out
        </button>
      </div>

      {message && (
        <div style={{ color: 'green', padding: '10px', background: '#efe', borderRadius: '4px', marginBottom: '10px' }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ color: 'red', padding: '10px', background: '#fee', borderRadius: '4px', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      <h3>My Attendance History</h3>
      {loadingRecords ? (
        <p>Loading...</p>
      ) : records.length === 0 ? (
        <p>No attendance records yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Type</th>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Date & Time</th>
            </tr>
          </thead>
          <tbody>
            {records.map((rec) => (
              <tr key={rec.id}>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                  {rec.type === 'checkin' ? '✅ Check In' : '🔴 Check Out'}
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                  {new Date(rec.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
