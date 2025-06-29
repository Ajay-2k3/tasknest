import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import axios, { AxiosError } from 'axios';

// ✅ Use VITE_API_URL for deployment flexibility
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
axios.defaults.baseURL = API_BASE_URL;

// ✅ Define user type
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  department?: string;
  position?: string;
  avatar?: string;
}

// ✅ Auth state shape
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ✅ Action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

// ✅ Context shape
interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  clearError: () => void;
}

// ✅ Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// ✅ Reducer function
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    default:
      return state;
  }
};

// ✅ Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ Token helpers
const getToken = () => localStorage.getItem('token');
const setToken = (token: string) => localStorage.setItem('token', token);
const removeToken = () => localStorage.removeItem('token');

// ✅ Axios interceptor to add token to every request
axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ AuthProvider Component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ✅ Check auth status on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (!token) {
        dispatch({ type: 'AUTH_FAILURE', payload: 'No token found' });
        return;
      }

      try {
        const response = await axios.get('/auth/verify');
        dispatch({ type: 'AUTH_SUCCESS', payload: response.data.user });
      } catch (error) {
        const err = error as AxiosError;
        if (err.response?.status === 401) {
          removeToken();
          dispatch({ type: 'AUTH_FAILURE', payload: 'Session expired' });
        } else {
          dispatch({ type: 'AUTH_FAILURE', payload: 'Auth check failed' });
        }
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await axios.post('/auth/login', { email, password });
      const { token, user } = response.data;

      setToken(token);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      throw new Error(message);
    }
  };

  const register = async (userData: any) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await axios.post('/auth/register-public', userData);
      const { token, user } = response.data;

      setToken(token);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      throw new Error(message);
    }
  };

  const logout = () => {
    removeToken();
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (userData: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ✅ Hook for consuming context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
