import { User } from '../App';

const API_BASE = '/api';

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface ApiError {
  error: string;
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export const setTokens = (accessToken: string, refreshToken: string, user: User) => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('user', JSON.stringify(user));
};

export const getAccessToken = () => localStorage.getItem('accessToken');
export const getRefreshToken = () => localStorage.getItem('refreshToken');
export const getUser = (): User | null => {
  const stored = localStorage.getItem('user');
  return stored ? JSON.parse(stored) : null;
};

export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (isRefreshing) {
    return refreshPromise;
  }

  isRefreshing = true;
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    isRefreshing = false;
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      window.location.href = '/login';
      return null;
    }

    const data = await res.json() as { accessToken: string };
    localStorage.setItem('accessToken', data.accessToken);
    return data.accessToken;
  } catch {
    clearTokens();
    window.location.href = '/login';
    return null;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
};

export const api = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  let accessToken = getAccessToken();

  const makeRequest = async (token: string): Promise<Response> => {
    return fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  };

  let res = await makeRequest(token!);

  if (res.status === 401 && accessToken) {
    // Try to refresh
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await makeRequest(newToken);
    } else {
      throw new Error('Session expired');
    }
  }

  if (!res.ok) {
    const error = await res.json() as ApiError;
    throw new Error(error.error || 'Request failed');
  }

  return res.json() as Promise<T>;
};

export const login = async (email: string, password: string): Promise<TokenResponse> => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json() as ApiError;
    throw new Error(error.error || 'Login failed');
  }

  const data = await res.json() as TokenResponse;
  setTokens(data.accessToken, data.refreshToken, data.user);
  return data;
};

export const register = async (
  email: string,
  password: string,
  name: string,
  role?: string
): Promise<TokenResponse> => {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, role }),
  });

  if (!res.ok) {
    const error = await res.json() as ApiError;
    throw new Error(error.error || 'Registration failed');
  }

  const data = await res.json() as TokenResponse;
  setTokens(data.accessToken, data.refreshToken, data.user);
  return data;
};
