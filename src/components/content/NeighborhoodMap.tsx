import React, { useState, useEffect, useRef } from 'react';

interface Neighborhood {
  id: string;
  name: string;
  medianPrice: number;
  areaType: string;
  inCityOfSanDiego: boolean;
  hasMelloRoos: boolean;
  typicalPropertyTaxRate: number;
  zipCodes: string[];
}

interface Props {
  neighborhoods: Neighborhood[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmtK = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`;

const tierColors: Record<string, { label: string; color: string; bg: string; border: string; bgHex: string }> = {
  entry_level: { label: 'Entry', color: '#22c55e', bg: 'bg-green-50', border: 'border-green-300', bgHex: '#f0fdf4' },
  mid_range: { label: 'Mid', color: '#0E9AA7', bg: 'bg-accent-50', border: 'border-accent-300', bgHex: '#e6f7f8' },
  higher: { label: 'Higher', color: '#D4A843', bg: 'bg-warm-50', border: 'border-warm-300', bgHex: '#fdf8ed' },
  premium: { label: 'Premium', color: '#1B2B4B', bg: 'bg-primary-50', border: 'border-primary-300', bgHex: '#f0f3f8' },
};

// Per capita income by neighborhood (ACS 2024 / Census estimates)
const perCapitaIncome: Record<string, number> = {
  'la-jolla': 90445, 'del-mar': 134263, 'pacific-beach': 77180, 'clairemont': 45200,
  'hillcrest': 52800, 'north-park': 65306, 'city-heights': 22100, 'encanto': 24500,
  'national-city': 27073, 'chula-vista': 54693, 'mira-mesa': 48300, 'santee': 39800,
  'el-cajon': 30100, 'la-mesa': 38600, 'spring-valley': 42069, 'escondido': 32400,
};

// Median household income (ACS 2024)
const medianHHIncome: Record<string, number> = {
  'la-jolla': 147230, 'del-mar': 199152, 'pacific-beach': 100866, 'clairemont': 97702,
  'hillcrest': 82000, 'north-park': 85000, 'city-heights': 50200, 'encanto': 90171,
  'national-city': 66841, 'chula-vista': 108032, 'mira-mesa': 126913, 'santee': 100361,
  'el-cajon': 67511, 'la-mesa': 81734, 'spring-valley': 109110, 'escondido': 75788,
};

const geoData: Record<string, { lat: number; lng: number; radius: number }> = {
  'la-jolla':       { lat: 32.8328, lng: -117.2713, radius: 2800 },
  'del-mar':        { lat: 32.9595, lng: -117.2653, radius: 2200 },
  'pacific-beach':  { lat: 32.7947, lng: -117.2382, radius: 1800 },
  'clairemont':     { lat: 32.8399, lng: -117.2036, radius: 2500 },
  'hillcrest':      { lat: 32.7479, lng: -117.1631, radius: 1500 },
  'north-park':     { lat: 32.7405, lng: -117.1296, radius: 1600 },
  'city-heights':   { lat: 32.7346, lng: -117.1010, radius: 2000 },
  'encanto':        { lat: 32.7010, lng: -117.0802, radius: 2200 },
  'national-city':  { lat: 32.6781, lng: -117.0992, radius: 2000 },
  'chula-vista':    { lat: 32.6401, lng: -117.0842, radius: 3500 },
  'mira-mesa':      { lat: 32.9155, lng: -117.1436, radius: 2800 },
  'santee':         { lat: 32.8384, lng: -116.9739, radius: 3000 },
  'el-cajon':       { lat: 32.7948, lng: -116.9625, radius: 2800 },
  'la-mesa':        { lat: 32.7678, lng: -117.0231, radius: 2000 },
  'spring-valley':  { lat: 32.7164, lng: -116.9989, radius: 2200 },
  'escondido':      { lat: 33.1192, lng: -117.0864, radius: 3500 },
};

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function NeighborhoodMap({ neighborhoods }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const layersRef = useRef<{ circles: any[]; labels: any[] }>({ circles: [], labels: [] });

  const activeHood = neighborhoods.find((n) => n.id === active);
  const visibleHoods = filter ? neighborhoods.filter((n) => n.areaType === filter) : neighborhoods;
  const animate = !prefersReducedMotion();

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    import('leaflet').then((L) => {
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!document.querySelector('style[data-nmap]')) {
        const s = document.createElement('style');
        s.setAttribute('data-nmap', '');
        s.textContent = '.nmap-tip{font-size:11px;padding:4px 7px;border-radius:5px;box-shadow:0 1px 4px rgba(0,0,0,.15);font-weight:600}.custom-marker{background:transparent!important;border:none!important}.leaflet-control-attribution{font-size:9px!important;opacity:.5}';
        document.head.appendChild(s);
      }
      requestAnimationFrame(() => {
        if (!mapRef.current) return;
        const map = L.map(mapRef.current, { center: [32.82, -117.10], zoom: 10, zoomControl: false, scrollWheelZoom: false });
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: 'abcd', maxZoom: 16,
        }).addTo(map);
        map.on('zoomend', () => {
          const z = map.getZoom();
          layersRef.current.labels.forEach((lbl) => { const el = lbl.getElement?.(); if (el) el.style.opacity = z >= 11 ? '1' : '0'; });
        });
        leafletMap.current = map;
        renderLayers(L, map, null, null);
      });
    });
    return () => { if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; } };
  }, []);

  useEffect(() => {
    if (!leafletMap.current) return;
    import('leaflet').then((L) => {
      [...layersRef.current.circles, ...layersRef.current.labels].forEach((l) => l.remove());
      layersRef.current = { circles: [], labels: [] };
      renderLayers(L, leafletMap.current, filter, active);
    });
  }, [filter, active]);

  function renderLayers(L: any, map: any, f: string | null, a: string | null) {
    const circles: any[] = [], labels: any[] = [];
    const zoom = map.getZoom();
    neighborhoods.forEach((hood) => {
      const geo = geoData[hood.id]; if (!geo) return;
      const tier = tierColors[hood.areaType];
      const isFiltered = f && hood.areaType !== f;
      const isActive = a === hood.id;
      const circle = L.circle([geo.lat, geo.lng], {
        radius: geo.radius, color: tier.color, weight: isActive ? 3 : 1.5,
        opacity: isFiltered ? 0.1 : (isActive ? 1 : 0.7),
        fillColor: tier.color, fillOpacity: isFiltered ? 0.03 : (isActive ? 0.4 : 0.18),
      }).addTo(map);
      circle.bindTooltip(`<strong>${hood.name}</strong><br/>${fmt(hood.medianPrice)}`, { direction: 'top', offset: [0, -10], className: 'nmap-tip' });
      const label = L.tooltip({ permanent: true, direction: 'center', className: 'nmap-tip', opacity: zoom >= 11 ? 1 : 0 })
        .setLatLng([geo.lat, geo.lng]).setContent(hood.name).addTo(map);
      if (isActive) { circle.openTooltip(); map.setView([geo.lat, geo.lng], 12, { animate }); }
      circle.on('click', () => { setActive(isActive ? null : hood.id); if (isActive) map.setView([32.82, -117.10], 10, { animate }); });
      circles.push(circle); labels.push(label);
    });
    layersRef.current = { circles, labels };
  }

  function resetView() { setActive(null); leafletMap.current?.setView([32.82, -117.10], 10, { animate }); }

  return (
    <div>
      {/* Filter pills — compact */}
      <div className="flex flex-wrap gap-1.5 mb-3" role="toolbar" aria-label="Filter by price tier">
        <button onClick={() => { setFilter(null); resetView(); }}
          className={`px-3 py-1.5 min-h-[44px] rounded-full text-xs font-medium transition-colors duration-150 cursor-pointer ${filter === null ? 'bg-primary-800 text-white' : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'}`}>
          All
        </button>
        {Object.entries(tierColors).map(([key, val]) => (
          <button key={key} onClick={() => { setFilter(filter === key ? null : key); resetView(); }}
            className={`px-3 py-1.5 min-h-[44px] rounded-full text-xs font-medium transition-colors duration-150 cursor-pointer flex items-center gap-1 ${filter === key ? 'bg-primary-800 text-white' : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'}`}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: val.color, display: 'inline-block', border: filter === key ? '1.5px solid white' : 'none', boxSizing: 'content-box' }} />
            {val.label}
          </button>
        ))}
      </div>

      {/* Side-by-side: map left, list right */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-4">
        {/* Map */}
        <div ref={mapRef} className="rounded-xl border border-neutral-200 overflow-hidden h-[260px] sm:h-[320px] lg:h-[400px]"
          role="application" aria-label="Interactive San Diego neighborhood map" />

        {/* Neighborhood list */}
        <div className="rounded-xl border border-neutral-200 overflow-hidden bg-white flex flex-col lg:h-[400px]">
          {/* Header */}
          <div className="px-3 py-1.5 bg-neutral-50 border-b border-neutral-100 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider grid grid-cols-[6px_1fr_auto_auto_auto] gap-2 items-center">
            <span />
            <span>Neighborhood</span>
            <span className="text-right w-14">Price</span>
            <span className="text-right w-16 hidden sm:block">Income/pp</span>
            <span className="text-right w-14 hidden sm:block" title="Median Household Income">HH Inc.</span>
          </div>
          {/* Rows */}
          <div className="overflow-y-auto flex-1">
            {visibleHoods.sort((a, b) => a.medianPrice - b.medianPrice).map((hood) => {
              const tier = tierColors[hood.areaType];
              const isActive = active === hood.id;
              const pci = perCapitaIncome[hood.id];
              const hhi = medianHHIncome[hood.id];
              return (
                <button key={hood.id}
                  onClick={() => {
                    if (isActive) { resetView(); } else {
                      setActive(hood.id);
                      const geo = geoData[hood.id];
                      if (geo && leafletMap.current) leafletMap.current.setView([geo.lat, geo.lng], 12, { animate });
                    }
                  }}
                  className={`w-full grid grid-cols-[6px_1fr_auto] sm:grid-cols-[6px_1fr_auto_auto_auto] gap-2 items-center px-3 py-2 min-h-[44px] text-left transition-colors duration-100 cursor-pointer border-b border-neutral-50 ${isActive ? '' : 'hover:bg-neutral-50'}`}
                  style={isActive ? { background: tier.bgHex, borderLeft: `3px solid ${tier.color}`, paddingLeft: 9 } : undefined}
                  aria-label={`${hood.name}: ${fmt(hood.medianPrice)}`} aria-pressed={isActive}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: tier.color, display: 'inline-block' }} />
                  <span className="flex flex-col leading-none">
                    <span className={`text-[13px] ${isActive ? 'font-bold text-primary-800' : 'font-medium text-neutral-800'}`}>{hood.name}</span>
                    <span className="text-[10px] text-neutral-400 mt-0.5">{hood.inCityOfSanDiego ? 'City of SD' : 'County'}</span>
                  </span>
                  <span className={`text-[13px] tabular-nums text-right w-14 ${isActive ? 'font-bold text-primary-800' : 'font-semibold text-neutral-700'}`}>
                    {fmtK(hood.medianPrice)}
                  </span>
                  <span className="text-[11px] tabular-nums text-right w-16 text-neutral-400 hidden sm:block">
                    {pci ? `$${Math.round(pci / 1000)}K` : '—'}
                  </span>
                  <span className="text-[11px] tabular-nums text-right w-14 text-neutral-400 hidden sm:block">
                    {hhi ? `$${Math.round(hhi / 1000)}K` : '—'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail card — appears below when active */}
      {activeHood && (
        <div className={`mt-3 rounded-xl p-4 border ${tierColors[activeHood.areaType].bg} ${tierColors[activeHood.areaType].border} transition-all duration-200`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: tierColors[activeHood.areaType].color, display: 'inline-block' }} />
              <h3 className="font-bold text-primary-800 text-base">{activeHood.name}</h3>
              <span className="text-xs text-neutral-400">{activeHood.inCityOfSanDiego ? 'City of San Diego' : 'SD County'} · ZIP {activeHood.zipCodes.join(', ')}</span>
            </div>
            <button onClick={resetView} className="text-neutral-400 hover:text-neutral-600 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center text-lg" aria-label="Close">&times;</button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-sm">
            <div><p className="text-neutral-400 text-[10px] uppercase tracking-wide">Home Price</p><p className="font-bold text-primary-800">{fmt(activeHood.medianPrice)}</p></div>
            <div><p className="text-neutral-400 text-[10px] uppercase tracking-wide">Income/pp</p><p className="font-semibold text-neutral-800">{perCapitaIncome[activeHood.id] ? fmt(perCapitaIncome[activeHood.id]) : '—'}</p></div>
            <div><p className="text-neutral-400 text-[10px] uppercase tracking-wide">HH Income</p><p className="font-semibold text-neutral-800">{medianHHIncome[activeHood.id] ? fmt(medianHHIncome[activeHood.id]) : '—'}</p></div>
            <div><p className="text-neutral-400 text-[10px] uppercase tracking-wide">Tax Rate</p><p className="font-semibold text-neutral-800">{activeHood.typicalPropertyTaxRate}%</p></div>
            <div><p className="text-neutral-400 text-[10px] uppercase tracking-wide">DPA</p><p className="font-semibold text-neutral-800">{activeHood.inCityOfSanDiego ? 'SDHC + State' : 'County + State'}</p></div>
            <div><p className="text-neutral-400 text-[10px] uppercase tracking-wide">Mello-Roos</p><p className="font-semibold text-neutral-800">{activeHood.hasMelloRoos ? 'Likely' : 'Unlikely'}</p></div>
          </div>
          <a href="/tools/dpa-finder/" className="mt-3 inline-block text-xs font-semibold text-accent-600 hover:text-accent-700 no-underline">
            Show me my 3 programs for {activeHood.name} &rarr;
          </a>
        </div>
      )}

      <p className="text-[10px] text-neutral-400 mt-3">
        Approximate medians &amp; ACS income estimates. Tap a region or row for details. DPA eligibility depends on City of San Diego vs. County.
      </p>
    </div>
  );
}
