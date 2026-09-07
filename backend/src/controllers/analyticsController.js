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

    const todayUTC = new Date().toISOString().split('T')[0];

    const summaryResult = await pool.query(
      `SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue, 
        COUNT(*) as total_bookings,
        COALESCE(SUM(total_amount) FILTER (WHERE booking_date = $${params.length + 1}), 0) as today_revenue
       FROM bookings b WHERE b.salon_id = $1 AND b.status IN ('completed', 'confirmed', 'accepted')${dateFilter}`,
      [...params, todayUTC]
    );

    const dailyResult = await pool.query(
      `SELECT b.booking_date as date, COALESCE(SUM(b.total_amount), 0) as revenue, COUNT(*) as bookings
       FROM bookings b WHERE b.salon_id = $1 AND b.status IN ('completed', 'confirmed', 'accepted')${dateFilter ? ` AND b.booking_date >= $2 AND b.booking_date <= $3` : ` AND b.booking_date >= NOW() - INTERVAL '30 days'`}
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
          todayEarnings: parseFloat(summaryResult.rows[0]?.today_revenue || 0),
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

    const todayUTC = new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE EXTRACT(MONTH FROM booking_date) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM booking_date) = EXTRACT(YEAR FROM NOW())) as monthly,
        COALESCE(SUM(total_amount) FILTER (WHERE booking_date = $2 AND status IN ('completed', 'confirmed', 'accepted')), 0) as today_revenue,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
       FROM bookings WHERE salon_id = $1`,
      [salonId, todayUTC]
    );

    const stats = result.rows[0];
    res.json({
      success: true,
      data: {
        total: parseInt(stats.total),
        monthly: parseInt(stats.monthly),
        today: parseFloat(stats.today_revenue),
        completed: parseInt(stats.completed),
        pending: parseInt(stats.pending),
      },
    });
  } catch (err) {
    console.error('GetBookingStats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch booking stats' });
  }
};

exports.getReportData = async (req, res) => {
  try {
    const salonResult = await pool.query('SELECT id, name FROM salons WHERE owner_id = $1', [req.user.id]);
    const salon = salonResult.rows[0];

    if (!salon) {
      return res.status(404).json({ success: false, message: 'No salon found' });
    }

    // Revenue
    const todayUTC = new Date().toISOString().split('T')[0];
    const revenueQuery = await pool.query(
      `SELECT 
        COALESCE(SUM(total_amount) FILTER (WHERE booking_date = $2 AND status IN ('completed', 'confirmed', 'accepted')), 0) as revenue_today,
        COALESCE(SUM(total_amount) FILTER (WHERE status IN ('completed', 'confirmed', 'accepted')), 0) as revenue_total
       FROM bookings WHERE salon_id = $1`,
      [salon.id, todayUTC]
    );
    const revenue = revenueQuery.rows[0];

    // Bookings Status Counts
    const bookingsStatsQuery = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'accepted' OR status = 'confirmed') as accepted,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
       FROM bookings WHERE salon_id = $1`,
      [salon.id]
    );
    const bookingsStats = bookingsStatsQuery.rows[0];

    // Visitors List
    const visitorsQuery = await pool.query(
      `SELECT DISTINCT u.id, u.name, u.email, u.phone, COUNT(b.id) as visit_count
       FROM bookings b
       JOIN users u ON b.client_id = u.id
       WHERE b.salon_id = $1
       GROUP BY u.id, u.name, u.email, u.phone
       ORDER BY visit_count DESC`,
      [salon.id]
    );
    const visitorsList = visitorsQuery.rows;

    // Detailed Bookings List
    const bookingsListQuery = await pool.query(
      `SELECT b.id, b.booking_date, b.start_time, b.status, b.total_amount, 
              u.name as client_name, s.name as staff_name
       FROM bookings b
       JOIN users u ON b.client_id = u.id
       LEFT JOIN staff s ON b.staff_id = s.id
       WHERE b.salon_id = $1
       ORDER BY b.booking_date DESC, b.start_time DESC`,
      [salon.id]
    );
    const bookingsList = bookingsListQuery.rows;

    res.json({
      success: true,
      data: {
        salonName: salon.name,
        revenue: {
          today: parseFloat(revenue.revenue_today),
          total: parseFloat(revenue.revenue_total)
        },
        stats: {
          total: parseInt(bookingsStats.total),
          pending: parseInt(bookingsStats.pending),
          accepted: parseInt(bookingsStats.accepted),
          completed: parseInt(bookingsStats.completed),
          cancelled: parseInt(bookingsStats.cancelled)
        },
        visitors: visitorsList,
        bookings: bookingsList
      }
    });

  } catch (err) {
    console.error('GetReportData error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch report data' });
  }
};

exports.exportPdf = async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-disposition', 'attachment; filename="Luxtril_Full_Report.pdf"');
    res.setHeader('Content-type', 'application/pdf');

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const result = Buffer.concat(chunks);
      res.setHeader('Content-Length', result.length);
      res.send(result);
    });

    const salonResult = await pool.query('SELECT id, name FROM salons WHERE owner_id = $1', [req.user.id]);
    const salon = salonResult.rows[0] || { name: 'My Salon', id: null };

    if (!salon.id) {
       doc.text('No salon data found.');
       doc.end();
       return;
    }

    // Fetch same data as report data
    const todayUTC = new Date().toISOString().split('T')[0];
    const revenueQuery = await pool.query(
      `SELECT 
        COALESCE(SUM(total_amount) FILTER (WHERE booking_date = $2 AND status IN ('completed', 'confirmed', 'accepted')), 0) as revenue_today,
        COALESCE(SUM(total_amount) FILTER (WHERE status IN ('completed', 'confirmed', 'accepted')), 0) as revenue_total
       FROM bookings WHERE salon_id = $1`, [salon.id, todayUTC]
    );
    const revenue = revenueQuery.rows[0];

    const bookingsStatsQuery = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'accepted' OR status = 'confirmed') as accepted,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
       FROM bookings WHERE salon_id = $1`, [salon.id]
    );
    const stats = bookingsStatsQuery.rows[0];

    const visitorsQuery = await pool.query(
      `SELECT DISTINCT u.name, u.email, u.phone, COUNT(b.id) as visit_count
       FROM bookings b JOIN users u ON b.client_id = u.id
       WHERE b.salon_id = $1 GROUP BY u.id, u.name, u.email, u.phone ORDER BY visit_count DESC`, [salon.id]
    );
    const visitors = visitorsQuery.rows;

    const bookingsListQuery = await pool.query(
      `SELECT b.booking_date, b.start_time, b.status, b.total_amount, 
              u.name as client_name, COALESCE(s.name, 'Unassigned') as staff_name
       FROM bookings b
       JOIN users u ON b.client_id = u.id
       LEFT JOIN staff s ON b.staff_id = s.id
       WHERE b.salon_id = $1 ORDER BY b.booking_date DESC, b.start_time DESC`, [salon.id]
    );
    const bookings = bookingsListQuery.rows;

    const today = new Date().toISOString().split('T')[0];

    // Cover / Header
    doc.fontSize(28).fillColor('#D4AF37').text('Luxtril Comprehensive Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).fillColor('#333333').text(`Salon: ${salon.name}`, { align: 'center' });
    doc.fontSize(12).fillColor('#666666').text(`Generated Date: ${today}`, { align: 'center' });
    doc.moveDown(2);

    // Revenue Section
    doc.fontSize(18).fillColor('#000000').text('Revenue Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor('#333333').text(`Revenue Today: Rs. ${revenue.revenue_today}`);
    doc.text(`Total Revenue Till Now: Rs. ${revenue.revenue_total}`);
    doc.moveDown(1.5);

    // Booking Stats
    doc.fontSize(18).fillColor('#000000').text('Booking Statistics', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#333333').text(`Total Bookings: ${stats.total}`);
    doc.text(`Completed: ${stats.completed}`);
    doc.text(`Accepted: ${stats.accepted}`);
    doc.text(`Pending: ${stats.pending}`);
    doc.text(`Cancelled: ${stats.cancelled}`);
    doc.moveDown(1.5);

    // Visitors List
    doc.addPage();
    doc.fontSize(18).fillColor('#000000').text('Total Visitors List', { underline: true });
    doc.moveDown(0.5);
    if (visitors.length > 0) {
      visitors.forEach((v, i) => {
        doc.fontSize(11).fillColor('#444444').text(`${i+1}. ${v.name} - ${v.phone} - ${v.email} (Visits: ${v.visit_count})`);
        doc.moveDown(0.2);
      });
    } else {
      doc.fontSize(12).fillColor('#666666').text('No visitors found.');
    }
    doc.moveDown(1.5);

    // Detailed Bookings List
    doc.addPage();
    doc.fontSize(18).fillColor('#000000').text('Detailed Bookings List', { underline: true });
    doc.moveDown(0.5);
    
    if (bookings.length > 0) {
      bookings.forEach((b, i) => {
        // Date format
        const bDate = b.booking_date instanceof Date ? b.booking_date.toISOString().split('T')[0] : b.booking_date;
        doc.fontSize(11).fillColor('#333333').text(
          `${i+1}. Date: ${bDate} | Time: ${b.start_time} | Client: ${b.client_name}`
        );
        doc.fontSize(10).fillColor('#666666').text(
          `   Status: ${b.status.toUpperCase()} | Staff: ${b.staff_name} | Amount: Rs. ${b.total_amount}`
        );
        doc.moveDown(0.4);
      });
    } else {
      doc.fontSize(12).fillColor('#666666').text('No bookings found.');
    }

    doc.moveDown(3);
    doc.fontSize(10).fillColor('#999999').text('Generated by Luxtril Management System', { align: 'center' });

    doc.end();

  } catch (err) {
    console.error('PDF Export error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate PDF', error: err.message, stack: err.stack });
    }
  }
};
