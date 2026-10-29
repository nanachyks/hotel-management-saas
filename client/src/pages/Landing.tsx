import { Link } from 'react-router-dom';
import {
  BedDouble, CalendarCheck, Wallet, BarChart3, ShieldCheck, Globe,
  MessageCircle, Check, ArrowRight, Hotel, Building2, Home, CreditCard,
  Sparkles, UtensilsCrossed, Wrench, UserCheck, LogIn,
} from 'lucide-react';

/* ============================================================
   EDIT ME — these constants drive everything customer-facing.
   Update them before the site goes live.
   ============================================================ */
const WHATSAPP_NUMBER = '233501234567'; // international format, no '+'
const WHATSAPP_MESSAGE = "Hello! I'd like a free demo of HotelEase for my hotel.";
const SUPPORT_EMAIL = 'hello@hotelease.com';

const DEMO_USERNAME = 'demo.admin';
const DEMO_PASSWORD = 'demo123';

const PRICING = [
  {
    name: 'Guesthouse',
    price: 'GH₵250',
    tagline: 'Up to 15 rooms',
    features: ['Front desk & bookings', 'Housekeeping tracker', 'Own website', 'WhatsApp support'],
  },
  {
    name: 'Hotel',
    price: 'GH₵500',
    tagline: 'Up to 50 rooms',
    popular: true,
    features: ['Everything in Guesthouse', 'Mobile money & card payments', 'Payroll & staff management', 'Full reports & exports', 'Priority WhatsApp support'],
  },
  {
    name: 'Group',
    price: 'GH₵1,500',
    tagline: 'Multiple properties',
    features: ['Everything in Hotel', 'Multi-property dashboard', 'Corporate & franchise clients', 'White-label branding', 'Dedicated account manager'],
  },
];
/* ============================================================ */

const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

/* Glassmorphism skin that matches the dashboard: deep gradient backdrop,
   floating color glows, frosted cards, and bold Space Grotesk display type. */
const C = {
  bg0: '#0b0d17',   // page base
  bg1: '#10142b',   // gradient partner
  text: '#eef0fa',
  soft: 'rgba(238,240,250,0.68)',
  dim: 'rgba(238,240,250,0.45)',
  primary: '#67e8f9',   // cyan accent
  violet: '#a78bfa',
  green: '#34d399',
};

const heroImg = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2000&q=80';

const page = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap');
  html, body { margin: 0; padding: 0; background: ${C.bg0}; }
  .lg-display { font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.03em; }
  details summary::-webkit-details-marker { display: none; }
  .lg-hidden-sm { display: none !important; }
  @media (min-width: 820px) {
    .lg-hidden-sm { display: flex !important; }
  }
`;

/* Frosted glass card */
const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.055)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 20,
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
};

const eyebrow = (color = C.primary): React.CSSProperties => ({
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: 12, letterSpacing: 4, textTransform: 'uppercase',
  color, fontWeight: 600,
});

const h2: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: 'clamp(30px, 4.4vw, 44px)', fontWeight: 700, letterSpacing: '-0.03em',
  lineHeight: 1.12, color: C.text, margin: '12px 0 0',
};

const iconWrap: React.CSSProperties = {
  width: 46, height: 46, borderRadius: 14, display: 'flex',
  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  background: 'linear-gradient(135deg, rgba(103,232,249,0.16), rgba(167,139,250,0.16))',
  border: '1px solid rgba(255,255,255,0.14)',
  color: C.primary,
};
const features = [
  { icon: BedDouble, title: 'Rooms & Rates', text: 'Manage every room, rate and special offer from one clean dashboard.' },
  { icon: CalendarCheck, title: 'Front Desk & Bookings', text: 'Check guests in and out in seconds. Walk-ins, online bookings and channel reservations in one calendar.' },
  { icon: Wallet, title: 'Get Paid Instantly', text: 'Accept MTN Mobile Money, Telecel Cash, AT Money and card payments through Paystack.' },
  { icon: Globe, title: 'Your Own Website', text: 'We give every property a beautiful booking website that takes reservations 24/7 — no developer needed.' },
  { icon: Sparkles, title: 'Housekeeping & Maintenance', text: 'Your cleaning crew and maintenance staff update room status from their phones in real time.' },
  { icon: UtensilsCrossed, title: 'Restaurant & Extras', text: 'Charges for your restaurant, bar, laundry and other services can be billed straight to the guest room.' },
  { icon: BarChart3, title: 'Reports & Money', text: 'Know your best-selling rooms, busiest months and actual profit. Invoices, expenses and payroll included.' },
  { icon: ShieldCheck, title: 'Role-based Security', text: 'Owner, manager, receptionist, accountant, housekeeper — everyone sees exactly what they need. Nothing more.' },
];

const propertyTypes = [
  { icon: Hotel, label: 'Hotels' },
  { icon: Home, label: 'Guesthouses' },
  { icon: Building2, label: 'Lodges' },
  { icon: BedDouble, label: 'Hostels' },
  { icon: UserCheck, label: 'Boutique hotels' },
  { icon: Wrench, label: 'Serviced apartments' },
];

const howItWorks = [
  { step: '1', title: 'Book your free demo', text: 'Chat with us on WhatsApp. We will walk you through the live demo in 15 minutes — in plain language, on your own screen.' },
  { step: '2', title: 'We set you up', text: 'You send us your rooms, rates and guest list. Our team enters everything for you — you start clean, with zero typing.' },
  { step: '3', title: 'Go live in 24 hours', text: 'Your staff get trained on the same call. Your booking website is up. You run your property with full visibility from day one.' },
];

const faqs = [
  { q: 'Does it work with mobile money?', a: 'Yes. Guests and front desk can pay with MTN Mobile Money, Telecel Cash, AT Money, or cards — all processed securely through Paystack. Payments land in your account, and records update automatically.' },
  { q: 'My staff are not techy. Can they use it?', a: 'That is exactly who we built it for. Every screen is simple and we train your staff live. Most teams are comfortable within one day — and keep reception/housekeeping permissions limited so mistakes cannot spread.' },
  { q: 'What does the package include?', a: 'The full management system (bookings, housekeeping, restaurant/POS, payroll, reports), your own public booking website, staff accounts with roles, setup of your data, and WhatsApp support.' },
  { q: 'How do I pay for the subscription?', a: 'Monthly or yearly in cedis — card or mobile money, your choice. There is no contract lock-in and no setup fee.' },
];

const checkIcon = (color = C.green) => <Check size={16} color={color} style={{ flexShrink: 0 }} />;

export default function Landing() {
  const authed = !!localStorage.getItem('token');
  const demoCreds = window.location.origin + `/login?demo=1`;

  return (
    <div style={{ background: C.bg0, color: C.text, fontFamily: "'Manrope', sans-serif", minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{page}</style>

      {/* Ambient color glows (fixed, behind everything) */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-220px', left: '50%', transform: 'translateX(-50%)', width: 900, height: 600, borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(103,232,249,0.18), transparent)' }} />
        <div style={{ position: 'absolute', top: '34%', left: '-260px', width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(167,139,250,0.14), transparent)' }} />
        <div style={{ position: 'absolute', top: '58%', right: '-280px', width: 760, height: 760, borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(52,211,153,0.12), transparent)' }} />
        <div style={{ position: 'absolute', bottom: '-320px', left: '22%', width: 820, height: 620, borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(103,232,249,0.10), transparent)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>

      {/* ---------- Nav ---------- */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px', background: 'rgba(11,13,23,0.65)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div className="lg-display" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 19, letterSpacing: '-0.02em' }}>
          <Hotel size={22} color={C.primary} /> HotelEase
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <a href="#features" className="lg-hidden-sm" style={{ color: C.soft, textDecoration: 'none', fontSize: 13.5, fontWeight: 600 }}>Features</a>
          <a href="#pricing" className="lg-hidden-sm" style={{ color: C.soft, textDecoration: 'none', fontSize: 13.5, fontWeight: 600 }}>Pricing</a>
          {authed
            ? <Link to="/dashboard" style={{ ...ghostBtn }}>Open Dashboard</Link>
            : <Link to="/login" style={{ ...ghostBtn, display: 'flex', alignItems: 'center', gap: 6 }}><LogIn size={14} /> Sign in</Link>}
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" style={{ ...primaryBtn, display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px' }}>
            <MessageCircle size={14} /> WhatsApp Us
          </a>
        </div>
      </nav>

      {/* ---------- Hero ---------- */}
      <header style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(180deg, rgba(11,13,23,0.78) 0%, rgba(11,13,23,0.85) 55%, ${C.bg0} 100%), url(${heroImg})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
        <div style={{ position: 'relative', maxWidth: 940, margin: '0 auto', padding: '96px 24px 130px', textAlign: 'center' }}>
          <div style={{
            ...glassCard, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 999,
            fontSize: 13, fontWeight: 600, color: C.primary,
          }}>
            <Sparkles size={14} /> Built for hotels & guesthouses in Ghana
          </div>
          <h1 className="lg-display" style={{ fontSize: 'clamp(38px, 6.6vw, 66px)', fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.06, margin: '26px 0 0', color: '#fff' }}>
            Run your entire hotel
            <span style={{ background: `linear-gradient(90deg, ${C.primary}, ${C.violet} 60%, ${C.green})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {' '}from one dashboard.
            </span>
          </h1>
          <p style={{ color: C.soft, fontSize: 17, lineHeight: 1.7, maxWidth: 620, margin: '22px auto 0', fontWeight: 500 }}>
            Take bookings, check guests in, track housekeeping, bill the restaurant to the room and see your real numbers every morning.
            Your front desk, your owner and your housekeeping crew all stay in sync — automatically.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginTop: 34 }}>
            <a href={demoCreds} style={{ ...primaryBtn, display: 'flex', alignItems: 'center', gap: 8, padding: '14px 28px', fontSize: 15 }}>
              <ArrowRight size={17} /> Try the Live Demo
            </a>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" style={{ ...ghostBtn, display: 'flex', alignItems: 'center', gap: 8, padding: '13px 24px' }}>
              <MessageCircle size={16} /> Book a free demo call
            </a>
          </div>
        </div>

        {/* Demo credentials card */}
        <div style={{ maxWidth: 560, margin: '-58px auto 0', padding: '0 24px', position: 'relative' }}>
          <div style={{ ...glassCard, padding: '22px 26px', textAlign: 'left', boxShadow: '0 24px 60px rgba(0,0,0,0.45)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ ...iconWrap, width: 40, height: 40 }}><BedDouble size={18} /></div>
              <div>
                <div className="lg-display" style={{ fontWeight: 600, fontSize: 15.5, letterSpacing: '-0.01em' }}>No sign-up needed — explore the live demo</div>
                <div style={{ color: C.dim, fontSize: 13 }}>A realistic hotel with bookings, invoices and reports. Resets nightly.</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <code style={{ ...credChip }}>Username <b style={{ color: C.text }}>{DEMO_USERNAME}</b></code>
              <code style={{ ...credChip }}>Password <b style={{ color: C.text }}>{DEMO_PASSWORD}</b></code>
              <a href={demoCreds} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: C.primary, textDecoration: 'none' }}>
                <LogIn size={14} /> Open demo
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- Property types ---------- */}
      <section style={{ maxWidth: 940, margin: '0 auto', padding: '52px 24px 72px', display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        {propertyTypes.map(p => (
          <div key={p.label} style={{
            ...glassCard, display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 999,
            fontSize: 14, fontWeight: 600, color: C.text,
          }}>
            <p.icon size={16} color={C.primary} /> {p.label}
          </div>
        ))}
      </section>

      {/* ---------- Features ---------- */}
      <section id="features" style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px 88px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={eyebrow()}>The System</div>
          <h2 style={h2}>Everything you need.<br />Nothing you don't.</h2>
          <p style={{ textAlign: 'center', color: C.dim, margin: '16px auto 0', fontSize: 15.5, maxWidth: 480 }}>
            One system for your front desk, your housekeepers, your books — and your guests.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))', gap: 16 }}>
          {features.map(f => (
            <div key={f.title} style={{ ...glassCard, padding: 24, textAlign: 'left' }}>
              <div style={iconWrap}><f.icon size={20} /></div>
              <div className="lg-display" style={{ fontWeight: 600, margin: '16px 0 6px', fontSize: 17, letterSpacing: '-0.01em' }}>{f.title}</div>
              <div style={{ color: C.dim, fontSize: 13.5, lineHeight: 1.65 }}>{f.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Payments trust ---------- */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px 88px' }}>
        <div style={{ ...glassCard, padding: '42px 40px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 32 }}>
          <div style={{ flex: '1 1 360px' }}>
            <div style={eyebrow(C.green)}>Payments</div>
            <h3 className="lg-display" style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, letterSpacing: '-0.03em', margin: '10px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <CreditCard size={24} color={C.green} /> Get paid the Ghanaian way
            </h3>
            <p style={{ color: C.soft, lineHeight: 1.7, margin: '14px 0 0', fontSize: 14.5 }}>
              Payments are processed by <b style={{ color: C.text }}>Paystack</b> — the same provider trusted by
              thousands of African businesses. Money moves straight to your own account. No chasing, no "we'll pay later", no math errors.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {['MTN Mobile Money', 'Telecel Cash', 'AT Money', 'Visa & Mastercard'].map(m => (
              <span key={m} style={{ ...glassCard, padding: '11px 18px', borderRadius: 12, fontSize: 13.5, fontWeight: 600, color: C.text }}>{m}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Pricing ---------- */}
      <section id="pricing" style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px 96px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={eyebrow(C.violet)}>Plans</div>
          <h2 style={h2}>Simple pricing, in cedis</h2>
          <p style={{ textAlign: 'center', color: C.dim, margin: '16px auto 0', fontSize: 15.5, maxWidth: 480 }}>
            No setup fee. No lock-in. Pay monthly or yearly (2 months free on yearly plans).
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 20, alignItems: 'stretch' }}>
          {PRICING.map(t => (
            <div key={t.name} style={{
              padding: 30, position: 'relative', textAlign: 'left', display: 'flex', flexDirection: 'column',
              ...(t.popular
                ? { ...glassCard, border: '1px solid transparent',
                    background: 'linear-gradient(rgba(17,21,44,0.92), rgba(17,21,44,0.92)) padding-box, linear-gradient(135deg, rgba(103,232,249,0.7), rgba(167,139,250,0.7)) border-box',
                    boxShadow: `0 24px 70px rgba(103,232,249,0.14), 0 24px 70px rgba(167,139,250,0.10)` }
                : glassCard),
            }}>
              {t.popular && (
                <span style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                  background: `linear-gradient(90deg, ${C.primary}, ${C.violet})`, color: '#0b0d17', fontSize: 11, fontWeight: 800,
                  letterSpacing: 1.5, padding: '6px 16px', borderRadius: 999, fontFamily: "'Space Grotesk', sans-serif" }}>
                  MOST POPULAR
                </span>
              )}
              <div className="lg-display" style={{ fontWeight: 700, fontSize: 19, letterSpacing: '-0.01em' }}>{t.name}</div>
              <div style={{ color: C.dim, fontSize: 13, marginBottom: 16 }}>{t.tagline}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                <span className="lg-display" style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.03em', color: t.popular ? '#fff' : C.text }}>{t.price}</span>
                <span style={{ color: C.dim, fontSize: 14 }}>/ month</span>
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '20px 0' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
                {t.features.map(feat => (
                  <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: C.soft, fontWeight: 500 }}>{t.popular ? checkIcon(C.primary) : checkIcon()} {feat}</div>
                ))}
              </div>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 26,
                ...(t.popular ? primaryBtn : { ...ghostBtn, display: 'flex' }),
              }}>
                Start with {t.name} <ArrowRight size={15} />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px 96px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={eyebrow(C.green)}>How It Works</div>
          <h2 style={h2}>You sign up. We do the heavy lifting.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {howItWorks.map(s => (
            <div key={s.step} style={{ ...glassCard, padding: 28 }}>
              <div className="lg-display" style={{
                width: 46, height: 46, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 19, color: '#0b0d17',
                background: `linear-gradient(135deg, ${C.primary}, ${C.green})`,
              }}>{s.step}</div>
              <div className="lg-display" style={{ fontWeight: 600, fontSize: 18, margin: '18px 0 8px', letterSpacing: '-0.01em' }}>{s.title}</div>
              <div style={{ color: C.dim, fontSize: 13.5, lineHeight: 1.65 }}>{s.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px 96px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={eyebrow(C.violet)}>FAQ</div>
          <h2 style={h2}>Questions owners ask us</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {faqs.map(f => (
            <details key={f.q} style={{ ...glassCard, padding: '18px 24px' }}>
              <summary className="lg-display" style={{ fontWeight: 600, cursor: 'pointer', fontSize: 16, listStyle: 'none', letterSpacing: '-0.01em' }}>{f.q}</summary>
              <p style={{ color: C.dim, fontSize: 14, lineHeight: 1.7, margin: '12px 0 0' }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px 96px' }}>
        <div style={{
          ...glassCard, padding: '64px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          {/* inner glow accents */}
          <div style={{ position: 'absolute', top: '-140px', left: '50%', transform: 'translateX(-70%)', width: 480, height: 380, borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(103,232,249,0.20), transparent)' }} />
          <div style={{ position: 'absolute', bottom: '-160px', right: '6%', width: 420, height: 380, borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(167,139,250,0.20), transparent)' }} />
          <div style={{ position: 'relative' }}>
            <div style={eyebrow(C.green)}>Get Started</div>
            <h2 style={h2}>See it working before<br />you pay a pesewa</h2>
            <p style={{ color: C.dim, maxWidth: 520, margin: '18px auto 32px', lineHeight: 1.7, fontSize: 15 }}>
              Explore the live demo on your own, or let us walk you through it on WhatsApp in 15 minutes — your choice.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href={demoCreds} style={{ ...primaryBtn, display: 'flex', alignItems: 'center', gap: 8 }}><ArrowRight size={17} /> Try the Live Demo</a>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" style={{ ...ghostBtn, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageCircle size={16} /> Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '40px 24px 30px', textAlign: 'center', color: C.dim, fontSize: 13.5 }}>
        <div className="lg-display" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, fontSize: 17, color: C.text, marginBottom: 14, letterSpacing: '-0.01em' }}>
          <Hotel size={19} color={C.primary} /> HotelEase
        </div>
        <div style={{ display: 'flex', gap: 22, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" style={{ color: C.soft, textDecoration: 'none' }}>WhatsApp: +{WHATSAPP_NUMBER}</a>
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: C.soft, textDecoration: 'none' }}>{SUPPORT_EMAIL}</a>
        </div>
        <div style={{ fontSize: 12.5 }}>
          © {new Date().getFullYear()} HotelEase · Payments secured by Paystack · Made for Ghana 🇬🇭
        </div>
      </footer>

      {/* ---------- Floating WhatsApp ---------- */}
      <a href={whatsappLink} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" style={{
        position: 'fixed', right: 20, bottom: 20, zIndex: 100, width: 56, height: 56, borderRadius: '50%',
        background: '#25d366', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 6px 20px rgba(37, 211, 102, 0.45)',
      }}>
        <MessageCircle size={26} />
      </a>

      </div>
    </div>
  );
}

/* ---------- shared button styles ---------- */
const primaryBtn: React.CSSProperties = {
  padding: '12px 22px', borderRadius: 14, border: 'none', color: '#0b0d17',
  fontWeight: 700, fontSize: 14, cursor: 'pointer', textDecoration: 'none',
  background: `linear-gradient(90deg, ${C.primary}, ${C.violet})`,
  boxShadow: '0 8px 30px rgba(103,232,249,0.35)',
  fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.01em',
};
const ghostBtn: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(255,255,255,0.06)', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', textDecoration: 'none', color: C.text,
  backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
};
const credChip: React.CSSProperties = {
  padding: '9px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  fontSize: 13, color: C.dim, fontStretch: 'normal' as const,
};
