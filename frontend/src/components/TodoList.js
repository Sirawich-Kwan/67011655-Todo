import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL;

function TodoList({ user, onLogout }) {
    const { id: myId, username: myName } = user;

    const [todos, setTodos] = useState([]);
    const [users, setUsers] = useState([]); 
    const [targetUserId, setTargetUserId] = useState(myId);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [selectedHistory, setSelectedHistory] = useState([]);
    const [viewingHistoryId, setViewingHistoryId] = useState(null);

    // --- API CALLS ---
    const fetchHistory = async (ticketId) => {
        try {
            const response = await fetch(`${API_URL}/history/${ticketId}`);
            const data = await response.json();
            setSelectedHistory(data);
            setViewingHistoryId(ticketId);
        } catch (err) {
            console.error("Error fetching history:", err);
        }
    };

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
            const response = await fetch(`${API_URL}/todos/${myId}`);
            if (!response.ok) return;
            const data = await response.json();
            setTodos(data);
        } catch (err) {
            console.error('Error fetching tickets:', err);
        }
    };

    useEffect(() => {
        if (myId) {
            fetchTodos();
            fetchUsers();
        }
    }, [myId]);

    // --- HANDLERS ---
    const handleAddTodo = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !targetDate) {
            alert("Please provide both a title and a deadline.");
            return;
        }

        const payload = { 
            assignee_id: Number(targetUserId),
            title: newTaskTitle,
            summary: "Manual task creation", 
            deadline: targetDate,
            assigned_by: myId 
        };

        try {
            const response = await fetch(`${API_URL}/todos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setNewTaskTitle('');
                setTargetDate('');
                fetchTodos(); 
            }
        } catch (err) {
            console.error('Network Error:', err);
        }
    };

    const handleStatusChange = async (ticketId, newStatus) => {
        let comment = "";
        if (newStatus === 'Solved' || newStatus === 'Failed') {
            comment = prompt(`Please provide a final resolution comment for this ${newStatus} ticket:`);
            if (!comment || comment.trim() === "") {
                alert("A resolution comment is required to close this ticket.");
                return;
            }
        }

        try {
            const response = await fetch(`${API_URL}/todos/${ticketId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    status: newStatus,
                    performed_by: myId,
                    resolution_comment: comment
                }),
            });
            
            if (response.ok) fetchTodos();
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    // --- HELPERS ---
    const getStatusHeaderClass = (status) => {
        switch (status) {
            case 'Solving': return { backgroundColor: '#FFF4CC', color: '#856404' };
            case 'Solved': return { backgroundColor: '#E6F4EA', color: '#1E4620' };
            case 'Failed': return { backgroundColor: '#FDECEA', color: '#611A15' };
            default: return { backgroundColor: '#E8F0FE', color: '#1C3A5F' };
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "No date";
        return new Date(dateString).toLocaleString('en-GB');
    };

    const renderTaskGroup = (statusLabel) => {
        const filteredTasks = todos
            .filter(t => t.status === statusLabel)
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

        return (
            <div className="mb-5" key={statusLabel}>
                <h6 className="p-3 rounded-3 fw-bold mb-3 d-flex justify-content-between" style={getStatusHeaderClass(statusLabel)}>
                    <span>{statusLabel}</span>
                    <span className="badge bg-white text-dark opacity-75">{filteredTasks.length}</span>
                </h6>
                <div className="list-group list-group-flush">
                    {filteredTasks.map(todo => {
                        const hoursLeft = (new Date(todo.deadline) - new Date()) / (1000 * 60 * 60);
                        const isUrgent = hoursLeft > 0 && hoursLeft < 24;
                        const isOverdue = new Date(todo.deadline) < new Date() && statusLabel !== 'Solved';
                        
                        return (
                            <div key={todo.id} className="list-group-item px-0 py-3 border-bottom">
                                <div className="d-flex align-items-start justify-content-between gap-3">
                                    <div className="flex-grow-1">
                                        <div className="d-flex align-items-center gap-2 mb-1">
                                            {isUrgent && <span className="badge bg-danger" style={{fontSize: '0.65rem'}}>URGENT</span>}
                                            <span className={`fw-medium ${statusLabel === 'Solved' ? 'text-decoration-line-through text-muted' : ''}`}>
                                                {todo.title}
                                            </span>
                                        </div>
                                        <small className="fw-bold d-block" style={{ fontSize: '0.75rem', color: isOverdue ? '#B91C1C' : '#2563EB' }}>
                                            Deadline: {formatDate(todo.deadline)}
                                        </small>
                                        {todo.resolution_comment && (
                                            <div className="mt-2 p-2 rounded bg-light border-start border-3 border-success small">
                                                <strong>Resolution:</strong> {todo.resolution_comment}
                                            </div>
                                        )}
                                    </div>

                                    <div className="d-flex align-items-center gap-2">
                                        <button 
                                            className="btn btn-sm btn-outline-secondary"
                                            style={{ fontSize: '0.7rem' }}
                                            onClick={() => fetchHistory(todo.id)}
                                        >
                                            History
                                        </button>
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
        <div className="container py-4" style={{ paddingBottom: viewingHistoryId ? '450px' : '40px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="mb-0 fw-bold text-dark">{myName}</h5>
                <button className="btn btn-outline-danger btn-sm px-3" onClick={onLogout}>Logout</button>
            </div>

            <div className="row mb-4">
                <div className="col-12">
                    <div className="p-3 bg-white border rounded-3 d-flex align-items-center justify-content-between shadow-sm">
                        <span className="text-muted small fw-bold text-uppercase">Active Workload</span>
                        <span className="h4 mb-0 fw-bold text-primary">
                            {todos.filter(t => ['New', 'Assigned', 'Solving'].includes(t.status)).length}
                        </span>
                    </div>
                </div>
            </div>
            
            <form onSubmit={handleAddTodo} className="mb-5 bg-white p-4 rounded-3 border shadow-sm">
                <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary">Task Title</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="What needs to be done?"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                    />
                </div>
                
                <div className="row g-2 mb-3">
                    <div className="col-md-6">
                        <label className="form-label small fw-bold text-secondary">Deadline</label>
                        <input
                            type="datetime-local"
                            className="form-control"
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                        />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label small fw-bold text-secondary">Assign To</label>
                        <select 
                            className="form-select"
                            value={targetUserId}
                            onChange={(e) => setTargetUserId(e.target.value)}
                        >
                            {users.map(u => (
                                <option key={u.id} value={u.id}>
                                    {Number(u.id) === Number(myId) ? `Myself (${myName})` : u.username}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <button className="btn btn-primary w-100 fw-bold py-2" type="submit">Create Ticket</button>
            </form>

            <div className="active-workload">
                <h5 className="mb-4 text-primary fw-bold">📂 Current Workload</h5>
                {['New', 'Assigned', 'Solving'].map(status => renderTaskGroup(status))}
            </div>

            <hr className="my-5 opacity-10" />

            <div className="archive-view opacity-75">
                <h6 className="mb-4 text-muted fw-bold">✔️ Completed & History</h6>
                {['Solved', 'Failed'].map(status => renderTaskGroup(status))}
            </div>

            {/* HISTORY OVERLAY */}
            {viewingHistoryId && (
                <div className="position-fixed bottom-0 start-50 translate-middle-x mb-4 p-4 bg-dark text-white rounded-3 shadow-lg w-75" style={{ zIndex: 1050, maxHeight: '400px', overflowY: 'auto' }}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0">📜 Ticket History (ID: {viewingHistoryId})</h6>
                        <button className="btn-close btn-close-white" onClick={() => setViewingHistoryId(null)}></button>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-dark table-hover table-sm small mb-0">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>From</th>
                                    <th>To</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedHistory.map((log) => (
                                    <tr key={log.id}>
                                        <td className="text-muted">{new Date(log.created_at).toLocaleString()}</td>
                                        <td className="text-info">{log.performer_name}</td>
                                        <td>{log.action_type}</td>
                                        <td className="text-secondary">{log.old_value}</td>
                                        <td className="text-success fw-bold">{log.new_value}</td>
                                    </tr>
                                ))}
                                {selectedHistory.length === 0 && (
                                    <tr><td colSpan="5" className="text-center py-3 text-muted">No history found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TodoList;