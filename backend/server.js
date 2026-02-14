require("dotenv").config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = 5001;

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.host,
  user: process.env.user,
  password: process.env.password,
  database: process.env.database,
  port: process.env.port
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL Database (Professional Schema).');
});

// ------------------------------------
// API: Authentication
// ------------------------------------
app.post('/api/login', (req, res) => {
    const { username } = req.body;
    // Logic: We need ID and ROLE for the app to function properly
    const sql = 'SELECT id, username, role FROM users WHERE username = ?';
    db.query(sql, [username], (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length === 0) return res.status(401).send({ message: 'User not found' });
        
        res.send({ 
            success: true, 
            user: results[0] 
        });
    });
});

// ------------------------------------
// API: Tickets (Replacing old Todo logic)
// ------------------------------------

// 1. READ: Get tickets by User ID (not username)
app.get('/api/todos/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
        return res.status(400).send({ message: "Invalid User ID" });
    }

    // Simplified SQL: Just get everything for this assignee
    const sql = `SELECT * FROM tickets WHERE assignee_id = ? ORDER BY deadline ASC`;
        
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("FETCH ERROR:", err.sqlMessage);
            return res.status(500).send({ message: err.sqlMessage });
        }
        res.json(results);
    });
});

app.post('/api/todos', (req, res) => {
    // We remove assigned_by because it's not in your tickets table yet
    const { title, summary, assignee_id, deadline } = req.body;
    
    // Check if any required field is missing
    if (!title || !assignee_id) {
        return res.status(400).send({ message: "Missing title or assignee" });
    }

    const sql = 'INSERT INTO tickets (title, summary, assignee_id, deadline, status) VALUES (?, ?, ?, ?, "New")';
    
    db.query(sql, [title, summary, assignee_id, deadline], (err, result) => {
        if (err) {
            console.error("DB Error:", err); // This will show in your terminal
            return res.status(500).send({ message: err.message });
        }
        res.status(201).send({ id: result.insertId, ...req.body });
    });
});

// --- UPDATE TICKET & LOG HISTORY ---
app.put('/api/todos/:id', (req, res) => {
    const { id } = req.params;
    const { status, performed_by, resolution_comment } = req.body; 

    // 1. Get the current status first so we know the "From" value
    db.query('SELECT status FROM tickets WHERE id = ?', [id], (err, current) => {
        if (err || current.length === 0) return res.status(404).send({ message: 'Ticket not found' });
        
        const oldStatus = current[0].status;

        // 2. Update the main ticket with the new status and comment
        const sqlUpdate = 'UPDATE tickets SET status = ?, resolution_comment = ? WHERE id = ?';
        db.query(sqlUpdate, [status, resolution_comment || null, id], (err) => {
            if (err) return res.status(500).send({ message: err.sqlMessage });

            // 3. IMPORTANT: Insert into ticket_history
            const historySql = `
                INSERT INTO ticket_history (ticket_id, action_type, action_comment, old_value, new_value, performed_by) 
                VALUES (?, "STATUS_CHANGE", ?, ?, ?, ?)`;
            
            // We use the resolution_comment as the action_comment
            db.query(historySql, [id, resolution_comment || 'Updated status', oldStatus, status, performed_by], (histErr) => {
                if (histErr) console.error("HISTORY LOG ERROR:", histErr.sqlMessage);
                res.send({ success: true, message: 'Status updated and history logged' });
            });
        });
    });
});

// --- GET HISTORY WITH ASSIGNEE NAME (STABLE VERSION) ---
app.get('/api/history/:ticketId', (req, res) => {
    const { ticketId } = req.params;
    
    // Using LEFT JOIN so the history shows even if the user isn't found
    const sql = `
        SELECT h.*, IFNULL(u.username, 'System/Unknown') as assignee_name 
        FROM ticket_history h
        LEFT JOIN users u ON h.performed_by = u.id
        WHERE h.ticket_id = ?
        ORDER BY h.created_at DESC`;

    db.query(sql, [ticketId], (err, results) => {
        if (err) {
            console.error("HISTORY FETCH ERROR:", err);
            return res.status(500).send(err);
        }
        console.log(`History found for ticket ${ticketId}:`, results.length); // Check your terminal for this!
        res.json(results);
    });
});

// --- REASSIGN TICKET ---
app.put('/api/todos/reassign/:id', (req, res) => {
    const { id } = req.params;
    const { new_assignee_id, performed_by } = req.body;

    // 1. Get current assignee and name for the history log
    const findOldSql = `
        SELECT t.assignee_id, u.username 
        FROM tickets t 
        LEFT JOIN users u ON t.assignee_id = u.id 
        WHERE t.id = ?`;

    db.query(findOldSql, [id], (err, results) => {
        if (err || results.length === 0) return res.status(404).send("Ticket not found");
        
        const oldAssigneeName = results[0].username || "Unassigned";

        // 2. Update to the new assignee
        db.query('UPDATE tickets SET assignee_id = ? WHERE id = ?', [new_assignee_id, id], (err) => {
            if (err) return res.status(500).send(err);

            // 3. Log it in history!
            const historySql = `
                INSERT INTO ticket_history (ticket_id, action_type, action_comment, old_value, new_value, performed_by) 
                VALUES (?, "REASSIGN", ?, ?, (SELECT username FROM users WHERE id = ?), ?)`;
            
            db.query(historySql, [id, `Moved from ${oldAssigneeName}`, oldAssigneeName, new_assignee_id, performed_by], (histErr) => {
                res.send({ success: true });
            });
        });
    });
});

// GET: Fetch all comments for a ticket
app.get('/api/comments/:ticketId', (req, res) => {
    const { ticketId } = req.params;
    const { role } = req.query; // We pass the user's role in the query string

    // Logic: If they are NOT an Assignee/Admin, they ONLY see 'Public'
    let query = `
        SELECT c.*, u.username 
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.ticket_id = ?
    `;

    if (role !== 'Assignee' && role !== 'Admin') {
        query += " AND c.comment_type = 'Public'";
    }

    query += " ORDER BY c.created_at ASC"; // Chronological order (ST001)

    db.query(query, [ticketId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// POST: Add a new comment
app.post('/api/comments', (req, res) => {
    const { ticket_id, user_id, comment_text, comment_type } = req.body;

    const query = `
        INSERT INTO comments (ticket_id, user_id, comment_text, comment_type)
        VALUES (?, ?, ?, ?)
    `;

    db.query(query, [ticket_id, user_id, comment_text, comment_type], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Comment added!", id: result.insertId });
    });
});

// POST: Add a follower to a ticket (Requirement ST003)
app.post('/api/tickets/followers', (req, res) => {
    const { ticket_id, user_id } = req.body;

    // We use IGNORE so if they are already following, it doesn't crash the server
    const query = `
        INSERT IGNORE INTO ticket_followers (ticket_id, user_id) 
        VALUES (?, ?)
    `;

    db.query(query, [ticket_id, user_id], (err, result) => {
        if (err) {
            console.error("FOLLOWER ERROR:", err);
            return res.status(500).json(err);
        }
        res.json({ message: "Follower added successfully" });
    });
});

// GET: All followers for a ticket (Already in your code, but double check the path)
app.get('/api/tickets/:id/followers', (req, res) => {
    const query = `
        SELECT u.username, u.id 
        FROM ticket_followers tf
        JOIN users u ON tf.user_id = u.id
        WHERE tf.ticket_id = ?
    `;
    db.query(query, [req.params.id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});
// ------------------------------------
// API: Users List (For Dropdown)
// ------------------------------------
app.get('/api/users', (req, res) => {
    const sql = 'SELECT id, username FROM users'; 
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

