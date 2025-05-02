const express = require('express');
const supabase = require('../supabase');
const auth = require('../middleware/auth');

const router = express.Router();

// Thống kê lượt xem bài viết
router.get('/views', auth(['admin', 'editor']), async (req, res) => {
    try {
        const { data: views, error } = await supabase
            .from('article_views')
            .select('article_id, view_count, posts(title)');

        if (error) {
            return res.status(500).json({ message: 'Server error', error: error.message });
        }

        res.json(views);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Thống kê số bài đăng theo danh mục
router.get('/posts-by-category', auth(['admin', 'editor']), async (req, res) => {
    try {
        const { data: stats, error } = await supabase
            .from('article_category')
            .select('category_id, categories(name), count:article_id.count()');

        if (error) {
            return res.status(500).json({ message: 'Server error', error: error.message });
        }

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Top bài viết đọc nhiều
router.get('/top-posts', auth(['admin', 'editor']), async (req, res) => {
    try {
        const { data: topPosts, error } = await supabase
            .from('article_views')
            .select('article_id, view_count, posts(title)')
            .order('view_count', { ascending: false })
            .limit(5);

        if (error) {
            return res.status(500).json({ message: 'Server error', error: error.message });
        }

        res.json(topPosts);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
