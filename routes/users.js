const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const supabase = require('../supabase');
const auth = require('../middleware/auth');

const router = express.Router();

// Đăng ký
router.post('/register', [
    check('email', 'Email is required').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    check('name', 'Name is required').not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role } = req.body;

    try {
        const { data: userExists, error: fetchError } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            return res.status(500).json({ message: 'Server error', error: fetchError.message });
        }

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([
                { email, password: hashedPassword, name, role: role || 'user' }
            ])
            .select()
            .single();

        if (insertError) {
            return res.status(500).json({ message: 'Server error', error: insertError.message });
        }

        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Đăng nhập
router.post('/login', [
    check('email', 'Email is required').isEmail(),
    check('password', 'Password is required').exists()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (fetchError || !user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ message: 'Server configuration error: JWT_SECRET is missing' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Đăng xuất (Client-side, không cần xử lý trên server với JWT)
router.post('/logout', auth(['user', 'editor', 'admin']), (req, res) => {
    // Với JWT, đăng xuất thường được xử lý phía client bằng cách xóa token
    res.json({ message: 'Logged out successfully' });
});

// Cập nhật thông tin cá nhân (bao gồm mật khẩu và avatar)
router.put('/profile', auth(['user', 'editor', 'admin']), async (req, res) => {
    const { name, password, avatar } = req.body;
    const userId = req.user.id;

    try {
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (fetchError || !user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const updates = {};
        if (name) updates.name = name;
        if (avatar) updates.avatar = avatar;
        if (password) {
            updates.password = await bcrypt.hash(password, 10);
        }

        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (updateError) {
            return res.status(500).json({ message: 'Server error', error: updateError.message });
        }

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Lấy danh sách tất cả người dùng
router.get('/', auth(['admin']), async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, email, name, role, avatar');

        if (error) {
            return res.status(500).json({ message: 'Server error', error: error.message });
        }

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;

