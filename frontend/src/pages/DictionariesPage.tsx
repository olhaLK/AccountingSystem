import { useEffect, useMemo, useState } from "react";
import { api } from "../api/endpoints";
import type { Cabinet, Doctor, Patient, Service } from "../api/types";
import "./dictionaries.scss";

type TabKey = "doctors" | "services" | "cabinets" | "patients";

function contains(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

export function DictionariesPage() {
  const [tab, setTab] = useState<TabKey>("doctors");
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

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

  const filteredDoctors = useMemo(() => {
    if (!q.trim()) return doctors;
    return doctors.filter((d) =>
      contains(`${d.FullName ?? ""} ${d.Specialty ?? ""}`, q)
    );
  }, [doctors, q]);

  const filteredServices = useMemo(() => {
    if (!q.trim()) return services;
    return services.filter((s) =>
      contains(`${s.ServiceName ?? ""} ${s.Modality ?? ""}`, q)
    );
  }, [services, q]);

  const filteredCabinets = useMemo(() => {
    if (!q.trim()) return cabinets;
    return cabinets.filter((c) =>
      contains(`${c.CabinetName ?? ""} ${c.Location ?? ""} ${c.Modality ?? ""}`, q)
    );
  }, [cabinets, q]);

  const filteredPatients = useMemo(() => {
    if (!q.trim()) return patients;
    return patients.filter((p) =>
      contains(`${p.FullName ?? ""} ${p.Phone ?? ""}`, q)
    );
  }, [patients, q]);

  const activeCount = useMemo(() => {
    switch (tab) {
      case "doctors":
        return filteredDoctors.length;
      case "services":
        return filteredServices.length;
      case "cabinets":
        return filteredCabinets.length;
      case "patients":
        return filteredPatients.length;
    }
  }, [tab, filteredDoctors.length, filteredServices.length, filteredCabinets.length, filteredPatients.length]);

  return (
    <div>
      <h1>Dictionaries</h1>

      {loading && <p>Loading...</p>}
      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {!loading && !err && (
        <div className="tabsCard">
          <div className="tabsHead">
            <div className="tabButtons">
              <button
                className={`tabBtn ${tab === "doctors" ? "active" : ""}`}
                onClick={() => setTab("doctors")}
              >
                Doctors
              </button>
              <button
                className={`tabBtn ${tab === "services" ? "active" : ""}`}
                onClick={() => setTab("services")}
              >
                Services
              </button>
              <button
                className={`tabBtn ${tab === "cabinets" ? "active" : ""}`}
                onClick={() => setTab("cabinets")}
              >
                Cabinets
              </button>
              <button
                className={`tabBtn ${tab === "patients" ? "active" : ""}`}
                onClick={() => setTab("patients")}
              >
                Patients
              </button>
            </div>

            <div className="searchWrap">
              <input
                className="input searchInput"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search..."
              />
              <button className="btn btnOutline" onClick={() => setQ("")}>
                Clear
              </button>
            </div>
          </div>

          <div className="metaRow">
            <span className="pill">
              {tab.toUpperCase()} • {activeCount} items
            </span>
            <span>Read-only view (minimum mode)</span>
          </div>

          <div className="tableWrap">
            {tab === "doctors" && (
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Full name</th>
                    <th>Specialty</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDoctors.map((d) => (
                    <tr key={d.DoctorId}>
                      <td>{d.DoctorId}</td>
                      <td>{d.FullName}</td>
                      <td>{d.Specialty ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === "services" && (
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Service</th>
                    <th>Modality</th>
                    <th>Base price</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map((s) => (
                    <tr key={s.ServiceId}>
                      <td>{s.ServiceId}</td>
                      <td>{s.ServiceName}</td>
                      <td>{s.Modality ?? "—"}</td>
                      <td>{s.BasePrice ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === "cabinets" && (
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Cabinet</th>
                    <th>Location</th>
                    <th>Modality</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCabinets.map((c) => (
                    <tr key={c.CabinetId}>
                      <td>{c.CabinetId}</td>
                      <td>{c.CabinetName}</td>
                      <td>{c.Location ?? "—"}</td>
                      <td>{c.Modality ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === "patients" && (
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Full name</th>
                    <th>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((p) => (
                    <tr key={p.PatientId}>
                      <td>{p.PatientId}</td>
                      <td>{p.FullName}</td>
                      <td>{p.Phone ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeCount === 0 && (
              <div style={{ padding: 18, color: "var(--muted)" }}>
                No items found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}