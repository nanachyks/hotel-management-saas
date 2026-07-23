import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { card, pageTitle, sectionTitle, colors, formatCurrency, glass } from '../styles';
import {
  TrendingUp, TrendingDown, AlertTriangle, Brain, LineChart, DollarSign,
  Smile, Frown, Meh, Lightbulb, MessageSquare, Zap,
} from 'lucide-react';

interface InsightsData {
  occupancyForecast: { forecast: { date: string; dayOfWeek: string; predictedOccupancy: number; predictedRate: number }[]; avgOccupancy: number };
  pricingSuggestions: { roomTypeName: string; basePrice: number; suggestedPrice: number; suggestedChange: number; demand: number; reasoning: string }[];
  revenueForecast: { forecast: { month: string; predictedRevenue: number }[]; totalProjected: number; lastMonthRevenue: number; trend: string };
  sentiment: { entries: { text: string; source: string; sentiment: string; score: number }[]; summary: { positive: number; negative: number; neutral: number; overallScore: number; totalEntries: number } };
  lowStockCount: number;
  totalRooms: number;
}

export default function AIInsights() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'forecast' | 'pricing' | 'sentiment' | 'upsell'>('overview');
  const [replyInput, setReplyInput] = useState('');
  const [replyResult, setReplyResult] = useState<{ reply: string; matchedKeywords: string[] } | null>(null);

  useEffect(() => {
    api.get<InsightsData>('/ai/insights').then(setData).catch(console.error);
  }, []);

  if (!data) return <div style={{ color: colors.slate }}>Loading AI insights...</div>;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: <Brain size={16} /> },
    { key: 'forecast', label: 'Forecast', icon: <LineChart size={16} /> },
    { key: 'pricing', label: 'Pricing', icon: <DollarSign size={16} /> },
    { key: 'sentiment', label: 'Sentiment', icon: data.sentiment.summary.overallScore >= 60 ? <Smile size={16} /> : data.sentiment.summary.overallScore >= 40 ? <Meh size={16} /> : <Frown size={16} /> },
    { key: 'upsell', label: 'Auto-Reply', icon: <MessageSquare size={16} /> },
  ];

  return (
    <div>
      <h1 style={pageTitle}>AI Insights</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: 'none',
            background: activeTab === t.key ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
            color: activeTab === t.key ? '#a78bfa' : colors.slate, fontSize: 14, fontWeight: 500, cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          <div style={{ ...glass, padding: 22, borderLeft: '3px solid #8b5cf6' }}>
            <div style={{ fontSize: 14, color: colors.slate, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <LineChart size={16} style={{ color: '#8b5cf6' }} /> Occupancy Forecast
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#a78bfa' }}>{data.occupancyForecast.avgOccupancy}%</div>
            <div style={{ fontSize: 13, color: colors.slate, marginTop: 4 }}>Average predicted occupancy (30 days)</div>
          </div>
          <div style={{ ...glass, padding: 22, borderLeft: '3px solid #10b981' }}>
            <div style={{ fontSize: 14, color: colors.slate, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <DollarSign size={16} style={{ color: '#10b981' }} /> Revenue Forecast
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#34d399' }}>{formatCurrency(data.revenueForecast.totalProjected)}</div>
            <div style={{ fontSize: 13, color: colors.slate, marginTop: 4 }}>
              Projected revenue (3 months) {data.revenueForecast.trend === 'up' ? <TrendingUp size={14} style={{ color: '#22c55e', display: 'inline' }} /> : <TrendingDown size={14} style={{ color: '#ef4444', display: 'inline' }} />}
            </div>
          </div>
          <div style={{ ...glass, padding: 22, borderLeft: '3px solid #f59e0b' }}>
            <div style={{ fontSize: 14, color: colors.slate, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lightbulb size={16} style={{ color: '#f59e0b' }} /> Pricing Suggestions
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#fbbf24' }}>{data.pricingSuggestions.length}</div>
            <div style={{ fontSize: 13, color: colors.slate, marginTop: 4 }}>Room types with pricing recommendations</div>
          </div>
          <div style={{ ...glass, padding: 22, borderLeft: '3px solid #ec4899' }}>
            <div style={{ fontSize: 14, color: colors.slate, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Smile size={16} style={{ color: '#ec4899' }} /> Guest Sentiment
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#f472b6' }}>{data.sentiment.summary.overallScore}%</div>
            <div style={{ fontSize: 13, color: colors.slate, marginTop: 4 }}>
              {data.sentiment.summary.positive} positive / {data.sentiment.summary.neutral} neutral / {data.sentiment.summary.negative} negative
            </div>
          </div>
          {data.lowStockCount > 0 && (
            <div style={{ ...glass, padding: 22, borderLeft: '3px solid #ef4444' }}>
              <div style={{ fontSize: 14, color: colors.slate, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={16} style={{ color: '#ef4444' }} /> Low Stock Alert
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#f87171' }}>{data.lowStockCount}</div>
              <div style={{ fontSize: 13, color: colors.slate, marginTop: 4 }}>Inventory items below minimum threshold</div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'forecast' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div style={{ ...card, padding: 20 }}>
              <h2 style={sectionTitle}>30-Day Occupancy Forecast</h2>
              <p style={{ fontSize: 13, color: colors.slate, marginBottom: 16 }}>Average: <strong style={{ color: '#a78bfa' }}>{data.occupancyForecast.avgOccupancy}%</strong></p>
              <div style={{ maxHeight: 500, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: colors.slate, fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: colors.slate, fontWeight: 600 }}>Day</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', color: colors.slate, fontWeight: 600 }}>Predicted Occupancy</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', color: colors.slate, fontWeight: 600 }}>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.occupancyForecast.forecast.map((f, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                        <td style={{ padding: '6px 12px' }}>{f.date}</td>
                        <td style={{ padding: '6px 12px', color: colors.slate }}>{f.dayOfWeek}</td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600 }}>{f.predictedOccupancy}/{data.totalRooms}</td>
                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                          <span style={{
                            color: f.predictedRate >= 80 ? '#22c55e' : f.predictedRate >= 50 ? '#f59e0b' : '#ef4444',
                            fontWeight: 600,
                          }}>{f.predictedRate}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ ...card, padding: 20 }}>
              <h2 style={sectionTitle}>Revenue Forecast</h2>
              <p style={{ fontSize: 13, color: colors.slate, marginBottom: 16 }}>
                Last month: <strong>{formatCurrency(data.revenueForecast.lastMonthRevenue)}</strong>
                &nbsp;→ Projected 3mo: <strong style={{ color: '#34d399' }}>{formatCurrency(data.revenueForecast.totalProjected)}</strong>
                &nbsp;{data.revenueForecast.trend === 'up' ? <TrendingUp size={16} style={{ color: '#22c55e', display: 'inline' }} /> : <TrendingDown size={16} style={{ color: '#ef4444', display: 'inline' }} />}
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: colors.slate, fontWeight: 600 }}>Month</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', color: colors.slate, fontWeight: 600 }}>Predicted Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.revenueForecast.forecast.map((f, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                      <td style={{ padding: '6px 12px' }}>{f.month}</td>
                      <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600, color: '#34d399' }}>{formatCurrency(f.predictedRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pricing' && (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.slate, fontWeight: 600 }}>Room Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', color: colors.slate, fontWeight: 600 }}>Base Price</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', color: colors.slate, fontWeight: 600 }}>Suggested Price</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', color: colors.slate, fontWeight: 600 }}>Change</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', color: colors.slate, fontWeight: 600 }}>Demand</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.slate, fontWeight: 600 }}>Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {data.pricingSuggestions.map((p, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>{p.roomTypeName}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: colors.slate }}>{formatCurrency(p.basePrice)}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: p.suggestedChange >= 0 ? '#22c55e' : '#ef4444' }}>{formatCurrency(p.suggestedPrice)}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                    <span style={{ color: p.suggestedChange >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                      {p.suggestedChange >= 0 ? '+' : ''}{p.suggestedChange}%
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                    <div style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                      background: p.demand >= 60 ? 'rgba(34,197,94,0.15)' : p.demand >= 30 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                      color: p.demand >= 60 ? '#22c55e' : p.demand >= 30 ? '#f59e0b' : '#ef4444',
                    }}>{p.demand}%</div>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: colors.slate }}>{p.reasoning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'sentiment' && (
        <div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ ...card, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Smile size={24} style={{ color: '#22c55e' }} />
              <div><div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{data.sentiment.summary.positive}</div><div style={{ fontSize: 12, color: colors.slate }}>Positive</div></div>
            </div>
            <div style={{ ...card, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Meh size={24} style={{ color: '#f59e0b' }} />
              <div><div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{data.sentiment.summary.neutral}</div><div style={{ fontSize: 12, color: colors.slate }}>Neutral</div></div>
            </div>
            <div style={{ ...card, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Frown size={24} style={{ color: '#ef4444' }} />
              <div><div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>{data.sentiment.summary.negative}</div><div style={{ fontSize: 12, color: colors.slate }}>Negative</div></div>
            </div>
            <div style={{ ...card, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Zap size={24} style={{ color: '#8b5cf6' }} />
              <div><div style={{ fontSize: 24, fontWeight: 700, color: '#8b5cf6' }}>{data.sentiment.summary.overallScore}%</div><div style={{ fontSize: 12, color: colors.slate }}>Overall Score</div></div>
            </div>
          </div>
          {data.sentiment.entries.length === 0 ? (
            <p style={{ color: colors.slate }}>No guest feedback entries found to analyze. Guest notes, room service requests, and maintenance descriptions are used for sentiment analysis.</p>
          ) : (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}` }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.slate, fontWeight: 600 }}>Source</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.slate, fontWeight: 600 }}>Text</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: colors.slate, fontWeight: 600 }}>Sentiment</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: colors.slate, fontWeight: 600 }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sentiment.entries.map((e, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: colors.slate }}>{e.source}</td>
                      <td style={{ padding: '10px 16px', fontSize: 13, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.text}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                          background: e.sentiment === 'positive' ? 'rgba(34,197,94,0.15)' : e.sentiment === 'negative' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                          color: e.sentiment === 'positive' ? '#22c55e' : e.sentiment === 'negative' ? '#ef4444' : '#f59e0b',
                        }}>
                          {e.sentiment}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600 }}>{e.score}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'upsell' && (
        <div>
          <div style={{ ...card, padding: 20, marginBottom: 20 }}>
            <h2 style={sectionTitle}>Automated Guest Support</h2>
            <p style={{ fontSize: 14, color: colors.slate, marginBottom: 12 }}>Type a guest inquiry to get an AI-suggested reply.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={replyInput} onChange={e => setReplyInput(e.target.value)}
                placeholder="e.g., What time is check-in? or Do you have WiFi?"
                style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: `1px solid ${colors.border}`,
                  background: 'rgba(255,255,255,0.04)', color: colors.dark, fontSize: 14,
                  outline: 'none', }} />
              <button onClick={async () => {
                if (!replyInput.trim()) return;
                try {
                  const res = await api.post<{ reply: string; matchedKeywords: string[] }>('/ai/auto-reply', { message: replyInput });
                  setReplyResult(res);
                } catch { setReplyResult({ reply: 'Error generating reply. Please try again.', matchedKeywords: [] }); }
              }} style={{
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>Generate Reply</button>
            </div>
            {replyResult && (
              <div style={{ marginTop: 16, padding: 16, borderRadius: 8, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <div style={{ fontSize: 13, color: '#a78bfa', marginBottom: 8, fontWeight: 600 }}>Suggested Reply</div>
                <div style={{ fontSize: 14, color: colors.dark, lineHeight: 1.5 }}>{replyResult.reply}</div>
                {replyResult.matchedKeywords.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {replyResult.matchedKeywords.map((kw, i) => (
                      <span key={i} style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', fontSize: 11, fontWeight: 600 }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ ...card, padding: 20 }}>
            <h2 style={sectionTitle}>Smart Upselling</h2>
            <p style={{ fontSize: 13, color: colors.slate, marginBottom: 12 }}>Top-rated services that can be suggested to guests based on their booking profile.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {data.pricingSuggestions.slice(0, 6).map((p, i) => (
                <div key={i} style={{
                  padding: 16, borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.borderLight}`,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{p.roomTypeName}</div>
                  <div style={{ fontSize: 13, color: colors.slate }}>{formatCurrency(p.suggestedPrice)}/night</div>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#a78bfa' }}>{p.demand >= 50 ? '⚡ High demand' : '📊 Moderate demand'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
