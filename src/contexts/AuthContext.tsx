import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from 'react';
import axios from 'axios';

// ✅ Dynamic API base URL using Vite env variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
axios.defaults.baseURL = API_BASE_URL;

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  department?: string;
  position?: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  clearError: () => void;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Reducer
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

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token management
const getToken = () => localStorage.getItem('token');
const setToken = (token: string) => localStorage.setItem('token', token);
const removeToken = () => localStorage.removeItem('token');

// Axios interceptor for token
axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Provider
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

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
      } catch (error: any) {
        removeToken();
        const message =
          error?.response?.data?.message ||
          (error?.response?.status === 401 ? 'Session expired' : 'Invalid token');
        dispatch({ type: 'AUTH_FAILURE', payload: message });
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

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must b
