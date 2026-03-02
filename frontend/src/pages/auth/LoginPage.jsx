import React, { useState } from 'react';
import './login.css';

const LoginPage = ({ onLogin }) => {
  const [role, setRole] = useState('USER');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await onLogin({ username: username.trim(), password, role });
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="login-page">
      <article className="login-card">
        <header>
          <h1>Sign In</h1>
          <p>Access Polaris control surfaces with role-based permissions.</p>
        </header>

        <form onSubmit={submit}>
          <label className="field-label" htmlFor="role-selector">Role</label>
          <div id="role-selector" className="role-segmented" role="radiogroup" aria-label="Select role">
            <button
              type="button"
              className={role === 'ADMIN' ? 'is-active' : ''}
              onClick={() => setRole('ADMIN')}
              role="radio"
              aria-checked={role === 'ADMIN'}
            >
              Admin
            </button>
            <button
              type="button"
              className={role === 'USER' ? 'is-active' : ''}
              onClick={() => setRole('USER')}
              role="radio"
              aria-checked={role === 'USER'}
            >
              User
            </button>
          </div>

          <label className="field-label" htmlFor="username">Username</label>
          <input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter username"
          />

          <label className="field-label" htmlFor="password">Password</label>
          <div className="password-wrap">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button className="signin-btn" type="submit" disabled={busy}>
            {busy ? <span className="signin-spinner" aria-hidden="true" /> : null}
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </article>
    </section>
  );
};

export default LoginPage;
