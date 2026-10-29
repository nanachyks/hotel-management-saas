import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Palmtree, UtensilsCrossed, Wifi, HeartHandshake, ArrowRight, X, Calendar,
  MapPin, Phone, Mail, Clock, ConciergeBell, Waves,
} from 'lucide-react';

/* Elegant hotel-website template rendered per hotel at /stay/:slug.
   Brand it like a boutique property: serif display type, cream + ink palette,
   gold accents. All copy/imagery lives here; data comes from /api/site/:slug. */

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Jost:wght@300;400;500;600&display=swap');
  .hs-serif { font-family: 'Cormorant Garamond', Georgia, serif; }
`;

const C = {
  ink: '#1d1c1a',
  cream: '#faf8f4',
  sand: '#f1ede5',
  gold: '#b98a4f',
  goldSoft: 'rgba(185,138,79,0.35)',
  line: '#e3ddd2',
  body: '#57534e',
  white: '#ffffff',
  dark: '#171613',
};

const symbol = (cur: string) => ({ GHS: 'GH₵', USD: '$', NGN: '₦', EUR: '€', GBP: '£' }[cur] || cur);

/* Fallback photography — used when a room type has no uploaded photo */
const IMAGES = {
  hero: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=2000&q=80',
  offer: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
  rooms: [
    'https://images.unsplash.com/photo-1611892440504-42b79b692a9e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80',
  ],
};

const isoDay = (d: Date) => d.toISOString().split('T')[0];
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return isoDay(d); };

interface RoomType {
  id: string; name: string; description: string;
  base_price: number; capacity: number; photo?: string;
}
interface Hotel {
  id: string; name: string; slug: string; email: string; phone: string; address: string;
  logo_url: string; currency: string; timezone: string; check_in_time: string; check_out_time: string;
}
type Availability = Record<string, number>;

export default function PublicSite() {
  const { slug = '' } = useParams();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const [checkIn, setCheckIn] = useState(addDays(7));
  const [checkOut, setCheckOut] = useState(addDays(9));
  const [guests, setGuests] = useState(2);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState('');

  const [bookingType, setBookingType] = useState<RoomType | null>(null);
  const [guest, setGuest] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingMsg, setBookingMsg] = useState('');
  const [bookingErr, setBookingErr] = useState('');

  useEffect(() => {
    let alive = true;
    fetch(`/api/site/${slug}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(data => { if (!alive) return; setHotel(data.hotel); setRoomTypes(data.room_types || []); setLoading(false); })
      .catch(() => { if (!alive) return; setMissing(true); setLoading(false); });
    return () => { alive = false; };
  }, [slug]);

  useEffect(() => {
    if (!hotel) return;
    document.title = `${hotel.name} — Official Booking Site`;
  }, [hotel]);

  const nights = useMemo(() => Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)), [checkIn, checkOut]);

  const checkAvailability = async () => {
    setCheckMsg('');
    setChecking(true);
    try {
      const res = await fetch(`/api/site/${slug}/availability?check_in=${checkIn}&check_out=${checkOut}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not check availability');
      setAvailability(data as Availability);
      const total = (data as { room_type_id: string; available: number }[]).reduce((s, a) => s + a.available, 0);
      setCheckMsg(total > 0 ? `${total} room${total > 1 ? 's' : ''} available for your dates — pick your favourite below.` : 'No rooms left for those dates. Try different dates or call us directly.');
      document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' });
    } catch (e: any) {
      setCheckMsg(e.message);
    } finally {
      setChecking(false);
    }
  };

  const startBooking = async () => {
    if (!bookingType) return;
    setBookingBusy(true); setBookingErr(''); setBookingMsg('');
    try {
      const res = await fetch(`/api/site/${slug}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_type_id: bookingType.id,
          check_in_date: checkIn,
          check_out_date: checkOut,
          guest,
        }),
      });
      const data = await res.json();
      if (res.status === 201 && data.payment?.authorization_url) {
        setBookingMsg('Redirecting you to secure checkout…');
        window.location.href = data.payment.authorization_url;
        return;
      }
      if (res.status === 402) {
        setBookingErr('Online booking is paused for this property right now. Please contact the hotel directly by phone or WhatsApp.');
        return;
      }
      setBookingErr(data.error || 'Could not create the booking. Please try again.');
    } catch {
      setBookingErr('Network error — please check your connection and try again.');
    } finally {
      setBookingBusy(false);
    }
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.body, fontFamily: 'Jost, sans-serif' }}>Loading…</div>;
  }
  if (missing || !hotel) {
    return (
      <div style={{ minHeight: '100vh', background: C.cream, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'Jost, sans-serif', color: C.body }}>
        <div className="hs-serif" style={{ fontSize: 40, color: C.ink }}>This page does not exist</div>
        <p>This property has no booking website at this address. Check the link, or book by contacting the property directly.</p>
        <Link to="/" style={{ color: C.gold }}>← Back to HotelEase</Link>
      </div>
    );
  }

  const cur = symbol(hotel.currency || 'GHS');

  return (
    <div style={{ background: C.cream, color: C.ink, fontFamily: 'Jost, sans-serif' }}>
      <style>{FONTS}</style>

      {/* ── Header over hero ── */}
      <header style={{ position: 'relative', borderRadius: 0 }}>
        <div style={{
          backgroundImage: `linear-gradient(180deg, rgba(15,14,12,0.55) 0%, rgba(15,14,12,0.25) 45%, rgba(15,14,12,0.65) 100%), url(${IMAGES.hero})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}>
          <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 44px', color: '#fff' }}>
            <div className="hs-serif" style={{ fontSize: 24, letterSpacing: 4, fontWeight: 600, textTransform: 'uppercase' }}>
              {hotel.name}
            </div>
            <div style={{ display: 'flex', gap: 28, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', alignItems: 'center' }}>
              <a href="#rooms" style={{ color: '#fff', textDecoration: 'none' }}>Stay</a>
              <a href="#promise" style={{ color: '#fff', textDecoration: 'none' }}>Experience</a>
              <a href="#offers" style={{ color: '#fff', textDecoration: 'none'}}>Offers</a>
              <a href="#contact" style={{ color: '#fff', textDecoration: 'none' }}>Contact</a>
              <a href="#booking" style={{ border: '1px solid rgba(255,255,255,0.7)', padding: '10px 22px', color: '#fff', textDecoration: 'none', letterSpacing: 2 }}>Book Now</a>
            </div>
          </nav>

          <div style={{ color: '#fff', padding: '70px 44px 180px', maxWidth: 720 }}>
            <div style={{ fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', marginBottom: 18 }}>
              Welcome to {hotel.name}
            </div>
            <h1 className="hs-serif" style={{ fontSize: 'clamp(42px, 6vw, 68px)', fontWeight: 500, lineHeight: 1.08, margin: 0, letterSpacing: 0.5 }}>
              Elevated Stays.<br />Timeless Memories.
            </h1>
            <p style={{ marginTop: 22, fontSize: 16, fontWeight: 300, color: 'rgba(255,255,255,0.9)', maxWidth: 430, lineHeight: 1.7 }}>
              Discover {hotel.name} — where every detail is designed for rest, and Ghanaian warmth feels like coming home.
            </p>
            <a href="#rooms" style={{ display: 'inline-block', marginTop: 30, background: C.dark, color: '#fff', padding: '15px 30px', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', textDecoration: 'none' }}>
              Explore Our Rooms
            </a>
          </div>
        </div>

        {/* ── Booking bar ── */}
        <div id="booking" style={{ maxWidth: 1100, margin: '-64px auto 0', padding: '0 24px', position: 'relative' }}>
          <div style={{
            background: C.white, borderRadius: 6, display: 'flex', alignItems: 'stretch', flexWrap: 'wrap',
            boxShadow: '0 18px 45px rgba(23,22,19,0.12)', border: `1px solid ${C.line}`,
          }}>
            <label style={barField}>
              <span style={barLabel}>Check-in</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                <input type="date" value={checkIn} min={isoDay(new Date())} onChange={e => setCheckIn(e.target.value)} style={barInput} /> <Calendar size={16} color={C.gold} />
              </span>
            </label>
            <label style={{ ...barField, borderLeft: `1px solid ${C.line}`, borderRight: `1px solid ${C.line}` }}>
              <span style={barLabel}>Check-out</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                <input type="date" value={checkOut} min={checkIn} onChange={e => setCheckOut(e.target.value)} style={barInput} /> <Calendar size={16} color={C.gold} />
              </span>
            </label>
            <label style={barField}>
              <span style={barLabel}>Guests</span>
              <select value={guests} onChange={e => setGuests(Number(e.target.value))} style={{ ...barInput, appearance: 'none', cursor: 'pointer' }}>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>)}
              </select>
            </label>
            <button onClick={checkAvailability} disabled={checking} style={{
              flex: '1 1 220px', background: C.dark, color: '#fff', border: 'none', cursor: 'pointer',
              fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', padding: '0 28px',
            }}>
              {checking ? 'Checking…' : 'Check Availability'}
            </button>
          </div>
          {checkMsg && <div style={{ marginTop: 12, fontSize: 14, color: checkMsg.toLowerCase().includes('no rooms') ? '#b91c1c' : C.gold, fontWeight: 500 }}>{checkMsg}</div>}
        </div>
      </header>

      {/* ── Promise ── */}
      <section id="promise" style={{ maxWidth: 1100, margin: '0 auto', padding: '90px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ fontSize: 11, letterSpacing: 3.5, textTransform: 'uppercase', color: C.gold, fontWeight: 600 }}>Our Promise</div>
            <h2 className="hs-serif" style={{ fontSize: 40, fontWeight: 500, margin: '10px 0 14px' }}>Hospitality,<br />Redefined.</h2>
            <p style={{ color: C.body, lineHeight: 1.8, fontSize: 14 }}>
              From the moment you arrive, everything is taken care of — clean, quiet rooms,
              honest food, fast Wi-Fi, and staff who treat you like family. {hotel.name} is where
              business trips feel easy and holidays feel long.
            </p>
            <a href="#rooms" style={{ fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', color: C.gold, textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginTop: 8 }}>
              Learn More →
            </a>
          </div>
          <PromiseCard icon={Palmtree} title="Serene Grounds" text="Calm, leafy spaces with warm sea-breeze evenings." />
          <PromiseCard icon={UtensilsCrossed} title="Honest Food" text="Fresh Ghanaian breakfast, jollof nights, and room service." />
          <PromiseCard icon={Wifi} title="Work-Ready" text="Fast fibre Wi-Fi and a proper desk in every room." />
          <PromiseCard icon={HeartHandshake} title="Personal Care" text="Thoughtful service from people who genuinely care." />
        </div>
      </section>

      {/* ── Rooms & Suites ── */}
      <section id="rooms" style={{ maxWidth: 1240, margin: '0 auto', padding: '60px 24px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 30, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3.5, textTransform: 'uppercase', color: C.gold, fontWeight: 600 }}>Rooms &amp; Suites</div>
            <h2 className="hs-serif" style={{ fontSize: 40, fontWeight: 500, margin: '10px 0 0' }}>Find Your Perfect Stay</h2>
          </div>
          {availability && (
            <div style={{ fontSize: 13, color: C.body }}>
              Available for <b>{nights} night{nights > 1 ? 's' : ''}</b>, {checkIn} → {checkOut}
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 26 }}>
          {roomTypes.map((rt, i) => {
            const avail = availability?.[rt.id];
            return (
              <div key={rt.id} style={{ background: C.white, border: `1px solid ${C.line}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 28px rgba(23,22,19,0.06)' }}>
                <div style={{ position: 'relative', paddingBottom: '62%', background: C.sand }}>
                  <img src={rt.photo?.startsWith('http') ? rt.photo : IMAGES.rooms[i % IMAGES.rooms.length]}
                       alt={rt.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  {typeof avail === 'number' && (
                    <div style={{ position: 'absolute', top: 14, left: 14, background: avail > 0 ? 'rgba(23,22,19,0.85)' : 'rgba(185,28,28,0.85)', color: '#fff', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', padding: '6px 12px' }}>
                      {avail > 0 ? `${avail} available` : 'Fully booked'}
                    </div>
                  )}
                </div>
                <div style={{ padding: 22, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div className="hs-serif" style={{ fontSize: 21, fontWeight: 600, letterSpacing: 1 }}>{rt.name}</div>
                  <p style={{ color: C.body, fontSize: 14, lineHeight: 1.7, margin: '10px 0 16px', flex: 1 }}>{rt.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
                    <div>
                      <span style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: C.body }}>From</span>
                      <div style={{ fontWeight: 600 }}>{cur} {rt.base_price.toLocaleString()} <span style={{ color: C.body, fontWeight: 400, fontSize: 12 }}>/ night</span></div>
                    </div>
                    <button onClick={() => { setBookingType(rt); setBookingErr(''); }}
                            aria-label={`Book ${rt.name}`}
                            style={{ width: 44, height: 44, borderRadius: '50%', border: `1px solid ${C.goldSoft}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ArrowRight size={18} color={C.gold} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Offer banner ── */}
      <section id="offers" style={{ background: C.dark, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <div style={{ padding: '70px 44px', position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: 11, letterSpacing: 3.5, textTransform: 'uppercase', color: C.gold, fontWeight: 600, marginBottom: 12 }}>Limited Time Offer</div>
            <h2 className="hs-serif" style={{ fontSize: 42, fontWeight: 500, margin: '0 0 12px' }}>Stay Longer, Save More</h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, maxWidth: 340 }}>
              Book 3 nights or more and enjoy a special long-stay discount on every night after the first two.
            </p>
            <a href="#booking" style={{ display: 'inline-block', marginTop: 22, border: `1px solid ${C.gold}`, color: C.gold, padding: '13px 26px', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', textDecoration: 'none' }}>
              Book Now
            </a>
          </div>
          <div style={{ backgroundImage: `url(${IMAGES.offer})`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: 260 }} />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contact" style={{ background: '#141311', color: '#d6d2c8', padding: '56px 44px 30px', fontFamily: 'Jost, sans-serif' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 34 }}>
          <div>
            <div className="hs-serif" style={{ color: '#fff', fontSize: 22, letterSpacing: 3, fontWeight: 600, marginBottom: 10 }}>{hotel.name}</div>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: '#a8a297' }}>Where warm Ghanaian hospitality meets modern comfort. Powered by HotelEase.</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 6, color: C.gold }}>
              <ConciergeBell size={18} /> <Waves size={18} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: '#fff', fontWeight: 600, marginBottom: 14 }}>Contact</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 }}>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><MapPin size={15} color={C.gold} /> {hotel.address || 'Ghana'}</span>
              {hotel.phone && <a href={`tel:${hotel.phone}`} style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#d6d2c8', textDecoration: 'none' }}><Phone size={15} color={C.gold} /> {hotel.phone}</a>}
              {hotel.email && <a href={`mailto:${hotel.email}`} style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#d6d2c8', textDecoration: 'none' }}><Mail size={15} color={C.gold} /> {hotel.email}</a>}
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Clock size={15} color={C.gold} /> Check-in {hotel.check_in_time} · Check-out {hotel.check_out_time}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: '#fff', fontWeight: 600, marginBottom: 14 }}>Payments</div>
            <p style={{ fontSize: 13, lineHeight: 1.8, color: '#a8a297' }}>
              Pay securely with <b style={{ color: '#fff' }}>MTN Mobile Money</b>, Telecel Cash, AT Money or bank cards.
              Every reservation is confirmed instantly by email.
            </p>
            <div style={{ fontSize: 11, letterSpacing: 1.5, color: '#8a8578' }}>Secured by Paystack</div>
          </div>
        </div>
        <div style={{ maxWidth: 1240, margin: '36px auto 0', paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8a8578', flexWrap: 'wrap', gap: 8 }}>
          <span>© {new Date().getFullYear()} {hotel.name}. All rights reserved.</span>
          <span>Powered by <span style={{ color: C.gold }}>✦ HotelEase</span></span>
        </div>
      </footer>

      {/* ── Booking modal ── */}
      {bookingType && (
        <div onClick={() => setBookingType(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(23,22,19,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.white, maxWidth: 480, width: '100%', maxHeight: '92vh', overflow: 'auto', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 26px', borderBottom: `1px solid ${C.line}` }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: C.gold, fontWeight: 600 }}>Reserve</div>
                <div className="hs-serif" style={{ fontSize: 24, fontWeight: 600 }}>{bookingType.name}</div>
              </div>
              <button onClick={() => setBookingType(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Close"><X size={22} color={C.ink} /></button>
            </div>
            <div style={{ padding: '20px 26px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <label style={modalLabel}>Check-in<input type="date" value={checkIn} min={isoDay(new Date())} onChange={e => setCheckIn(e.target.value)} style={modalInput} /></label>
                <label style={modalLabel}>Check-out<input type="date" value={checkOut} min={checkIn} onChange={e => setCheckOut(e.target.value)} style={modalInput} /></label>
              </div>
              <div style={{ background: C.cream, border: `1px solid ${C.line}`, padding: '12px 16px', fontSize: 13.5, marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <span>{nights} night{nights > 1 ? 's' : ''} × {cur} {bookingType.base_price.toLocaleString()}</span>
                <b>Total: {cur} {(nights * bookingType.base_price).toLocaleString()}</b>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={modalLabel}>First name<input value={guest.first_name} onChange={e => setGuest({ ...guest, first_name: e.target.value })} style={modalInput} placeholder="Ama" /></label>
                <label style={modalLabel}>Last name<input value={guest.last_name} onChange={e => setGuest({ ...guest, last_name: e.target.value })} style={modalInput} placeholder="Mensah" /></label>
                <label style={modalLabel}>Email<input type="email" value={guest.email} onChange={e => setGuest({ ...guest, email: e.target.value })} style={modalInput} placeholder="you@email.com" /></label>
                <label style={modalLabel}>Phone / WhatsApp<input value={guest.phone} onChange={e => setGuest({ ...guest, phone: e.target.value })} style={modalInput} placeholder="0555 000 000" /></label>
              </div>
              {bookingMsg && <div style={{ marginTop: 14, fontSize: 13, color: C.gold, fontWeight: 500 }}>{bookingMsg}</div>}
              {bookingErr && <div style={{ marginTop: 14, fontSize: 13, color: '#b91c1c', fontWeight: 500 }}>{bookingErr}</div>}
              <button onClick={startBooking} disabled={bookingBusy || !guest.first_name || !guest.last_name || !guest.email || !guest.phone} style={{
                width: '100%', marginTop: 20, background: C.dark, color: '#fff', border: 'none', padding: '15px 20px',
                fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', cursor: bookingBusy ? 'wait' : 'pointer', opacity: bookingBusy ? 0.7 : 1,
              }}>
                {bookingBusy ? 'Preparing checkout…' : `Reserve & Pay ${cur} ${(nights * bookingType.base_price).toLocaleString()}`}
              </button>
              <div style={{ marginTop: 12, fontSize: 11.5, color: C.body, textAlign: 'center' }}>
                You will pay securely via Paystack — MTN MoMo, Telecel Cash, AT Money or card. Your room is held for 15 minutes until payment completes.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Pieces ── */
function PromiseCard({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div style={{ borderTop: `1px solid ${C.goldSoft}`, paddingTop: 18 }}>
      <span style={{ width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.goldSoft}`, color: C.gold, marginBottom: 12, background: '#fff' }}>
        <Icon size={20} />
      </span>
      <div className="hs-serif" style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
      <p style={{ color: C.body, fontSize: 13.5, lineHeight: 1.65, marginTop: 6 }}>{text}</p>
    </div>
  );
}

const barField: React.CSSProperties = {
  flex: '1 1 200px', padding: '16px 26px', display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center', cursor: 'pointer',
};
const barLabel: React.CSSProperties = {
  fontSize: 9.5, letterSpacing: 2, textTransform: 'uppercase', color: C.body, fontWeight: 600,
};
const barInput: React.CSSProperties = {
  border: 'none', outline: 'none', fontSize: 15, background: 'transparent', color: C.ink, fontFamily: 'inherit', padding: 0, width: '100%',
};
const modalLabel: React.CSSProperties = {
  fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.body, fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 6, gridColumn: 'span 2',
};
const modalInput: React.CSSProperties = {
  padding: '11px 14px', border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 15, outline: 'none', color: C.ink, background: '#fff', fontFamily: 'inherit',
};
