const pool = require('../config/db');

exports.getDashboard = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role IN ('customer', 'salon_owner')) as total_users,
        (SELECT COUNT(*) FROM salons) as total_salons,
        (SELECT COUNT(*) FROM bookings) as total_bookings,
        (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE status = 'completed') as total_revenue,
        (SELECT COUNT(*) FROM salons WHERE is_approved = false) as pending_approvals
    `);

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('GetDashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (role) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(LOWER(name) LIKE LOWER($${params.length}) OR LOWER(email) LIKE LOWER($${params.length}))`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);

    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT id, name, email, phone, role, profile_image, is_active, created_at FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      success: true,
      data: {
        users: result.rows,
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('GetUsers error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const result = await pool.query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role, is_active',
      [isActive, req.params.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: { user: result.rows[0] } });
  } catch (err) {
    console.error('UpdateUserStatus error:', err);
    res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
};

exports.getAdminSalons = async (req, res) => {
  try {
    const { page = 1, limit = 20, isApproved, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (isApproved !== undefined) {
      params.push(isApproved === 'true');
      conditions.push(`s.is_approved = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(LOWER(s.name) LIKE LOWER($${params.length}) OR LOWER(s.address_city) LIKE LOWER($${params.length}))`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(`SELECT COUNT(*) as total FROM salons s ${whereClause}`, params);

    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT s.*, json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'phone', u.phone) as owner FROM salons s LEFT JOIN users u ON u.id = s.owner_id ${whereClause} ORDER BY s.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      success: true,
      data: {
        salons: result.rows,
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('GetAdminSalons error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch salons' });
  }
};

exports.approveSalon = async (req, res) => {
  try {
    const { isApproved } = req.body;
    const result = await pool.query(
      'UPDATE salons SET is_approved = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [isApproved, req.params.salonId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Salon not found' });
    }

    res.json({ success: true, data: { salon: result.rows[0] } });
  } catch (err) {
    console.error('ApproveSalon error:', err);
    res.status(500).json({ success: false, message: 'Failed to approve salon' });
  }
};

exports.updateSalonStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const result = await pool.query(
      'UPDATE salons SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [isActive, req.params.salonId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Salon not found' });
    }

    res.json({ success: true, data: { salon: result.rows[0] } });
  } catch (err) {
    console.error('UpdateSalonStatus error:', err);
    res.status(500).json({ success: false, message: 'Failed to update salon status' });
  }
};

exports.getAdminBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, salonId } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (status) {
      params.push(status);
      conditions.push(`b.status = $${params.length}`);
    }
    if (salonId) {
      params.push(salonId);
      conditions.push(`b.salon_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(`SELECT COUNT(*) as total FROM bookings b ${whereClause}`, params);

    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT b.*,
        json_build_object('id', s.id, 'name', s.name) as salon,
        json_build_object('id', u.id, 'name', u.name, 'phone', u.phone) as client
       FROM bookings b
       JOIN salons s ON s.id = b.salon_id
       JOIN users u ON u.id = b.client_id
       ${whereClause}
       ORDER BY b.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      success: true,
      data: {
        bookings: result.rows,
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('GetAdminBookings error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
};

exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const params = [];
    let dateFilter = '';

    if (startDate && endDate) {
      params.push(startDate, endDate);
      dateFilter = ' WHERE b.booking_date >= $1 AND b.booking_date <= $2 AND b.status = $3';
    } else {
      params.push('completed');
      dateFilter = " WHERE b.status = $1";
    }

    if (!startDate) {
      params.push('completed');
      dateFilter = " WHERE b.status = $1";
    }

    const summaryResult = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total_revenue, COUNT(*) as total_bookings FROM bookings b${dateFilter}`,
      params
    );

    const dailyResult = params.length <= 2
      ? await pool.query(
          `SELECT b.booking_date as date, COALESCE(SUM(b.total_amount), 0) as revenue, COUNT(*) as bookings
           FROM bookings b WHERE b.status = 'completed' AND b.booking_date >= NOW() - INTERVAL '30 days'
           GROUP BY b.booking_date ORDER BY b.booking_date`
        )
      : await pool.query(
          `SELECT b.booking_date as date, COALESCE(SUM(b.total_amount), 0) as revenue, COUNT(*) as bookings
           FROM bookings b WHERE b.booking_date >= $1 AND b.booking_date <= $2 AND b.status = $3
           GROUP BY b.booking_date ORDER BY b.booking_date`,
          [...params]
        );

    // If we had a different params length for the second query
    const summary = summaryResult.rows[0];
    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: parseFloat(summary?.total_revenue || 0),
          totalBookings: parseInt(summary?.total_bookings || 0),
        },
        daily: dailyResult.rows.map(r => ({
          date: r.date,
          revenue: parseFloat(r.revenue),
          bookings: parseInt(r.bookings),
        })),
      },
    });
  } catch (err) {
    console.error('GetRevenueAnalytics error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch revenue analytics' });
  }
};
