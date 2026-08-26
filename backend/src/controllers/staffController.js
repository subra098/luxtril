const pool = require('../config/db');

exports.createStaff = async (req, res) => {
  try {
    const { name, role, phone, email, isAvailable, serviceIds } = req.body;

    const salonResult = await pool.query('SELECT id FROM salons WHERE owner_id = $1', [req.user.id]);
    if (salonResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No salon found' });
    }

    const profileImage = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await pool.query(
      'INSERT INTO staff (salon_id, name, role, phone, email, profile_image, is_available) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [salonResult.rows[0].id, name, role, phone, email, profileImage, isAvailable === 'true' || isAvailable === true]
    );

    const staff = result.rows[0];

    if (serviceIds) {
      const ids = Array.isArray(serviceIds) ? serviceIds : [serviceIds];
      for (const sid of ids) {
        await pool.query('INSERT INTO staff_services (staff_id, service_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [staff.id, sid]);
      }
    }

    res.status(201).json({ success: true, data: { staff } });
  } catch (err) {
    console.error('CreateStaff error:', err);
    res.status(500).json({ success: false, message: 'Failed to create staff' });
  }
};

exports.getMyStaff = async (req, res) => {
  try {
    const salonResult = await pool.query('SELECT id FROM salons WHERE owner_id = $1', [req.user.id]);
    if (salonResult.rows.length === 0) {
      return res.json({ success: true, data: { staff: [] } });
    }

    const result = await pool.query(
      `SELECT s.*, COALESCE(json_agg(ss.service_id) FILTER (WHERE ss.service_id IS NOT NULL), '[]') as service_ids
       FROM staff s LEFT JOIN staff_services ss ON ss.staff_id = s.id WHERE s.salon_id = $1 GROUP BY s.id ORDER BY s.created_at DESC`,
      [salonResult.rows[0].id]
    );

    res.json({ success: true, data: { staff: result.rows } });
  } catch (err) {
    console.error('GetMyStaff error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch staff' });
  }
};

exports.getSalonStaff = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM staff WHERE salon_id = $1 ORDER BY is_available DESC, name',
      [req.params.salonId]
    );
    res.json({ success: true, data: { staff: result.rows } });
  } catch (err) {
    console.error('GetSalonStaff error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch staff' });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const { name, role, phone, email, isAvailable } = req.body;
    let profileImage;

    if (req.file) {
      profileImage = `/uploads/${req.file.filename}`;
    }

    const result = await pool.query(
      `UPDATE staff SET name = COALESCE($1, name), role = COALESCE($2, role), phone = COALESCE($3, phone), email = COALESCE($4, email), is_available = COALESCE($5, is_available), profile_image = COALESCE($6, profile_image), updated_at = NOW() WHERE id = $7 AND salon_id = (SELECT id FROM salons WHERE owner_id = $8) RETURNING *`,
      [name, role, phone, email, isAvailable, profileImage, req.params.staffId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    res.json({ success: true, data: { staff: result.rows[0] } });
  } catch (err) {
    console.error('UpdateStaff error:', err);
    res.status(500).json({ success: false, message: 'Failed to update staff' });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM staff WHERE id = $1 AND salon_id = (SELECT id FROM salons WHERE owner_id = $2) RETURNING id',
      [req.params.staffId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    res.json({ success: true, message: 'Staff deleted successfully' });
  } catch (err) {
    console.error('DeleteStaff error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete staff' });
  }
};
