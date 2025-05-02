const express = require('express');
const { check, validationResult } = require('express-validator');
const supabase = require('../supabase');
const auth = require('../middleware/auth');

const router = express.Router();

// Thêm bình luận
router.post('/', [
    auth(['user', 'editor', 'admin']),
    check('content', 'Content is required').not().isEmpty(),
    check('article_id', 'Article ID is required').isInt()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { content, article_id } = req.body;
    const userId = req.user.id;

    try {
        const { data: newComment, error } = await supabase
            .from('comments')
            .insert([{ content, article_id, user_id: userId, status: 'pending' }])
            .select()
            .single();

        if (error) {
            return res.status(500).json({ message: 'Server error', error: error.message });
        }

        res.status(201).json(newComment);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Lấy bình luận theo bài viết
router.get('/article/:article_id', async (req, res) => {
    const articleId = parseInt(req.params.article_id);

    try {
        const { data: comments, error } = await supabase
            .from('comments')
            .select('*, users(name)')
            .eq('article_id', articleId)
            .eq('status', 'approved');

        if (error) {
            return res.status(500).json({ message: 'Server error', error: error.message });
        }

        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Duyệt bình luận (admin/editor)
router.put('/:id/approve', auth(['admin', 'editor']), async (req, res) => {
    const commentId = parseInt(req.params.id);

    try {
        const { data: comment, error: fetchError } = await supabase
            .from('comments')
            .select('*')
            .eq('id', commentId)
            .single();

        if (fetchError || !comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        const { data: updatedComment, error: updateError } = await supabase
            .from('comments')
            .update({ status: 'approved' })
            .eq('id', commentId)
            .select()
            .single();

        if (updateError) {
            return res.status(500).json({ message: 'Server error', error: updateError.message });
        }

        res.json(updatedComment);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Xóa bình luận (admin hoặc chủ bình luận)
router.delete('/:id', auth(['user', 'editor', 'admin']), async (req, res) => {
    const commentId = parseInt(req.params.id);
    const userId = req.user.id;

    try {
        const { data: comment, error: fetchError } = await supabase
            .from('comments')
            .select('*')
            .eq('id', commentId)
            .single();

        if (fetchError || !comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        if (comment.user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { error: deleteError } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);

        if (deleteError) {
            return res.status(500).json({ message: 'Server error', error: deleteError.message });
        }

        res.json({ message: 'Comment deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
