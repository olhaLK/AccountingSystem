import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/endpoints";
import type { AppointmentStatus, Cabinet, Doctor, Patient, Service } from "../api/types";
import "./create.scss";

type Option = { value: number; label: string };

function toOptions<
  T extends object,
  KId extends keyof T,
  KLabel extends keyof T,
  KSuffix extends keyof T
>(rows: T[], idKey: KId, labelKey: KLabel, suffixKey?: KSuffix): Option[] {
  return rows.map((r) => {
    const idRaw = r[idKey];
    const labelRaw = r[labelKey];
    const suffixRaw = suffixKey ? r[suffixKey] : undefined;

    const id = Number(idRaw);
    const base = String(labelRaw ?? "");
    const suffix = suffixRaw === null || suffixRaw === undefined ? "" : String(suffixRaw);

    const label = suffix ? `${base} — ${suffix}` : base;

    return { value: id, label };
  });
}

function nowPlusMinutes(mins: number) {
  const d = new Date(Date.now() + mins * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function CreatePage() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  const [patientId, setPatientId] = useState<number>(0);
  const [serviceId, setServiceId] = useState<number>(0);
  const [doctorId, setDoctorId] = useState<number>(0);
  const [cabinetId, setCabinetId] = useState<number>(0);

  const [startAtLocal, setStartAtLocal] = useState<string>(nowPlusMinutes(60));
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [status, setStatus] = useState<AppointmentStatus>("NEW");

  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [submitErr, setSubmitErr] = useState<string>("");

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setErr("");

    Promise.all([api.doctors(), api.services(), api.cabinets(), api.patients()])
      .then(([d, s, c, p]) => {
        if (canceled) return;

        setDoctors(d);
        setServices(s);
        setCabinets(c);
        setPatients(p);

        // preselect first items (minimum UX)
        if (p.length) setPatientId(p[0].patientId);
        if (s.length) setServiceId(s[0].serviceId);
        if (d.length) setDoctorId(d[0].doctorId);
        if (c.length) setCabinetId(c[0].cabinetId);
      })
      .catch((e: unknown) => {
        if (canceled) return;
        setErr(e instanceof Error ? e.message : "Failed to load dictionaries");
      })
      .finally(() => {
        if (canceled) return;
        setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, []);

  const patientOptions = useMemo(
    () => toOptions(patients, "patientId", "displayName", "phoneLast4"),
    [patients]
  );

  const serviceOptions = useMemo(
    () => toOptions(services, "serviceId", "serviceName", "modality"),
    [services]
  );

  const doctorOptions = useMemo(
    () => toOptions(doctors, "doctorId", "fullName", "specialty"),
    [doctors]
  );

  const cabinetOptions = useMemo(
    () => toOptions(cabinets, "cabinetId", "cabinetName", "modality"),
    [cabinets]
  );

  async function onSubmit() {
    setSubmitting(true);
    setSubmitErr("");
    setCreatedId(null);

    try {
      const iso = new Date(startAtLocal).toISOString();

      const res = await api.createAppointment({
        patientId,
        serviceId,
        doctorId,
        cabinetId,
        startAt: iso,
        durationMinutes: Number(durationMinutes) || 30,
        status,
      });

      setCreatedId(res.NewAppointmentId ?? null);
    } catch (e: unknown) {
      setSubmitErr(e instanceof Error ? e.message : "Failed to create appointment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="createGrid">
      <div className="formCard">
        <h1>Create</h1>
        <div className="small">Create a new appointment using dictionaries from the backend API.</div>

        {loading && <p>Loading...</p>}
        {err && <div className="errorBox">{err}</div>}

        {!loading && !err && (
          <>
            <div className="field">
              <div className="label">Patient</div>
              <select
                className="select"
                value={patientId}
                onChange={(e) => setPatientId(Number(e.target.value))}
              >
                {patientOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="row2">
              <div className="field">
                <div className="label">Service</div>
                <select
                  className="select"
                  value={serviceId}
                  onChange={(e) => setServiceId(Number(e.target.value))}
                >
                  {serviceOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <div className="label">Doctor</div>
                <select
                  className="select"
                  value={doctorId}
                  onChange={(e) => setDoctorId(Number(e.target.value))}
                >
                  {doctorOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="row2">
              <div className="field">
                <div className="label">Cabinet</div>
                <select
                  className="select"
                  value={cabinetId}
                  onChange={(e) => setCabinetId(Number(e.target.value))}
                >
                  {cabinetOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <div className="label">Status</div>
                <select
                  className="select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                >
                  <option value="NEW">NEW</option>
                  <option value="NEED_INFO">NEED_INFO</option>
                  <option value="PRICE_SENT">PRICE_SENT</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="PAYMENT_REPORTED">PAYMENT_REPORTED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="READY">READY</option>
                  <option value="DONE">DONE</option>
                  <option value="CANCELED">CANCELED</option>
                </select>
              </div>
            </div>

            <div className="row2">
              <div className="field">
                <div className="label">Start (date & time)</div>
                <input
                  className="input"
                  type="datetime-local"
                  value={startAtLocal}
                  onChange={(e) => setStartAtLocal(e.target.value)}
                />
              </div>

              <div className="field">
                <div className="label">Duration (minutes)</div>
                <input
                  className="input"
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="actions">
              <button className="btn" onClick={onSubmit} disabled={submitting}>
                {submitting ? "Creating..." : "Create appointment"}
              </button>

              <button className="btn btnOutline" onClick={() => nav("/")} disabled={submitting}>
                Back to list
              </button>
            </div>

            {submitErr && <div className="errorBox">{submitErr}</div>}

            {createdId !== null && (
              <div className="successBox">
                Created successfully. NewAppointmentId: <b>{createdId}</b>
              </div>
            )}
          </>
        )}
      </div>

      <div className="sideCard">
        <h2>How it works</h2>
        <div className="hint">
          This page loads doctors, services, cabinets and patients from the backend and sends a POST request to create a
          new appointment.
        </div>

        <div className="hint">
          After creation, open <b>Appointments</b> to see the new record in the list.
        </div>

        <div className="hint">
          Minimal mode: no complex validation or roles. Only basic UI and API integration.
        </div>
      </div>
    </div>
  );
}