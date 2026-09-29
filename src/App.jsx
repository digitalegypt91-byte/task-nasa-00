import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownLeft, ArrowUpLeft, Clock3, ExternalLink, Globe2, Orbit, RefreshCw, Satellite, Waves } from 'lucide-react';
import FloodMap from './components/FloodMap.jsx';
import { EONET_API_URL, EONET_CATEGORY_URL, fetchFloodEvents, getLatestEvent, GIBS_INFO_URL } from './data/eonet.js';

function formatTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

function formatEventDate(value) {
  if (!value) return 'لا يوجد رصد في النتيجة الحالية';
  return new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value)) + ' UTC';
}

function getImageryDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 2);
  return date.toISOString().slice(0, 10);
}

function StatusPill({ status, fetchedAt, onRetry }) {
  const labels = {
    loading: 'جاري تحميل أرشيف NASA',
    ready: 'أرشيف NASA EONET متاح',
    error: 'تعذر تحميل أرشيف NASA EONET',
  };

  return (
    <div className={`connection-status status-${status}`}>
      <span className="status-dot" />
      <span>{labels[status]}</span>
      {status === 'ready' && fetchedAt && <span className="status-time">· {formatTime(fetchedAt)}</span>}
      {status === 'error' && <button onClick={onRetry}>إعادة المحاولة</button>}
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState('loading');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const imageryDate = useMemo(getImageryDate, []);
  const events = data?.events ?? [];
  const latestEvent = getLatestEvent(events);

  async function loadData() {
    setStatus('loading');
    setError('');
    const controller = new AbortController();
    try {
      const result = await fetchFloodEvents(controller.signal);
      setData(result);
      setStatus('ready');
      setSelected((current) => current ? result.events.find((event) => event.id === current.id) ?? null : null);
    } catch (cause) {
      if (cause.name === 'AbortError') return;
      setData(null);
      setSelected(null);
      setError('تعذر تحميل سجل الفيضانات التاريخي من NASA. يرجى المحاولة مرة أخرى.');
      setStatus('error');
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    async function initialize() {
      setStatus('loading');
      try {
        const result = await fetchFloodEvents(controller.signal);
        setData(result);
        setStatus('ready');
      } catch (cause) {
        if (cause.name === 'AbortError') return;
        setData(null);
        setSelected(null);
        setError('تعذر تحميل سجل الفيضانات التاريخي من NASA. يرجى المحاولة مرة أخرى.');
        setStatus('error');
      }
    }
    initialize();
    return () => {
      controller.abort();
    };
  }, []);

  const mapEvents = useMemo(() => events.map((event) => ({ ...event })), [events]);

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="مِرصد الصفحة الرئيسية">
          <span className="brand-mark"><Orbit size={21} strokeWidth={1.8} /></span>
          <span className="brand-word">مِرصد<span> / EARTH INTELLIGENCE</span></span>
        </a>
        <nav className="main-nav" aria-label="التنقل الرئيسي">
          <a href="#map">الخريطة</a><a href="#sources">مصادر البيانات</a><a href="#method">المنهجية</a>
        </nav>
        <StatusPill status={status} fetchedAt={data?.fetchedAt} onRetry={loadData} />
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="kicker-line" /> أرشيف الأرض · NASA OPEN DATA</div>
          <h1>راقب الفيضانات<br /><span>من الفضاء.</span></h1>
          <p>استكشف أرشيف أحداث الفيضانات المكتملة في NASA EONET، واقرأ المشهد الأرضي عبر صور الأقمار الصناعية من NASA GIBS.</p>
          <a className="hero-action" href="#map">استكشف الخريطة <ArrowDownLeft size={16} /></a>
        </div>
        <div className="hero-aside" aria-label="بيانات تعريف المنصة">
          <div className="orbit-graphic"><span className="orbit-ring orbit-ring-one" /><span className="orbit-ring orbit-ring-two" /><span className="orbit-center"><Waves size={26} /></span><span className="orbit-satellite" /></div>
          <div className="hero-aside-caption"><span>EARTH OBSERVATION SYSTEM</span><strong>قراءة موثّقة، لا تنبؤات.</strong><small>بيانات الحدث والصورة الفضائية مصدران منفصلان.</small></div>
        </div>
        <div className="hero-index"><span>01</span><span className="index-rule" /><span>GLOBAL FLOOD WATCH</span></div>
      </section>

      <section className="dashboard-section" id="map">
        <div className="section-heading">
          <div><span className="eyebrow">أرشيف الفيضانات العالمي</span><h2>نظرة عالمية <span>على السجل</span></h2></div>
          <div className="window-label"><Clock3 size={14} /> أحداث مكتملة · الأرشيف المتاح <button className="refresh-button" aria-label="تحديث أرشيف NASA" onClick={loadData} disabled={status === 'loading'}><RefreshCw size={15} className={status === 'loading' ? 'spin' : ''} /></button></div>
        </div>

        <div className="metrics-row" aria-live="polite">
          <article className="metric metric-primary"><span className="metric-index">01 / EVENTS</span><span className="metric-value">{status === 'ready' ? events.length.toLocaleString('ar') : '—'}</span><span className="metric-label">أحداث الفيضانات المسجلة في الأرشيف</span><Activity className="metric-icon" size={18} /></article>
          <article className="metric"><span className="metric-index">02 / ADMIN AREA</span><span className="metric-value metric-text">{status === 'ready' ? 'غير متاح' : '—'}</span><span className="metric-label">لا يوفر EONET حقلًا موحدًا للدولة</span><Globe2 className="metric-icon" size={18} /></article>
          <article className="metric"><span className="metric-index">03 / LATEST RECORD</span><span className="metric-value metric-date">{status === 'ready' ? formatEventDate(latestEvent?.latest.date) : '—'}</span><span className="metric-label">تاريخ أحدث هندسة من NASA EONET</span><Satellite className="metric-icon" size={18} /></article>
          <article className="metric metric-updated"><span className="metric-index">04 / DATA CHECK</span><span className="metric-value metric-date">{status === 'ready' ? formatTime(data.fetchedAt) : '—'}</span><span className="metric-label">وقت جلب استجابة API في هذا المتصفح</span><RefreshCw className="metric-icon" size={18} /></article>
        </div>

        {status === 'error' && <div className="error-banner" role="alert"><span className="error-symbol">!</span><div><strong>{error}</strong><span>لم نحتفظ ببيانات سابقة لعرضها كأنها حديثة.</span></div><button onClick={loadData}>إعادة المحاولة <RefreshCw size={14} /></button></div>}
        {status === 'loading' && !data && <div className="loading-strip"><span className="loading-line" /><span>جارٍ تحميل أرشيف NASA EONET…</span></div>}

        <div className="map-layout">
          <FloodMap events={mapEvents} selected={selected} onSelect={setSelected} imageryDate={imageryDate} />
          <aside className="map-rail">
            <div className="rail-heading"><div><span className="eyebrow">الطبقة النشطة</span><h3>أحداث الفيضانات</h3></div><span className="rail-count">{status === 'ready' ? events.length.toLocaleString('ar') : '—'}</span></div>
            <div className="rail-source"><span className="source-emblem"><Waves size={17} /></span><div><strong>NASA EONET</strong><small>سجل أحداث طبيعية · تصنيف Floods</small></div><a href={EONET_CATEGORY_URL} target="_blank" rel="noreferrer" aria-label="تعريف تصنيف الفيضانات"><ExternalLink size={14} /></a></div>
            {status === 'loading' && <div className="rail-state"><span className="mini-spinner" /> جارٍ تحميل السجل التاريخي من المصدر…</div>}
            {status === 'error' && <div className="rail-state rail-error">تعذر الاتصال بالمصدر. لا توجد نتائج معروضة.</div>}
            {status === 'ready' && events.length === 0 && <div className="rail-empty"><span className="empty-index">NO RECORDS</span><strong>لا توجد أحداث في الأرشيف</strong><p>لم يُرجع المصدر أحداث فيضانات مسجلة ضمن السجل المتاح.</p><span className="empty-rule" /></div>}
            {status === 'ready' && events.length > 0 && <div className="event-list">{events.map((event, index) => <button key={event.id} className={`event-row ${selected?.id === event.id ? 'is-selected' : ''}`} onClick={() => setSelected(event)}><span className="event-number">{String(index + 1).padStart(2, '0')}</span><span className="event-row-main"><strong>{event.title}</strong><small>{formatEventDate(event.latest.date)}</small></span><ArrowUpLeft size={15} /></button>)}</div>}
            <div className="rail-bottom"><span className="rail-pulse" /><span>النقاط تمثل آخر هندسة مسجلة للحدث، لا مساحة الغمر.</span></div>
          </aside>
        </div>
        <div className="map-legend"><span className="legend-dot" /><span>حدث مصنف كفيضان في EONET</span><span className="legend-divider" /><span className="legend-image"><Satellite size={13} /></span><span>صورة NASA GIBS تُعرض كسياق بصري فقط</span></div>
      </section>

      <section className="trust-section" id="sources">
        <div className="trust-title"><span className="eyebrow">شفافية المصدر</span><h2>مصادر البيانات</h2><p>كل طبقة تحتفظ باسمها ومصدرها الأصلي. الصور الفضائية لا تُصنّف وحدها كفيضانات.</p></div>
        <div className="source-grid">
          <article className="source-card"><div className="source-card-top"><span className="source-number">01</span><span className="source-card-icon"><Waves size={18} /></span></div><h3>NASA EONET</h3><p>أرشيف أحداث الفيضانات المكتملة؛ يعرض الموقع هندسة الحدث وتاريخها وروابط الجهات الأصلية التي يوردها السجل.</p><div className="source-meta"><span>النوع</span><strong>أحداث مكانية · Floods</strong></div><div className="source-meta"><span>آخر جلب</span><strong>{status === 'ready' ? formatTime(data.fetchedAt) : 'لا توجد استجابة ناجحة'}</strong></div><a href={EONET_API_URL} target="_blank" rel="noreferrer">واجهة الأحداث الرسمية <ExternalLink size={14} /></a></article>
          <article className="source-card source-card-image"><div className="source-card-top"><span className="source-number">02</span><span className="source-card-icon"><Satellite size={18} /></span></div><h3>NASA GIBS · MODIS Terra</h3><p>طبقة انعكاس مرئي حقيقي لتصوير سطح الأرض، وليست قناع غمر أو قياسًا لمساحة الفيضانات.</p><div className="source-meta"><span>التاريخ المعروض</span><strong>{imageryDate} · طلب صور يومي</strong></div><div className="source-meta"><span>الدقة الزمنية</span><strong>صور يومية؛ التوفر حسب المنتج</strong></div><a href={GIBS_INFO_URL} target="_blank" rel="noreferrer">بوابة NASA GIBS <ExternalLink size={14} /></a></article>
        </div>
      </section>

      <section className="method-section" id="method">
        <div className="method-header"><span className="eyebrow">من API إلى الخريطة</span><h2>منهجية جمع البيانات</h2><span className="method-stamp">NO FABRICATED OBSERVATIONS</span></div>
        <div className="method-steps">
          <article><span>01</span><h3>الاتصال</h3><p>يطلب المتصفح أحداث الفيضانات المكتملة من API الرسمية لـNASA EONET.</p></article>
          <article><span>02</span><h3>التحقق</h3><p>تُفحص بنية الاستجابة، نوع الحدث، التاريخ والإحداثيات قبل قبول أي عنصر.</p></article>
          <article><span>03</span><h3>المعالجة</h3><p>يُعرض أحدث شكل مكاني لكل حدث؛ يبقى سجل الأشكال السابقة متاحًا في التفاصيل.</p></article>
          <article><span>04</span><h3>العرض والتحديث</h3><p>تُرسم النتائج على الخريطة، ويمكن إعادة تحميل أحدث نسخة من الأرشيف يدويًا.</p></article>
        </div>
        <div className="raw-note"><div className="raw-note-icon"><Activity size={17} /></div><p><strong>البيانات الخام</strong> هي الأحداث والهندسة والتواريخ التي أرجعها NASA EONET. <strong>المعلومات المعروضة</strong> هي عدد الأحداث المقبولة وآخر هندسة لكل حدث بعد التحقق. لا يقدّم هذا السجل دائمًا الدولة أو مساحة الغمر أو الشدة؛ عند غيابها لا يستنتجها الموقع.</p></div>
      </section>

      <footer className="site-footer"><a className="footer-brand" href="#top"><Orbit size={17} /> مِرصد</a><div className="footer-meta"><span>البيانات والمصادر: NASA – National Aeronautics and Space Administration</span><span>جميع الحقوق محفوظة لمروان أسامه محمد رفاعي</span><span>عن المطور: مروان أسامه محمد رفاعي من جهينه</span></div><div className="footer-links"><a href={EONET_CATEGORY_URL} target="_blank" rel="noreferrer">EONET</a><a href={GIBS_INFO_URL} target="_blank" rel="noreferrer">GIBS</a></div></footer>
    </main>
  );
}