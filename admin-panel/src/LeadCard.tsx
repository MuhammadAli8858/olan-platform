// ══════════════════════════════════════════════════════════════════
// КАРТОЧКА ЗАЯВКИ — ОБЩАЯ ДЛЯ ВСЕХ КАБИНЕТОВ
//
// Один и тот же вид заявки в кабинете оператора, менеджера и админа.
//
// Главное правило: каждое поле, которое заполнил клиент
// (имя, организация, почта, телефон, описание), выводится в своей
// рамке. Текст любой длины переносится ВНУТРИ рамки и никогда
// не вылезает за карточку — за это отвечают классы .field и
// .field-value в styles.css (overflow-wrap: anywhere).
// ══════════════════════════════════════════════════════════════════

import type { ReactNode } from "react";
import {
  User as UserIcon, Building2, Mail, Phone, MessageSquare,
  Clock, Circle, CheckCircle,
} from "lucide-react";
import { fmtDate } from "./lib";

export type Lead = {
  id: string;
  name: string;
  organization: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  createdAt: string;
  lang: string;
  operatorId?: string | null;
  operatorName?: string;
  managerName?: string;
  hasChat?: boolean;
};

/**
 * Одно поле заявки в универсальной рамке.
 * Иконка слева не сжимается, текст справа переносится по любому
 * символу — поэтому в рамку помещается и «Иван», и сплошная строка
 * из трёхсот символов без пробелов.
 */
export function LeadField({
  icon, label, children, long = false,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  /** true для описания — ограничить высоту и включить прокрутку */
  long?: boolean;
}) {
  return (
    <div className="field">
      <span className="field-icon">{icon}</span>
      <div className="field-body">
        <span className="field-label">{label}</span>
        <div className={`field-value${long ? " field-value--long" : ""}`}>{children}</div>
      </div>
    </div>
  );
}

const ic = { width: 13, height: 13 } as const;

export function LeadCard({
  lead, onMarkDone, showAssignee = false,
}: {
  lead: Lead;
  onMarkDone?: (id: string) => void;
  /** показывать строку «кому назначена» — для менеджера и админа */
  showAssignee?: boolean;
}) {
  const l = lead;

  return (
    <div className="card lead-card">
      {/* ─── статус и дата ─── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8, flexWrap: "wrap",
      }}>
        <span className={`badge ${l.status === "new" ? "badge-orange" : "badge-green"}`}>
          {l.status === "new"
            ? <><Circle style={{ width: 10, height: 10 }} /> Новая</>
            : <><CheckCircle style={{ width: 10, height: 10 }} /> Обработана</>}
        </span>
        <span className="tele" style={{
          fontSize: 10, color: "var(--txt-3)",
          display: "flex", alignItems: "center", gap: 5,
        }}>
          <Clock style={{ width: 10, height: 10 }} />
          {fmtDate(l.createdAt)}
        </span>
      </div>

      {/* ─── поля, заполненные клиентом ─── */}
      <LeadField icon={<UserIcon style={ic} />} label="Имя">
        {l.name || "—"}
      </LeadField>

      {l.organization && (
        <LeadField icon={<Building2 style={ic} />} label="Организация">
          {l.organization}
        </LeadField>
      )}

      {l.email && (
        <LeadField icon={<Mail style={ic} />} label="Почта">
          <a href={`mailto:${l.email}`}>{l.email}</a>
        </LeadField>
      )}

      {l.phone && (
        <LeadField icon={<Phone style={ic} />} label="Телефон">
          <a href={`tel:${l.phone.replace(/[^\d+]/g, "")}`}>{l.phone}</a>
        </LeadField>
      )}

      {l.message && (
        <LeadField icon={<MessageSquare style={ic} />} label="Описание" long>
          {l.message}
        </LeadField>
      )}

      {/* ─── кому назначена (менеджер и админ) ─── */}
      {showAssignee && (
        <div style={{
          marginTop: "auto", paddingTop: 10, borderTop: "1px solid var(--line-soft)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 10, flexWrap: "wrap",
        }}>
          <div style={{
            fontSize: 12, color: "var(--txt-2)",
            display: "flex", alignItems: "center", gap: 6,
            minWidth: 0, flexWrap: "wrap",
          }}>
            <UserIcon style={{ width: 12, height: 12, color: "var(--orange)", flexShrink: 0 }} />
            {l.operatorName ? (
              <>
                <strong style={{ color: "var(--txt)" }}>{l.operatorName}</strong>
                {l.managerName && <span style={{ color: "var(--txt-3)" }}>· {l.managerName}</span>}
              </>
            ) : (
              <span className="badge badge-grey">ждёт оператора на смене</span>
            )}
          </div>

          {l.hasChat && (
            <span className="badge badge-grey" title="Этот клиент также писал в онлайн-чат">
              <MessageSquare style={{ width: 10, height: 10 }} /> есть чат
            </span>
          )}
        </div>
      )}

      {l.status === "new" && onMarkDone && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginTop: showAssignee ? 2 : "auto", width: "100%" }}
          onClick={() => onMarkDone(l.id)}
        >
          <CheckCircle style={{ width: 13, height: 13 }} /> Отметить обработанной
        </button>
      )}
    </div>
  );
}
