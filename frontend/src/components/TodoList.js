import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL;

function TodoList({ user, onLogout }) {
    // We "destructure" the user object we got from App.js
    const { id: myId, username: myName, role } = user;

    const [todos, setTodos] = useState([]);
    const [users, setUsers] = useState([]); 
    const [targetUserId, setTargetUserId] = useState(myId); // Logic: Use ID for assignment
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [targetDate, setTargetDate] = useState('');

    useEffect(() => {
        fetchTodos();
        fetchUsers();
    }, [myId]); // Logic: Refresh when the User ID changes

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
            // Logic: Request tickets by ID (matches EP04-ST001)
            const response = await fetch(`${API_URL}/todos/${myId}`);
            if (!response.ok) return;
            const data = await response.json();
            setTodos(data);
        } catch (err) {
            console.error('Error fetching tickets:', err);
        }
    };

    const handleAddTodo = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !targetDate) {
            alert("Please provide both a title and a deadline.");
            return;
        }
        try {
            await fetch(`${API_URL}/todos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    assignee_id: targetUserId, // Professional: Using ID
                    title: newTaskTitle,        // Professional: Using 'title' not 'task'
                    summary: "User created task", 
                    deadline: targetDate,      // Professional: Using 'deadline'
                    assigned_by: myId          // Logic: Record WHO created it
                }),
            });
            setNewTaskTitle('');
            setTargetDate('');
            setTargetUserId(myId); 
            fetchTodos(); 
        } catch (err) {
            console.error('Error adding ticket:', err);
        }
    };

    const handleStatusChange = async (ticketId, newStatus) => {
        try {
            // Logic: Pass 'performed_by' to the backend for the History Log (EP04-ST003)
            const response = await fetch(`${API_URL}/todos/${ticketId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    status: newStatus,
                    performed_by: myId 
                }),
            });
            if (!response.ok) return;
            fetchTodos();
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    // Helper: Logic to match the Professional SQL Statuses
    const getStatusHeaderClass = (status) => {
        switch (status) {
            case 'Solving': return { backgroundColor: '#FFF4CC', color: '#856404' }; // Warning Yellow
            case 'Solved': return { backgroundColor: '#E6F4EA', color: '#1E4620' };  // Success Green
            case 'Failed': return { backgroundColor: '#FDECEA', color: '#611A15' };  // Danger Red
            default: return { backgroundColor: '#E8F0FE', color: '#1C3A5F' };        // Info Blue
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "No date";
        return new Date(dateString).toLocaleString('en-GB');
    };

    const renderTaskGroup = (statusLabel) => {
        const filteredTasks = todos
            .filter(t => t.status === statusLabel)
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline)); // Sort by Deadline

        return (
            <div className="mb-5" key={statusLabel}>
                <h6 className="p-3 rounded-3 fw-bold mb-3 d-flex justify-content-between" style={getStatusHeaderClass(statusLabel)}>
                    <span>{statusLabel}</span>
                    <span className="badge bg-white text-dark opacity-75">{filteredTasks.length}</span>
                </h6>
                <div className="list-group list-group-flush">
                    {filteredTasks.map(todo => {
                        const isOverdue = new Date(todo.deadline) < new Date() && statusLabel !== 'Solved';
                        
                        return (
                            <div key={todo.id} className="list-group-item px-0 py-3 border-bottom">
                                <div className="d-flex align-items-start justify-content-between gap-3">
                                    <div className="flex-grow-1">
                                        <span className={`fw-medium d-block mb-1 ${statusLabel === 'Solved' ? 'text-decoration-line-through text-muted' : ''}`}>
                                            {todo.title}
                                        </span>
                                        <div className="d-flex flex-column gap-1">
                                            <small className="fw-bold" style={{ fontSize: '0.75rem', color: isOverdue ? '#B91C1C' : '#2563EB' }}>
                                                Deadline: {formatDate(todo.deadline)}
                                            </small>
                                            {/* Logic: Show who assigned it if it wasn't you */}
                                            {todo.creator_name && todo.creator_name !== myName && (
                                                <small className="text-info" style={{ fontSize: '0.7rem' }}>
                                                    Assigned by: {todo.creator_name}
                                                </small>
                                            )}
                                        </div>
                                    </div>

                                    <div className="d-flex align-items-center gap-2">
                                        <select 
                                            className="form-select form-select-sm" 
                                            style={{ width: '105px', fontSize: '0.8rem' }}
                                            value={todo.status}
                                            onChange={(e) => handleStatusChange(todo.id, e.target.value)}
                                        >
                                            <option value="New">New</option>
                                            <option value="Assigned">Assigned</option>
                                            <option value="Solving">Solving</option>
                                            <option value="Solved">Solved</option>
                                            <option value="Failed">Failed</option>
                                        </select>
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
                <div>
                    <h5 className="mb-0 fw-bold">{myName}</h5>
                    <span className="badge bg-secondary" style={{fontSize: '0.6rem'}}>{role.toUpperCase()}</span>
                </div>
                <button className="btn btn-outline-danger btn-sm" onClick={onLogout}>Logout</button>
            </div>
            
            <form onSubmit={handleAddTodo} className="mb-5 bg-light p-3 rounded-3 border">
                <input
                    type="text"
                    className="form-control mb-2"
                    placeholder="Ticket Title"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                />
                <div className="input-group mb-2">
                    <span className="input-group-text small">Deadline</span>
                    <input
                        type="datetime-local"
                        className="form-control"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                    />
                </div>
                <div className="input-group">
                    <span className="input-group-text small">Assign To</span>
                    <select 
                        className="form-select"
                        value={targetUserId}
                        onChange={(e) => setTargetUserId(e.target.value)}
                    >
                        {users.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.id === myId ? "Myself" : u.username}
                            </option>
                        ))}
                    </select>
                    <button className="btn btn-primary" type="submit">Create Ticket</button>
                </div>
            </form>

            {/* Render groups based on the Professional SQL Statuses */}
            {['New', 'Assigned', 'Solving', 'Solved', 'Failed'].map(status => renderTaskGroup(status))}
        </div>
    );
}

export default TodoList;