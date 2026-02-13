const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim()) {
            setError('Please enter a username.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.message || 'Login failed.');
                return;
            }

            const data = await response.json();
            if (data.success) {
                // --- CRITICAL CHANGES HERE ---
                // Store the ID and Role too, not just the username
                localStorage.setItem('userId', data.user.id);
                localStorage.setItem('userRole', data.user.role);
                localStorage.setItem('todo_username', data.user.username);
                
                // Pass the whole user object back to App.js
                onLogin(data.user); 
            } else {
                setError(data.message || 'Login failed.');
            }
        } catch (err) {
            setError('Network error: Could not connect to the server.');
        }
    };