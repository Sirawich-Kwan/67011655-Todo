// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import TodoList from './components/TodoList';

function App() {
    const [currentUser, setCurrentUser] = useState(null);

    // Check for stored username on initial load
    useEffect(() => {
        const storedUser = localStorage.getItem('todo_username');
        if (storedUser) {
            setCurrentUser(storedUser);
        }
    }, []);

    const handleLogin = (username) => {
        setCurrentUser(username);
    };

    const handleLogout = () => {
        // Clear username from local storage and state
        localStorage.removeItem('todo_username');
        setCurrentUser(null);
    };

return (
    <div className="d-flex justify-content-center">
        <div className="col-12 col-sm-10 col-md-6 col-lg-5">

            <div className="card shadow-sm">
                <div className="card-body">

                    {/* HEADER */}
                    <div className="text-center mb-4">
                        <img
                            src="/cei-logo.png"
                            alt="CEI Logo"
                            style={{ maxWidth: "100px" }}
                        />
                        <h4 className="mt-2">CEI Todo</h4>
                        <p className="text-muted mb-0">
                            Full Stack Todo App
                        </p>
                    </div>

                    {/* MAIN CONTENT */}
                    {currentUser ? (
                        <TodoList
                            username={currentUser}
                            onLogout={handleLogout}
                        />
                    ) : (
                        <Login onLogin={handleLogin} />
                    )}

                </div>
            </div>

        </div>
    </div>
);

}

export default App;