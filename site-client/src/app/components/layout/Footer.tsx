// ══════════════════════════════════════════════════════════════════
// ПОДВАЛ САЙТА
// Контакты компании · список всех 8 решений · ссылки на секции
// ══════════════════════════════════════════════════════════════════

import { Phone, Mail, MapPin } from "lucide-react";
import { OlanLogo } from "../ui/OlanLogo";
import type { NavigateFn } from "../../types";
import { useLang } from "../../i18n/LangContext";

// ─── ПОДВАЛ ──────────────────────────────────────────────────────────────────

export function Footer({ navigate }: { navigate: NavigateFn }) {
  const { t, content } = useLang();
  const problems = content?.problems || [];
  const company = content?.company || {};
  const companyLinks = [
    { label: t.nav.problems, go: () => navigate("home", "problems") },
    { label: t.nav.projects, go: () => navigate("home", "projects") },
    { label: t.nav.geography, go: () => navigate("home", "geography") },
    { label: t.nav.partners, go: () => navigate("home", "partners") },
    { label: "ISO", go: () => navigate("home", "certs") },
    { label: t.nav.contacts, go: () => navigate("home", "contact") },
  ];

  return (
    <footer className="tech-grid" style={{ background: "var(--void)", borderTop: "1px solid var(--line)" }}>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <button onClick={() => navigate("home")} className="flex items-center gap-3 mb-5">
              <OlanLogo size={40} title={company.name || "OLAN HIGH TECH PROJECT"} />
              <span className="font-display font-bold text-sm tracking-[0.12em]" style={{ color: "var(--txt)" }}>
                {company.name || "OLAN HIGH TECH PROJECT"}
              </span>
            </button>
            <p className="text-sm leading-relaxed max-w-sm mb-7" style={{ color: "var(--txt-2)" }}>
              {company.about || ""}
            </p>
            <div className="flex flex-col gap-3">
              {[
                { icon: Phone, text: company.phone || "" },
                { icon: Mail, text: company.email || "" },
                { icon: MapPin, text: company.address || "" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="font-tele flex items-center gap-3 text-xs" style={{ color: "var(--txt-2)" }}>
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--cyan)" }} />
                  {text}
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-4 md:col-start-7">
            <h4 className="font-tele text-[11px] font-medium tracking-[0.22em] uppercase mb-5" style={{ color: "var(--cyan)" }}>{t.footer.solutions}</h4>
            <ul className="flex flex-col gap-3">
              {problems.map((p: any) => (
                <li key={p.id}>
                  <button
                    onClick={() => navigate(p.id)}
                    className="text-sm text-left transition-colors duration-150"
                    style={{ color: "var(--txt-2)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--orange)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--txt-2)"; }}
                  >
                    <span className="font-tele text-[10px] mr-2" style={{ color: "var(--txt-3)" }}>{p.code}</span>
                    {p.title.split(" ").slice(0, 4).join(" ")}…
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-tele text-[11px] font-medium tracking-[0.22em] uppercase mb-5" style={{ color: "var(--cyan)" }}>{t.footer.company}</h4>
            <ul className="flex flex-col gap-3">
              {companyLinks.map((l) => (
                <li key={l.label}>
                  <button
                    onClick={l.go}
                    className="text-sm text-left transition-colors duration-150"
                    style={{ color: "var(--txt-2)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--orange)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--txt-2)"; }}
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderTop: "1px solid var(--line-soft)" }}>
          <p className="font-tele text-[11px]" style={{ color: "var(--txt-3)" }}>
            © 2026 {company.name || "OLAN HIGH TECH PROJECT"}. {t.footer.rights}
          </p>
          <p className="font-tele text-[11px]" style={{ color: "var(--txt-3)" }}>
            {t.footer.legal}
          </p>
        </div>
      </div>
    </footer>
  );
}
