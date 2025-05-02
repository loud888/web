const express = require('express');
const { check, validationResult } = require('express-validator');
const supabase = require('../supabase');
const auth = require('../middleware/auth');

const router = express.Router();

// Tạo bài viết mới (hỗ trợ image_url và danh mục)
router.post('/', [
    auth(['user', 'editor', 'admin']),
    check('title', 'Title is required').not().isEmpty(),
    check('content', 'Content is required').not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, image_url, category_ids, tag_ids, status } = req.body;
    const userId = req.user.id;

    try {
        // Tạo bài viết
        const { data: newPost, error: insertError } = await supabase
            .from('posts')
            .insert([
                { title, content, image_url, status: status || 'draft', user_id: userId }
            ])
            .select()
            .single();

        if (insertError) {
            return res.status(500).json({ message: 'Server error', error: insertError.message });
        }

        // Liên kết với danh mục
        if (category_ids && Array.isArray(category_ids)) {
            const categoryLinks = category_ids.map(category_id => ({
                article_id: newPost.id,
                category_id
            }));
            await supabase.from('article_category').insert(categoryLinks);
        }

        // Liên kết với thẻ
        if (tag_ids && Array.isArray(tag_ids)) {
            const tagLinks = tag_ids.map(tag_id => ({
                article_id: newPost.id,
                tag_id
            }));
            await supabase.from('article_tag').insert(tagLinks);
        }

        // Khởi tạo lượt xem
        await supabase.from('article_views').insert([{ article_id: newPost.id, view_count: 0 }]);

        res.status(201).json(newPost);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Lấy danh sách bài viết (hiển thị danh mục và thẻ)
router.get('/', async (req, res) => {
    try {
        const { data: posts, error } = await supabase
            .from('posts')
            .select(`
                *,
                article_category(category_id, categories(name)),
                article_tag(tag_id, tags(name)),
                article_views(view_count)
            `);

        if (error) {
            return res.status(500).json({ message: 'Server error', error: error.message });
        }

        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Lấy bài viết theo ID (tăng lượt xem)
router.get('/:id', async (req, res) => {
    const postId = parseInt(req.params.id);

    try {
        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select(`
                *,
                article_category(category_id, categories(name)),
                article_tag(tag_id, tags(name)),
                article_views(view_count)
            `)
            .eq('id', postId)
            .single();

        if (fetchError || !post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Tăng lượt xem
        await supabase
            .from('article_views')
            .update({ view_count: post.article_views.view_count + 1 })
            .eq('article_id', postId);

        res.json(post);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Cập nhật bài viết
router.put('/:id', auth(['user', 'editor', 'admin']), async (req, res) => {
    const postId = parseInt(req.params.id);
    const { title, content, image_url, category_ids, tag_ids, status } = req.body;
    const userId = req.user.id;

    try {
        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();

        if (fetchError || !post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        if (post.user_id !== userId && req.user.role !== 'admin' && req.user.role !== 'editor') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const updates = {
            title: title || post.title,
            content: content || post.content,
            image_url: image_url || post.image_url,
            status: status || post.status
        };

        const { data: updatedPost, error: updateError } = await supabase
            .from('posts')
            .update(updates)
            .eq('id', postId)
            .select()
            .single();

        if (updateError) {
            return res.status(500).json({ message: 'Server error', error: updateError.message });
        }

        // Cập nhật danh mục
        if (category_ids && Array.isArray(category_ids)) {
            await supabase.from('article_category').delete().eq('article_id', postId);
            const categoryLinks = category_ids.map(category_id => ({
                article_id: postId,
                category_id
            }));
            await supabase.from('article_category').insert(categoryLinks);
        }

        // Cập nhật thẻ
        if (tag_ids && Array.isArray(tag_ids)) {
            await supabase.from('article_tag').delete().eq('article_id', postId);
            const tagLinks = tag_ids.map(tag_id => ({
                article_id: postId,
                tag_id
            }));
            await supabase.from('article_tag').insert(tagLinks);
        }

        res.json(updatedPost);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Xóa bài viết
router.delete('/:id', auth(['user', 'editor', 'admin']), async (req, res) => {
    const postId = parseInt(req.params.id);
    const userId = req.user.id;

    try {
        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();

        if (fetchError || !post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        if (post.user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        await supabase.from('article_category').delete().eq('article_id', postId);
        await supabase.from('article_tag').delete().eq('article_id', postId);
        await supabase.from('article_views').delete().eq('article_id', postId);
        await supabase.from('comments').delete().eq('article_id', postId);

        const { error: deleteError } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId);

        if (deleteError) {
            return res.status(500).json({ message: 'Server error', error: deleteError.message });
        }

        res.json({ message: 'Post deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Tìm kiếm bài viết
router.get('/search', async (req, res) => {
    const { keyword } = req.query;

    if (!keyword) {
        return res.status(400).json({ message: 'Keyword is required' });
    }

    try {
        const { data: posts, error } = await supabase
            .from('posts')
            .select(`
                *,
                article_category(category_id, categories(name)),
                article_tag(tag_id, tags(name)),
                article_views(view_count)
            `)
            .or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`);

        if (error) {
            return res.status(500).json({ message: 'Server error', error: error.message });
        }

        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
