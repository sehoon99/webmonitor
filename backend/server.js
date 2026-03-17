const express = require('express');
const cors = require('cors');
const yaml = require('js-yaml');
const fs = require('fs');
const axios = require('axios');
const dns = require('dns').promises;
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PROMETHEUS_YML = path.join(__dirname, '../prometheus.yml');
const PROMETHEUS_URL = 'http://localhost:9090';

function readConfig() {
  return yaml.load(fs.readFileSync(PROMETHEUS_YML, 'utf8'));
}

function writeConfig(config) {
  fs.writeFileSync(PROMETHEUS_YML, yaml.dump(config, { lineWidth: -1 }), 'utf8');
}

function getWebsiteJob(config) {
  return config.scrape_configs.find(j => j.job_name === 'website-latency');
}

async function reloadPrometheus() {
  try {
    await axios.post(`${PROMETHEUS_URL}/-/reload`);
    console.log('[Prometheus] Config reloaded');
  } catch (e) {
    console.error('[Prometheus] Reload failed:', e.message);
  }
}

// GET /api/targets
app.get('/api/targets', (req, res) => {
  try {
    const config = readConfig();
    const job = getWebsiteJob(config);
    const targets = job?.static_configs?.[0]?.targets || [];
    res.json({ targets });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/targets
app.post('/api/targets', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const config = readConfig();
    const job = getWebsiteJob(config);
    if (!job.static_configs) job.static_configs = [{ targets: [] }];
    if (!job.static_configs[0].targets.includes(url)) {
      job.static_configs[0].targets.push(url);
      writeConfig(config);
      await reloadPrometheus();
    }
    res.json({ success: true, targets: job.static_configs[0].targets });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/targets
app.delete('/api/targets', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const config = readConfig();
    const job = getWebsiteJob(config);
    if (job?.static_configs?.[0]?.targets) {
      job.static_configs[0].targets = job.static_configs[0].targets.filter(t => t !== url);
      writeConfig(config);
      await reloadPrometheus();
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/metrics?target=https://example.com
app.get('/api/metrics', async (req, res) => {
  const { target } = req.query;
  if (!target) return res.status(400).json({ error: 'target required' });

  try {
    const metricNames = [
      'probe_success',
      'probe_http_status_code',
      'probe_duration_seconds',
      'probe_dns_lookup_time_seconds',
      'probe_tcp_connect_duration_seconds',
      'probe_http_version',
      'probe_ssl_earliest_cert_expiry',
    ];

    const results = {};

    await Promise.all(metricNames.map(async (metric) => {
      try {
        const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
          params: { query: `${metric}{instance="${target}"}` }
        });
        const data = response.data.data.result;
        results[metric] = data.length > 0 ? parseFloat(data[0].value[1]) : null;
      } catch (e) {
        results[metric] = null;
      }
    }));

    // TLS version from labels
    try {
      const tlsRes = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
        params: { query: `probe_tls_version_info{instance="${target}"}` }
      });
      const tlsData = tlsRes.data.data.result;
      results['tls_version'] = tlsData.length > 0 ? tlsData[0].metric.version : null;
    } catch (e) {
      results['tls_version'] = null;
    }

    // Historical duration (last 1 hour)
    try {
      const now = Math.floor(Date.now() / 1000);
      const histRes = await axios.get(`${PROMETHEUS_URL}/api/v1/query_range`, {
        params: {
          query: `probe_duration_seconds{instance="${target}"}`,
          start: now - 3600,
          end: now,
          step: 30
        }
      });
      const values = histRes.data.data.result[0]?.values || [];
      results['duration_history'] = values.map(([ts, val]) => ({
        time: new Date(ts * 1000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        value: parseFloat((parseFloat(val) * 1000).toFixed(2))
      }));
    } catch (e) {
      results['duration_history'] = [];
    }

    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/geoip?target=https://example.com
app.get('/api/geoip', async (req, res) => {
  const { target } = req.query;
  if (!target) return res.status(400).json({ error: 'target required' });

  try {
    const hostname = new URL(target).hostname;
    const { address } = await dns.lookup(hostname);
    const geoRes = await axios.get(
      `http://ip-api.com/json/${address}?fields=status,lat,lon,country,city,isp,regionName,org`
    );
    const geo = geoRes.data;
    if (geo.status === 'fail') {
      return res.json({ lat: 37.5665, lon: 126.978, country: 'Unknown', city: hostname, isp: '', hostname, ip: address });
    }
    res.json({ lat: geo.lat, lon: geo.lon, country: geo.country, city: geo.city, isp: geo.isp || geo.org, regionName: geo.regionName, ip: address, hostname });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(4000, () => console.log('WebMonitor backend → http://localhost:4000'));
