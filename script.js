const BASE_URL = 'https://blog-backend.onrender.com/api';
let curSelectedNav = null;

async function fetchNews(endpoint, queryParams = {}) {
    try {
        const url = new URL(`${BASE_URL}${endpoint}`);
        url.search = new URLSearchParams(queryParams).toString();
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching news:', error);
        return [];
    }
}

function bindData(articles) {
    const cardsContainer = document.getElementById('cardscontainer');
    const newsCardTemplate = document.getElementById('template-news-card');
    cardsContainer.innerHTML = '';

    articles.forEach((article) => {
        if (!article.image_url) return;

        const cardClone = newsCardTemplate.content.cloneNode(true);
        fillDataInCard(cardClone, article);
        cardsContainer.appendChild(cardClone);
    });
}

function fillDataInCard(cardClone, article) {
    const newsImg = cardClone.querySelector('#news-img');
    const newsTitle = cardClone.querySelector('#news-title');
    const newsSource = cardClone.querySelector('#news-source');
    const newsDesc = cardClone.querySelector('#news-desc');

    newsImg.src = article.image_url || 'https://via.placeholder.com/400x200';
    newsTitle.innerHTML = `${article.title.slice(0, 60)}...`;
    newsDesc.innerHTML = `${article.content.slice(0, 150)}...`;

    const date = new Date(article.created_at).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    newsSource.innerHTML = `${article.author_id ? 'User' : 'Admin'} · ${date}`;

    cardClone.firstElementChild.addEventListener('click', () => {
        window.location.href = `/detail.html?id=${article.id}`;
    });
}

function onNavItemClick(id) {
    fetchNews(`/posts/category/${id}`)
        .then(articles => bindData(articles));
    const navItem = document.getElementById(id);
    curSelectedNav?.classList.remove('active');
    curSelectedNav = navItem;
    curSelectedNav.classList.add('active');
}

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

window.addEventListener('load', () => {
    fetchNews('/posts/category/technology')
        .then(articles => bindData(articles));
});
