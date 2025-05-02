const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Dữ liệu tĩnh thay cho Supabase
const users = [];

// Đăng ký
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, name } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { id: users.length + 1, email, password: hashedPassword, name };
  users.push(user);
  res.status(201).json({ message: 'User registered', userId: user.id });
});

// Đăng nhập
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ message: 'User not found' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, email: user.email }, 'secret_key', { expiresIn: '1h' });
  res.json({ token });
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

