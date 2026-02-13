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

// 3. UPDATE: Status & Record History (Professional Logic)
app.put('/api/todos/:id', (req, res) => {
    const { id } = req.params;
    const { status, performed_by } = req.body; 

    // 1. Get current status first
    db.query('SELECT status FROM tickets WHERE id = ?', [id], (err, current) => {
        if (err) return res.status(500).send({ message: "Database read error" });
        if (current.length === 0) return res.status(404).send({ message: 'Ticket not found' });
        
        const oldStatus = current[0].status;

        // 2. Update the ticket status
        const sqlUpdate = 'UPDATE tickets SET status = ? WHERE id = ?';
        db.query(sqlUpdate, [status, id], (err) => {
            if (err) {
                console.error("UPDATE ERROR:", err.sqlMessage);
                return res.status(500).send({ message: err.sqlMessage });
            }

            // 3. Log to history (Wrapped in a check to prevent crashing)
            // Note: Ensure these column names match your ticket_history table exactly!
            const historySql = `
                INSERT INTO ticket_history (ticket_id, action_type, old_value, new_value, performed_by) 
                VALUES (?, "STATUS_CHANGE", ?, ?, ?)`;
            
            db.query(historySql, [id, oldStatus, status, performed_by], (histErr) => {
                if (histErr) {
                    // We log the error to the terminal, but we DON'T crash the response
                    console.error("HISTORY LOG ERROR (Check column names):", histErr.sqlMessage);
                }
                
                // Still send success because the main status actually changed
                res.send({ success: true, message: 'Status updated' });
            });
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