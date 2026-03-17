import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

function MetricCard({ title, value, unit, color, subtitle }) {
  const c = color || '#6b7280';
  return (
    <div className="metric-card" style={{ borderTopColor: c }}>
      <div className="metric-title">{title}</div>
      <div className="metric-value" style={{ color: c }}>
        {value ?? <span style={{ color: '#374151' }}>—</span>}
        {value != null && unit && <span className="metric-unit">{unit}</span>}
      </div>
      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
    </div>
  );
}

function statusColor(val) {
  if (val == null) return '#6b7280';
  return val === 1 ? '#10b981' : '#ef4444';
}
function httpColor(code) {
  if (code == null) return '#6b7280';
  if (code >= 200 && code < 300) return '#10b981';
  if (code >= 300 && code < 400) return '#f59e0b';
  return '#ef4444';
}
function durationColor(ms) {
  if (ms == null) return '#6b7280';
  if (ms < 300) return '#10b981';
  if (ms < 800) return '#f59e0b';
  return '#ef4444';
}
function sslColor(days) {
  if (days == null) return '#6b7280';
  if (days > 30) return '#10b981';
  if (days > 7) return '#f59e0b';
  return '#ef4444';
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: '#1a1d27',
        border: '1px solid #2d3148',
        borderRadius: 6,
        padding: '8px 12px',
        fontSize: 12,
      }}>
        <div style={{ color: '#6b7280', marginBottom: 4 }}>{label}</div>
        <div style={{ color: '#3b82f6', fontWeight: 700 }}>
          {payload[0].value.toFixed(1)} ms
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard({ target, metrics, loading }) {
  if (loading && !metrics) {
    return <div className="loading">메트릭 로딩 중...</div>;
  }

  if (!metrics) {
    return (
      <div className="loading">
        데이터 대기 중 — Prometheus 첫 스크랩까지 약 5초 소요됩니다
      </div>
    );
  }

  const isUp = metrics.probe_success === 1;
  const httpCode = metrics.probe_http_status_code != null ? Math.round(metrics.probe_http_status_code) : null;
  const durationMs = metrics.probe_duration_seconds != null ? metrics.probe_duration_seconds * 1000 : null;
  const dnsMs = metrics.probe_dns_lookup_time_seconds != null ? metrics.probe_dns_lookup_time_seconds * 1000 : null;
  const tcpMs = metrics.probe_tcp_connect_duration_seconds != null ? metrics.probe_tcp_connect_duration_seconds * 1000 : null;
  const certExpiry = metrics.probe_ssl_earliest_cert_expiry;
  const daysRemaining = certExpiry != null
    ? Math.floor((certExpiry - Date.now() / 1000) / 86400)
    : null;
  const certDate = certExpiry != null
    ? new Date(certExpiry * 1000).toLocaleDateString('ko-KR')
    : null;
  const httpVersion = metrics.probe_http_version != null ? `HTTP/${metrics.probe_http_version}` : null;
  const tlsVersion = metrics.tls_version;
  const history = metrics.duration_history || [];

  const avgMs = history.length > 0
    ? (history.reduce((s, d) => s + d.value, 0) / history.length).toFixed(1)
    : null;

  const hostname = (() => { try { return new URL(target).hostname; } catch { return target; } })();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2 className="dashboard-title">
          <span style={{ color: isUp ? '#10b981' : '#ef4444', fontSize: 13 }}>
            {isUp ? '● UP' : '● DOWN'}
          </span>
          <span style={{ color: '#6b7280', fontSize: 13, fontWeight: 400 }}>
            {hostname}
          </span>
        </h2>
        {loading && <span className="refreshing">새로고침 중...</span>}
      </div>

      <div className="metric-grid">
        <MetricCard
          title="상태"
          value={isUp ? 'UP' : 'DOWN'}
          color={statusColor(metrics.probe_success)}
          subtitle="Probe Status"
        />
        <MetricCard
          title="HTTP 상태 코드"
          value={httpCode}
          color={httpColor(httpCode)}
          subtitle="HTTP Status Code"
        />
        <MetricCard
          title="응답 시간"
          value={durationMs != null ? durationMs.toFixed(1) : null}
          unit="ms"
          color={durationColor(durationMs)}
          subtitle="Total Response Time"
        />
        <MetricCard
          title="DNS 조회"
          value={dnsMs != null ? dnsMs.toFixed(1) : null}
          unit="ms"
          color="#06b6d4"
          subtitle="DNS Lookup Time"
        />
        <MetricCard
          title="TCP 연결"
          value={tcpMs != null ? tcpMs.toFixed(1) : null}
          unit="ms"
          color="#8b5cf6"
          subtitle="TCP Connect Time"
        />
        <MetricCard
          title="SSL 인증서"
          value={daysRemaining}
          unit="일"
          color={sslColor(daysRemaining)}
          subtitle={certDate ? `만료: ${certDate}` : 'SSL Expiry'}
        />
        <MetricCard
          title="HTTP 버전"
          value={httpVersion}
          color="#3b82f6"
          subtitle="Protocol Version"
        />
        <MetricCard
          title="TLS 버전"
          value={tlsVersion || (certExpiry != null ? 'TLS' : null)}
          color="#f59e0b"
          subtitle="TLS Version"
        />
      </div>

      {history.length > 0 && (
        <div className="chart-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 className="chart-title" style={{ margin: 0 }}>응답 시간 히스토리 (지난 1시간)</h3>
            {avgMs && (
              <span style={{ fontSize: 11, color: '#6b7280' }}>
                평균 <span style={{ color: '#3b82f6', fontWeight: 700 }}>{avgMs}ms</span>
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={history} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#374151"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                interval="preserveStartEnd"
                tickLine={false}
              />
              <YAxis
                stroke="#374151"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickFormatter={(v) => `${v}ms`}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              {avgMs && (
                <ReferenceLine
                  y={parseFloat(avgMs)}
                  stroke="#f59e0b"
                  strokeDasharray="4 2"
                  strokeOpacity={0.6}
                />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
