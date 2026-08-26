const pool = require('../config/db');

exports.getEarnings = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const salonResult = await pool.query('SELECT id FROM salons WHERE owner_id = $1', [req.user.id]);
    if (salonResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No salon found' });
    }

    const salonId = salonResult.rows[0].id;
    const params = [salonId];
    let dateFilter = '';

    if (startDate && endDate) {
      params.push(startDate, endDate);
      dateFilter = ' AND b.booking_date >= $2 AND b.booking_date <= $3';
    }

    const summaryResult = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total_revenue, COUNT(*) as total_bookings
       FROM bookings b WHERE b.salon_id = $1 AND b.status = 'completed'${dateFilter}`,
      params
    );

    const dailyResult = await pool.query(
      `SELECT b.booking_date as date, COALESCE(SUM(b.total_amount), 0) as revenue, COUNT(*) as bookings
       FROM bookings b WHERE b.salon_id = $1 AND b.status = 'completed'${dateFilter ? ` AND b.booking_date >= $2 AND b.booking_date <= $3` : ` AND b.booking_date >= NOW() - INTERVAL '30 days'`}
       GROUP BY b.booking_date ORDER BY b.booking_date`,
      params
    );

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: parseFloat(summaryResult.rows[0]?.total_revenue || 0),
          totalBookings: parseInt(summaryResult.rows[0]?.total_bookings || 0),
          totalEarnings: parseFloat(summaryResult.rows[0]?.total_revenue || 0),
        },
        daily: dailyResult.rows.map(r => ({
          date: r.date,
          revenue: parseFloat(r.revenue),
          bookings: parseInt(r.bookings),
        })),
      },
    });
  } catch (err) {
    console.error('GetEarnings error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch earnings' });
  }
};

exports.getBookingStats = async (req, res) => {
  try {
    const salonResult = await pool.query('SELECT id FROM salons WHERE owner_id = $1', [req.user.id]);
    if (salonResult.rows.length === 0) {
      return res.json({ success: true, data: { total: 0, monthly: 0, today: 0, completed: 0, pending: 0 } });
    }

    const salonId = salonResult.rows[0].id;

    const result = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE EXTRACT(MONTH FROM booking_date) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM booking_date) = EXTRACT(YEAR FROM NOW())) as monthly,
        COUNT(*) FILTER (WHERE booking_date = CURRENT_DATE) as today,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
       FROM bookings WHERE salon_id = $1`,
      [salonId]
    );

    const stats = result.rows[0];
    res.json({
      success: true,
      data: {
        total: parseInt(stats.total),
        monthly: parseInt(stats.monthly),
        today: parseInt(stats.today),
        completed: parseInt(stats.completed),
        pending: parseInt(stats.pending),
      },
    });
  } catch (err) {
    console.error('GetBookingStats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch booking stats' });
  }
};
