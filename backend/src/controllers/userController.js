const pool = require('../config/db');

exports.getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, role, profile_image, gender, is_active, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: { user: result.rows[0] } });
  } catch (err) {
    console.error('GetProfile error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    let profileImage;

    if (req.file) {
      profileImage = `/uploads/${req.file.filename}`;
    }

    const result = await pool.query(
      'UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone), profile_image = COALESCE($3, profile_image), updated_at = NOW() WHERE id = $4 RETURNING id, name, email, phone, role, profile_image',
      [name, phone, profileImage, req.user.id]
    );

    res.json({ success: true, data: { user: result.rows[0] } });
  } catch (err) {
    console.error('UpdateProfile error:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};
