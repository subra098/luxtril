const pool = require('../config/db');

exports.createReview = async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    const bookingResult = await pool.query(
      'SELECT id, salon_id FROM bookings WHERE id = $1 AND client_id = $2 AND status = $3',
      [bookingId, req.user.id, 'completed']
    );
    if (bookingResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Can only review completed bookings' });
    }

    const existing = await pool.query('SELECT id FROM reviews WHERE booking_id = $1', [bookingId]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Booking already reviewed' });
    }

    const result = await pool.query(
      'INSERT INTO reviews (booking_id, user_id, salon_id, rating, comment) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [bookingId, req.user.id, bookingResult.rows[0].salon_id, rating, comment]
    );

    await pool.query(
      `UPDATE salons SET
        rating_average = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE salon_id = $1),
        rating_count = (SELECT COUNT(*) FROM reviews WHERE salon_id = $1)
       WHERE id = $1`,
      [bookingResult.rows[0].salon_id]
    );

    res.status(201).json({ success: true, data: { review: result.rows[0] } });
  } catch (err) {
    console.error('CreateReview error:', err);
    res.status(500).json({ success: false, message: 'Failed to create review' });
  }
};

exports.getSalonReviews = async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const limit = 20;
    const offset = (parseInt(page) - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) as total FROM reviews WHERE salon_id = $1', [req.params.salonId]);

    const result = await pool.query(
      `SELECT r.*, json_build_object('id', u.id, 'name', u.name, 'profile_image', u.profile_image) as user
       FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.salon_id = $1 ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`,
      [req.params.salonId, limit, offset]
    );

    res.json({
      success: true,
      data: {
        reviews: result.rows,
        total: parseInt(countResult.rows[0].total),
      },
    });
  } catch (err) {
    console.error('GetSalonReviews error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
};

exports.getMyReviews = async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const limit = 20;
    const offset = (parseInt(page) - 1) * limit;

    const result = await pool.query(
      'SELECT * FROM reviews WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.id, limit, offset]
    );

    res.json({ success: true, data: { reviews: result.rows } });
  } catch (err) {
    console.error('GetMyReviews error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
};

exports.respondToReview = async (req, res) => {
  try {
    const { responseText } = req.body;

    const result = await pool.query(
      `UPDATE reviews SET response_text = $1, responded_at = NOW() FROM bookings b JOIN salons s ON s.id = b.salon_id WHERE reviews.id = $2 AND s.owner_id = $3 RETURNING reviews.*`,
      [responseText, req.params.reviewId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.json({ success: true, data: { review: result.rows[0] } });
  } catch (err) {
    console.error('RespondToReview error:', err);
    res.status(500).json({ success: false, message: 'Failed to respond to review' });
  }
};
