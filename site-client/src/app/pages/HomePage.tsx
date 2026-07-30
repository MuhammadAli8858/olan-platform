// ══════════════════════════════════════════════════════════════════
// ГЛАВНАЯ СТРАНИЦА
// Секции сверху вниз (у каждой свой класс — легко найти в инспекторе):
//   .oht-hero       — хиро с консолью мониторинга
//   .oht-problems   — сетка 8 проблем (id="problems")
//   .oht-trust-bar  — полоса цифр доверия
//   .oht-clients    — гос-заказы / частный сектор / международные
//   .oht-geography  — карта мира, страны СНГ (id="geography")
//   .oht-projects   — 4 кейса (id="projects")
//   .oht-partners   — партнёры (id="partners")
//   .oht-certs      — сертификаты (id="certs")
//   .oht-contact    — форма заявки (id="contact")
// ══════════════════════════════════════════════════════════════════

import { ArrowRight, Landmark, Briefcase, Globe2, Shield, Award, Clock, Zap } from "lucide-react";
import { Eyebrow } from "../components/ui/Eyebrow";
import { PrimaryButton, GhostButton } from "../components/ui/Buttons";
import { ContactForm } from "../components/ui/ContactForm";
import { MonitoringConsole } from "../components/console/MonitoringConsole";
import { WorldMap } from "../components/map/WorldMap";
import type { NavigateFn } from "../types";
import { useLang } from "../i18n/LangContext";
import { getIcon } from "../lib/icons";
import { API_URL } from "../config";

// ─── ГЛАВНАЯ СТРАНИЦА ────────────────────────────────────────────────────────

export function HomePage({ navigate }: { navigate: NavigateFn }) {
  // Всё содержимое приходит из админ-панели (или из встроенных данных,
  // если сервер недоступен). Надписи интерфейса — из словаря переводов.
  const { t, content } = useLang();
  const problems = content?.problems || [];
  const stats = content?.stats || [];
  const partners = content?.partners || [];
  const projects = content?.projects || [];
  const countries = content?.countries || [];
  const certs = content?.certs || [];
  const hero = content?.hero || {};

  return (
    <>
      {/* ── Хиро: командный центр ─────────────────────────────────────────── */}
      <section className="oht-hero tech-grid relative min-h-screen flex items-center overflow-hidden" style={{ background: "var(--void)" }}>
        <div className="absolute pointer-events-none" style={{ top: "-20%", right: "-10%", width: "60%", height: "80%", background: "radial-gradient(circle, var(--cyan-dim), transparent 65%)" }} />
        <div className="absolute pointer-events-none" style={{ bottom: "-30%", left: "-10%", width: "50%", height: "70%", background: "radial-gradient(circle, var(--orange-dim), transparent 65%)" }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 md:pt-36 pb-16 md:pb-20 w-full">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="font-tele inline-flex items-center gap-2.5 px-4 py-2 mb-9 rounded-full text-[11px] font-medium tracking-[0.22em] uppercase" style={{ background: "var(--cyan-dim)", border: "1px solid var(--cyan-border)", color: "var(--cyan)" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--cyan)", animation: "pulse-dot 1.8s infinite" }} />
                {hero.badge}
              </div>

              <h1 className="font-display font-bold uppercase mb-7" style={{ color: "var(--txt)", fontSize: "clamp(2.5rem, 8vw, 5rem)", lineHeight: 1.06, letterSpacing: "0.01em" }}>
                {hero.titleLine1}
                <br />
                <span style={{ color: "var(--orange)" }}>{hero.titleAccent}</span>
                <br />
                {hero.titleLine3}
              </h1>

              <p className="text-lg lg:text-xl leading-relaxed mb-10 max-w-xl" style={{ color: "var(--txt-2)" }}>
                {hero.lead}
              </p>

              <div className="flex flex-col sm:flex-row flex-wrap gap-4">
                <PrimaryButton onClick={() => navigate("home", "problems")}>
                  {t.hero.btnProblems} <ArrowRight className="w-4 h-4" />
                </PrimaryButton>
                <GhostButton onClick={() => navigate("home", "projects")}>{t.hero.btnProjects}</GhostButton>
              </div>
            </div>

            <div className="lg:col-span-5">
              <MonitoringConsole />
            </div>
          </div>
        </div>
      </section>

      {/* ── Сетка проблем ─────────────────────────────────────────────────── */}
      <section id="problems" className="oht-problems" style={{ background: "var(--panel)", padding: "clamp(64px, 12vw, 110px) 0", borderTop: "1px solid var(--line)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-14 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <Eyebrow>{t.problems.eyebrow}</Eyebrow>
              <h2 className="font-display font-bold uppercase max-w-2xl" style={{ color: "var(--txt)", fontSize: "clamp(2.6rem, 5vw, 4rem)", lineHeight: 1.08 }}>
                {t.problems.title}
              </h2>
            </div>
            <p className="font-tele text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--txt-3)" }}>
              {problems.length} {t.problems.note}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {problems.map((problem: any) => {
              const Icon = getIcon(problem.icon);
              return (
                <button
                  key={problem.id}
                  onClick={() => navigate(problem.id)}
                  className="hud group relative text-left p-7 transition-all duration-300 overflow-hidden"
                  style={{ borderRadius: "var(--r-lg)", background: "var(--panel-2)", border: "1px solid var(--line)", boxShadow: "var(--card-shadow)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--orange-border)"; e.currentTarget.style.background = "var(--panel-hover)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.background = "var(--panel-2)"; e.currentTarget.style.transform = "none"; }}
                >
                  <div className="flex items-start justify-between mb-7">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--cyan-dim)", border: "1px solid var(--cyan-border)" }}>
                      <Icon className="w-5 h-5" style={{ color: "var(--cyan)" }} />
                    </div>
                    <span className="font-tele text-[10px] tracking-[0.2em]" style={{ color: "var(--txt-3)" }}>{problem.code}</span>
                  </div>

                  <h3 className="font-display font-bold text-xl uppercase mb-3" style={{ color: "var(--txt)", lineHeight: 1.18 }}>
                    {problem.title}
                  </h3>
                  <p className="text-sm leading-relaxed mb-7" style={{ color: "var(--txt-2)" }}>
                    {problem.short}
                  </p>

                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--orange)" }}>
                    {t.problems.cta}
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Полоса доверия ────────────────────────────────────────────────── */}
      <section className="oht-trust-bar tech-grid" style={{ background: "var(--void)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "clamp(48px, 9vw, 76px) 0" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-6">
            {stats.map((s: any, i: number) => (
              <div key={s.value} className={`relative px-2 lg:px-6 ${i > 0 ? "lg:border-l" : ""}`} style={{ borderColor: "var(--line-soft)" }}>
                <div className="font-tele text-[10px] tracking-[0.2em] mb-3" style={{ color: "var(--cyan)" }}>
                  {String(i + 1).padStart(2, "0")} /
                </div>
                <div className="font-display font-bold uppercase mb-2" style={{ fontSize: "clamp(2.4rem, 6vw, 3.6rem)", color: "var(--txt)", lineHeight: 1 }}>
                  {s.value}
                </div>
                <div className="text-sm" style={{ color: "var(--txt-2)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Заказчики: гос + частные ──────────────────────────────────────── */}
      <section className="oht-clients" style={{ background: "var(--panel)", padding: "clamp(56px, 11vw, 100px) 0" }}>
        <div className="max-w-7xl mx-auto px-6">
          <Eyebrow>{t.clients.eyebrow}</Eyebrow>
          <h2 className="font-display font-bold uppercase mb-12 max-w-3xl" style={{ color: "var(--txt)", fontSize: "clamp(2.2rem, 4vw, 3.2rem)", lineHeight: 1.08 }}>
            {t.clients.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: Landmark, title: t.clients.govTitle, desc: t.clients.govText },
              { icon: Briefcase, title: t.clients.privTitle, desc: t.clients.privText },
              { icon: Globe2, title: t.clients.intlTitle, desc: t.clients.intlText },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="hud p-8" style={{ borderRadius: "var(--r-lg)", background: "var(--panel-2)", border: "1px solid var(--line)", boxShadow: "var(--card-shadow)" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6" style={{ background: "var(--orange-dim)", border: "1px solid var(--orange-border)" }}>
                  <Icon className="w-5 h-5" style={{ color: "var(--orange)" }} />
                </div>
                <h3 className="font-display font-bold text-2xl uppercase mb-3" style={{ color: "var(--txt)", lineHeight: 1.15 }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--txt-2)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── География: карта мира ─────────────────────────────────────────── */}
      <section id="geography" className="oht-geography tech-grid" style={{ background: "var(--void)", borderTop: "1px solid var(--line)", padding: "clamp(64px, 12vw, 110px) 0" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4">
              <Eyebrow>{t.geo.eyebrow}</Eyebrow>
              <h2 className="font-display font-bold uppercase mb-6" style={{ color: "var(--txt)", fontSize: "clamp(2.2rem, 4vw, 3.2rem)", lineHeight: 1.08 }}>
                {t.geo.title}
              </h2>
              <p className="text-base leading-relaxed mb-8" style={{ color: "var(--txt-2)" }}>
                Наши комплексы работают в 6 странах Содружества — от Минска до Душанбе. Мы знаем специфику дорог, климата и законодательства региона, а платформа готова к масштабированию в любую страну мира.
              </p>
              <div className="flex flex-wrap gap-2">
                {countries.map((c: any) => (
                  <span key={c.name || c} className="font-tele px-3.5 py-1.5 rounded-full text-[11px] tracking-wider" style={{ border: "1px solid var(--cyan-border)", color: "var(--cyan)", background: "var(--cyan-dim)" }}>
                    {c.name || c}
                  </span>
                ))}
              </div>
            </div>
            <div className="lg:col-span-8">
              <WorldMap />
            </div>
          </div>
        </div>
      </section>

      {/* ── Проекты ───────────────────────────────────────────────────────── */}
      <section id="projects" className="oht-projects" style={{ background: "var(--panel)", borderTop: "1px solid var(--line)", padding: "clamp(64px, 12vw, 110px) 0" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-14 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <Eyebrow color="var(--orange)">{t.projects.eyebrow}</Eyebrow>
              <h2 className="font-display font-bold uppercase max-w-2xl" style={{ color: "var(--txt)", fontSize: "clamp(2.4rem, 4.5vw, 3.6rem)", lineHeight: 1.08 }}>
                {t.projects.title}
              </h2>
            </div>
            <p className="font-tele text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--txt-3)" }}>
              {projects.length} {t.projects.note}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {projects.map((pr: any) => (
              <div
                key={pr.city}
                className="hud p-8 transition-all duration-300"
                style={{ borderRadius: "var(--r-lg)", background: "var(--panel-2)", border: "1px solid var(--line)", boxShadow: "var(--card-shadow)" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden>{pr.flag}</span>
                    <div>
                      <div className="font-display font-bold text-lg uppercase" style={{ color: "var(--txt)", lineHeight: 1.1 }}>{pr.city}</div>
                      <div className="font-tele text-[10px] tracking-[0.2em] uppercase" style={{ color: "var(--orange)" }}>{pr.country}</div>
                    </div>
                  </div>
                  <span className="font-tele text-[10px] tracking-[0.2em] px-3 py-1.5 rounded-full" style={{ border: "1px solid var(--green)", color: "var(--green)" }}>
                    {t.projects.status}
                  </span>
                </div>
                <h3 className="font-display font-bold text-2xl uppercase mb-3" style={{ color: "var(--txt)", lineHeight: 1.15 }}>{pr.title}</h3>
                <p className="text-sm leading-relaxed mb-7" style={{ color: "var(--txt-2)" }}>{pr.desc}</p>
                <div className="flex gap-8 pt-5" style={{ borderTop: "1px solid var(--line-soft)" }}>
                  {(pr.metrics || []).map((m: any) => (
                    <div key={m.l}>
                      <div className="font-display font-bold text-3xl" style={{ color: "var(--orange)", lineHeight: 1 }}>{m.v}</div>
                      <div className="font-tele text-[10px] tracking-wider uppercase mt-1.5" style={{ color: "var(--txt-2)" }}>{m.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Партнёры: логотип/фото + название + описание ─────────────────── */}
      <section id="partners" className="oht-partners tech-grid" style={{ background: "var(--void)", borderTop: "1px solid var(--line)", padding: "clamp(56px, 11vw, 100px) 0" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <Eyebrow>{t.partners.eyebrow}</Eyebrow>
            <h2 className="font-display font-bold uppercase" style={{ color: "var(--txt)", fontSize: "clamp(2.2rem, 4vw, 3.2rem)", lineHeight: 1.08 }}>
              {t.partners.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {partners.map((p: any) => (
              <div
                key={p.name}
                className="hud flex flex-col overflow-hidden transition-all duration-250"
                style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--panel-2)", boxShadow: "var(--card-shadow)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--cyan-border)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.transform = "none"; }}
              >
                {/* Место для логотипа или фото партнёра.
                    Картинка загружается в админ-панели (поле «Логотип»). */}
                <div
                  className="flex items-center justify-center"
                  style={{ height: 132, background: "var(--chip-bg)", borderBottom: "1px solid var(--line-soft)", padding: 18 }}
                >
                  {p.logo ? (
                    <img
                      src={p.logo.startsWith("http") ? p.logo : `${API_URL}${p.logo}`}
                      alt={p.name}
                      style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <span className="font-display font-bold tracking-[0.14em] text-lg text-center" style={{ color: "var(--txt-2)" }}>
                      {p.name}
                    </span>
                  )}
                </div>

                <div className="p-6 flex flex-col gap-2 flex-1">
                  <span className="font-display font-bold tracking-[0.1em] text-base" style={{ color: "var(--txt)" }}>{p.name}</span>
                  <span className="font-tele text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--cyan)" }}>{p.tag}</span>
                  {p.description && (
                    <p className="text-sm leading-relaxed mt-1" style={{ color: "var(--txt-2)" }}>{p.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Сертификаты ───────────────────────────────────────────────────── */}
      <section id="certs" className="oht-certs" style={{ background: "var(--panel)", borderTop: "1px solid var(--line)", padding: "clamp(40px, 8vw, 64px) 0" }}>
        <div className="max-w-7xl mx-auto px-6">
          <p className="font-tele text-center text-[11px] tracking-[0.24em] uppercase mb-9" style={{ color: "var(--txt-3)" }}>
            {t.certs.title}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {certs.map((cert: string) => (
              <div key={cert} className="font-tele flex items-center gap-2.5 px-5 py-2.5 rounded-full text-xs" style={{ border: "1px solid var(--line)", color: "var(--txt-2)", background: "var(--chip-bg)" }}>
                <Award className="w-3.5 h-3.5" style={{ color: "var(--cyan)" }} />
                {cert}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Контакты ──────────────────────────────────────────────────────── */}
      <section id="contact" className="oht-contact" style={{ background: "var(--void)", borderTop: "1px solid var(--line)", padding: "clamp(64px, 12vw, 110px) 0" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <Eyebrow color="var(--orange)">{t.contact.eyebrow}</Eyebrow>
              <h2 className="font-display font-bold uppercase mb-6" style={{ color: "var(--txt)", fontSize: "clamp(2.5rem, 5vw, 3.6rem)", lineHeight: 1.08 }}>
                {t.contact.title}
              </h2>
              <p className="text-base leading-relaxed mb-10" style={{ color: "var(--txt-2)" }}>
                {t.contact.text}
              </p>
              <div className="flex flex-col gap-4">
                {[
                  { icon: Shield, text: t.contact.adv1 },
                  { icon: Award, text: t.contact.adv2 },
                  { icon: Clock, text: t.contact.adv3 },
                  { icon: Zap, text: t.contact.adv4 },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "var(--cyan)" }} />
                    <span className="text-sm" style={{ color: "var(--txt-2)" }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hud p-6 md:p-8 lg:p-10" style={{ borderRadius: "var(--r-lg)", background: "var(--panel-2)", border: "1px solid var(--line)", boxShadow: "var(--card-shadow)" }}>
              <div className="font-tele text-[10px] tracking-[0.22em] uppercase mb-3" style={{ color: "var(--cyan)" }}>
                {t.contact.formNote}
              </div>
              <h3 className="font-display font-bold uppercase text-3xl mb-7" style={{ color: "var(--txt)" }}>
                {t.contact.formTitle}
              </h3>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
