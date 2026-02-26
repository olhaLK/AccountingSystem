const express = require("express");
const cors = require("cors");
const sql = require("mssql");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || "localhost",
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
    connectionTimeout: 15000,
    requestTimeout: 15000,
};

let poolPromise = null;

function getPool() {
    if (!poolPromise) {
        poolPromise = sql.connect(dbConfig);
    }
    return poolPromise;
}

function toInt(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
}

function pickBody(reqBody, pascalKey, camelKey) {
    if (reqBody && reqBody[pascalKey] !== undefined && reqBody[pascalKey] !== null) return reqBody[pascalKey];
    if (reqBody && reqBody[camelKey] !== undefined && reqBody[camelKey] !== null) return reqBody[camelKey];
    return undefined;
}

app.get("/api/health", async (req, res) => {
    try {
        await getPool();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.get("/api/doctors", async (req, res) => {
    try {
        const p = await getPool();
        const result = await p.request().query(`
      SELECT DoctorId, FullName, Specialty
      FROM dbo.Doctors
      WHERE IsActive = 1
      ORDER BY FullName
    `);
        res.json(result.recordset);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/services", async (req, res) => {
    try {
        const p = await getPool();
        const result = await p.request().query(`
      SELECT ServiceId, ServiceName, Modality, BasePriceUAH
      FROM dbo.Services
      WHERE IsActive = 1
      ORDER BY Modality, ServiceName
    `);
        res.json(result.recordset);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/cabinets", async (req, res) => {
    try {
        const p = await getPool();
        const result = await p.request().query(`
      SELECT CabinetId, CabinetCode, CabinetName, Modality
      FROM dbo.Cabinets
      WHERE IsActive = 1
      ORDER BY Modality, CabinetCode
    `);
        res.json(result.recordset);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/patients", async (req, res) => {
    try {
        const p = await getPool();
        const result = await p.request().query(`
      SELECT PatientId, PatientCode, DisplayName
      FROM dbo.Patients
      ORDER BY PatientCode
    `);
        res.json(result.recordset);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/appointments", async (req, res) => {
    try {
        const p = await getPool();
        const result = await p.request().query(`
      SELECT TOP 200
        a.AppointmentId,
        a.StartAt,
        a.EndAt,
        DATEDIFF(MINUTE, a.StartAt, a.EndAt) AS DurationMinutes,
        a.Status,
        a.PriceUAH,

        -- Пациент
        p.PatientId,
        p.PatientCode,
        p.DisplayName AS PatientDisplayName,

        d.DoctorId,
        d.FullName AS DoctorFullName,

        s.ServiceId,
        s.ServiceName,
        s.Modality AS ServiceModality,

        c.CabinetId,
        c.CabinetCode,
        c.CabinetName
      FROM dbo.Appointments a
      LEFT JOIN dbo.Patients p ON p.PatientId = a.PatientId
      LEFT JOIN dbo.Doctors d ON d.DoctorId = a.DoctorId
      LEFT JOIN dbo.Services s ON s.ServiceId = a.ServiceId
      LEFT JOIN dbo.Cabinets c ON c.CabinetId = a.CabinetId
      ORDER BY a.StartAt DESC;
    `);

        res.json(result.recordset);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/appointments", async (req, res) => {
    try {
        console.log("CREATE /api/appointments body:", req.body);
        const PatientIdRaw = pickBody(req.body, "PatientId", "patientId");
        const DoctorIdRaw = pickBody(req.body, "DoctorId", "doctorId");
        const ServiceIdRaw = pickBody(req.body, "ServiceId", "serviceId");
        const CabinetIdRaw = pickBody(req.body, "CabinetId", "cabinetId");
        const StartAtRaw = pickBody(req.body, "StartAt", "startAt");
        const DurationRaw = pickBody(req.body, "DurationMinutes", "durationMinutes");
        const StatusRaw = pickBody(req.body, "Status", "status");
        const PatientId = toInt(PatientIdRaw);
        const DoctorId = toInt(DoctorIdRaw);
        const ServiceId = toInt(ServiceIdRaw);
        const CabinetId = toInt(CabinetIdRaw);
        const DurationMinutes = toInt(DurationRaw) ?? 30;
        const Status = (StatusRaw ?? "NEW").toString();

        console.log("CREATE parsed:", {
            PatientId,
            DoctorId,
            ServiceId,
            CabinetId,
            StartAt: StartAtRaw,
            DurationMinutes,
            Status,
        });

        const ids = { PatientId, DoctorId, ServiceId, CabinetId };
        for (const [k, v] of Object.entries(ids)) {
            if (!Number.isFinite(v) || v <= 0) {
                return res.status(400).json({ error: `Invalid ${k}: must be > 0` });
            }
        }
        if (!StartAtRaw) {
            return res.status(400).json({ error: "Invalid StartAt: required" });
        }

        const p = await getPool();

        const r = await p
            .request()
            .input("PatientId", sql.Int, PatientId)
            .input("DoctorId", sql.Int, DoctorId)
            .input("ServiceId", sql.Int, ServiceId)
            .input("CabinetId", sql.Int, CabinetId)
            .input("StartAt", sql.DateTime2, StartAtRaw)
            .input("DurationMinutes", sql.Int, DurationMinutes)
            .input("Status", sql.NVarChar(30), Status)
            .execute("dbo.spAppointmentCreate");

        const NewAppointmentId = r.recordset?.[0]?.NewAppointmentId ?? null;

        console.log("CREATE result:", { NewAppointmentId });

        res.json({ NewAppointmentId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.patch("/api/appointments/:id/status", async (req, res) => {
    try {
        const appointmentId = Number(req.params.id);
        const Status = req.body?.Status ?? req.body?.status;

        if (!Number.isFinite(appointmentId) || appointmentId <= 0) {
            return res.status(400).json({ error: "Invalid appointment id" });
        }
        if (!Status) {
            return res.status(400).json({ error: "Status is required" });
        }

        const p = await getPool();
        const r = await p
            .request()
            .input("AppointmentId", sql.Int, appointmentId)
            .input("Status", sql.NVarChar(30), String(Status))
            .execute("dbo.spAppointmentSetStatus");

        res.json(r.recordset?.[0] ?? { ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`API running on http://localhost:${port}`));