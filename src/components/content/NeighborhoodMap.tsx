import React, { useState } from 'react';

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

const tierColors: Record<string, { bg: string; border: string; label: string; dot: string }> = {
  entry_level: { bg: 'bg-green-50', border: 'border-green-300', label: 'Entry-level', dot: 'bg-green-500' },
  mid_range: { bg: 'bg-accent-50', border: 'border-accent-300', label: 'Mid-range', dot: 'bg-accent-500' },
  higher: { bg: 'bg-warm-50', border: 'border-warm-300', label: 'Higher', dot: 'bg-warm-500' },
  premium: { bg: 'bg-primary-50', border: 'border-primary-300', label: 'Premium', dot: 'bg-primary-500' },
};

// Positions spread to avoid overlap — min 8% apart in tight clusters
const positions: Record<string, { x: number; y: number }> = {
  'la-jolla': { x: 20, y: 30 },
  'del-mar': { x: 24, y: 16 },
  'pacific-beach': { x: 15, y: 40 },
  'clairemont': { x: 30, y: 32 },
  'hillcrest': { x: 28, y: 44 },
  'north-park': { x: 38, y: 42 },
  'city-heights': { x: 46, y: 50 },
  'encanto': { x: 44, y: 60 },
  'national-city': { x: 36, y: 66 },
  'chula-vista': { x: 42, y: 76 },
  'mira-mesa': { x: 40, y: 22 },
  'santee': { x: 62, y: 38 },
  'el-cajon': { x: 60, y: 50 },
  'la-mesa': { x: 52, y: 54 },
  'spring-valley': { x: 54, y: 64 },
  'escondido': { x: 54, y: 12 },
};

export default function NeighborhoodMap({ neighborhoods }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = filter
    ? neighborhoods.filter((n) => n.areaType === filter)
    : neighborhoods;

  const activeHood = neighborhoods.find((n) => n.id === active);

  return (
    <div>
      {/* Filter pills — 44px min touch targets */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilter(null)}
          className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            filter === null ? 'bg-primary-800 text-white' : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
          }`}
        >
          All areas
        </button>
        {Object.entries(tierColors).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setFilter(filter === key ? null : key)}
            className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              filter === key ? 'bg-primary-800 text-white' : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${val.dot}`} />
            {val.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Map — 3:2 on mobile, 4:3 on desktop */}
        <div
          className="relative bg-primary-50 rounded-xl border border-primary-100 overflow-hidden aspect-[3/2] lg:aspect-[4/3]"
        >
          {/* Ocean label — AA contrast */}
          <div className="absolute left-3 bottom-3 text-sm text-primary-400 font-medium italic">Pacific Ocean</div>

          {/* Coastline hint */}
          <div
            className="absolute inset-y-0 left-0 w-[15%]"
            style={{ background: 'linear-gradient(to right, rgba(14,154,167,0.08), transparent)' }}
          />

          {/* Dots — 44px touch target via button sizing */}
          {neighborhoods.map((hood) => {
            const pos = positions[hood.id];
            if (!pos) return null;
            const tier = tierColors[hood.areaType];
            const isFiltered = filter && hood.areaType !== filter;
            const isActive = active === hood.id;

            return (
              <button
                key={hood.id}
                onClick={() => setActive(isActive ? null : hood.id)}
                className="absolute cursor-pointer group flex items-center justify-center w-11 h-11"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  opacity: isFiltered ? 0.15 : 1,
                  transition: 'opacity 200ms',
                }}
                aria-label={`${hood.name}: ${fmt(hood.medianPrice)}`}
              >
                <span
                  className={`block rounded-full transition-all ${tier.dot} ${
                    isActive ? 'w-4 h-4 ring-2 ring-white ring-offset-1' : 'w-2.5 h-2.5 group-hover:w-3.5 group-hover:h-3.5'
                  }`}
                />
                <span
                  className={`absolute top-full left-1/2 -translate-x-1/2 mt-0.5 whitespace-nowrap text-xs font-medium transition-opacity pointer-events-none ${
                    isActive ? 'opacity-100 text-primary-800' : 'opacity-0 group-hover:opacity-100 text-neutral-600'
                  }`}
                >
                  {hood.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Neighborhood list / detail — capped height on mobile */}
        <div>
          {activeHood ? (
            <div className={`rounded-xl p-5 border ${tierColors[activeHood.areaType].bg} ${tierColors[activeHood.areaType].border}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-primary-800 text-lg">{activeHood.name}</h3>
                <button
                  onClick={() => setActive(null)}
                  className="text-neutral-400 hover:text-neutral-600 text-sm cursor-pointer py-2 px-3"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-neutral-500">Median price</p>
                  <p className="font-bold text-primary-800 text-lg">{fmt(activeHood.medianPrice)}</p>
                </div>
                <div>
                  <p className="text-neutral-500">Property tax rate</p>
                  <p className="font-semibold text-neutral-800">{activeHood.typicalPropertyTaxRate}%</p>
                </div>
                <div>
                  <p className="text-neutral-500">City of SD (DPA eligible)</p>
                  <p className="font-semibold text-neutral-800">{activeHood.inCityOfSanDiego ? 'Yes — SDHC programs' : 'No — County programs'}</p>
                </div>
                <div>
                  <p className="text-neutral-500">Mello-Roos</p>
                  <p className="font-semibold text-neutral-800">{activeHood.hasMelloRoos ? 'Likely' : 'Unlikely'}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-neutral-200 text-xs text-neutral-500">
                ZIP codes: {activeHood.zipCodes.join(', ')}
              </div>
              <a href="/tools/affordability-calculator/" className="mt-3 inline-block text-sm font-medium text-accent-600 hover:text-accent-700">
                See what you can afford here →
              </a>
            </div>
          ) : (
            <div className="space-y-1 max-h-[360px] overflow-y-auto lg:max-h-none">
              {filtered
                .sort((a, b) => a.medianPrice - b.medianPrice)
                .map((hood) => {
                  const tier = tierColors[hood.areaType];
                  return (
                    <button
                      key={hood.id}
                      onClick={() => setActive(hood.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm hover:bg-neutral-100 transition-colors cursor-pointer group min-h-[44px]"
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${tier.dot} flex-shrink-0`} />
                        <span className="font-medium text-neutral-800 group-hover:text-primary-800">{hood.name}</span>
                      </span>
                      <span className="font-semibold text-neutral-600">{fmt(hood.medianPrice)}</span>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-neutral-500 mt-3">
        Approximate medians. Tap a dot or name to see details. DPA eligibility depends on whether the property is in the City of San Diego.
      </p>
    </div>
  );
}
