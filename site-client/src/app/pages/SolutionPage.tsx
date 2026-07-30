// ══════════════════════════════════════════════════════════════════
// УНИВЕРСАЛЬНАЯ СТРАНИЦА РЕШЕНИЯ (одна на все 8 проблем)
// Контент подставляется из src/app/data/solutions.ts по id проблемы.
// Секции сверху вниз (у каждой свой класс):
//   .sol-hero          — заголовок-боль + подводка
//   .sol-problem-stats — 3 факта о проблеме с источниками
//   .sol-solution      — продукт, продающий текст, преимущества, техпаспорт
//   .sol-process       — 4 этапа внедрения
//   .sol-results       — 4 измеримых результата
//   .sol-cta           — призыв + форма заявки
//   .sol-related       — смежные решения
// ══════════════════════════════════════════════════════════════════

import { AlertTriangle, ArrowRight } from "lucide-react";
import { Eyebrow } from "../components/ui/Eyebrow";
import { ContactForm } from "../components/ui/ContactForm";
import { Breadcrumbs } from "../components/solution/Breadcrumbs";
import { SpecPanel } from "../components/solution/SpecPanel";
import type { NavigateFn } from "../types";
import { useLang } from "../i18n/LangContext";
import { getIcon } from "../lib/icons";

export function SolutionPage({ problem, navigate }: { problem: any; navigate: NavigateFn }) {
  const { t, content: site } = useLang();
  const problems = site?.problems || [];
  const processSteps = site?.processSteps || [];
  const content = site?.solutions?.[problem.id];
  const related = problems.filter((p: any) => p.id !== problem.id).slice(0, 3);
  const Icon = getIcon(problem.icon);

  // если для решения ещё нет описания — показываем короткую заглушку
  if (!content) {
    return (
      <section className="tech-grid" style={{ background: "var(--void)", paddingTop: 170, paddingBottom: 100 }}>
        <div className="max-w-7xl mx-auto px-6">
          <Breadcrumbs navigate={navigate} current={problem.code} />
          <h1 className="font-display font-bold uppercase" style={{ color: "var(--txt)", fontSize: "clamp(2rem, 5vw, 3.4rem)", lineHeight: 1.08 }}>
            {problem.title}
          </h1>
          <p className="text-lg mt-5 max-w-2xl" style={{ color: "var(--txt-2)" }}>{problem.short}</p>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* ── Хиро проблемы ─────────────────────────────────────────────────── */}
      <section className="sol-hero tech-grid relative overflow-hidden" style={{ paddingTop: "clamp(120px, 22vw, 170px)", paddingBottom: "clamp(48px, 10vw, 84px)", background: "var(--void)" }}>
        <div className="absolute pointer-events-none" style={{ top: "-30%", right: "-15%", width: "60%", height: "100%", background: "radial-gradient(circle, var(--red-dim), transparent 65%)" }} />
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <Breadcrumbs navigate={navigate} current={problem.code} />

          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8" style={{ background: "var(--cyan-dim)", border: "1px solid var(--cyan-border)" }}>
            <Icon className="w-6 h-6" style={{ color: "var(--cyan)" }} />
          </div>

          <div className="font-tele inline-flex items-center gap-2.5 px-4 py-2 mb-8 rounded-full text-[11px] font-medium tracking-[0.2em] uppercase" style={{ background: "var(--red-dim)", border: "1px solid var(--red-border)", color: "var(--red)" }}>
            <AlertTriangle className="w-3.5 h-3.5" />
            {t.sol.problem} {problem.code}
          </div>

          <h1 className="font-display font-bold uppercase mb-6" style={{ color: "var(--txt)", fontSize: "clamp(2.1rem, 7vw, 4.8rem)", lineHeight: 1.06, maxWidth: "900px" }}>
            {content.heroRest} <span style={{ color: "var(--orange)" }}>{content.heroAccent}</span>
          </h1>
          <p className="text-lg md:text-xl leading-relaxed max-w-2xl" style={{ color: "var(--txt-2)" }}>
            {content.heroLead}
          </p>
        </div>
      </section>

      {/* ── Статистика проблемы ───────────────────────────────────────────── */}
      <section className="sol-problem-stats" style={{ background: "var(--panel)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "clamp(48px, 9vw, 76px) 0" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {content.stats.map((s: any) => (
              <div key={s.fact} className="hud p-7" style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--panel-2)", boxShadow: "var(--card-shadow)" }}>
                <div className="font-display font-bold uppercase mb-3" style={{ fontSize: "clamp(2.4rem, 6vw, 3rem)", color: "var(--orange)", lineHeight: 1 }}>
                  {s.value}
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--txt-2)" }}>{s.fact}</p>
                <p className="font-tele text-[10px] tracking-wider uppercase" style={{ color: "var(--txt-3)" }}>{s.source}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Решение ───────────────────────────────────────────────────────── */}
      <section className="sol-solution" style={{ background: "var(--void)", padding: "clamp(56px, 11vw, 100px) 0" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-14 items-start">
            <div>
              <Eyebrow color="var(--orange)">{t.sol.solutionFor} // {content.productName}</Eyebrow>
              <h2 className="font-display font-bold uppercase mb-6" style={{ color: "var(--txt)", fontSize: "clamp(2.2rem, 4vw, 3.1rem)", lineHeight: 1.08 }}>
                {content.solutionTitle}
              </h2>
              <p className="text-base leading-relaxed mb-10" style={{ color: "var(--txt-2)" }}>
                {content.sellText}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {content.features.map(({ icon, title, desc }: any) => { const FIcon = getIcon(icon); return (
                  <div key={title} className="hud p-5" style={{ borderRadius: "var(--r-md)", background: "var(--panel-2)", border: "1px solid var(--line)", boxShadow: "var(--card-shadow)" }}>
                    <FIcon className="w-5 h-5 mb-3" style={{ color: "var(--cyan)" }} />
                    <div className="font-semibold text-sm mb-1" style={{ color: "var(--txt)" }}>{title}</div>
                    <div className="text-xs leading-relaxed" style={{ color: "var(--txt-2)" }}>{desc}</div>
                  </div>
                ); })}
              </div>
            </div>

            <div className="lg:sticky lg:top-32">
              <SpecPanel productName={content.productName} specs={content.specs} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Этапы ─────────────────────────────────────────────────────────── */}
      <section className="sol-process" style={{ background: "var(--panel)", borderTop: "1px solid var(--line)", padding: "clamp(56px, 11vw, 100px) 0" }}>
        <div className="max-w-7xl mx-auto px-6">
          <Eyebrow>{t.sol.process}</Eyebrow>
          <h2 className="font-display font-bold uppercase mb-14" style={{ color: "var(--txt)", fontSize: "clamp(2.2rem, 4vw, 3.1rem)", lineHeight: 1.08 }}>
            {t.sol.processTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {processSteps.map((s: any, i: number) => (
              <div key={s.step} className="hud relative p-7" style={{ borderRadius: "var(--r-lg)", background: "var(--panel-2)", border: "1px solid var(--line)", boxShadow: "var(--card-shadow)" }}>
                <div className="font-tele text-[11px] tracking-[0.2em] mb-6" style={{ color: "var(--cyan)" }}>
                  {t.sol.stage} {s.step} {i < processSteps.length - 1 ? "→" : "✓"}
                </div>
                <h3 className="font-display font-bold text-xl uppercase mb-3" style={{ color: "var(--txt)", lineHeight: 1.18 }}>
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--txt-2)" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Результаты ────────────────────────────────────────────────────── */}
      <section className="sol-results tech-grid" style={{ background: "var(--void)", borderTop: "1px solid var(--line)", padding: "clamp(56px, 11vw, 100px) 0" }}>
        <div className="max-w-7xl mx-auto px-6">
          <Eyebrow color="var(--orange)">{t.sol.results}</Eyebrow>
          <h2 className="font-display font-bold uppercase mb-14" style={{ color: "var(--txt)", fontSize: "clamp(2.2rem, 4vw, 3.1rem)", lineHeight: 1.08 }}>
            {t.sol.resultsTitle}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {content.results.map((r: any) => (
              <div key={r.label} className="px-6 py-2" style={{ borderLeft: "3px solid var(--orange)", borderRadius: "4px" }}>
                <div className="font-display font-bold uppercase mb-3" style={{ fontSize: "clamp(2.4rem, 6vw, 3rem)", color: "var(--txt)", lineHeight: 1 }}>
                  {r.value}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--txt-2)" }}>{r.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="sol-cta" style={{ background: "var(--panel)", borderTop: "1px solid var(--line)", padding: "clamp(56px, 11vw, 100px) 0" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="hud max-w-3xl mx-auto p-6 md:p-8 lg:p-12 text-center" style={{ borderRadius: "var(--r-lg)", background: "var(--panel-2)", border: "1px solid var(--line)", boxShadow: "var(--card-shadow)" }}>
            <div className="font-tele text-[10px] tracking-[0.22em] uppercase mb-4" style={{ color: "var(--cyan)" }}>
              {t.sol.ctaNote}
            </div>
            <h2 className="font-display font-bold uppercase mb-5" style={{ color: "var(--txt)", fontSize: "clamp(1.9rem, 3.5vw, 2.6rem)", lineHeight: 1.1 }}>
              {t.sol.ctaTitle}
            </h2>
            <p className="text-sm leading-relaxed mb-9 max-w-xl mx-auto" style={{ color: "var(--txt-2)" }}>
              {content.ctaLine}
            </p>
            <div className="text-left">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── Смежные решения ───────────────────────────────────────────────── */}
      <section className="sol-related" style={{ background: "var(--void)", borderTop: "1px solid var(--line)", padding: "clamp(48px, 10vw, 84px) 0" }}>
        <div className="max-w-7xl mx-auto px-6">
          <Eyebrow>{t.sol.related}</Eyebrow>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
            {related.map((p: any) => {
              const RIcon = getIcon(p.icon);
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(p.id)}
                  className="hud group text-left p-7 transition-all duration-250"
                  style={{ borderRadius: "var(--r-lg)", background: "var(--panel-2)", border: "1px solid var(--line)", boxShadow: "var(--card-shadow)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--orange-border)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.transform = "none"; }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <RIcon className="w-5 h-5" style={{ color: "var(--cyan)" }} />
                    <span className="font-tele text-[10px] tracking-[0.2em]" style={{ color: "var(--txt-3)" }}>{p.code}</span>
                  </div>
                  <h3 className="font-display font-bold uppercase mb-3 text-lg" style={{ color: "var(--txt)", lineHeight: 1.18 }}>
                    {p.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--orange)" }}>
                    {t.problems.cta} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
