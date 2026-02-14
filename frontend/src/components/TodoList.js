import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL;

function TodoList({ user, onLogout }) {
    const { id: myId, username: myName } = user;
    const creatorPlaceholder = "Original Reporter"; // Placeholder for EP05-ST003

    // --- STATE ---
    const [todos, setTodos] = useState([]);
    const [users, setUsers] = useState([]);
    const [targetUserId, setTargetUserId] = useState(myId);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [targetDate, setTargetDate] = useState('');

    // History State (EP04)
    const [selectedHistory, setSelectedHistory] = useState([]);
    const [viewingHistoryId, setViewingHistoryId] = useState(null);

    // Collaboration State (EP05)
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [viewingCommentsId, setViewingCommentsId] = useState(null);
    const [followers, setFollowers] = useState([]);

    // --- API CALLS ---

    const fetchTodos = async () => {
        try {
            const response = await fetch(`${API_URL}/todos/${myId}`);
            if (response.ok) {
                const data = await response.json();
                setTodos(data);
            }
        } catch (err) {
            console.error('Error fetching tickets:', err);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/users`);
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    const fetchHistory = async (ticketId) => {
        try {
            const response = await fetch(`${API_URL}/history/${ticketId}`);
            const data = await response.json();
            setSelectedHistory(data);
            setViewingHistoryId(ticketId);
            setViewingCommentsId(null); 
        } catch (err) {
            console.error("Error fetching history:", err);
        }
    };

    const fetchComments = async (ticketId) => {
        try {
            const response = await fetch(`${API_URL}/comments/${ticketId}?role=Assignee`);
            const data = await response.json();
            setComments(data);

            const followerRes = await fetch(`${API_URL}/tickets/${ticketId}/followers`);
            const followerData = await followerRes.json();
            setFollowers(followerData);

            setViewingCommentsId(ticketId);
            setViewingHistoryId(null); 
        } catch (err) {
            console.error("Error fetching collaboration data:", err);
        }
    };

    useEffect(() => {
        if (myId) {
            fetchTodos();
            fetchUsers();
        }
    }, [myId]);

    // --- HANDLERS ---

// KEYWORD TODO: Manual Creation Logic
// // Remove or hide this before production.

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
    // REMOVE END HERE

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

    const handleReassign = async (ticketId, newUserId) => {
        if (!newUserId) return;
        const confirmMove = window.confirm("Are you sure you want to reassign this ticket?");
        if (!confirmMove) return;

        try {
            const response = await fetch(`${API_URL}/todos/reassign/${ticketId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    new_assignee_id: newUserId, 
                    performed_by: myId 
                }),
            });

            if (response.ok) {
                // Only close if it's no longer assigned to me
                if (Number(newUserId) !== Number(myId)) {
                    setViewingCommentsId(null);
                    setViewingHistoryId(null);
                }
                fetchTodos(); 
                alert("Ticket Reassigned!");
            }
        } catch (error) {
            console.error("Reassign error:", error);
        }
    };

    const handleAddComment = async (e, ticketId) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const response = await fetch(`${API_URL}/comments`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticket_id: ticketId,
                    user_id: myId, 
                    comment_text: newComment,
                    comment_type: isInternal ? 'Internal' : 'Public'
                }),
            });

            if (response.ok) {
                setNewComment('');
                setIsInternal(false);
                fetchComments(ticketId); 
            }
        } catch (err) {
            console.error("Error adding comment:", err);
        }
    };

    const handleAddFollower = async (ticketId, userId) => {
        if (!userId) return;
        try {
            const response = await fetch(`${API_URL}/tickets/followers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticket_id: ticketId, user_id: userId }),
            });
            if (response.ok) fetchComments(ticketId); 
        } catch (err) {
            console.error("Error adding follower:", err);
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

                                        {!['Solved', 'Failed'].includes(statusLabel) && (
                                            <div className="mt-2" style={{ maxWidth: '180px' }}>
                                                <select 
                                                    className="form-select form-select-sm bg-light" 
                                                    style={{ fontSize: '0.7rem' }}
                                                    onChange={(e) => handleReassign(todo.id, e.target.value)}
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>Reassign to...</option>
                                                    {users.filter(u => u.id !== myId).map(u => (
                                                        <option key={u.id} value={u.id}>{u.username}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        {todo.resolution_comment && (
                                            <div className="mt-2 p-2 rounded bg-light border-start border-3 border-success small text-wrap text-break">
                                                <strong>Resolution:</strong> {todo.resolution_comment}
                                            </div>
                                        )}
                                    </div>

                                    <div className="d-flex align-items-center gap-2">
                                        <button className="btn btn-sm btn-outline-secondary" style={{ fontSize: '0.7rem' }} onClick={() => fetchHistory(todo.id)}>
                                            History
                                        </button>
                                        <button className="btn btn-sm btn-outline-primary" style={{ fontSize: '0.7rem' }} onClick={() => fetchComments(todo.id)}>
                                            Comments
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
        <div className="container py-4">
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

                {/* --- KEYWORD TODO: Assignee friend should hide or Remove this whole form block later --- */}            
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
                        <select className="form-select" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)}>
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
            {/* --- REMOVE END HERE --- */}            


            <div className="active-workload">
                <h5 className="mb-4 text-primary fw-bold">📂 Current Workload</h5>
                {['New', 'Assigned', 'Solving'].map(status => renderTaskGroup(status))}
            </div>

            <hr className="my-5 opacity-10" />

            <div className="archive-view opacity-75">
                <h6 className="mb-4 text-muted fw-bold">✔️ Completed & History</h6>
                {['Solved', 'Failed'].map(status => renderTaskGroup(status))}
            </div>

            {/* EP04: HISTORY OVERLAY */}
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
                                    <th>Time/Date</th>
                                    <th>Assignee</th>
                                    <th>From</th>
                                    <th>To</th>
                                    <th>Comment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedHistory.map((log) => (
                                    <tr key={log.id}>
                                        <td style={{ color: '#ced4da' }}>{formatDate(log.created_at)}</td>
                                        <td className="text-info">{log.assignee_name}</td>
                                        <td className="text-secondary">{log.old_value}</td>
                                        <td className="text-success fw-bold">{log.new_value}</td>
                                        <td className="italic text-light">{log.action_comment}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* EP05: COLLABORATION SIDEBAR */}
            {viewingCommentsId && (
                <div className="position-fixed top-0 end-0 h-100 bg-white shadow-lg border-start" style={{ width: '350px', zIndex: 1060, display: 'flex', flexDirection: 'column' }}>
                    <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-primary text-white">
                        <h6 className="mb-0 fw-bold">Ticket #{viewingCommentsId} Details</h6>
                        <button className="btn-close btn-close-white" onClick={() => setViewingCommentsId(null)}></button>
                    </div>

                    <div className="p-3 border-bottom bg-light">
                        <label className="small fw-bold text-muted mb-2 d-block text-uppercase">Project Roles</label>
                        
                        <div className="mb-2">
                            <span className="badge bg-secondary text-white border small shadow-sm me-2">Creator</span>
                            <span className="small text-dark">{creatorPlaceholder}</span>
                        </div>

                        {/* FIXED HEAD LEAD LOGIC */}
                        <div className="mb-2">
                            <span className="badge bg-primary text-white border small shadow-sm me-2">Head Lead</span>
                            <span className="small text-dark fw-bold">
                                {todos.find(t => t.id === viewingCommentsId)?.assignee_name || myName}
                            </span>
                        </div>

                        <label className="small fw-bold text-muted mb-2 d-block text-uppercase mt-3">Followers / Teammates</label>
                        <div className="d-flex flex-wrap gap-1 mb-2">
                            {followers.length > 0 ? followers.map(f => (
                                <span key={f.id} className="badge bg-white text-dark border small shadow-sm">👤 {f.username}</span>
                            )) : <span className="small text-muted">No followers yet</span>}
                        </div>
                        
                        <select 
                            className="form-select form-select-sm mt-2" 
                            style={{fontSize: '0.7rem'}}
                            onChange={(e) => handleAddFollower(viewingCommentsId, e.target.value)}
                            defaultValue=""
                        >
                            <option value="" disabled>+ Add Teammate to follow</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                        </select>
                    </div>

                    <div className="flex-grow-1 overflow-auto p-3 bg-light">
                        {comments.length > 0 ? comments.map(c => (
                            <div key={c.id} className={`p-2 mb-3 rounded-3 shadow-sm small ${c.comment_type === 'Internal' ? 'bg-warning-subtle border-start border-3 border-warning' : 'bg-white'}`}>
                                <div className="d-flex justify-content-between mb-1">
                                    <span className="fw-bold text-primary">{c.username}</span>
                                    {c.comment_type === 'Internal' && <span className="badge bg-warning text-dark" style={{fontSize: '0.5rem'}}>INTERNAL</span>}
                                </div>
                                <div className="text-dark">{c.comment_text}</div>
                                <div className="text-muted mt-1" style={{fontSize: '0.55rem'}}>{formatDate(c.created_at)}</div>
                            </div>
                        )) : <div className="text-center text-muted mt-5 small">No conversation yet.</div>}
                    </div>

                    <div className="p-3 border-top bg-white">
                        <form onSubmit={(e) => handleAddComment(e, viewingCommentsId)}>
                            <textarea 
                                className="form-control form-control-sm mb-2" 
                                rows="3" 
                                placeholder="Type a message..." 
                                value={newComment} 
                                onChange={(e) => setNewComment(e.target.value)} 
                            />
                            <div className="d-flex justify-content-between align-items-center">
                                <div className="form-check form-switch small">
                                    <input className="form-check-input" type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                                    <label className="form-check-label text-muted" style={{fontSize: '0.7rem'}}>Internal Only</label>
                                </div>
                                <button className="btn btn-primary btn-sm px-3 fw-bold" type="submit">Send</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TodoList;