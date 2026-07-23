import { getDb } from '../db.js';

const db = getDb();

function daysAhead(n: number): string {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function dayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay();
}

export function getOccupancyForecast(hotelId: string, days: number = 30) {
  const totalRooms = db.queryOne('SELECT COUNT(*) as count FROM rooms WHERE hotel_id = ?', [hotelId]).count;
  if (!totalRooms) return { forecast: [], avgOccupancy: 0 };

  const ninetyDaysAgo = daysAhead(-90);
  const historical = db.queryAll(`
    SELECT check_in_date, check_out_date, status FROM bookings
    WHERE hotel_id = ? AND (check_in_date >= ? OR check_out_date >= ?)
    ORDER BY check_in_date ASC
  `, [hotelId, ninetyDaysAgo, ninetyDaysAgo]);

  const dailyOccupancy: Record<string, { occupied: number; total: number }> = {};
  const rooms = db.queryAll('SELECT id FROM rooms WHERE hotel_id = ?', [hotelId]);

  for (let i = -90; i < days; i++) {
    const date = daysAhead(i);
    dailyOccupancy[date] = { occupied: 0, total: totalRooms };
  }

  for (const b of historical) {
    const start = b.check_in_date >= ninetyDaysAgo ? b.check_in_date : ninetyDaysAgo;
    const end = b.check_out_date;
    const cursor = new Date(start);
    const endDate = new Date(end);
    while (cursor <= endDate) {
      const dateStr = cursor.toISOString().split('T')[0];
      if (dailyOccupancy[dateStr] && b.status !== 'cancelled' && b.status !== 'no_show') {
        dailyOccupancy[dateStr].occupied++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const dowAvg: Record<number, { sum: number; count: number }> = { 0: { sum: 0, count: 0 }, 1: { sum: 0, count: 0 }, 2: { sum: 0, count: 0 }, 3: { sum: 0, count: 0 }, 4: { sum: 0, count: 0 }, 5: { sum: 0, count: 0 }, 6: { sum: 0, count: 0 } };
  for (let i = -90; i < 0; i++) {
    const date = daysAhead(i);
    const day = dailyOccupancy[date];
    if (day) {
      const rate = day.total > 0 ? (day.occupied / day.total) : 0;
      dowAvg[dayOfWeek(date)].sum += rate;
      dowAvg[dayOfWeek(date)].count++;
    }
  }

  const avgByDOW: Record<number, number> = {};
  for (const [dow, v] of Object.entries(dowAvg)) {
    avgByDOW[Number(dow)] = v.count > 0 ? v.sum / v.count : 0;
  }

  let recentTrend = 0;
  const recentRates: number[] = [];
  for (let i = -30; i < 0; i++) {
    const day = dailyOccupancy[daysAhead(i)];
    if (day && day.total > 0) recentRates.push(day.occupied / day.total);
  }
  if (recentRates.length > 7) {
    const firstWeek = recentRates.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
    const lastWeek = recentRates.slice(-7).reduce((a, b) => a + b, 0) / 7;
    recentTrend = lastWeek - firstWeek;
  }

  const forecast: { date: string; dayOfWeek: string; predictedOccupancy: number; predictedRate: number }[] = [];
  for (let i = 0; i < days; i++) {
    const date = daysAhead(i);
    const dow = dayOfWeek(date);
    const baseRate = avgByDOW[dow] || 0;
    const trendBoost = (i / days) * recentTrend * 0.5;
    const predictedRate = Math.min(1, Math.max(0, baseRate + trendBoost));
    forecast.push({
      date,
      dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dow],
      predictedOccupancy: Math.round(predictedRate * totalRooms),
      predictedRate: Math.round(predictedRate * 100),
    });
  }

  const avgOccupancy = forecast.reduce((s, f) => s + f.predictedRate, 0) / forecast.length;
  return { forecast, avgOccupancy: Math.round(avgOccupancy) };
}

export function getPricingSuggestions(hotelId: string) {
  const roomTypes = db.queryAll(`
    SELECT rt.id, rt.name, rt.base_price, COUNT(r.id) as room_count,
      COALESCE(SUM(CASE WHEN b.status IN ('confirmed','checked_in','checked_out') THEN 1 ELSE 0 END), 0) as booked
    FROM room_types rt
    LEFT JOIN rooms r ON r.room_type_id = rt.id AND r.hotel_id = rt.hotel_id
    LEFT JOIN bookings b ON b.room_id = r.id AND b.hotel_id = rt.hotel_id
      AND b.check_in_date <= ? AND b.check_out_date >= ?
    WHERE rt.hotel_id = ?
    GROUP BY rt.id
  `, [daysAhead(30), daysAhead(-1), hotelId]);

  const occupancyForecast = getOccupancyForecast(hotelId, 30);
  const overallDemand = occupancyForecast.avgOccupancy;

  return roomTypes.map((rt: any) => {
    const usageRate = rt.room_count > 0 ? rt.booked / rt.room_count : 0;
    const demandFactor = (usageRate * 0.5 + (overallDemand / 100) * 0.5);
    let suggestedChange = 0;
    if (demandFactor > 0.8) suggestedChange = 25;
    else if (demandFactor > 0.6) suggestedChange = 15;
    else if (demandFactor > 0.4) suggestedChange = 5;
    else if (demandFactor > 0.2) suggestedChange = -5;
    else suggestedChange = -15;

    const suggestedPrice = Math.round(rt.base_price * (1 + suggestedChange / 100));
    return {
      roomTypeId: rt.id,
      roomTypeName: rt.name,
      basePrice: rt.base_price,
      suggestedPrice,
      suggestedChange,
      demand: Math.round(demandFactor * 100),
      reasoning: demandFactor > 0.6
        ? 'High demand — increase price to maximize revenue'
        : demandFactor < 0.3
          ? 'Low demand — reduce price to attract bookings'
          : 'Moderate demand — maintain current pricing',
    };
  });
}

export function getRevenueForecast(hotelId: string, months: number = 3) {
  const historicalRevenue = db.queryAll(`
    SELECT strftime('%Y-%m', check_out_date) as month, COALESCE(SUM(total_amount), 0) as revenue
    FROM bookings WHERE status = 'checked_out' AND hotel_id = ?
    GROUP BY month ORDER BY month ASC
  `, [hotelId]);

  if (historicalRevenue.length < 2) {
    return { forecast: [], totalProjected: 0 };
  }

  const values = historicalRevenue.map((r: any) => r.revenue);
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a: number, b: number) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;

  const forecast: { month: string; predictedRevenue: number }[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  let totalProjected = 0;
  for (let i = 1; i <= months; i++) {
    const m = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const label = `${monthNames[m.getMonth()]} ${m.getFullYear()}`;
    const projected = Math.max(0, intercept + slope * (n + i - 1));
    forecast.push({ month: label, predictedRevenue: Math.round(projected) });
    totalProjected += projected;
  }

  const lastMonthRevenue = values[n - 1] || 0;
  return { forecast, totalProjected: Math.round(totalProjected), lastMonthRevenue, trend: slope >= 0 ? 'up' : 'down' };
}

export function getSentimentAnalysis(hotelId: string) {
  const keywords: Record<string, { positive: string[]; negative: string[] }> = {
    default: {
      positive: ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'beautiful', 'clean', 'comfortable', 'friendly', 'helpful', 'quiet', 'spacious', 'nice', 'good', 'perfect', 'enjoy', 'happy', 'satisfied'],
      negative: ['bad', 'terrible', 'awful', 'horrible', 'poor', 'dirty', 'noisy', 'rude', 'uncomfortable', 'broken', 'cold', 'slow', 'worst', 'disappointed', 'unhappy', 'complaint', 'issue', 'problem', 'unclean', 'mold'],
    },
  };

  const feedbackSources: { text: string; source: string; date: string }[] = [];

  const rsRequests = db.queryAll("SELECT description, created_at FROM room_service_requests WHERE hotel_id = ?", [hotelId]);
  for (const r of rsRequests) {
    feedbackSources.push({ text: r.description, source: 'Room Service', date: r.created_at?.split('T')[0] || '' });
  }

  const maintenanceRequests = db.queryAll("SELECT description, created_at FROM maintenance_requests WHERE hotel_id = ?", [hotelId]);
  for (const m of maintenanceRequests) {
    feedbackSources.push({ text: m.description, source: 'Maintenance', date: m.created_at?.split('T')[0] || '' });
  }

  const results = feedbackSources.map(fs => {
    const lower = fs.text.toLowerCase();
    const posCount = keywords.default.positive.filter(k => lower.includes(k)).length;
    const negCount = keywords.default.negative.filter(k => lower.includes(k)).length;
    let score = 0;
    if (posCount > negCount) score = Math.min(100, 50 + (posCount - negCount) * 15);
    else if (negCount > posCount) score = Math.max(0, 50 - (negCount - posCount) * 15);
    else score = 50;

    return {
      text: fs.text.substring(0, 200),
      source: fs.source,
      date: fs.date,
      score,
      sentiment: score >= 70 ? 'positive' : score >= 40 ? 'neutral' : 'negative',
    };
  });

  const scored = results.filter(r => r.score !== 50 || r.text.length > 0);
  const positiveCount = scored.filter(r => r.sentiment === 'positive').length;
  const negativeCount = scored.filter(r => r.sentiment === 'negative').length;
  const neutralCount = scored.filter(r => r.sentiment === 'neutral').length;
  const total = scored.length || 1;

  return {
    entries: scored.slice(0, 50),
    summary: {
      positive: positiveCount,
      negative: negativeCount,
      neutral: neutralCount,
      overallScore: Math.round((positiveCount * 100 + neutralCount * 50) / total),
      totalEntries: scored.length,
    },
  };
}

export function getUpsellSuggestions(hotelId: string, bookingId?: string) {
  const services = db.queryAll('SELECT id, name, price, category FROM services WHERE hotel_id = ?', [hotelId]);
  if (!services.length) return { suggestions: [] };

  if (bookingId) {
    const booking = db.queryOne(`
      SELECT b.*, g.first_name || ' ' || g.last_name as guest_name, r.room_number, rt.name as room_type
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE b.id = ? AND b.hotel_id = ?
    `, [bookingId, hotelId]);

    if (!booking) return { suggestions: [] };

    const existingServices = db.queryAll(
      'SELECT service_id FROM booking_services WHERE booking_id = ?',
      [bookingId]
    );
    const existingIds = new Set(existingServices.map((s: any) => s.service_id));

    const available = services.filter((s: any) => !existingIds.has(s.id));
    const bookingValue = booking.total_amount || 0;

    const suggestions = available.map((s: any) => {
      let relevance = 0.5;
      const guestName = (booking.guest_name || '').toLowerCase();
      if (s.category === 'food' && booking.check_in_date && booking.check_out_date) {
        const nights = Math.max(1, Math.round((new Date(booking.check_out_date).getTime() - new Date(booking.check_in_date).getTime()) / 86400000));
        if (nights >= 3) relevance = 0.8;
      }
      if (s.category === 'transport' && bookingValue > 500) relevance = 0.7;
      if (s.category === 'spa' && booking.room_type?.toLowerCase().includes('suite')) relevance = 0.85;

      return {
        serviceId: s.id,
        serviceName: s.name,
        category: s.category,
        price: s.price,
        relevance: Math.round(relevance * 100),
        reason: relevance > 0.7 ? 'Highly recommended for this guest' : 'Available add-on service',
      };
    });

    return { suggestions: suggestions.sort((a: any, b: any) => b.relevance - a.relevance).slice(0, 5), guestName: booking.guest_name, roomNumber: booking.room_number };
  }

  return {
    suggestions: services.map((s: any) => ({
      serviceId: s.id, serviceName: s.name, category: s.category, price: s.price,
      relevance: 50, reason: 'Popular service',
    })),
  };
}

export function getAutoReply(message: string) {
  const lower = message.toLowerCase();
  const replies: { keywords: string[]; reply: string }[] = [
    { keywords: ['check-in', 'checkin', 'arrive', 'arrival', 'early'], reply: 'Standard check-in time is 2:00 PM. Early check-in may be available upon request. Would you like to request an early check-in?' },
    { keywords: ['check-out', 'checkout', 'depart', 'departure', 'late'], reply: 'Standard check-out time is 11:00 AM. Late check-out until 2:00 PM is available for an additional fee. Would you like to arrange a late check-out?' },
    { keywords: ['wifi', 'internet', 'password', 'network'], reply: 'Complimentary high-speed WiFi is available. Network: HotelEase_Guest, Password: welcome2024. For premium WiFi, please contact the front desk.' },
    { keywords: ['parking', 'car', 'garage', 'valet'], reply: 'We offer complimentary self-parking in our secure garage. Valet parking is available for a daily fee of GHS 50.' },
    { keywords: ['breakfast', 'restaurant', 'food', 'dinner', 'lunch', 'menu'], reply: 'Our restaurant is open daily: Breakfast 6:30-10:30 AM, Lunch 12:00-2:30 PM, Dinner 6:00-10:00 PM. Room service is available 24/7.' },
    { keywords: ['pool', 'gym', 'fitness', 'spa', 'facility'], reply: 'Our pool, fitness center, and spa are open daily from 6:00 AM to 10:00 PM. Spa appointments can be booked through the front desk.' },
    { keywords: ['laundry', 'washing', 'dry clean'], reply: 'Same-day laundry and dry cleaning service is available. Please place items in the laundry bag and call housekeeping for pickup before 9:00 AM.' },
    { keywords: ['cancel', 'cancellation', 'refund', 'modify'], reply: 'Cancellations made 48 hours before check-in receive a full refund. Late cancellations may be subject to a one-night charge. Please provide your booking reference for assistance.' },
    { keywords: ['reservation', 'booking', 'book', 'room'], reply: 'Our reservations team is happy to help. Please call the front desk or visit our website to book or modify a reservation.' },
    { keywords: ['airport', 'shuttle', 'transport', 'taxi'], reply: 'Airport shuttle service is available for GHS 100 per person (one-way). Please contact the front desk at least 2 hours before your arrival to arrange pickup.' },
    { keywords: ['noise', 'loud', 'party', 'quiet'], reply: 'Quiet hours are from 10:00 PM to 7:00 AM. If you are experiencing noise disturbance, please contact the front desk immediately and we will address it.' },
    { keywords: ['tv', 'television', 'channel', 'remote'], reply: 'Your room is equipped with a smart TV with streaming channels. If you need assistance with the remote or channel guide, please contact the front desk.' },
    { keywords: ['ac', 'air conditioner', 'air conditioning', 'heater', 'temperature', 'cold', 'hot'], reply: 'Each room has individual climate control. If your room temperature is not comfortable, please adjust the thermostat or contact maintenance for assistance.' },
    { keywords: ['invoice', 'receipt', 'bill', 'payment', 'pay'], reply: 'Your invoice is available at the front desk or through the app. We accept cash, credit/debit cards, and mobile money (M-Pesa, MTN MoMo).' },
    { keywords: ['safe', 'security', 'locker'], reply: 'An in-room safe is provided for your valuables. For larger items, our front desk offers secure storage. Please ensure your room door is locked at all times.' },
    { keywords: ['pet', 'dog', 'cat', 'animal'], reply: 'We welcome well-behaved pets in select rooms. A non-refundable pet fee of GHS 200 per stay applies. Please inform us in advance if you are bringing a pet.' },
  ];

  for (const r of replies) {
    if (r.keywords.some(k => lower.includes(k))) {
      return { reply: r.reply, matchedKeywords: [...r.keywords] };
    }
  }

  return { reply: 'Thank you for your message. Our front desk team will respond shortly. For urgent matters, please call +233 XXX XXX XXX.', matchedKeywords: [] };
}
