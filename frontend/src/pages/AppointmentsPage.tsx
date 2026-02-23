import { useEffect, useState } from "react";
import { api } from "../api/endpoints";
import type { Appointment } from "../api/types";

export function AppointmentsPage() {
  const [data, setData] = useState<Appointment[]>([]);
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setErr("");

    api.appointments()
      .then((rows) => {
        if (!canceled) setData(rows);
      })
      .catch((e: unknown) => {
        if (!canceled) setErr(e instanceof Error ? e.message : "Loading error");
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, []);

  return (
    <div>
      <h1>Posts</h1>

      {loading && <p>Loading...</p>}
      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {!loading && !err && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">ID</th>
              <th align="left">StartAt</th>
              <th align="left">Duration</th>
              <th align="left">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.AppointmentId}>
                <td>{a.AppointmentId}</td>
                <td>{a.StartAt}</td>
                <td>{a.DurationMinutes}</td>
                <td>{a.Status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}