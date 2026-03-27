import { useState, useEffect, FormEvent } from 'react';
import { api } from '../api/client';
import { User } from '../App';

interface Props {
  user: User | null;
}

interface ProfileStats {
  totalDays: number;
  totalCheckins: number;
  totalCheckouts: number;
  avgCheckinTime: string | null;
  avgCheckoutTime: string | null;
  lastWorked: string | null;
}

export default function Profile({ user }: Props) {
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (user) setName(user.name);
    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      const data = await api<ProfileStats>('/attendance/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleProfileUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    setProfileError('');
    setProfileMsg('');
    try {
      const result = await api<{ message: string; user: { id: number; name: string; email: string; role: string } }>(
        '/users/profile',
        {
          method: 'PUT',
          body: JSON.stringify({ name }),
        }
      );
      setProfileMsg(result.message);
      const updatedUser = { ...user!, name: result.user.name };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.dispatchEvent(new CustomEvent('user-updated', { detail: updatedUser }));
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMsg('');

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setLoadingPassword(true);
    try {
      const result = await api<{ message: string }>('/users/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordMsg(result.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Password change failed');
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <h2>👤 My Profile</h2>

      {/* Profile Stats */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px', color: '#555' }}>📊 Attendance Summary</h3>
        {loadingStats ? (
          <p>Loading stats...</p>
        ) : stats ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <StatCard label="Total Days Worked" value={stats.totalDays.toString()} icon="📅" />
            <StatCard label="Total Check-ins" value={stats.totalCheckins.toString()} icon="✅" />
            <StatCard label="Total Check-outs" value={stats.totalCheckouts.toString()} icon="🔴" />
            <StatCard label="Avg Check-in" value={stats.avgCheckinTime || '—'} icon="🕘" />
            <StatCard label="Avg Check-out" value={stats.avgCheckoutTime || '—'} icon="🕔" />
            <StatCard label="Last Worked" value={stats.lastWorked || '—'} icon="📆" />
          </div>
        ) : (
          <p style={{ color: '#999' }}>No attendance data yet.</p>
        )}
      </div>

      {/* Account Info */}
      <div style={{ marginBottom: '30px', padding: '20px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
        <h3 style={{ marginBottom: '10px', color: '#555' }}>ℹ️ Account Info</h3>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Role:</strong> <span style={{ textTransform: 'capitalize' }}>{user?.role}</span></p>
      </div>

      {/* Update Profile */}
      <form onSubmit={handleProfileUpdate} style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px', color: '#555' }}>✏️ Edit Profile</h3>
        {profileMsg && (
          <div style={{ color: 'green', padding: '10px', background: '#efe', borderRadius: '4px', marginBottom: '10px' }}>
            {profileMsg}
          </div>
        )}
        {profileError && (
          <div style={{ color: 'red', padding: '10px', background: '#fee', borderRadius: '4px', marginBottom: '10px' }}>
            {profileError}
          </div>
        )}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' }}
          />
        </div>
        <button
          type="submit"
          disabled={loadingProfile}
          style={{ padding: '10px 24px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
        >
          {loadingProfile ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Change Password */}
      <form onSubmit={handlePasswordChange}>
        <h3 style={{ marginBottom: '15px', color: '#555' }}>🔒 Change Password</h3>
        {passwordMsg && (
          <div style={{ color: 'green', padding: '10px', background: '#efe', borderRadius: '4px', marginBottom: '10px' }}>
            {passwordMsg}
          </div>
        )}
        {passwordError && (
          <div style={{ color: 'red', padding: '10px', background: '#fee', borderRadius: '4px', marginBottom: '10px' }}>
            {passwordError}
          </div>
        )}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' }}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' }}
          />
        </div>
        <button
          type="submit"
          disabled={loadingPassword}
          style={{ padding: '10px 24px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
        >
          {loadingPassword ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
      <div style={{ fontSize: '22px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{label}</div>
    </div>
  );
}
