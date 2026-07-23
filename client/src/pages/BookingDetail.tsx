import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, colors, glass, card, select, input } from '../styles';

interface BookingDetail {
  id: string; guest_name: string; guest_email: string; guest_phone: string;
  room_number: string; room_type_name: string; room_id: string; guest_id: string;
  check_in_date: string; check_out_date: string; status: string; source: string; total_amount: number;
  services: BookingService[]; invoice: Invoice | null;
}

interface BookingService {
  id: string; service_id: string; service_name: string; category: string;
  quantity: number; price: number;
}

interface Invoice {
  id: string; amount: number; paid_amount: number; status: string; due_date: string;
}

interface ServiceOption {
  id: string; name: string; price: number; category: string;
}

type ModalMode = 'services' | 'checkout' | null;

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalMode>(null);
  const [allServices, setAllServices] = useState<ServiceOption[]>([]);
  const [selectedService, setSelectedService] = useState('');
  const [serviceQty, setServiceQty] = useState(1);

  const load = () => {
    if (!id) return;
    setLoading(true);
    api.get<BookingDetail>(`/bookings/${id}`)
      .then(setBooking)
      .catch(() => navigate('/bookings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const openServices = () => {
    api.get<ServiceOption[]>('/services').then(setAllServices);
    setSelectedService(''); setServiceQty(1); setModal('services');
  };

  const addService = async () => {
    if (!selectedService || !id) return;
    try {
      await api.post(`/bookings/${id}/services`, { service_id: selectedService, quantity: serviceQty });
      toast('Service added', 'success'); setModal(null); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const removeService = async (svcId: string) => {
    if (!id || !confirm('Remove this service?')) return;
    try {
      await api.del(`/bookings/${id}/services/${svcId}`);
      toast('Service removed', 'success'); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const updateStatus = async (newStatus: string) => {
    if (!id) return;
    try {
      await api.put(`/bookings/${id}`, { status: newStatus });
      toast(newStatus === 'checked_in' ? 'Guest checked in' : newStatus === 'checked_out' ? 'Guest checked out' : newStatus === 'cancelled' ? 'Booking cancelled' : 'Status updated', 'success');
      if (newStatus === 'checked_out') setModal(null);
      load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  if (loading) return <div style={{ color: colors.slate }}>Loading...</div>;
  if (!booking) return <div style={{ color: colors.danger }}>Booking not found</div>;

  const nights = Math.max(1, Math.ceil(
    (new Date(booking.check_out_date).getTime() - new Date(booking.check_in_date).getTime()) / (1000 * 60 * 60 * 24)
  ));
  const roomRate = booking.total_amount > 0 && booking.services?.length > 0
    ? booking.total_amount - booking.services.reduce((s, sv) => s + sv.price, 0)
    : 0;
  const servicesTotal = booking.services?.reduce((s, sv) => s + sv.price, 0) || 0;
  const invoice = booking.invoice;
  const balance = invoice ? invoice.amount - invoice.paid_amount : booking.total_amount;

  const actionBtn = (color: string): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: 8, border: 'none', color: '#fff',
    fontWeight: 600, fontSize: 15, cursor: 'pointer',
    background: `linear-gradient(135deg, ${color}, ${color}dd)`,
    boxShadow: `0 4px 15px ${color}40`,
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button onClick={() => navigate('/bookings')} style={{
          padding: '6px 14px', borderRadius: 8, border: `1px solid ${colors.border}`,
          background: colors.input, fontSize: 14, cursor: 'pointer', color: colors.dark,
          transition: 'all 0.15s ease',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = colors.inputFocus; }}
          onMouseLeave={e => { e.currentTarget.style.background = colors.input; }}
        >&larr; Back</button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.dark, letterSpacing: '-0.5px' }}>Booking Details</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={card}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: colors.dark, paddingBottom: 8, borderBottom: `1px solid ${colors.border}`, letterSpacing: '-0.3px' }}>Booking Info</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <InfoRow label="Guest" value={booking.guest_name} />
            <InfoRow label="Email" value={booking.guest_email} />
            <InfoRow label="Phone" value={booking.guest_phone} />
            <InfoRow label="Room" value={`#${booking.room_number} - ${booking.room_type_name}`} />
            <InfoRow label="Check-in" value={booking.check_in_date} />
            <InfoRow label="Check-out" value={booking.check_out_date} />
            <InfoRow label="Nights" value={String(nights)} />
            <InfoRow label="Status" value={<StatusBadge status={booking.status} />} />
            <InfoRow label="Source" value={({ walk_in: 'Walk-in', online: 'Online', phone: 'Phone', corporate: 'Corporate', group: 'Group' })[booking.source] || booking.source} />
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {booking.status === 'pending' && (
              <button onClick={() => updateStatus('confirmed')} style={actionBtn('#3b82f6')}>Confirm Booking</button>
            )}
            {booking.status === 'confirmed' && (
              <button onClick={() => updateStatus('checked_in')} style={actionBtn('#22c55e')}>Check In</button>
            )}
            {booking.status === 'checked_in' && (
              <button onClick={() => setModal('checkout')} style={actionBtn('#f59e0b')}>Check Out</button>
            )}
            {(booking.status === 'pending' || booking.status === 'confirmed') && (
              <button onClick={() => { if (confirm('Cancel this booking?')) updateStatus('cancelled'); }} style={actionBtn('#ef4444')}>Cancel Booking</button>
            )}
            {(booking.status === 'confirmed') && (
              <button onClick={() => { if (confirm('Mark as no show?')) updateStatus('no_show'); }} style={actionBtn('#f97316')}>No Show</button>
            )}
            {(booking.status === 'confirmed' || booking.status === 'checked_in') && (
              <button onClick={openServices} style={actionBtn('#3b82f6')}>Manage Services</button>
            )}
          </div>
        </div>

        <div style={card}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: colors.dark, paddingBottom: 8, borderBottom: `1px solid ${colors.border}`, letterSpacing: '-0.3px' }}>Services ({booking.services?.length || 0})</h2>
          {(!booking.services || booking.services.length === 0) ? (
            <p style={{ color: colors.slate, fontSize: 14 }}>No services added yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <th style={thS}>Service</th>
                  <th style={thS}>Qty</th>
                  <th style={thS}>Price</th>
                  {(booking.status === 'confirmed' || booking.status === 'checked_in') && <th style={thS}></th>}
                </tr>
              </thead>
              <tbody>
                {booking.services.map(sv => (
                  <tr key={sv.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                    <td style={tdS}>{sv.service_name}</td>
                    <td style={tdS}>{sv.quantity}</td>
                    <td style={tdS}>{formatCurrency(sv.price)}</td>
                    {(booking.status === 'confirmed' || booking.status === 'checked_in') && (
                      <td style={tdS}>
                        <button onClick={() => removeService(sv.id)} style={{ ...smallBtn, color: colors.danger }}>Remove</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {booking.status === 'checked_in' && (
            <button onClick={openServices} style={{ ...smallBtn, marginTop: 16 }}>+ Add Service</button>
          )}
        </div>
      </div>

      <div style={{ ...card, marginTop: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: colors.dark, paddingBottom: 8, borderBottom: `1px solid ${colors.border}`, letterSpacing: '-0.3px' }}>Invoice Summary</h2>
        {invoice ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={summaryRow}><span style={{ color: colors.slate }}>Room Charges ({nights} nights)</span><span>{formatCurrency(roomRate)}</span></div>
              <div style={summaryRow}><span style={{ color: colors.slate }}>Services</span><span>{formatCurrency(servicesTotal)}</span></div>
              <div style={{ ...summaryRow, borderTop: `2px solid ${colors.border}`, paddingTop: 8, fontWeight: 600 }}><span>Total Amount</span><span>{formatCurrency(invoice.amount)}</span></div>
            </div>
            <div>
              <div style={summaryRow}><span style={{ color: colors.slate }}>Paid</span><span style={{ color: colors.success }}>{formatCurrency(invoice.paid_amount)}</span></div>
              <div style={summaryRow}><span style={{ color: colors.slate }}>Balance Due</span><span style={{ color: balance > 0 ? colors.danger : colors.success, fontWeight: 600 }}>{formatCurrency(balance)}</span></div>
              <div style={summaryRow}>
                <span style={{ color: colors.slate }}>Status</span>
                <StatusBadge status={invoice.status} />
              </div>
              <div style={summaryRow}><span style={{ color: colors.slate }}>Due Date</span><span>{invoice.due_date}</span></div>
            </div>
          </div>
        ) : (
          <p style={{ color: colors.slate, fontSize: 14 }}>No invoice generated.</p>
        )}
      </div>

      {modal === 'services' && (
        <div style={overlay}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: colors.dark }}>Add Service</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <select value={selectedService} onChange={e => setSelectedService(e.target.value)} style={{ ...select, width: '100%' }}>
                <option value="">Select a service...</option>
                {allServices.map(s => <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.price)}</option>)}
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: colors.slate }}>Quantity:</span>
                <input type="number" min={1} value={serviceQty} onChange={e => setServiceQty(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ ...input, width: 80 }} />
              </div>
            </div>
            <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
              <button onClick={addService} disabled={!selectedService} style={{ ...btnStyle, opacity: selectedService ? 1 : 0.5 }}>Add</button>
              <button onClick={() => setModal(null)} style={{ ...btnStyle, background: colors.slate }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'checkout' && (
        <div style={overlay}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: colors.dark }}>Check-out Summary</h2>
            <div style={{ ...glass, padding: 20, marginBottom: 20 }}>
              <div style={summaryRow}><span style={{ color: colors.slate }}>Room Charges ({nights} nights)</span><span>{formatCurrency(roomRate)}</span></div>
              <div style={summaryRow}><span style={{ color: colors.slate }}>Services</span><span>{formatCurrency(servicesTotal)}</span></div>
              <div style={{ ...summaryRow, borderTop: `2px solid ${colors.border}`, paddingTop: 8, fontWeight: 700, fontSize: 16 }}>
                <span>Total</span><span>{formatCurrency(roomRate + servicesTotal)}</span>
              </div>
            </div>
            <p style={{ fontSize: 14, color: colors.slate, marginBottom: 16 }}>
              This will mark the booking as checked out, set the room to available, and mark the invoice as paid.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => updateStatus('checked_out')} style={{ ...btnStyle, background: colors.success }}>Confirm Check-out</button>
              <button onClick={() => setModal(null)} style={{ ...btnStyle, background: colors.slate }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 13, color: colors.slate, marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 14, color: colors.dark, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

const summaryRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 };
const thS: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: colors.slate };
const tdS: React.CSSProperties = { padding: '10px 14px', fontSize: 15, color: colors.dark };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 };
const modalStyle: React.CSSProperties = { ...card, padding: 28, width: 440, maxWidth: '90vw' };
const btnStyle: React.CSSProperties = { padding: '10px 24px', borderRadius: 8, border: 'none', background: colors.primary, color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer' };
const smallBtn: React.CSSProperties = { padding: '8px 14px', borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.input, fontSize: 14, cursor: 'pointer', color: colors.dark };
