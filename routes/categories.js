const express = require('express');
const { check, validationResult } = require('express-validator');
const supabase = require('../supabase');
const auth = require('../middleware/auth');

const router = express.Router();

// Tạo danh mục (admin/editor)
router.post('/', [
    auth(['admin', 'editor']),
    check('name', 'Name is required').not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;

    try {
        const { data: newCategory, error } = await supabase
            .from('categories')
            .insert([{ name, description }])
            .select()
            .single();

        if (error) {
            return res.status(500).json({ message: 'Server error', error: error.message });
        }

        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Lấy danh sách danh mục
router.get('/', async (req, res) => {
    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*');

        if (error) {
            return res.status(500).json({ message: 'Server error', error: error.message });
        }

        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Cập nhật danh mục (admin/editor)
router.put('/:id', auth(['admin', 'editor']), async (req, res) => {
    const categoryId = parseInt(req.params.id);
    const { name, description } = req.body;

    try {
        const { data: category, error: fetchError } = await supabase
            .from('categories')
            .select('*')
            .eq('id', categoryId)
            .single();

        if (fetchError || !category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        const { data: updatedCategory, error: updateError } = await supabase
            .from('categories')
            .update({ name: name || category.name, description: description || category.description })
            .eq('id', categoryId)
            .select()
            .single();

        if (updateError) {
            return res.status(500).json({ message: 'Server error', error: updateError.message });
        }

        res.json(updatedCategory);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Xóa danh mục (admin)
router.delete('/:id', auth(['admin']), async (req, res) => {
    const categoryId = parseInt(req.params.id);

    try {
        const { data: category, error: fetchError } = await supabase
            .from('categories')
            .select('*')
            .eq('id', categoryId)
            .single();

        if (fetchError || !category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        await supabase.from('article_category').delete().eq('category_id', categoryId);

        const { error: deleteError } = await supabase
            .from('categories')
            .delete()
            .eq('id', categoryId);

        if (deleteError) {
            return res.status(500).json({ message: 'Server error', error: deleteError.message });
        }

        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
