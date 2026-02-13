import React, { useState } from 'react';

// This pulls the URL from your .env file
const API_URL = process.env.REACT_APP_API_URL;

function Login({ onLogin }) {
    // These are the "hooks" that define the variables ESLint is complaining about
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Now it's defined!

        if (!username.trim()) {
            setError('Please enter a username.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.message || 'Login failed.');
                return;
            }

            const data = await response.json();
            if (data.success) {
                // We save these for the "Real World" logic of IDs
                localStorage.setItem('userId', data.user.id);
                localStorage.setItem('userRole', data.user.role);
                localStorage.setItem('todo_username', data.user.username);
                
                // This sends the user object back to App.js
                onLogin(data.user);
            } else {
                setError(data.message || 'Login failed.');
            }
        } catch (err) {
            setError('Network error: Could not connect to the server.');
        }
    };

    return (
        <div className="text-center">
            <h4 className="fw-bold mb-3">Login</h4>
            <p className="text-muted small mb-4">Please enter your username to continue.</p>
            
            <form onSubmit={handleSubmit}>
                <div className="mb-3 text-start">
                    <label className="form-label small fw-bold text-secondary">Username</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. watchie"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>
                
                {error && (
                    <div className="alert alert-danger py-2 small" role="alert">
                        {error}
                    </div>
                )}

                <button type="submit" className="btn btn-primary w-100 mt-2 py-2">
                    Sign In
                </button>
            </form>
        </div>
    );
}

export default Login;