import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface UserRecord {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  created_at: string;
}

interface AttendanceRecord {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  type: 'checkin' | 'checkout';
  timestamp: string;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'attendance'>('users');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, attendanceData] = await Promise.all([
        api<UserRecord[]>('/users/all'),
        api<AttendanceRecord[]>('/attendance/all'),
      ]);
      setUsers(usersData);
      setAttendance(attendanceData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h2>Admin Panel</h2>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'users' ? '#007bff' : '#e0e0e0',
            color: activeTab === 'users' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          All Users
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'attendance' ? '#007bff' : '#e0e0e0',
            color: activeTab === 'attendance' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          All Attendance
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : activeTab === 'users' ? (
        <div>
          <h3>Users ({users.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Name</th>
                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Email</th>
                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Role</th>
                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{u.name}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{u.email}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: u.role === 'admin' ? '#dc3545' : '#28a745',
                      color: 'white',
                      fontSize: '12px',
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          <h3>Attendance Records ({attendance.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>User</th>
                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Email</th>
                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Type</th>
                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((rec) => (
                <tr key={rec.id}>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{rec.user_name}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{rec.user_email}</td>
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
        </div>
      )}
    </div>
  );
}
