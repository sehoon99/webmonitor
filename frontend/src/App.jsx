import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import WorldMap from './components/WorldMap';
import Dashboard from './components/Dashboard';

const API = '/api';

export default function App() {
  const [targets, setTargets] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [geoData, setGeoData] = useState({});
  const [statusMap, setStatusMap] = useState({});
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const intervalRef = useRef(null);

  // Load targets on mount
  useEffect(() => {
    fetchTargets();
  }, []);

  // Refresh metrics every 30s for selected target
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (selectedTarget) {
      fetchMetrics(selectedTarget);
      intervalRef.current = setInterval(() => fetchMetrics(selectedTarget), 30000);
    }
    return () => clearInterval(intervalRef.current);
  }, [selectedTarget]);

  const fetchTargets = async () => {
    try {
      const res = await axios.get(`${API}/targets`);
      const list = res.data.targets;
      setTargets(list);
      list.forEach((t) => fetchGeoip(t));
      list.forEach((t) => fetchStatus(t));
    } catch (e) {
      console.error('fetchTargets failed:', e);
    }
  };

  const fetchGeoip = async (target) => {
    try {
      const res = await axios.get(`${API}/geoip?target=${encodeURIComponent(target)}`);
      setGeoData((prev) => ({ ...prev, [target]: res.data }));
    } catch (e) {
      console.error('fetchGeoip failed for', target);
    }
  };

  const fetchStatus = async (target) => {
    try {
      const res = await axios.get(`${API}/metrics?target=${encodeURIComponent(target)}`);
      setStatusMap((prev) => ({ ...prev, [target]: res.data.probe_success }));
    } catch (e) {
      // silently ignore
    }
  };

  const fetchMetrics = async (target) => {
    setMetricsLoading(true);
    try {
      const res = await axios.get(`${API}/metrics?target=${encodeURIComponent(target)}`);
      setMetrics(res.data);
      setStatusMap((prev) => ({ ...prev, [target]: res.data.probe_success }));
    } catch (e) {
      console.error('fetchMetrics failed:', e);
    } finally {
      setMetricsLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    let url = searchInput.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    try {
      await axios.post(`${API}/targets`, { url });
      if (!targets.includes(url)) {
        setTargets((prev) => [...prev, url]);
        fetchGeoip(url);
      }
      setSelectedTarget(url);
      setMetrics(null);
      setSearchInput('');
    } catch (e) {
      console.error('handleSearch failed:', e);
    }
  };

  const handleRemove = async (url) => {
    try {
      await axios.delete(`${API}/targets`, { data: { url } });
      setTargets((prev) => prev.filter((t) => t !== url));
      setGeoData((prev) => { const n = { ...prev }; delete n[url]; return n; });
      setStatusMap((prev) => { const n = { ...prev }; delete n[url]; return n; });
      if (selectedTarget === url) {
        setSelectedTarget(null);
        setMetrics(null);
      }
    } catch (e) {
      console.error('handleRemove failed:', e);
    }
  };

  const handleSelect = (target) => {
    setSelectedTarget(target);
    setMetrics(null);
  };

  const hostname = selectedTarget
    ? (() => { try { return new URL(selectedTarget).hostname; } catch { return selectedTarget; } })()
    : null;

  return (
    <div className="app">
      {/* ── Left Sidebar ── */}
      <div className="sidebar">
        <div className="sidebar-header">
          <span className="logo">⬡ WebMonitor</span>
        </div>
        <Sidebar
          targets={targets}
          selectedTarget={selectedTarget}
          statusMap={statusMap}
          onSelect={handleSelect}
          onRemove={handleRemove}
        />
      </div>

      {/* ── Main ── */}
      <div className="main">
        {/* Search Bar */}
        <div className="search-section">
          <form onSubmit={handleSearch} className="search-form">
            <input
              className="search-input"
              type="text"
              placeholder="URL 입력 후 Enter (예: naver.com, https://github.com)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button className="search-btn" type="submit">모니터링 추가</button>
          </form>
          {hostname && (
            <div className="selected-label">
              보는 중: <span>{hostname}</span>
            </div>
          )}
        </div>

        {/* World Map */}
        <div className="map-section">
          <WorldMap
            geoData={geoData}
            selectedTarget={selectedTarget}
            statusMap={statusMap}
            onMarkerClick={handleSelect}
          />
        </div>

        {/* Dashboard */}
        <div className="dashboard-section">
          {selectedTarget ? (
            <Dashboard
              target={selectedTarget}
              metrics={metrics}
              loading={metricsLoading}
            />
          ) : (
            <div className="empty-state">
              URL을 검색하거나 좌측 목록에서 사이트를 선택하세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
