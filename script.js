const BASE_URL = 'https://blog-backend.onrender.com/api';
let curSelectedNav = null;

// Hàm fetch dữ liệu từ backend
async function fetchNews(endpoint, queryParams = {}) {
  try {
    const url = new URL(`${BASE_URL}${endpoint}`);
    url.search = new URLSearchParams(queryParams).toString();
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}` // Thêm token nếu cần
      }
    });
    const data = await response.json();
    return data; // Trả về mảng posts từ backend
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}

// Hàm bind dữ liệu lên card (giữ nguyên logic cũ, điều chỉnh dữ liệu)
function bindData(articles) {
  const cardsContainer = document.getElementById('cardscontainer');
  const newsCardTemplate = document.getElementById('template-news-card');
  cardsContainer.innerHTML = '';

  articles.forEach((article) => {
    if (!article.image_url) return; // Sử dụng image_url từ backend

    const cardClone = newsCardTemplate.content.cloneNode(true);
    fillDataInCard(cardClone, article);
    cardsContainer.appendChild(cardClone);
  });
}

// Hàm điền dữ liệu vào card
function fillDataInCard(cardClone, article) {
  const newsImg = cardClone.querySelector('#news-img');
  const newsTitle = cardClone.querySelector('#news-title');
  const newsSource = cardClone.querySelector('#news-source');
  const newsDesc = cardClone.querySelector('#news-desc');

  newsImg.src = article.image_url || 'https://via.placeholder.com/400x200';
  newsTitle.innerHTML = `${article.title.slice(0, 60)}...`;
  newsDesc.innerHTML = `${article.content.slice(0, 150)}...`; // Sử dụng content từ backend

  const date = new Date(article.created_at).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  newsSource.innerHTML = `${article.author_id ? 'User' : 'Admin'} · ${date}`; // Điều chỉnh nguồn

  cardClone.firstElementChild.addEventListener('click', () => {
    window.open(`/detail.html?id=${article.id}`, '_blank'); // Chuyển đến trang chi tiết
  });
}

// Xử lý click menu
function onNavItemClick(id) {
  fetchNews('/posts/category/' + id)
    .then(articles => bindData(articles));
  const navItem = document.getElementById(id);
  curSelectedNav?.classList.remove('active');
  curSelectedNav = navItem;
  curSelectedNav.classList.add('active');
}

// Xử lý tìm kiếm
const searchButton = document.getElementById('search-button');
const searchText = document.getElementById('search-text');

searchButton.addEventListener('click', () => {
  const query = searchText.value;
  if (!query) return;
  fetchNews('/search', { keyword: query })
    .then(articles => bindData(articles));
  curSelectedNav?.classList.remove('active');
  curSelectedNav = null;
});

// Load mặc định (Technology)
window.addEventListener('load', () => {
  fetchNews('/posts/category/technology')
    .then(articles => bindData(articles));
});
