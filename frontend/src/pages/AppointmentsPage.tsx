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
  const appointmentId = Number(
    pick(raw, ["AppointmentId", "appointmentId", "id"], 0)
  );

  const startAt = String(
    pick(raw, ["StartAt", "startAt", "Start", "start", "start_at"], "")
  );

  const endAt = pick<string | undefined>(
    raw,
    ["EndAt", "endAt", "End", "end", "end_at"],
    undefined
  );

  const durationRaw = pick(raw, [
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
  ], 0);

  let duration = parseDuration(durationRaw);

  if (!duration && startAt && endAt) {
    duration = durationFromEndStart(startAt, String(endAt));
  }

  const status = String(pick(raw, ["Status", "status"], "NEW")) as AppointmentStatus;

  return {
    AppointmentId: appointmentId,
    PatientId: Number(pick(raw, ["PatientId", "patientId"], 0)),
    ServiceId: Number(pick(raw, ["ServiceId", "serviceId"], 0)),
    DoctorId: Number(pick(raw, ["DoctorId", "doctorId"], 0)),
    CabinetId: Number(pick(raw, ["CabinetId", "cabinetId"], 0)),
    StartAt: startAt,
    DurationMinutes: duration,
    Status: status,
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

    api.appointments()
      .then((rows: any[]) => {
        if (canceled) return;

        const normalized = (rows ?? []).map(normalizeAppointment);
        setData(normalized);
        if (rows?.length) {
          console.log("Raw appointment example:", rows[0]);
          console.log("Normalized appointment example:", normalized[0]);
        }
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
        prev.map((a) =>
          a.AppointmentId === appointmentId ? { ...a, Status: next } : a
        )
      );
    } catch (e: unknown) {
      setUpdateErr(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="page">
      <h1>Appointments</h1>

      {loading && <p>Loading...</p>}
      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {updateErr && !err && <div className="errorBox">{updateErr}</div>}

      {!loading && !err && (
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
                const known = statusSet.has(a.Status);

                return (
                  <tr key={a.AppointmentId}>
                    <td className="colId">{a.AppointmentId}</td>
                    <td className="colDate">{formatDate(a.StartAt)}</td>
                    <td className="colDuration">
                      {a.DurationMinutes > 0 ? `${a.DurationMinutes} min` : "—"}
                    </td>
                    <td className="colStatus">
                      <select
                        className="select selectSmall"
                        value={a.Status}
                        disabled={!known || updatingId === a.AppointmentId}
                        onChange={(e) =>
                          changeStatus(a.AppointmentId, e.target.value as AppointmentStatus)
                        }
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                        {!known && <option value={a.Status}>{a.Status}</option>}
                      </select>

                      {updatingId === a.AppointmentId && (
                        <span className="miniSpinner" aria-label="Updating" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}