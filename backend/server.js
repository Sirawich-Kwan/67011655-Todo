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
    console.log('Connected to MySQL Database.');
});

// ------------------------------------
// API: Authentication
// ------------------------------------
app.post('/api/login', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).send({ message: 'Username is required' });
    
    res.send({ 
        success: true, 
        message: 'Login successful', 
        user: { username }
    });
});

// ------------------------------------
// API: Todo List (Updated for Statuses)
// ------------------------------------

// 1. READ: Added target_datetime to SELECT
app.get('/api/todos/:username', (req, res) => {
    const { username } = req.params;
    const sql = 'SELECT id, task, status, updated, target_datetime FROM todo WHERE username = ?';
    db.query(sql, [username], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// 2. CREATE: Added target_datetime to INSERT
app.post('/api/todos', (req, res) => {
    const { username, task, target_datetime } = req.body; // Receive date from frontend
    const sql = 'INSERT INTO todo (username, task, status, target_datetime) VALUES (?, ?, "Todo", ?)';
    db.query(sql, [username, task, target_datetime], (err, result) => {
        if (err) return res.status(500).send(err);
        res.status(201).send({ 
            id: result.insertId, 
            username, 
            task, 
            status: 'Todo', 
            target_datetime,
            updated: new Date() 
        });
    });
});

// 3. UPDATE: Change status to 'Todo', 'Doing', or 'Done'
app.put('/api/todos/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body; 
    
    // Validate that the status is one of the three allowed values
    const allowedStatuses = ['Todo', 'Doing', 'Done'];
    if (status && !allowedStatuses.includes(status)) {
        return res.status(400).send({ message: 'Invalid status value' });
    }

    const sql = 'UPDATE todo SET status = ? WHERE id = ?';
    db.query(sql, [status, id], (err, result) => {
        if (err) return res.status(500).send(err);
        if (result.affectedRows === 0) {
            return res.status(404).send({ message: 'Todo not found' });
        }
        res.send({ message: 'Status updated successfully' });
    });
});

// 4. DELETE: Remains the same
app.delete('/api/todos/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM todo WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send({ message: 'Todo deleted successfully' });
    });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

// ADD "ALTER TABLE todo ADD COLUMN assigned_by VARCHAR(255);" to mysql

// --- CLEANED UP ROUTES ---
// 1. Get list of users for dropdown
app.get('/api/users', (req, res) => {
    const sql = 'SELECT username FROM users'; 
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// 2. Fetch todos for a user (Includes EVERYTHING using SELECT *)
app.get('/api/todos/:username', (req, res) => {
    const { username } = req.params;
    // Selecting * ensures assigned_by and target_datetime are included
    const sql = 'SELECT * FROM todo WHERE username = ? ORDER BY target_datetime ASC';
    db.query(sql, [username], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// 3. Create a new todo (The ONLY Post route you need)
app.post('/api/todos', (req, res) => {
    const { username, task, target_datetime, assigned_by } = req.body;
    const sql = 'INSERT INTO todo (username, task, status, target_datetime, assigned_by) VALUES (?, ?, "Todo", ?, ?)';
    
    db.query(sql, [username, task, target_datetime, assigned_by], (err, result) => {
        if (err) {
            console.error("Insert error:", err);
            return res.status(500).send(err);
        }
        res.status(201).send({ id: result.insertId, ...req.body });
    });
});