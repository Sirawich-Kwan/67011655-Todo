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
    // We force userId to be a number just in case
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
        return res.status(400).send({ message: "Invalid User ID" });
    }

    // Professional SQL: Use assignee_id to find tickets for this user
    const sql = `
        SELECT t.*, u.username as creator_name 
        FROM tickets t 
        LEFT JOIN users u ON t.assignee_id = u.id 
        WHERE t.assignee_id = ? 
        ORDER BY t.deadline ASC`;
        
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

// 3. UPDATE: Status & Record History (Professional Logic)
app.put('/api/todos/:id', (req, res) => {
    const { id } = req.params;
    const { status, performed_by } = req.body; 

    // First, find old status to record in history
    db.query('SELECT status FROM tickets WHERE id = ?', [id], (err, current) => {
        if (err || current.length === 0) return res.status(404).send('Ticket not found');
        const oldStatus = current[0].status;

        const sql = 'UPDATE tickets SET status = ? WHERE id = ?';
        db.query(sql, [status, id], (err) => {
            if (err) return res.status(500).send(err);

            // LOG HISTORY: Every time a status changes, it's recorded here
            const historySql = 'INSERT INTO ticket_history (ticket_id, action_type, old_value, new_value, performed_by) VALUES (?, "STATUS_CHANGE", ?, ?, ?)';
            db.query(historySql, [id, oldStatus, status, performed_by]);

            res.send({ message: 'Status updated and history logged' });
        });
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