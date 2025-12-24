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
                body: JSON.stringify({ username, task: newTask }),
            });
            if (!response.ok) return;
            const newTodo = await response.json();
            setTodos([newTodo, ...todos]); 
            setNewTask('');
        } catch (err) {
            console.error('Error adding todo:', err);
        }
    };

    const handleToggleDone = async (id, currentDoneStatus) => {
        const newDoneStatus = !currentDoneStatus;
        try {
            const response = await fetch(`${API_URL}/todos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ done: newDoneStatus }),
            });
            if (!response.ok) return;
            setTodos(todos.map(todo => 
                todo.id === id ? { ...todo, done: newDoneStatus } : todo
            ));
        } catch (err) {
            console.error('Error toggling done status:', err);
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
                    <div key={todo.id} className="list-group-item d-flex align-items-center justify-content-between px-0 py-3 border-bottom">
                        
                        <div className="d-flex align-items-start flex-grow-1">
                            {/* CHECKBOX */}
                            <input
                                className="form-check-input me-3 mt-1"
                                type="checkbox"
                                checked={!!todo.done}
                                onChange={() => handleToggleDone(todo.id, todo.done)}
                                style={{ cursor: 'pointer', width: '1.2rem', height: '1.2rem' }}
                            />
                            
                            {/* TEXT AND TIME STACKED */}
                            <div className="d-flex flex-column">
                                <span className={`fw-medium ${todo.done ? 'text-decoration-line-through text-muted' : 'text-dark'}`}>
                                    {todo.task}
                                </span>
                                <small className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                                    Updated: {new Date(todo.updated).toLocaleString()}
                                </small>
                            </div>
                        </div>

                        {/* DELETE BUTTON FIXED TO RIGHT */}
                        <button 
                            className="btn btn-link text-danger text-decoration-none btn-sm fw-bold ms-2" 
                            onClick={() => handleDeleteTodo(todo.id)}
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default TodoList;