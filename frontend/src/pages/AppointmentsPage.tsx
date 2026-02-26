import { useEffect, useMemo, useState } from "react";
import { api } from "../api/endpoints";
import type { AppointmentStatus } from "../api/types";
import "./appointments.scss";

type ScheduleRow = {
  AppointmentId: number;
  StartAt: string;
  EndAt: string | null;
  CabinetCode?: string | null;
  CabinetName?: string | null;
  ServiceName?: string | null;
  ServiceModality?: string | null;
  PatientCode?: string | null;
  PriceUAH?: number | null;
  Status: AppointmentStatus | string;
  DurationMinutes?: number | null;
  PatientDisplayName?: string | null;
  DoctorFullName?: string | null;
};

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

function safeNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function calcDurationMinutes(startIso: string, endIso: string | null | undefined): number {
  if (!endIso) return 0;
  const s = new Date(startIso);
  const e = new Date(endIso);
  const ms = e.getTime() - s.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.round(ms / 60000);
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
  const needsQuotes = /["\n\r;]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function buildScheduleCsv(rows: ScheduleRow[]): string {
  const sep = ";";

  const header = [
    "AppointmentId",
    "StartAt",
    "EndAt",
    "DurationMinutes",
    "Status",
    "PatientCode",
    "PatientDisplayName",
    "DoctorFullName",
    "ServiceName",
    "ServiceModality",
    "CabinetCode",
    "CabinetName",
    "PriceUAH",
  ];

  const lines = [
    `sep=${sep}`,
    header.join(sep),
    ...rows.map((r) => {
      const duration =
        r.DurationMinutes !== null && r.DurationMinutes !== undefined
          ? Number(r.DurationMinutes)
          : calcDurationMinutes(r.StartAt, r.EndAt);

      return [
        r.AppointmentId,
        r.StartAt,
        r.EndAt ?? "",
        duration,
        r.Status ?? "",
        r.PatientCode ?? "",
        r.PatientDisplayName ?? "",
        r.DoctorFullName ?? "",
        r.ServiceName ?? "",
        r.ServiceModality ?? "",
        r.CabinetCode ?? "",
        r.CabinetName ?? "",
        r.PriceUAH ?? "",
      ].map(csvEscape).join(sep);
    }),
  ];

  return "\uFEFF" + lines.join("\r\n");
}

function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
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

export function AppointmentsPage() {
  const [data, setData] = useState<ScheduleRow[]>([]);
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

        const mapped: ScheduleRow[] = (rows ?? []).map((x: any) => ({
          AppointmentId: Number(x?.AppointmentId ?? x?.appointmentId ?? 0),
          StartAt: String(x?.StartAt ?? x?.startAt ?? ""),
          EndAt: x?.EndAt ?? x?.endAt ?? null,

          CabinetCode: x?.CabinetCode ?? x?.cabinetCode ?? null,
          CabinetName: x?.CabinetName ?? x?.cabinetName ?? null,

          ServiceName: x?.ServiceName ?? x?.serviceName ?? null,
          ServiceModality: x?.ServiceModality ?? x?.serviceModality ?? null,

          DoctorName: x?.DoctorName ?? x?.doctorName ?? null,
          PatientCode: x?.PatientCode ?? x?.patientCode ?? null,

          PriceUAH: safeNumber(x?.PriceUAH ?? x?.priceUAH),
          Status: (x?.Status ?? x?.status ?? "NEW") as any,

          DurationMinutes: safeNumber(x?.DurationMinutes ?? x?.durationMinutes),
        }));

        setData(mapped);
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
        prev.map((r) => (r.AppointmentId === appointmentId ? { ...r, Status: next } : r))
      );
    } catch (e: unknown) {
      setUpdateErr(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  function exportCsv() {
    const csv = buildScheduleCsv(data);

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
                {data.map((r) => {
                  const status = String(r.Status ?? "NEW") as AppointmentStatus | string;
                  const known = statusSet.has(status as AppointmentStatus);

                  const duration =
                    r.DurationMinutes !== null && r.DurationMinutes !== undefined
                      ? Number(r.DurationMinutes)
                      : calcDurationMinutes(r.StartAt, r.EndAt);

                  return (
                    <tr key={r.AppointmentId}>
                      <td className="colId">{r.AppointmentId}</td>
                      <td className="colDate">{formatDate(r.StartAt)}</td>
                      <td className="colDuration">{duration} min</td>
                      <td className="colStatus">
                        <select
                          className="select selectSmall"
                          value={known ? (status as AppointmentStatus) : status}
                          disabled={!known || updatingId === r.AppointmentId}
                          onChange={(e) =>
                            changeStatus(r.AppointmentId, e.target.value as AppointmentStatus)
                          }
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                          {!known && <option value={status}>{status}</option>}
                        </select>

                        {updatingId === r.AppointmentId && (
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