// ══════════════════════════════════════════════════════════════════
// КАРТА МИРА — секция «География работы»
// Подсвечивает страны СНГ (CIS_IDS) и ставит пульсирующие маркеры
// на города проектов (projectMarkers из data/company.ts)
// ══════════════════════════════════════════════════════════════════

import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import worldData from "world-atlas/countries-110m.json";
import { useLang } from "../../i18n/LangContext";

export function WorldMap() {
  const { t, content } = useLang();
  // страны и города берутся из админ-панели
  const CIS_IDS = new Set<string>((content?.countries || []).map((c: any) => c.iso).filter(Boolean));
  const projectMarkers = content?.projectMarkers || [];
  return (
    <div className="hud overflow-hidden" style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--panel-2)", boxShadow: "var(--card-shadow)" }}>
      <div className="font-tele flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 md:px-5 py-3 text-[9px] md:text-[10px] tracking-[0.14em] md:tracking-[0.18em] uppercase" style={{ borderBottom: "1px solid var(--line-soft)", color: "var(--txt-3)" }}>
        <span>{t.geo.mapNote}</span>
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--map-cis)" }} /> {t.geo.legendWork}</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "var(--orange)" }} /> {t.geo.legendProjects}</span>
        </span>
      </div>
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ scale: 150, center: [25, 12] }}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={worldData as any}>
          {({ geographies }: { geographies: any[] }) =>
            geographies.map((geo) => {
              const isCis = CIS_IDS.has(String(geo.id).padStart(3, "0"));
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    default: { fill: isCis ? "var(--map-cis)" : "var(--map-land)", stroke: "var(--map-stroke)", strokeWidth: 0.4, outline: "none" },
                    hover: { fill: isCis ? "var(--map-cis-hover)" : "var(--map-land)", stroke: "var(--map-stroke)", strokeWidth: 0.4, outline: "none" },
                    pressed: { fill: isCis ? "var(--map-cis-hover)" : "var(--map-land)", outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
        {projectMarkers.map(({ name, coordinates }: any) => (
          <Marker key={name} coordinates={coordinates}>
            <circle className="map-pulse" r={4} fill="none" stroke="var(--orange)" strokeWidth={1.5} />
            <circle r={3} fill="var(--orange)" stroke="#fff" strokeWidth={1} />
          </Marker>
        ))}
      </ComposableMap>
    </div>
  );
}
