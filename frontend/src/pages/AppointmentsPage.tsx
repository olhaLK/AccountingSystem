import { useEffect, useMemo, useState } from "react";
import { api } from "../api/endpoints";
import type { Appointment, AppointmentStatus } from "../api/types";
import "./appointments.scss";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

const STATUS_OPTIONS: AppointmentStatus[] = [
  "NEW",
  "NEED_INFO",
  "PRICE_SENT",
  "CONFIRMED",
  "PAYMENT_REPORTED",
  "IN_PROGRESS",
  "READY",
  "DONE",
  "CANCELED",
];

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  const needsQuotes = /[",\n\r;]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function buildAppointmentsCsv(rows: Appointment[]): string {
  const sep = ";"; // Excel-friendly for RU/UA locales

  const header = [
    "appointmentId",
    "startAt",
    "endAt",
    "durationMinutes",
    "status",
    "patientId",
    "doctorId",
    "serviceId",
    "cabinetId",
  ];

  const lines = [
    `sep=${sep}`,                 // <- важно для Excel
    header.join(sep),
    ...rows.map((a) =>
      [
        a.appointmentId,
        a.startAt,
        a.endAt ?? "",
        a.durationMinutes,
        a.status,
        a.patientId,
        a.doctorId,
        a.serviceId,
        a.cabinetId,
      ]
        .map(csvEscape)
        .join(sep)
    ),
  ];

  // BOM для корректной кодировки в Excel
  return "\uFEFF" + lines.join("\r\n");
}

function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/csv;charset=utf-8"
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function pick<T = any>(raw: any, keys: string[], fallback?: T): T {
  for (const k of keys) {
    if (raw && raw[k] !== undefined && raw[k] !== null) return raw[k] as T;
  }
  return fallback as T;
}

function parseDuration(value: any): number {
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const n = parseInt(trimmed, 10);
    return Number.isFinite(n) ? n : 0;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function durationFromEndStart(startIso: string, endIso: string): number {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const ms = e.getTime() - s.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.round(ms / 60000);
}

function normalizeAppointment(raw: any): Appointment {
  const appointmentId = Number(pick(raw, ["AppointmentId", "appointmentId", "id"], 0));

  const startAt = String(pick(raw, ["StartAt", "startAt", "Start", "start", "start_at"], ""));

  const endAt = pick<string | undefined>(
    raw,
    ["EndAt", "endAt", "End", "end", "end_at"],
    undefined
  );

  const durationRaw = pick(
    raw,
    [
      "DurationMinutes",
      "durationMinutes",
      "Duration",
      "duration",
      "DurationMin",
      "durationMin",
      "DurationMins",
      "durationMins",
      "DurationInMinutes",
      "durationInMinutes",
      "duration_min",
      "duration_minutes",
    ],
    0
  );

  let duration = parseDuration(durationRaw);

  if (!duration && startAt && endAt) {
    duration = durationFromEndStart(startAt, String(endAt));
  }

  const status = String(pick(raw, ["Status", "status"], "NEW")) as AppointmentStatus;

  return {
    appointmentId,
    patientId: Number(pick(raw, ["PatientId", "patientId"], 0)),
    serviceId: Number(pick(raw, ["ServiceId", "serviceId"], 0)),
    doctorId: Number(pick(raw, ["DoctorId", "doctorId"], 0)),
    cabinetId: Number(pick(raw, ["CabinetId", "cabinetId"], 0)),
    startAt,
    endAt: endAt ?? null,
    durationMinutes: duration,
    status,
  };
}

export function AppointmentsPage() {
  const [data, setData] = useState<Appointment[]>([]);
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [updateErr, setUpdateErr] = useState<string>("");

  useEffect(() => {
    let canceled = false;

    setLoading(true);
    setErr("");

    api
      .appointments()
      .then((rows: any[]) => {
        if (canceled) return;

        console.table(rows?.slice(0, 5) ?? []);
        console.log("RAW SAMPLE JSON:", JSON.stringify(rows?.[0] ?? null, null, 2));

        const normalized = (rows ?? []).map(normalizeAppointment);
        setData(normalized);

        console.log("NORMALIZED SAMPLE JSON:", JSON.stringify(normalized?.[0] ?? null, null, 2));
      })
      .catch((e: unknown) => {
        if (!canceled) setErr(e instanceof Error ? e.message : "Failed to load data");
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, []);

  const statusSet = useMemo(() => new Set(STATUS_OPTIONS), []);

  async function changeStatus(appointmentId: number, next: AppointmentStatus) {
    setUpdatingId(appointmentId);
    setUpdateErr("");

    try {
      await api.updateAppointmentStatus(appointmentId, next);

      setData((prev) =>
        prev.map((a) => (a.appointmentId === appointmentId ? { ...a, status: next } : a))
      );
    } catch (e: unknown) {
      setUpdateErr(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  function exportCsv() {
    const csv = buildAppointmentsCsv(data);

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp =
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_` +
      `${pad(now.getHours())}-${pad(now.getMinutes())}`;

    downloadTextFile(`appointments_${stamp}.csv`, csv);
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>Appointments</h1>

        <button
          className="btn"
          type="button"
          onClick={exportCsv}
          disabled={loading || data.length === 0}
          title={data.length ? "Download CSV report" : "No data to export"}
        >
          Export CSV
        </button>
      </div>

      {err && <div className="alert alertError">{err}</div>}
      {updateErr && <div className="alert alertError">{updateErr}</div>}

      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <div className="card">
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="colId">ID</th>
                  <th className="colDate">Start</th>
                  <th className="colDuration">Duration</th>
                  <th className="colStatus">Status</th>
                </tr>
              </thead>

              <tbody>
                {data.map((a) => {
                  const known = statusSet.has(a.status);

                  return (
                    <tr key={a.appointmentId}>
                      <td className="colId">{a.appointmentId}</td>
                      <td className="colDate">{formatDate(a.startAt)}</td>
                      <td className="colDuration">{a.durationMinutes} min</td>
                      <td className="colStatus">
                        <select
                          className="select selectSmall"
                          value={a.status}
                          disabled={!known || updatingId === a.appointmentId}
                          onChange={(e) =>
                            changeStatus(a.appointmentId, e.target.value as AppointmentStatus)
                          }
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                          {!known && <option value={a.status}>{a.status}</option>}
                        </select>

                        {updatingId === a.appointmentId && (
                          <span className="miniSpinner" aria-label="Updating" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!data.length && <div className="empty">No appointments.</div>}
          </div>
        </div>
      )}
    </div>
  );
}