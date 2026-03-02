import React, { useEffect, useMemo, useState } from 'react';
import { Route, Routes, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import UserPage from './pages/UserPage';
import LoginPage from './pages/auth/LoginPage';
import { clearAuthToken, getAuthEventName, getCurrentUser, getStoredAuthToken, login, logout, setAuthToken } from './api/client';
import { useToast } from './components/ui/toast';
import CommandPalette from './components/ui/command-palette';
import './styles/app.css';
import './components/ui/ui.css';

const ASCII_POLARIS = `
             _            _     
            | |          (_)    
 _ __   ___ | | __ _ _ __ _ ___ 
| '_ \\ / _ \\| |/ _\` | '__| / __|
| |_) | (_) | | (_| | |  | \\__ \\
| .__/ \\___/|_|\\__,_|_|  |_|___/
| |                             
|_|                             
                           `;

const getInitialTheme = () => {
  const stored = localStorage.getItem('polaris-theme');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

const App = () => {
  const [theme, setTheme] = useState(getInitialTheme);
  const [auth, setAuth] = useState({ loading: true, user: null });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { pushToast } = useToast();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('polaris-theme', theme);
  }, [theme]);

  useEffect(() => {
    const bootstrapAuth = async () => {
      if (!getStoredAuthToken()) {
        setAuth({ loading: false, user: null });
        return;
      }

      try {
        const user = await getCurrentUser();
        setAuth({ loading: false, user });
      } catch {
        clearAuthToken();
        setAuth({ loading: false, user: null });
      }
    };

    bootstrapAuth();
  }, []);

  useEffect(() => {
    const handleAuthChange = async () => {
      if (!getStoredAuthToken()) {
        setAuth({ loading: false, user: null });
        return;
      }

      try {
        const user = await getCurrentUser();
        setAuth({ loading: false, user });
      } catch {
        clearAuthToken();
        setAuth({ loading: false, user: null });
      }
    };

    const eventName = getAuthEventName();
    window.addEventListener(eventName, handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener(eventName, handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  const nextTheme = useMemo(() => (theme === 'dark' ? 'light' : 'dark'), [theme]);
  const roles = auth.user?.roles || [];
  const canAccessAdmin = roles.includes('ADMIN');
  const canAccessUser = roles.includes('USER') || roles.includes('ADMIN');
  const hasAppRole = canAccessAdmin || canAccessUser;
  const defaultRoute = hasAppRole ? (canAccessAdmin ? '/admin' : '/app') : '/login';

  useEffect(() => {
    if (auth.user && !hasAppRole) {
      clearAuthToken();
      setAuth({ loading: false, user: null });
    }
  }, [auth.user, hasAppRole]);

  const handleLogin = async ({ username, password, role }) => {
    const payload = await login({ username, password, role });
    setAuthToken(payload.token);
    setAuth({ loading: false, user: payload.user });
    pushToast({ title: 'Signed in', description: `Welcome ${payload.user.username}`, variant: 'success' });

    if (role === 'ADMIN') {
      navigate('/admin?tab=Dashboard', { replace: true });
      return;
    }
    navigate('/app?tab=User Dashboard', { replace: true });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore logout errors and clear local session anyway
    } finally {
      clearAuthToken();
      setAuth({ loading: false, user: null });
      pushToast({ title: 'Signed out', variant: 'info' });
    }
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
      } else if (event.key === 'Escape') {
        setPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const commandActions = useMemo(() => {
    const actions = [];

    if (canAccessAdmin) {
      actions.push(
        {
          id: 'go-admin-dashboard',
          label: 'Go to Admin Dashboard',
          description: 'Infrastructure and metrics overview',
          run: () => navigate('/admin?tab=Dashboard')
        },
        {
          id: 'go-admin-api-keys',
          label: 'Go to API Keys',
          description: 'Create and manage API keys',
          run: () => navigate('/admin?tab=API Keys')
        },
        {
          id: 'go-admin-policies',
          label: 'Go to Rate Policies',
          description: 'Switch global or plan strategies',
          run: () => navigate('/admin?tab=Rate Policies')
        },
        {
          id: 'go-admin-health',
          label: 'Go to System Health',
          description: 'Actuator health and raw JSON',
          run: () => navigate('/admin?tab=System Health')
        }
      );
    }

    if (canAccessUser) {
      actions.push(
        {
          id: 'go-user-login',
          label: 'Go to User API Key Login',
          description: 'Authenticate with API key',
          run: () => navigate('/app?tab=API Key Login')
        },
        {
          id: 'go-user-dashboard',
          label: 'Go to User Dashboard',
          description: 'View current strategy for key',
          run: () => navigate('/app?tab=User Dashboard')
        },
        {
          id: 'go-user-simulator',
          label: 'Go to Request Simulator',
          description: 'Run protected endpoint simulation',
          run: () => navigate('/app?tab=Request Simulator')
        }
      );
    }

    actions.push({
      id: 'toggle-theme',
      label: `Switch to ${nextTheme} mode`,
      description: 'Toggle UI theme',
      run: () => setTheme(nextTheme)
    });

    if (auth.user) {
      actions.push({
        id: 'logout',
        label: 'Logout',
        description: 'End current session',
        run: handleLogout
      });
    } else {
      actions.push({
        id: 'go-login',
        label: 'Go to Login',
        description: 'Sign in to Polaris',
        run: () => navigate('/login')
      });
    }

    return actions;
  }, [auth.user, canAccessAdmin, canAccessUser, navigate, nextTheme]);

  useEffect(() => {
    setPaletteOpen(false);
  }, [location.pathname, location.search]);

  if (auth.loading) {
    return (
      <div className="app-shell auth-shell">
        <main className="app-main">
          <section className="auth-loading">
            <h1>Polaris Control Plane</h1>
            <p>Restoring session...</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-wrap">
          <div className="brand">
            <pre className="brand-ascii" aria-label="POLARIS">
              {ASCII_POLARIS}
            </pre>
          </div>
          <p className="brand-subtitle">Distributed API key governance, strategy control, and real-time enforcement visibility</p>
        </div>
        <div className="header-actions">
          {auth.user && (
            <nav>
              {canAccessAdmin && (
                <NavLink to="/admin" className="nav-link">
                  Admin
                </NavLink>
              )}
              {canAccessUser && (
                <NavLink to="/app" className="nav-link">
                  User
                </NavLink>
              )}
            </nav>
          )}
          {auth.user && (
            <div className="session-controls">
              <span className="session-pill">{auth.user.username}</span>
              <button type="button" className="logout-btn" onClick={handleLogout} aria-label="Logout" title="Logout">
                ⏻
              </button>
            </div>
          )}
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme(nextTheme)}
            aria-label={`Switch to ${nextTheme} mode`}
            title={`Switch to ${nextTheme} mode`}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <button type="button" className="command-btn" onClick={() => setPaletteOpen(true)} aria-label="Open command palette">
            ⌘K
          </button>
        </div>
      </header>
      <main className="app-main">
        <Routes>
          <Route
            path="/login"
            element={auth.user && hasAppRole ? <Navigate to={defaultRoute} replace /> : <LoginPage onLogin={handleLogin} />}
          />
          <Route
            path="/admin"
            element={canAccessAdmin ? <AdminPage /> : <Navigate to={auth.user ? defaultRoute : '/login'} replace />}
          />
          <Route
            path="/app"
            element={canAccessUser ? <UserPage /> : <Navigate to={auth.user ? defaultRoute : '/login'} replace />}
          />
          <Route path="*" element={<Navigate to={defaultRoute} replace />} />
        </Routes>
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} actions={commandActions} />
    </div>
  );
};

export default App;
