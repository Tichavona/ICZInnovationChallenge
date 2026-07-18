// frontend/src/hooks/useAuth.ts
import * as React from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId?: string;
  stationId?: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
}

// Create context with a default value
const AuthContext = React.createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider(props: AuthProviderProps): React.ReactElement {
  const [user, setUser] = React.useState<User | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    // Check for stored token on mount
    const storedToken = window.localStorage.getItem('auth_token');
    const storedUser = window.localStorage.getItem('auth_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        window.localStorage.removeItem('auth_token');
        window.localStorage.removeItem('auth_user');
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      
      setToken(data.token);
      setUser(data.user);
      
      window.localStorage.setItem('auth_token', data.token);
      window.localStorage.setItem('auth_user', JSON.stringify(data.user));

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = (): void => {
    setUser(null);
    setToken(null);
    window.localStorage.removeItem('auth_token');
    window.localStorage.removeItem('auth_user');
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return user.permissions?.includes(permission) || false;
  };

  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false;
    if (typeof role === 'string') {
      return user.role === role;
    }
    return role.includes(user.role);
  };

  const contextValue: AuthContextType = {
    user: user,
    token: token,
    isLoading: isLoading,
    login: login,
    logout: logout,
    hasPermission: hasPermission,
    hasRole: hasRole
  };

  return React.createElement(
    AuthContext.Provider,
    { value: contextValue },
    props.children
  );
}

export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}