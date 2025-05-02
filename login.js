const BASE_URL = 'https://blog-backend.onrender.com/api';

document.getElementById('login-button').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        const response = await fetch(`${BASE_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            window.location.href = 'index.html';
        } else {
            alert('Login failed');
        }
    } catch (error) {
        console.error('Error logging in:', error);
    }
});

document.getElementById('register-button').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const name = document.getElementById('login-name').value;
    try {
        const response = await fetch(`${BASE_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Registered successfully');
        } else {
            alert('Registration failed');
        }
    } catch (error) {
        console.error('Error registering:', error);
    }
});
