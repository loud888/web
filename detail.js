const BASE_URL = 'https://blog-backend.onrender.com/api';

async function fetchPost() {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');
  const response = await fetch(`${BASE_URL}/posts/${postId}`);
  const post = await response.json();
  document.getElementById('detail-title').textContent = post.title;
  document.getElementById('detail-image').src = post.image_url;
  document.getElementById('detail-content').innerHTML = post.content;
  document.getElementById('detail-date').textContent = new Date(post.created_at).toLocaleString();
}

window.addEventListener('load', fetchPost);
