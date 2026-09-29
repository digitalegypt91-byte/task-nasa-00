import { useMemo, useState } from 'react';
import { CircleHelp, LocateFixed, Minus, Plus, Satellite, X } from 'lucide-react';
import L from 'leaflet';
import { GeoJSON, MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import { getCoordinates } from '../data/eonet.js';

function ZoomButtons() {
  const map = useMap();
  return (
    <div className="map-zoom" aria-label="أدوات تكبير الخريطة">
      <button aria-label="تكبير" onClick={() => map.zoomIn()}><Plus size={16} /></button>
      <button aria-label="تصغير" onClick={() => map.zoomOut()}><Minus size={16} /></button>
    </div>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })
    .format(new Date(value)) + ' UTC';
}

export default function FloodMap({ events, selected, onSelect }) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const collection = useMemo(() => ({
    type: 'FeatureCollection',
    features: events.map((event) => event.feature),
  }), [events]);

  const selectedCoordinates = selected ? getCoordinates(selected.latest) : null;

  return (
    <section className="map-frame" aria-label="الخريطة العالمية لأحداث الفيضانات">
      <MapContainer center={[18, 8]} zoom={2} minZoom={2} maxZoom={19} zoomControl={false} worldCopyJump>
        <TileLayer
          attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxNativeZoom={19}
          maxZoom={19}
          eventHandlers={{ tileerror: () => setTilesFailed(true) }}
        />
        {events.length > 0 && (
          <GeoJSON
            key={events.map((event) => `${event.id}-${event.latest.date}`).join('|')}
            data={collection}
            pointToLayer={(_feature, latlng) => L.circleMarker(latlng, {
              radius: 7,
              fillColor: '#ff765f',
              color: '#fff8ef',
              weight: 2,
              fillOpacity: 0.95,
            })}
            style={{ color: '#f17b65', fillColor: '#ff765f', weight: 2, fillOpacity: 0.3 }}
            onEachFeature={(feature, layer) => {
              const event = events.find((item) => item.id === feature.id);
              if (!event) return;
              layer.bindTooltip(event.title, { direction: 'top', className: 'map-tooltip' });
              layer.on('click', () => onSelect(event));
            }}
          />
        )}
        <ZoomControl position="bottomleft" />
        <ZoomButtons />
      </MapContainer>

      <div className="map-topline">
        <div className="map-label"><span className="map-label-mark"><Satellite size={16} /></span><span>صور الأقمار الصناعية</span><span className="map-label-separator">/</span><span>العالم</span></div>
      </div>

      {tilesFailed && <div className="map-tile-error" role="alert">تعذر تحميل صورة القمر الصناعي. تظل نقاط الأحداث وبقية بيانات الموقع متاحة.</div>}

      <div className="map-coordinate-note"><LocateFixed size={14} /> {selectedCoordinates ? `${selectedCoordinates[1].toFixed(3)}° ، ${selectedCoordinates[0].toFixed(3)}°` : 'اسحب الخريطة لاستكشاف العالم'}</div>

      {events.length === 0 && (
        <div className="map-empty-note">
          <span className="empty-orbit"><CircleHelp size={18} /></span>
          <div><strong>لا توجد أحداث فيضانات مسجلة</strong><span>في أرشيف NASA EONET المتاح.</span></div>
        </div>
      )}

      {selected && (
        <aside className="event-detail" aria-label="تفاصيل الحدث المحدد">
          <button className="detail-close" aria-label="إغلاق التفاصيل" onClick={() => onSelect(null)}><X size={17} /></button>
          <span className="eyebrow">سجل فيضان · NASA EONET</span>
          <h3>{selected.title}</h3>
          {selected.description && <p className="detail-description">{selected.description}</p>}
          <div className="detail-coordinate-list">
            <span>الإحداثيات الأحدث</span>
            <strong dir="ltr">{selectedCoordinates ? `${selectedCoordinates[1].toFixed(5)}, ${selectedCoordinates[0].toFixed(5)}` : 'غير متاحة'}</strong>
          </div>
          <div className="detail-coordinate-list">
            <span>تاريخ الهندسة في المصدر</span>
            <strong>{formatDate(selected.latest.date)}</strong>
          </div>
          <div className="detail-coordinate-list">
            <span>عدد نقاط السجل</span>
            <strong>{selected.history.length.toLocaleString('ar')}</strong>
          </div>
          <div className="detail-note">المساحة والشدة والدولة لا تظهر إلا إذا أوردها سجل الحدث نفسه.</div>
          {selected.sources.map((source, index) => (
            <div className="detail-source-link" key={`${source.id || 'source'}-${index}`}>
              المصدر الأصلي للحدث <span>{source.id || 'NASA EONET'}</span>
            </div>
          ))}
          <div className="map-footnote"><span>Esri World Imagery</span><span>صورة فضائية تفاعلية</span></div>
        </aside>
      )}

      <div className="map-footnote"><span>Esri World Imagery</span><span>صورة فضائية تفاعلية</span></div>
    </section>
  );
}