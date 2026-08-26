const pool = require('../config/db');

exports.createService = async (req, res) => {
  try {
    const { name, description, category, gender, price, duration } = req.body;

    const salonResult = await pool.query('SELECT id FROM salons WHERE owner_id = $1', [req.user.id]);
    if (salonResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No salon found. Create a salon first.' });
    }

    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await pool.query(
      'INSERT INTO services (salon_id, name, description, category, gender, price, duration, image) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [salonResult.rows[0].id, name, description, category, gender || 'unisex', price, duration, image]
    );

    res.status(201).json({ success: true, data: { service: result.rows[0] } });
  } catch (err) {
    console.error('CreateService error:', err);
    res.status(500).json({ success: false, message: 'Failed to create service' });
  }
};

exports.getMyServices = async (req, res) => {
  try {
    const salonResult = await pool.query('SELECT id FROM salons WHERE owner_id = $1', [req.user.id]);
    if (salonResult.rows.length === 0) {
      return res.json({ success: true, data: { services: [] } });
    }

    const result = await pool.query('SELECT * FROM services WHERE salon_id = $1 ORDER BY created_at DESC', [salonResult.rows[0].id]);
    res.json({ success: true, data: { services: result.rows } });
  } catch (err) {
    console.error('GetMyServices error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch services' });
  }
};

exports.getSalonServices = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM services WHERE salon_id = $1 AND is_active = true ORDER BY category, name',
      [req.params.salonId]
    );
    res.json({ success: true, data: { services: result.rows } });
  } catch (err) {
    console.error('GetSalonServices error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch services' });
  }
};

exports.updateService = async (req, res) => {
  try {
    const { name, description, category, gender, price, duration, is_active } = req.body;
    let image = undefined;

    if (req.file) {
      image = `/uploads/${req.file.filename}`;
    }

    const result = await pool.query(
      `UPDATE services SET name = COALESCE($1, name), description = COALESCE($2, description), category = COALESCE($3, category), gender = COALESCE($4, gender), price = COALESCE($5, price), duration = COALESCE($6, duration), is_active = COALESCE($7, is_active), image = COALESCE($8, image), updated_at = NOW() WHERE id = $9 AND salon_id = (SELECT id FROM salons WHERE owner_id = $10) RETURNING *`,
      [name, description, category, gender, price, duration ? parseInt(duration) : null, is_active, image, req.params.serviceId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    res.json({ success: true, data: { service: result.rows[0] } });
  } catch (err) {
    console.error('UpdateService error:', err);
    res.status(500).json({ success: false, message: 'Failed to update service' });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM services WHERE id = $1 AND salon_id = (SELECT id FROM salons WHERE owner_id = $2) RETURNING id',
      [req.params.serviceId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    res.json({ success: true, message: 'Service deleted successfully' });
  } catch (err) {
    console.error('DeleteService error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete service' });
  }
};
