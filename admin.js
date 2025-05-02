const BASE_URL = 'https://blog-backend.onrender.com/api';

async function fetchPosts() {
    try {
        const response = await fetch(`${BASE_URL}/posts`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        });
        const posts = await response.json();
        const adminPosts = document.getElementById('admin-posts');
        adminPosts.innerHTML = '';
        posts.forEach(post => {
            adminPosts.innerHTML += `<p>${post.title} <button onclick="deletePost(${post.id})">Delete</button></p>`;
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
    }
}

async function deletePost(id) {
    try {
        await fetch(`${BASE_URL}/posts/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        });
        fetchPosts();
    } catch (error) {
        console.error('Error deleting post:', error);
    }
}

document.getElementById('create-post').addEventListener('click', async () => {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const image_url = document.getElementById('post-image').value;
    try {
        const response = await fetch(`${BASE_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            },
            body: JSON.stringify({ title, content, image_url, status: 'published' })
        });
        if (response.ok) {
            fetchPosts();
        }
    } catch (error) {
        console.error('Error creating post:', error);
    }
});

window.addEventListener('load', fetchPosts);
