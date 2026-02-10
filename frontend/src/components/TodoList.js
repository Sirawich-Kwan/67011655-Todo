// frontend/src/components/TodoList.js
import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL;

function TodoList({ username, onLogout }) {
    // --- HOOKS MUST BE INSIDE HERE ---
    const [todos, setTodos] = useState([]);
    const [users, setUsers] = useState([]); // List of all users for dropdown
    const [targetUser, setTargetUser] = useState(username); // Who is getting the task
    const [newTask, setNewTask] = useState('');
    const [targetDate, setTargetDate] = useState('');

    useEffect(() => {
        fetchTodos();
        fetchUsers(); // Fetch users when component loads
    }, [username]);

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/users`);
            if (!response.ok) return;
            const data = await response.json();
            setUsers(data);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

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
        if (!newTask.trim() || !targetDate) {
            alert("Please provide both a task and a target date.");
            return;
        }
        try {
            await fetch(`${API_URL}/todos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: targetUser, // Targeted recipient
                    task: newTask, 
                    target_datetime: targetDate,
                    assigned_by: username // You as the assigner
                }),
            });
            setNewTask('');
            setTargetDate('');
            setTargetUser(username); // Reset dropdown to yourself
            fetchTodos(); 
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
            fetchTodos();
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

    const getStatusHeaderClass = (status) => {
        switch (status) {
            case 'Doing': return { backgroundColor: '#FFF4CC', color: '#856404' };
            case 'Done': return { backgroundColor: '#E6F4EA', color: '#1E4620' };
            default: return { backgroundColor: '#E8F0FE', color: '#1C3A5F' };
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "No date";
        const date = new Date(dateString);
        return date.toLocaleString('en-GB');
    };

    const renderTaskGroup = (statusLabel) => {
        const filteredTasks = todos
            .filter(t => t.status === statusLabel)
            .sort((a, b) => new Date(b.target_datetime) - new Date(a.target_datetime));

        return (
            <div className="mb-5" key={statusLabel}>
                <h6 className="p-3 rounded-3 fw-bold mb-3" style={getStatusHeaderClass(statusLabel)}>
                    {statusLabel}
                </h6>
                <div className="list-group list-group-flush">
                    {filteredTasks.map(todo => {
                        const isOverdue = new Date(todo.target_datetime) < new Date() && todo.status !== 'Done';
                        const dateColor = isOverdue ? '#B91C1C' : '#2563EB';

                        return (
                            <div key={todo.id} className="list-group-item px-0 py-3 border-bottom">
                                <div className="d-flex align-items-start justify-content-between gap-3">
                                    <div className="d-flex flex-column flex-grow-1" style={{ minWidth: '0' }}>
                                        <span className={`fw-medium mb-1 ${todo.status === 'Done' ? 'text-decoration-line-through text-muted' : 'text-dark'}`}>
                                            {todo.task}
                                        </span>
                                        <div className="d-flex flex-column gap-1">
                                            <small className="fw-bold" style={{ fontSize: '0.75rem', color: dateColor }}>
                                                Target: {formatDate(todo.target_datetime)}
                                            </small>
                                            <small className="text-muted" style={{ fontSize: '0.65rem' }}>
                                                Updated: {formatDate(todo.updated)}
                                            </small>
                                            
                                            {/* --- NUMBER 5: ASSIGNED BY DISPLAY --- */}
                                            {todo.assigned_by && todo.assigned_by !== todo.username && (
                                                <small className="text-info d-block mt-1" style={{ fontSize: '0.7rem', fontStyle: 'italic' }}>
                                                    Assigned by: {todo.assigned_by}
                                                </small>
                                            )}
                                        </div>
                                    </div>

                                    <div className="d-flex align-items-center gap-2 pt-1">
                                        <select 
                                            className="form-select form-select-sm" 
                                            style={{ width: '95px', fontSize: '0.8rem' }}
                                            value={todo.status}
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
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="mb-0 fw-bold text-secondary">
                    User: <span className="text-dark">{username}</span>
                </h5>
                <button className="btn btn-outline-danger btn-sm" onClick={onLogout}>
                    Logout
                </button>
            </div>
            
            <form onSubmit={handleAddTodo} className="mb-5">
                <div className="mb-3">
                    <input
                        type="text"
                        className="form-control shadow-none mb-2"
                        placeholder="What needs to be done?"
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                    />
                    <div className="input-group mb-2">
                        <span className="input-group-text small bg-light text-muted">Target Date</span>
                        <input
                            type="datetime-local"
                            className="form-control shadow-none"
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                        />
                    </div>
                    <div className="input-group">
                        <span className="input-group-text small bg-light text-muted">Assign To</span>
                        <select 
                            className="form-select shadow-none"
                            value={targetUser}
                            onChange={(e) => setTargetUser(e.target.value)}
                        >
                            {users.map(u => (
                                <option key={u.username} value={u.username}>
                                    {u.username === username ? "Myself" : u.username}
                                </option>
                            ))}
                        </select>
                        <button className="btn btn-primary px-4" type="submit">
                            Add Task
                        </button>
                    </div>
                </div>
            </form>

            {['Todo', 'Doing', 'Done'].map(status => renderTaskGroup(status))}
        </div>
    );
}

export default TodoList;