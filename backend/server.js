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

// 1. READ: Includes the 'status' column
app.get('/api/todos/:username', (req, res) => {
    const { username } = req.params;
    // Selecting 'status' instead of 'done'
    const sql = 'SELECT id, task, status, updated FROM todo WHERE username = ? ORDER BY id DESC';
    db.query(sql, [username], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// 2. CREATE: Defaults new tasks to 'Todo'
app.post('/api/todos', (req, res) => {
    const { username, task } = req.body;
    const status = req.body.status || 'Todo'; // Default to Todo

    if (!username || !task) {
        return res.status(400).send({ message: 'Username and task are required' });
    }

    const sql = 'INSERT INTO todo (username, task, status) VALUES (?, ?, ?)';
    db.query(sql, [username, task, status], (err, result) => {
        if (err) return res.status(500).send(err);
        res.status(201).send({ 
            id: result.insertId, 
            username, 
            task, 
            status, 
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