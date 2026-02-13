import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import TodoList from './components/TodoList';
import './App.css';

function App() {
    // Now stores the whole user object: { id, username, role }
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const storedId = localStorage.getItem('userId');
        const storedName = localStorage.getItem('todo_username');
        const storedRole = localStorage.getItem('userRole');

        if (storedId && storedName) {
            setCurrentUser({ 
                id: storedId, 
                username: storedName, 
                role: storedRole 
            });
        }
    }, []);

    // Accepts the user object from Login.js
    const handleLogin = (userObject) => {
        setCurrentUser(userObject);
    };

    const handleLogout = () => {
        localStorage.removeItem('todo_username');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        setCurrentUser(null);
    };

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center py-4 px-3">
            <div className="col-12 col-sm-10 col-md-8 col-lg-7 col-xl-6">
                <div className="card">
                    <div className="card-body p-4 p-sm-5">
                        <header className="text-center mb-5">
                            <div className="logo-wrapper">
                                <img
                                    src="/cei_logo.png"
                                    alt="CEI Logo"
                                    style={{ width: "50px" }}
                                />
                            </div>
                            <h2 className="fw-bold mb-1">CEI Todo</h2>
                            <p className="text-muted small">Efficiency at your fingertips</p>
                        </header>

                        <main>
                            {currentUser ? (
                                <TodoList
                                    // Pass the whole user object to TodoList
                                    user={currentUser}
                                    onLogout={handleLogout}
                                />
                            ) : (
                                <Login onLogin={handleLogin} />
                            )}
                        </main>
                    </div>
                </div>
                <div className="mt-4 text-center">
                    <small className="text-muted">© 2026 CEI Todo App. All rights reserved.</small>
                </div>
            </div>
        </div>
    );
}

export default App;