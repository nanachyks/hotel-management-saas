import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { colors, card, pageTitle } from '../styles';
import { Check, Crown, Loader2 } from 'lucide-react';

interface Plan {
  id: string; name: string; slug: string; description: string;
  price_monthly: number; price_yearly: number;
  max_rooms: number; max_users: number;
  features: string; highlighted: number; sort_order: number;
}

interface Subscription {
  id: string; hotel_id: string; plan_id: string; status: string;
  billing_interval: string;
  trial_ends_at: string | null; current_period_ends_at: string;
  plan_name: string; plan_slug: string; plan_description: string;
  price_monthly: number; price_yearly: number;
  max_rooms: number; max_users: number;
  features: string; highlighted: number;
  usage: { room_count: number; user_count: number };
}

export default function Subscriptions() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [yearly, setYearly] = useState(false);
  const [paystackConfigured, setPaystackConfigured] = useState(false);

  const load = async () => {
    try {
      const [plansRes, subRes, configRes] = await Promise.all([
        api.get<{ data: Plan[] }>('/subscriptions/plans'),
        api.get<{ data: Subscription | null }>('/subscriptions'),
        api.get<{ paystackConfigured: boolean }>('/subscriptions/config'),
      ]);
      setPlans(plansRes.data);
      setSubscription(subRes.data);
      setPaystackConfigured(configRes.paystackConfigured);
      if (subRes.data?.billing_interval === 'yearly') setYearly(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubscribe = async (planId: string, isFree: boolean) => {
    setSubscribing(planId);
    try {
      if (isFree) {
        await api.post('/subscriptions', { plan_id: planId, billing_interval: 'monthly' });
        await load();
      } else {
        const res = await api.post<{ authorization_url: string }>('/subscriptions/initialize-payment', {
          plan_id: planId,
          billing_interval: yearly ? 'yearly' : 'monthly',
        });
        window.location.href = res.authorization_url;
      }
    } catch (err: any) {
      alert(err.message || 'Something went wrong');
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;
    try {
      await api.post('/subscriptions/cancel', {});
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: colors.primary }} />
      </div>
    );
  }

  const currentPlanId = subscription?.plan_id;
  const isCancelled = subscription?.status === 'cancelled';
  const isTrial = subscription?.status === 'trial';
  const usage = subscription?.usage;

  return (
    <div>
      <h1 style={pageTitle}>Subscription Plans</h1>
      <p style={{ color: colors.slate, marginBottom: 8, fontSize: 16 }}>
        Choose the plan that fits your property. Upgrade or downgrade at any time.
      </p>

      {!paystackConfigured && (
        <div style={{ ...card, marginBottom: 28, background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)' }}>
          <p style={{ color: colors.warning, margin: 0, fontSize: 15 }}>
            Payment gateway not configured. Add <strong>PAYSTACK_SECRET_KEY</strong> and <strong>PAYSTACK_PUBLIC_KEY</strong> to server/.env to enable paid plan subscriptions.
          </p>
        </div>
      )}

      {subscription && (
        <div style={{ ...card, marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, color: colors.slate, marginBottom: 4 }}>Current Plan</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: colors.dark, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Crown size={20} color={colors.warning} />
              {subscription.plan_name}
              {subscription.billing_interval === 'yearly' && <span style={{ fontSize: 12, color: colors.primary, fontWeight: 600 }}>(Yearly)</span>}
              {isTrial && <span style={{ fontSize: 12, color: colors.warning, fontWeight: 600 }}>(Trial ends {subscription.trial_ends_at})</span>}
              {isCancelled && <span style={{ fontSize: 12, color: colors.danger, fontWeight: 600 }}>(Cancelled)</span>}
            </div>
          </div>
          {usage && (
            <div style={{ display: 'flex', gap: 24, fontSize: 14 }}>
              <div><span style={{ color: colors.slate }}>Rooms:</span> <span style={{ color: colors.dark, fontWeight: 600 }}>{usage.room_count}/{subscription.max_rooms === 9999 ? '∞' : subscription.max_rooms}</span></div>
              <div><span style={{ color: colors.slate }}>Users:</span> <span style={{ color: colors.dark, fontWeight: 600 }}>{usage.user_count}/{subscription.max_users === 9999 ? '∞' : subscription.max_users}</span></div>
            </div>
          )}
        </div>
      )}

      {isCancelled && (
        <div style={{ ...card, marginBottom: 28, background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }}>
          <p style={{ color: colors.danger, margin: 0, fontSize: 15 }}>
            Your subscription has been cancelled. You can still access your data. Choose a plan below to reactivate.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', background: colors.input, borderRadius: 10, padding: 4 }}>
          <button onClick={() => setYearly(false)} style={{
            padding: '8px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
            background: !yearly ? colors.primary : 'transparent', color: !yearly ? '#fff' : colors.slate,
            transition: 'all 0.15s ease',
          }}>Monthly</button>
          <button onClick={() => setYearly(true)} style={{
            padding: '8px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
            background: yearly ? '#3b82f6' : 'transparent', color: yearly ? '#fff' : colors.slate,
            transition: 'all 0.15s ease', position: 'relative',
          }}>
            Yearly
            <span style={{ position: 'absolute', top: -8, right: -8, background: '#22c55e', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999 }}>Save</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20, alignItems: 'start' }}>
        {plans.map(plan => {
          const features: string[] = JSON.parse(plan.features || '[]');
          const isCurrent = currentPlanId === plan.id;
          const isFree = plan.price_monthly === 0;
          const displayPrice = yearly ? plan.price_yearly : plan.price_monthly;

          return (
            <div key={plan.id} style={{
              ...card, padding: 32, display: 'flex', flexDirection: 'column',
              border: plan.highlighted ? '2px solid rgba(59,130,246,0.4)' : `1px solid ${colors.border}`,
              position: 'relative', transform: plan.highlighted ? 'scale(1.02)' : 'none',
            }}>
              {plan.highlighted ? (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', padding: '4px 16px', borderRadius: 999, letterSpacing: '0.05em' }}>Most Popular</div>
              ) : null}

              <div style={{ fontSize: 14, color: colors.warning, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{plan.name}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: colors.dark, marginBottom: 8 }}>
                {isFree ? 'Free' : `GHs ${displayPrice}`}
                {!isFree && <span style={{ fontSize: 14, color: colors.slate, fontWeight: 400 }}>{yearly ? '/yr' : '/mo'}</span>}
              </div>
              {!isFree && yearly && <div style={{ fontSize: 13, color: '#22c55e', marginBottom: 16 }}>GHs {plan.price_monthly}/mo billed yearly &mdash; save {Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}%</div>}
              {!isFree && !yearly && <div style={{ fontSize: 13, color: colors.slate, marginBottom: 16 }}>GHs {plan.price_yearly}/year (save {Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}%)</div>}

              <div style={{ fontSize: 14, color: colors.slate, marginBottom: 20, lineHeight: 1.5, minHeight: 40 }}>{plan.description}</div>

              <div style={{ fontSize: 13, color: colors.slate, marginBottom: 12, fontWeight: 600 }}>
                {plan.max_rooms === 9999 ? 'Unlimited' : `Up to ${plan.max_rooms}`} rooms &bull; {plan.max_users === 9999 ? 'Unlimited' : `Up to ${plan.max_users}`} users
              </div>

              <div style={{ flex: 1, marginBottom: 24 }}>
                {features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 14, color: colors.darker }}>
                    <Check size={16} color={colors.success} style={{ flexShrink: 0 }} />{f}
                  </div>
                ))}
              </div>

              {isCurrent ? (
                <div style={{ textAlign: 'center', padding: '10px', borderRadius: 10, background: 'rgba(34,197,94,0.1)', color: colors.success, fontWeight: 600, fontSize: 14 }}>
                  {isTrial ? 'Trial Active' : isCancelled ? 'Cancelled' : 'Current Plan'}
                </div>
              ) : (
                <button onClick={() => handleSubscribe(plan.id, isFree)} disabled={subscribing === plan.id} style={{
                  padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15,
                  background: plan.highlighted ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.06)',
                  color: plan.highlighted ? '#fff' : colors.dark, transition: 'all 0.2s ease', opacity: subscribing === plan.id ? 0.6 : 1,
                }}>
                  {subscribing === plan.id ? 'Processing...' : isFree ? 'Start Free Trial' : `Pay with Paystack (GHs ${displayPrice})`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {subscription && !isCancelled && subscription.plan_slug !== 'free_trial' && (
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <button onClick={handleCancel} style={{
            padding: '10px 24px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)',
            background: 'transparent', color: colors.danger, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>Cancel Subscription</button>
        </div>
      )}
    </div>
  );
}
