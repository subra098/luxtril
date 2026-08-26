const pool = require('../config/db');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder',
});

exports.createOrder = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const result = await pool.query('SELECT id, total_amount FROM bookings WHERE id = $1 AND client_id = $2', [bookingId, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = result.rows[0];
    const amountInPaise = Math.round(parseFloat(booking.total_amount) * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `booking_${booking.id}`,
    });

    await pool.query(
      'UPDATE bookings SET razorpay_order_id = $1, payment_status = $2 WHERE id = $3',
      [order.id, 'pending', bookingId]
    );

    await pool.query(
      'INSERT INTO payments (booking_id, user_id, razorpay_order_id, amount, currency, status) VALUES ($1,$2,$3,$4,$5,$6)',
      [bookingId, req.user.id, order.id, booking.total_amount, 'INR', 'created']
    );

    res.json({
      success: true,
      data: {
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt,
        },
      },
    });
  } catch (err) {
    console.error('CreateOrder error:', err);
    res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'placeholder')
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    await pool.query(
      "UPDATE bookings SET razorpay_payment_id = $1, razorpay_signature = $2, payment_status = 'paid', status = 'confirmed', updated_at = NOW() WHERE razorpay_order_id = $3",
      [razorpayPaymentId, razorpaySignature, razorpayOrderId]
    );

    await pool.query(
      "UPDATE payments SET razorpay_payment_id = $1, status = 'paid', updated_at = NOW() WHERE razorpay_order_id = $2",
      [razorpayPaymentId, razorpayOrderId]
    );

    const result = await pool.query(
      `SELECT b.* FROM bookings b WHERE b.razorpay_order_id = $1`,
      [razorpayOrderId]
    );

    res.json({
      success: true,
      data: {
        payment: {
          razorpayOrderId,
          razorpayPaymentId,
          status: 'paid',
        },
        booking: result.rows[0],
      },
    });
  } catch (err) {
    console.error('VerifyPayment error:', err);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
};

exports.handlePaymentFailure = async (req, res) => {
  try {
    const { razorpayOrderId, error } = req.body;

    await pool.query(
      "UPDATE bookings SET payment_status = 'failed', updated_at = NOW() WHERE razorpay_order_id = $1",
      [razorpayOrderId]
    );

    await pool.query(
      "UPDATE payments SET status = 'failed', error_details = $1, updated_at = NOW() WHERE razorpay_order_id = $2",
      [JSON.stringify(error), razorpayOrderId]
    );

    res.json({ success: true, message: 'Payment failure recorded' });
  } catch (err) {
    console.error('HandlePaymentFailure error:', err);
    res.status(500).json({ success: false, message: 'Failed to record payment failure' });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const limit = 20;
    const offset = (parseInt(page) - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) as total FROM payments WHERE user_id = $1', [req.user.id]);

    const result = await pool.query(
      'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.id, limit, offset]
    );

    res.json({
      success: true,
      data: {
        payments: result.rows,
        total: parseInt(countResult.rows[0].total),
      },
    });
  } catch (err) {
    console.error('GetPaymentHistory error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch payment history' });
  }
};
