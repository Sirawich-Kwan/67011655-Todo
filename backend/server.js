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
// API: Todo List
// ------------------------------------

// 1. READ: Get all tasks for a specific user
app.get('/api/todos/:username', (req, res) => {
    const { username } = req.params;
    // Using * ensures we get id, task, status, updated, target_datetime, AND assigned_by
    const sql = 'SELECT * FROM todo WHERE username = ? ORDER BY target_datetime ASC';
    db.query(sql, [username], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// 2. CREATE: Add a new task with "assigned_by" support
app.post('/api/todos', (req, res) => {
    const { username, task, target_datetime, assigned_by } = req.body;
    const sql = 'INSERT INTO todo (username, task, status, target_datetime, assigned_by) VALUES (?, ?, "Todo", ?, ?)';
    
    db.query(sql, [username, task, target_datetime, assigned_by], (err, result) => {
        if (err) {
            console.error("Insert error:", err);
            return res.status(500).send(err);
        }
        res.status(201).send({ 
            id: result.insertId, 
            ...req.body,
            status: 'Todo',
            updated: new Date() 
        });
    });
});

// 3. UPDATE: Change status
app.put('/api/todos/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body; 
    
    const allowedStatuses = ['Todo', 'Doing', 'Done'];
    if (status && !allowedStatuses.includes(status)) {
        return res.status(400).send({ message: 'Invalid status value' });
    }

    const sql = 'UPDATE todo SET status = ? WHERE id = ?';
    db.query(sql, [status, id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send({ message: 'Status updated successfully' });
    });
});

// 4. DELETE: Remove task
app.delete('/api/todos/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM todo WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send({ message: 'Todo deleted successfully' });
    });
});

// ------------------------------------
// API: Users (For Dropdown)
// ------------------------------------
app.get('/api/users', (req, res) => {
    const sql = 'SELECT username FROM users'; 
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});