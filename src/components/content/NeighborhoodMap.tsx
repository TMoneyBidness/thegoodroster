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

// Approximate lat/lng positions mapped to % for the SVG overlay
// These place each neighborhood roughly on a San Diego county map
const positions: Record<string, { x: number; y: number }> = {
  'la-jolla': { x: 22, y: 32 },
  'del-mar': { x: 24, y: 20 },
  'pacific-beach': { x: 18, y: 38 },
  'clairemont': { x: 30, y: 34 },
  'hillcrest': { x: 32, y: 42 },
  'north-park': { x: 36, y: 44 },
  'city-heights': { x: 40, y: 48 },
  'encanto': { x: 42, y: 56 },
  'national-city': { x: 38, y: 62 },
  'chula-vista': { x: 40, y: 72 },
  'mira-mesa': { x: 38, y: 24 },
  'santee': { x: 58, y: 40 },
  'el-cajon': { x: 56, y: 48 },
  'la-mesa': { x: 48, y: 50 },
  'spring-valley': { x: 50, y: 58 },
  'escondido': { x: 50, y: 14 },
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
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilter(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
            filter === null ? 'bg-primary-800 text-white' : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
          }`}
        >
          All areas
        </button>
        {Object.entries(tierColors).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setFilter(filter === key ? null : key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              filter === key ? 'bg-primary-800 text-white' : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${val.dot}`} />
            {val.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Map visualization */}
        <div className="relative bg-primary-50 rounded-xl border border-primary-100 overflow-hidden" style={{ aspectRatio: '4/3' }}>
          {/* Ocean label */}
          <div className="absolute left-2 bottom-3 text-xs text-primary-300 font-medium italic">Pacific Ocean</div>

          {/* Coastline hint */}
          <div
            className="absolute inset-y-0 left-0 w-[15%]"
            style={{ background: 'linear-gradient(to right, rgba(14,154,167,0.08), transparent)' }}
          />

          {/* Dots */}
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
                className="absolute cursor-pointer group"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  opacity: isFiltered ? 0.2 : 1,
                  transition: 'opacity 200ms, transform 200ms',
                }}
                aria-label={`${hood.name}: ${fmt(hood.medianPrice)}`}
              >
                <span
                  className={`block rounded-full transition-all ${tier.dot} ${
                    isActive ? 'w-5 h-5 ring-2 ring-white ring-offset-1' : 'w-3 h-3 group-hover:w-4 group-hover:h-4'
                  }`}
                />
                <span
                  className={`absolute left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap text-xs font-medium transition-opacity ${
                    isActive ? 'opacity-100 text-primary-800' : 'opacity-0 group-hover:opacity-100 text-neutral-600'
                  }`}
                >
                  {hood.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Neighborhood list / detail */}
        <div>
          {activeHood ? (
            <div className={`rounded-xl p-5 border ${tierColors[activeHood.areaType].bg} ${tierColors[activeHood.areaType].border}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-primary-800 text-lg">{activeHood.name}</h3>
                <button
                  onClick={() => setActive(null)}
                  className="text-neutral-400 hover:text-neutral-600 text-sm cursor-pointer"
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
                  <p className="font-semibold text-neutral-800">{activeHood.inCityOfSanDiego ? 'Yes — SDHC programs apply' : 'No — County programs apply'}</p>
                </div>
                <div>
                  <p className="text-neutral-500">Mello-Roos</p>
                  <p className="font-semibold text-neutral-800">{activeHood.hasMelloRoos ? 'Likely — newer developments' : 'Unlikely'}</p>
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
            <div className="space-y-1.5">
              {filtered
                .sort((a, b) => a.medianPrice - b.medianPrice)
                .map((hood) => {
                  const tier = tierColors[hood.areaType];
                  return (
                    <button
                      key={hood.id}
                      onClick={() => setActive(hood.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm hover:bg-neutral-100 transition-colors cursor-pointer group"
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

      {/* Legend */}
      <p className="text-xs text-neutral-400 mt-3">
        Prices are approximate medians. Tap a dot or name to see details. DPA eligibility depends on whether the property is in the City of San Diego.
      </p>
    </div>
  );
}
