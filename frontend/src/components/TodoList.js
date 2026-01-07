// frontend/src/components/TodoList.js
import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL;

function TodoList({ username, onLogout }) {
    const [todos, setTodos] = useState([]);
    const [newTask, setNewTask] = useState('');

    useEffect(() => {
        fetchTodos();
    }, [username]);

    const fetchTodos = async () => {
        try {
            const response = await fetch(`${API_URL}/todos/${username}`);
            if (!response.ok) return;
            const data = await response.json();
            setTodos(data);
        } catch (err) {
            console.error('Error fetching todos:', err);
        }
    };

    const handleAddTodo = async (e) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        try {
            const response = await fetch(`${API_URL}/todos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, task: newTask, status: 'Todo' }),
            });
            if (!response.ok) return;
            const newTodo = await response.json();
            setTodos([newTodo, ...todos]); 
            setNewTask('');
        } catch (err) {
            console.error('Error adding todo:', err);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            const response = await fetch(`${API_URL}/todos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!response.ok) return;
            setTodos(todos.map(todo => 
                todo.id === id ? { ...todo, status: newStatus } : todo
            ));
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    const handleDeleteTodo = async (id) => {
        try {
            const response = await fetch(`${API_URL}/todos/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) return;
            setTodos(todos.filter(todo => todo.id !== id));
        } catch (err) {
            console.error('Error deleting todo:', err);
        }
    };

    // Helper to get color based on status
    const getStatusClass = (status) => {
        switch (status) {
            case 'Doing': return 'bg-warning text-dark';
            case 'Done': return 'bg-success text-white';
            default: return 'bg-light text-dark border';
        }
    };

    return (
        <div>
            {/* USER HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="mb-0 fw-bold text-secondary">
                    User: <span className="text-dark">{username}</span>
                </h5>
                <button className="btn btn-outline-danger btn-sm" onClick={onLogout}>
                    Logout
                </button>
            </div>
            
            {/* ADD TASK FORM */}
            <form onSubmit={handleAddTodo} className="input-group mb-4">
                <input
                    type="text"
                    className="form-control shadow-none"
                    placeholder="Create a new task..."
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                />
                <button className="btn btn-primary px-4" type="submit">
                    Add Task
                </button>
            </form>

            {/* TODO LIST ITEMS */}
            <div className="list-group list-group-flush">
                {todos.map(todo => (
                    <div key={todo.id} className="list-group-item px-0 py-3 border-bottom">
                        {/* Use gap-3 and align-items-start to give more room */}
                        <div className="d-flex align-items-start justify-content-between gap-3">
                            
                            {/* LEFT SIDE: Task Text and Meta Info */}
                            <div className="d-flex flex-column flex-grow-1" style={{ minWidth: '0' }}>
                                <span className={`fw-medium mb-1 ${todo.status === 'Done' ? 'text-decoration-line-through text-muted' : 'text-dark'}`} style={{ wordBreak: 'break-word' }}>
                                    {todo.task}
                                </span>
                                
                                <div className="d-flex flex-wrap align-items-center gap-2">
                                    {/* STATUS BADGE */}
                                    <span className={`badge ${getStatusClass(todo.status)}`} style={{ fontSize: '0.65rem', padding: '0.35em 0.65em' }}>
                                        {todo.status || 'Todo'}
                                    </span>
                                    {/* UPDATED TIME - whiteSpace: nowrap prevents weird wrapping */}
                                    <small className="text-muted" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                                        Updated: {new Date(todo.updated).toLocaleString()}
                                    </small>
                                </div>
                            </div>

                            {/* RIGHT SIDE: Dropdown and Delete */}
                            <div className="d-flex align-items-center gap-2 pt-1">
                                <select 
                                    className="form-select form-select-sm" 
                                    style={{ width: '95px', fontSize: '0.8rem' }}
                                    value={todo.status || 'Todo'}
                                    onChange={(e) => handleStatusChange(todo.id, e.target.value)}
                                >
                                    <option value="Todo">Todo</option>
                                    <option value="Doing">Doing</option>
                                    <option value="Done">Done</option>
                                </select>

                                <button 
                                    className="btn btn-link text-danger text-decoration-none btn-sm fw-bold p-0 ms-1" 
                                    onClick={() => handleDeleteTodo(todo.id)}
                                >
                                    Delete
                                </button>
                            </div>

                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default TodoList;