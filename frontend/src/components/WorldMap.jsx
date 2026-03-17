import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icons for Vite/bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored marker icon
function createIcon(color) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 14px; height: 14px;
        background: ${color};
        border: 2px solid rgba(255,255,255,0.8);
        border-radius: 50%;
        box-shadow: 0 0 8px ${color}, 0 2px 6px rgba(0,0,0,0.5);
      "></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

function FlyToSelected({ target, geoData }) {
  const map = useMap();
  useEffect(() => {
    if (target && geoData[target]) {
      const { lat, lon } = geoData[target];
      map.flyTo([lat, lon], 5, { duration: 1.2 });
    }
  }, [target, geoData, map]);
  return null;
}

export default function WorldMap({ geoData, selectedTarget, statusMap, onMarkerClick }) {
  const entries = Object.entries(geoData);

  return (
    <MapContainer
      center={[25, 10]}
      zoom={2}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="© OpenStreetMap contributors © CARTO"
      />
      <FlyToSelected target={selectedTarget} geoData={geoData} />

      {entries.map(([target, geo]) => {
        const status = statusMap?.[target];
        const isSelected = target === selectedTarget;
        const color = status === 1 ? '#10b981' : status === 0 ? '#ef4444' : '#6b7280';
        const hostname = (() => { try { return new URL(target).hostname; } catch { return target; } })();

        return (
          <Marker
            key={target}
            position={[geo.lat, geo.lon]}
            icon={createIcon(isSelected ? '#3b82f6' : color)}
            eventHandlers={{ click: () => onMarkerClick(target) }}
            zIndexOffset={isSelected ? 1000 : 0}
          >
            <Popup>
              <strong>{hostname}</strong>
              <div>{geo.city}, {geo.country}</div>
              <div>{geo.isp}</div>
              <div className="geo-ip">IP: {geo.ip}</div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
