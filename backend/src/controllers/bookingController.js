const pool = require('../config/db');

exports.createBooking = async (req, res) => {
  try {
    const { salonId, serviceIds, bookingDate, startTime, staffId } = req.body;

    const salonResult = await pool.query('SELECT id, slot_duration, seats_per_slot FROM salons WHERE id = $1 AND is_active = true', [salonId]);
    if (salonResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Salon not found' });
    }
    const salon = salonResult.rows[0];

    const servicesResult = await pool.query('SELECT id, name, price, duration FROM services WHERE id = ANY($1::uuid[]) AND is_active = true', [serviceIds]);
    if (servicesResult.rows.length !== serviceIds.length) {
      return res.status(400).json({ success: false, message: 'One or more services not found' });
    }

    const services = servicesResult.rows;
    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
    const totalAmount = services.reduce((sum, s) => sum + parseFloat(s.price), 0);

    let endH, endM;
    let actualStartTime = startTime;
    let actualEndTime;

    if (startTime.includes('-')) {
      const parts = startTime.split('-');
      actualStartTime = parts[0];
      actualEndTime = parts[1];
      
      const sParts = actualStartTime.split(':').map(Number);
      const eParts = actualEndTime.split(':').map(Number);
      endH = eParts[0]; endM = eParts[1];
    } else {
      const [startH, startM] = startTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = startMinutes + totalDuration;
      endH = Math.floor(endMinutes / 60);
      endM = endMinutes % 60;
    }
    
    const endTime = actualEndTime || `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const bookingResult = await pool.query(
      `INSERT INTO bookings (salon_id, client_id, staff_id, booking_date, start_time, end_time, total_amount, total_duration, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING *`,
      [salonId, req.user.id, staffId || null, bookingDate, actualStartTime, endTime, totalAmount, totalDuration]
    );

    const booking = bookingResult.rows[0];

    for (const service of services) {
      await pool.query(
        'INSERT INTO booking_services (booking_id, service_id, service_name, price, duration) VALUES ($1,$2,$3,$4,$5)',
        [booking.id, service.id, service.name, service.price, service.duration]
      );
    }

    const fullBooking = await pool.query(
      `SELECT b.*,
        json_build_object('id', s.id, 'name', s.name, 'phone', s.phone, 'address_street', s.address_street, 'address_city', s.address_city) as salon,
        json_build_object('id', u.id, 'name', u.name, 'phone', u.phone) as client,
        (SELECT json_agg(json_build_object('service_id', bs.service_id, 'service_name', bs.service_name, 'price', bs.price, 'duration', bs.duration)) FROM booking_services bs WHERE bs.booking_id = b.id) as services
       FROM bookings b
       JOIN salons s ON s.id = b.salon_id
       JOIN users u ON u.id = b.client_id
       WHERE b.id = $1`,
      [booking.id]
    );

    res.status(201).json({ success: true, data: { booking: fullBooking.rows[0] } });
  } catch (err) {
    console.error('CreateBooking error:', err);
    res.status(500).json({ success: false, message: 'Failed to create booking' });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const { status, page = 1 } = req.query;
    const limit = 20;
    const offset = (parseInt(page) - 1) * limit;
    const params = [req.user.id];
    let statusFilter = '';

    if (status) {
      params.push(status);
      statusFilter = ` AND b.status = $${params.length}`;
    }

    const countResult = await pool.query(`SELECT COUNT(*) as total FROM bookings b WHERE b.client_id = $1${statusFilter}`, params);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT b.*,
        json_build_object('id', s.id, 'name', s.name, 'phone', s.phone, 'address_street', s.address_street, 'address_city', s.address_city) as salon,
        json_build_object('id', u.id, 'name', u.name, 'phone', u.phone) as client,
        (SELECT json_agg(json_build_object('service_id', bs.service_id, 'service_name', bs.service_name, 'price', bs.price, 'duration', bs.duration)) FROM booking_services bs WHERE bs.booking_id = b.id) as services
       FROM bookings b
       JOIN salons s ON s.id = b.salon_id
       JOIN users u ON u.id = b.client_id
       WHERE b.client_id = $1${statusFilter}
       ORDER BY b.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      success: true,
      data: {
        bookings: result.rows,
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
      },
    });
  } catch (err) {
    console.error('GetMyBookings error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
};

exports.getSalonBookings = async (req, res) => {
  try {
    const { status, date, page = 1 } = req.query;
    const limit = 20;
    const offset = (parseInt(page) - 1) * limit;
    const params = [req.user.id];
    let statusFilter = '';
    let dateFilter = '';

    if (status) {
      params.push(status);
      statusFilter = ` AND b.status = $${params.length}`;
    }
    if (date) {
      params.push(date);
      dateFilter = ` AND b.booking_date = $${params.length}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM bookings b JOIN salons s ON s.id = b.salon_id WHERE s.owner_id = $1${statusFilter}${dateFilter}`,
      params
    );

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT b.*,
        json_build_object('id', s.id, 'name', s.name) as salon,
        json_build_object('id', u.id, 'name', u.name, 'phone', u.phone) as client,
        (SELECT json_agg(json_build_object('service_id', bs.service_id, 'service_name', bs.service_name, 'price', bs.price, 'duration', bs.duration)) FROM booking_services bs WHERE bs.booking_id = b.id) as services
       FROM bookings b
       JOIN salons s ON s.id = b.salon_id
       JOIN users u ON u.id = b.client_id
       WHERE s.owner_id = $1${statusFilter}${dateFilter}
       ORDER BY b.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      success: true,
      data: {
        bookings: result.rows,
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
      },
    });
  } catch (err) {
    console.error('GetSalonBookings error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch salon bookings' });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*,
        json_build_object('id', s.id, 'name', s.name, 'phone', s.phone, 'address_street', s.address_street, 'address_city', s.address_city, 'latitude', s.latitude, 'longitude', s.longitude) as salon,
        json_build_object('id', u.id, 'name', u.name, 'phone', u.phone) as client,
        (SELECT json_agg(json_build_object('service_id', bs.service_id, 'service_name', bs.service_name, 'price', bs.price, 'duration', bs.duration)) FROM booking_services bs WHERE bs.booking_id = b.id) as services,
        CASE WHEN st.id IS NOT NULL THEN json_build_object('id', st.id, 'name', st.name, 'role', st.role) ELSE NULL END as staff,
        (SELECT id FROM reviews WHERE booking_id = b.id) as review_id
       FROM bookings b
       JOIN salons s ON s.id = b.salon_id
       JOIN users u ON u.id = b.client_id
       LEFT JOIN staff st ON st.id = b.staff_id
       WHERE b.id = $1`,
      [req.params.bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, data: { booking: result.rows[0] } });
  } catch (err) {
    console.error('GetBookingById error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch booking' });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const result = await pool.query(
      `UPDATE bookings b SET status = $1, updated_at = NOW() FROM salons s WHERE b.salon_id = s.id AND b.id = $2 AND s.owner_id = $3 RETURNING b.*`,
      [status, req.params.bookingId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found or unauthorized' });
    }

    res.json({ success: true, data: { booking: result.rows[0] } });
  } catch (err) {
    console.error('UpdateBookingStatus error:', err);
    res.status(500).json({ success: false, message: 'Failed to update booking status' });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const { cancellationReason } = req.body;

    const result = await pool.query(
      "UPDATE bookings SET status = 'cancelled', cancellation_reason = $1, updated_at = NOW() WHERE id = $2 AND client_id = $3 RETURNING *",
      [cancellationReason, req.params.bookingId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, data: { booking: result.rows[0] } });
  } catch (err) {
    console.error('CancelBooking error:', err);
    res.status(500).json({ success: false, message: 'Failed to cancel booking' });
  }
};

exports.getAvailableTimeSlots = async (req, res) => {
  try {
    const { salonId, date } = req.query;

    if (!salonId || !date) {
      return res.status(400).json({ success: false, message: 'salonId and date are required' });
    }

    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // 1. Get working hours and manual_slots
    const whResult = await pool.query(
      'SELECT is_open, manual_slots FROM working_hours WHERE salon_id = $1 AND day_of_week = $2',
      [salonId, dayName]
    );

    if (whResult.rows.length === 0 || !whResult.rows[0].is_open) {
      return res.json({ success: true, data: { isOpen: false, slots: [] } });
    }

    const manualSlots = whResult.rows[0].manual_slots || [];

    // 2. Count total staff for this salon
    const staffResult = await pool.query(
      'SELECT COUNT(*) as total_staff FROM staff WHERE salon_id = $1 AND is_available = true',
      [salonId]
    );
    const totalStaff = parseInt(staffResult.rows[0].total_staff || 0);

    // 3. Count bookings for each manual slot
    const existingResult = await pool.query(
      "SELECT start_time FROM bookings WHERE salon_id = $1 AND booking_date = $2 AND status NOT IN ('cancelled')",
      [salonId, date]
    );
    
    const bookedMap = {};
    existingResult.rows.forEach(r => {
      const timeStr = r.start_time.substring(0, 5);
      bookedMap[timeStr] = (bookedMap[timeStr] || 0) + 1;
    });

    const slots = manualSlots.map(time => {
      const timeStr = time.substring(0, 5); // Start time for checking booked counts
      const bookedCount = bookedMap[timeStr] || 0;
      return {
        time: time, // Send the full string (e.g. "09:00-10:00")
        isAvailable: bookedCount < totalStaff,
        availableSeats: Math.max(0, totalStaff - bookedCount),
        totalSeats: totalStaff
      };
    }).sort((a, b) => a.time.localeCompare(b.time));

    res.json({ success: true, data: { isOpen: true, slots } });
  } catch (err) {
    console.error('GetAvailableTimeSlots error:', err);
    res.status(500).json({ success: false, message: 'Failed to get available slots' });
  }
};

exports.getSalonAvailableSlots = async (req, res) => {
  const { salonId, date } = req.query;
  req.params.salonId = salonId;
  req.query.date = date;
  return exports.getAvailableTimeSlots(req, res);
};
