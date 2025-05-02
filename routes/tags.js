const express = require('express');
const { check, validationResult } = require('express-validator');
const supabase = require('../supabase');
const auth = require('../middleware/auth');

const router = express.Router();

// Tạo thẻ (admin/editor)
router.post('/', [
    auth(['admin', 'editor']),
    check('name', 'Name is required').not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name } = req.body;

    try {
        const { data: newTag, error } = await supabase
            .from('tags')
            .insert([{ name }])
            .select()
            .single();

        if (error) {
            return res.status(500).json({ message: 'Server error', error: error.message });
        }

        res.status(201).json(newTag);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Lấy danh sách thẻ
router.get('/', async (req, res) => {
    try {
        const { data: tags, error } = await supabase
            .from('tags')
            .select('*');

        if (error) {
            return res.status(500).json({ message: 'Server error', error: error.message });
        }

        res.json(tags);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Cập nhật thẻ (admin/editor)
router.put('/:id', auth(['admin', 'editor']), async (req, res) => {
    const tagId = parseInt(req.params.id);
    const { name } = req.body;

    try {
        const { data: tag, error: fetchError } = await supabase
            .from('tags')
            .select('*')
            .eq('id', tagId)
            .single();

        if (fetchError || !tag) {
            return res.status(404).json({ message: 'Tag not found' });
        }

        const { data: updatedTag, error: updateError } = await supabase
            .from('tags')
            .update({ name: name || tag.name })
            .eq('id', tagId)
            .select()
            .single();

        if (updateError) {
            return res.status(500).json({ message: 'Server error', error: updateError.message });
        }

        res.json(updatedTag);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Xóa thẻ (admin)
router.delete('/:id', auth(['admin']), async (req, res) => {
    const tagId = parseInt(req.params.id);

    try {
        const { data: tag, error: fetchError } = await supabase
            .from('tags')
            .select('*')
            .eq('id', tagId)
            .single();

        if (fetchError || !tag) {
            return res.status(404).json({ message: 'Tag not found' });
        }

        await supabase.from('article_tag').delete().eq('tag_id', tagId);

        const { error: deleteError } = await supabase
            .from('tags')
            .delete()
            .eq('id', tagId);

        if (deleteError) {
            return res.status(500).json({ message: 'Server error', error: deleteError.message });
        }

        res.json({ message: 'Tag deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
