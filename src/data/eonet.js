const EVENTS_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events?category=floods&status=closed&limit=5000';
const GEOMETRY_TYPES = new Set([
  'Point',
  'MultiPoint',
  'LineString',
  'MultiLineString',
  'Polygon',
  'MultiPolygon',
]);

function validPosition(position) {
  return Array.isArray(position)
    && position.length >= 2
    && Number.isFinite(position[0])
    && Number.isFinite(position[1])
    && Math.abs(position[0]) <= 180
    && Math.abs(position[1]) <= 90;
}

function validCoordinates(coordinates) {
  if (validPosition(coordinates)) return true;
  return Array.isArray(coordinates) && coordinates.length > 0 && coordinates.every(validCoordinates);
}

function normalizeEvent(event) {
  if (!event || typeof event.id !== 'string' || typeof event.title !== 'string') return null;
  if (!Array.isArray(event.categories) || !event.categories.some((category) => category.id === 'floods')) return null;
  if (!Array.isArray(event.geometry)) return null;

  const history = event.geometry
    .filter((entry) => entry && GEOMETRY_TYPES.has(entry.type) && validCoordinates(entry.coordinates))
    .filter((entry) => typeof entry.date === 'string' && Number.isFinite(Date.parse(entry.date)))
    .sort((left, right) => Date.parse(left.date) - Date.parse(right.date));

  if (history.length === 0) return null;

  const latest = history[history.length - 1];
  return {
    id: event.id,
    title: event.title,
    description: typeof event.description === 'string' ? event.description : null,
    link: typeof event.link === 'string' ? event.link : null,
    closed: event.closed,
    sources: Array.isArray(event.sources) ? event.sources.filter((source) => source?.url) : [],
    history,
    latest,
    feature: {
      type: 'Feature',
      id: event.id,
      properties: { eventId: event.id, title: event.title },
      geometry: { type: latest.type, coordinates: latest.coordinates },
    },
  };
}

export async function fetchFloodEvents(signal) {
  const response = await fetch(EVENTS_URL, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) throw new Error(`NASA EONET returned ${response.status}`);

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.events)) {
    throw new Error('Unexpected NASA EONET response');
  }

  const events = payload.events.map(normalizeEvent).filter(Boolean);
  return {
    events,
    fetchedAt: new Date(),
    sourceUrl: EVENTS_URL,
    receivedCount: payload.events.length,
  };
}

export function getLatestEvent(events) {
  return events.reduce((latest, event) => {
    if (!latest || Date.parse(event.latest.date) > Date.parse(latest.latest.date)) return event;
    return latest;
  }, null);
}

export function getCoordinates(geometry) {
  if (geometry.type === 'Point') return geometry.coordinates;
  return findFirstPosition(geometry.coordinates);
}

function findFirstPosition(value) {
  if (validPosition(value)) return value;
  if (!Array.isArray(value)) return null;
  for (const item of value) {
    const position = findFirstPosition(item);
    if (position) return position;
  }
  return null;
}

export const EONET_CATEGORY_URL = 'https://eonet.gsfc.nasa.gov/api/v3/categories/floods';
export const EONET_API_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events';
