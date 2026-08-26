const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

const generateToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, role, gender } = req.body;
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, phone, role, gender) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, phone, role, profile_image',
      [name, cleanEmail, hashedPassword, phone, role || 'customer', gender]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      data: { token, user },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user);
    const { password: _, ...userData } = user;

    res.json({
      success: true,
      data: {
        token,
        user: userData,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, role, profile_image, gender, is_active, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: { user: result.rows[0] },
    });
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, req.user.id]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('UpdatePassword error:', err);
    res.status(500).json({ success: false, message: 'Failed to update password' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (result.rows.length > 0) {
      const crypto = require('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 3600000);

      await pool.query(
        'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3',
        [resetToken, expires, email]
      );
    }

    res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
  } catch (err) {
    console.error('ForgotPassword error:', err);
    res.status(500).json({ success: false, message: 'Failed to process request' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { resetToken } = req.params;
    const { password } = req.body;

    const result = await pool.query(
      'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
      [resetToken]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL, updated_at = NOW() WHERE id = $2',
      [hashedPassword, result.rows[0].id]
    );

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('ResetPassword error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('DeleteUser error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};
