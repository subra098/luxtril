const pool = require('../config/db');

exports.createSalon = async (req, res) => {
  try {
    const { name, description, phone, email, latitude, longitude } = req.body;

    let address = {};
    if (req.body.address) {
      try {
        address = typeof req.body.address === 'string' ? JSON.parse(req.body.address) : req.body.address;
      } catch (e) {
        console.error('Parse address error:', e);
      }
    }
    const address_street = address.street || req.body.address_street;
    const address_city = address.city || req.body.address_city;
    const address_state = address.state || req.body.address_state;
    const address_pincode = address.pincode || req.body.address_pincode;

    let images = [];
    if (req.files && req.files.length > 0) {
      const logoFile = req.files.find(f => f.fieldname === 'logo');
      const galleryFiles = req.files.filter(f => f.fieldname === 'images' || f.fieldname === 'newImages');

      if (logoFile) {
        images.push(`/uploads/${logoFile.filename}`);
      }
      if (galleryFiles.length > 0) {
        const galleryUrls = galleryFiles.map(f => `/uploads/${f.filename}`);
        images = [...images, ...galleryUrls];
      }
    }

    const result = await pool.query(
      `INSERT INTO salons (owner_id, name, description, phone, email, address_street, address_city, address_state, address_pincode, images, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.user.id, name, description, phone, email, address_street, address_city, address_state, address_pincode, JSON.stringify(images), latitude || null, longitude || null]
    );

    const salon = result.rows[0];

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of days) {
      await pool.query(
        'INSERT INTO working_hours (salon_id, day_of_week, is_open, open_time, close_time) VALUES ($1,$2,true,$3,$4) ON CONFLICT (salon_id, day_of_week) DO NOTHING',
        [salon.id, day, '09:00', '21:00']
      );
    }

    res.status(201).json({ success: true, data: { salon } });
  } catch (err) {
    console.error('CreateSalon error:', err);
    res.status(500).json({ success: false, message: 'Failed to create salon' });
  }
};

exports.getMySalon = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, json_agg(json_build_object('day_of_week', wh.day_of_week, 'is_open', wh.is_open, 'open_time', wh.open_time, 'close_time', wh.close_time) ORDER BY wh.day_of_week) as working_hours
       FROM salons s LEFT JOIN working_hours wh ON wh.salon_id = s.id WHERE s.owner_id = $1 GROUP BY s.id`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Salon not found' });
    }

    res.json({ success: true, data: { salon: result.rows[0] } });
  } catch (err) {
    console.error('GetMySalon error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch salon' });
  }
};

exports.updateMySalon = async (req, res) => {
  try {
    const { name, description, phone, email, latitude, longitude, is_active } = req.body;

    let address = {};
    if (req.body.address) {
      try {
        address = typeof req.body.address === 'string' ? JSON.parse(req.body.address) : req.body.address;
      } catch (e) {
        console.error('Parse address error:', e);
      }
    }
    const address_street = address.street || req.body.address_street;
    const address_city = address.city || req.body.address_city;
    const address_state = address.state || req.body.address_state;
    const address_pincode = address.pincode || req.body.address_pincode;

    const existing = await pool.query('SELECT images FROM salons WHERE owner_id = $1', [req.user.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Salon not found' });
    }

    let images = [];
    if (req.body.images) {
      try {
        images = JSON.parse(req.body.images);
      } catch (e) {
        images = existing.rows[0].images || [];
      }
    } else {
      images = existing.rows[0].images || [];
    }

    if (req.files && req.files.length > 0) {
      const logoFile = req.files.find(f => f.fieldname === 'logo');
      const galleryFiles = req.files.filter(f => f.fieldname === 'images' || f.fieldname === 'newImages');

      if (logoFile) {
        const logoUrl = `/uploads/${logoFile.filename}`;
        if (images.length > 0) {
          images[0] = logoUrl;
        } else {
          images.unshift(logoUrl);
        }
      }
      if (galleryFiles.length > 0) {
        const galleryUrls = galleryFiles.map(f => `/uploads/${f.filename}`);
        images = [...images, ...galleryUrls];
      }
    }

    const result = await pool.query(
      `UPDATE salons SET name = COALESCE($1, name), description = COALESCE($2, description), phone = COALESCE($3, phone), email = COALESCE($4, email), address_street = COALESCE($5, address_street), address_city = COALESCE($6, address_city), address_state = COALESCE($7, address_state), address_pincode = COALESCE($8, address_pincode), images = $9, latitude = COALESCE($10, latitude), longitude = COALESCE($11, longitude), is_active = COALESCE($12, is_active), updated_at = NOW() WHERE owner_id = $13 RETURNING *`,
      [name, description, phone, email, address_street, address_city, address_state, address_pincode, JSON.stringify(images), latitude, longitude, is_active, req.user.id]
    );

    res.json({ success: true, data: { salon: result.rows[0] } });
  } catch (err) {
    console.error('UpdateSalon error:', err);
    res.status(500).json({ success: false, message: 'Failed to update salon' });
  }
};

exports.updateSlotConfig = async (req, res) => {
  try {
    const { duration, seatsPerSlot } = req.body;

    const result = await pool.query(
      'UPDATE salons SET slot_duration = $1, seats_per_slot = $2, updated_at = NOW() WHERE owner_id = $3 RETURNING *',
      [duration, seatsPerSlot, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Salon not found' });
    }

    res.json({ success: true, data: { salon: result.rows[0] } });
  } catch (err) {
    console.error('UpdateSlotConfig error:', err);
    res.status(500).json({ success: false, message: 'Failed to update slot config' });
  }
};

exports.getSalonById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, json_agg(json_build_object('day_of_week', wh.day_of_week, 'is_open', wh.is_open, 'open_time', wh.open_time, 'close_time', wh.close_time) ORDER BY wh.day_of_week) as working_hours
       FROM salons s LEFT JOIN working_hours wh ON wh.salon_id = s.id WHERE s.id = $1 GROUP BY s.id`,
      [req.params.salonId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Salon not found' });
    }

    res.json({ success: true, data: { salon: result.rows[0] } });
  } catch (err) {
    console.error('GetSalonById error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch salon' });
  }
};

exports.getAllSalons = async (req, res) => {
  try {
    const { isApproved, page = 1, limit = 20, city, serviceCategory, latitude, longitude } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = ['s.is_approved = true', 's.is_active = true'];

    if (isApproved !== undefined) {
      conditions[0] = `s.is_approved = ${isApproved === 'true'}`;
    }
    if (city) {
      params.push(city);
      conditions.push(`LOWER(s.address_city) LIKE LOWER('%' || $${params.length} || '%')`);
    }

    let joinServices = '';
    if (serviceCategory) {
      params.push(serviceCategory);
      joinServices = `INNER JOIN services sv ON sv.salon_id = s.id AND LOWER(sv.category) = LOWER($${params.length})`;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT s.id) as total FROM salons s ${joinServices} WHERE ${whereClause}`,
      params
    );

    let selectFields = 'DISTINCT s.*';
    let orderBy = 's.created_at DESC';

    // If coordinates are provided, compute distance and sort by it
    if (latitude && longitude) {
      params.push(parseFloat(latitude), parseFloat(longitude));
      const latIdx = params.length - 1;
      const lngIdx = params.length;
      
      selectFields = `DISTINCT s.*, (6371 * acos(cos(radians($${latIdx})) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians($${lngIdx})) + sin(radians($${latIdx})) * sin(radians(s.latitude)))) AS distance_km`;
      orderBy = 'distance_km ASC NULLS LAST';
    }

    params.push(parseInt(limit), offset);
    const limitIdx = params.length - 1;
    const offsetIdx = params.length;

    const result = await pool.query(
      `SELECT ${selectFields} FROM salons s ${joinServices} WHERE ${whereClause} ORDER BY ${orderBy} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
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
    console.error('GetAllSalons error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch salons' });
  }
};

exports.getAvailableSlots = async (req, res) => {
  try {
    const { salonId } = req.params;
    const { date } = req.query;

    const salonResult = await pool.query('SELECT slot_duration, seats_per_slot FROM salons WHERE id = $1', [salonId]);
    if (salonResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Salon not found' });
    }

    const salon = salonResult.rows[0];
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const whResult = await pool.query(
      'SELECT is_open, open_time, close_time FROM working_hours WHERE salon_id = $1 AND day_of_week = $2',
      [salonId, dayName]
    );

    if (whResult.rows.length === 0 || !whResult.rows[0].is_open) {
      return res.json({ success: true, data: { slots: [] } });
    }

    const { open_time, close_time } = whResult.rows[0];
    const duration = salon.slot_duration;

    const overrideResult = await pool.query(
      'SELECT is_available, open_time, close_time FROM slot_overrides WHERE salon_id = $1 AND date = $2',
      [salonId, date]
    );

    let slotOpen = open_time;
    let slotClose = close_time;
    if (overrideResult.rows.length > 0) {
      const ov = overrideResult.rows[0];
      if (!ov.is_available) {
        return res.json({ success: true, data: { slots: [] } });
      }
      if (ov.open_time) slotOpen = ov.open_time;
      if (ov.close_time) slotClose = ov.close_time;
    }

    const existingResult = await pool.query(
      'SELECT start_time, COUNT(*) as count FROM bookings WHERE salon_id = $1 AND booking_date = $2 AND status != $3 GROUP BY start_time',
      [salonId, date, 'cancelled']
    );

    const bookedMap = {};
    existingResult.rows.forEach(r => {
      bookedMap[r.start_time] = parseInt(r.count);
    });

    const slots = [];
    const [openH, openM] = slotOpen.split(':').map(Number);
    const [closeH, closeM] = slotClose.split(':').map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    for (let m = openMinutes; m + duration <= closeMinutes; m += duration) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      const time = `${hh}:${mm}`;
      const booked = bookedMap[time] || 0;
      const totalSeats = salon.seats_per_slot;
      slots.push({
        time,
        isAvailable: booked < totalSeats,
        availableSeats: totalSeats - booked,
        totalSeats,
      });
    }

    res.json({ success: true, data: { slots } });
  } catch (err) {
    console.error('GetAvailableSlots error:', err);
    res.status(500).json({ success: false, message: 'Failed to get available slots' });
  }
};

exports.getNearbySalons = async (req, res) => {
  try {
    const { latitude, longitude, radius = 10000 } = req.query;

    let result;
    if (latitude && longitude) {
      result = await pool.query(
        `SELECT *, (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) AS distance_km
         FROM salons WHERE is_approved = true AND is_active = true AND latitude IS NOT NULL AND longitude IS NOT NULL
         AND (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) * 1000 < $3
         ORDER BY distance_km LIMIT 50`,
        [latitude, longitude, radius]
      );
    } else {
      result = await pool.query(
        'SELECT * FROM salons WHERE is_approved = true AND is_active = true ORDER BY created_at DESC LIMIT 50'
      );
    }

    res.json({ success: true, data: { salons: result.rows } });
  } catch (err) {
    console.error('GetNearbySalons error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch nearby salons' });
  }
};

exports.searchSalons = async (req, res) => {
  try {
    const { query, city } = req.query;
    const params = [];
    const conditions = ['is_approved = true', 'is_active = true'];

    if (query) {
      params.push(`%${query}%`);
      conditions.push(`(LOWER(name) LIKE LOWER($${params.length}) OR LOWER(description) LIKE LOWER($${params.length}) OR LOWER(address_city) LIKE LOWER($${params.length}))`);
    }
    if (city) {
      params.push(city);
      conditions.push(`LOWER(address_city) = LOWER($${params.length})`);
    }

    const result = await pool.query(
      `SELECT * FROM salons WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 50`,
      params
    );

    res.json({ success: true, data: { salons: result.rows } });
  } catch (err) {
    console.error('SearchSalons error:', err);
    res.status(500).json({ success: false, message: 'Failed to search salons' });
  }
};
