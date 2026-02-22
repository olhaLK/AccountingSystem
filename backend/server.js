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
      SELECT TOP 200 *
      FROM dbo.vwSchedule
      ORDER BY StartAt DESC
    `);
        res.json(result.recordset);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/appointments", async (req, res) => {
    try {
        const {
            PatientId,
            DoctorId,
            ServiceId,
            CabinetId,
            StartAt,
            DurationMinutes,
            Status,
        } = req.body;

        const p = await getPool();
        const r = await p
            .request()
            .input("PatientId", sql.Int, PatientId)
            .input("DoctorId", sql.Int, DoctorId)
            .input("ServiceId", sql.Int, ServiceId)
            .input("CabinetId", sql.Int, CabinetId)
            .input("StartAt", sql.DateTime2, StartAt)
            .input("DurationMinutes", sql.Int, DurationMinutes ?? 30)
            .input("Status", sql.NVarChar(30), Status ?? "NEW")
            .execute("dbo.spAppointmentCreate");

        res.json({ NewAppointmentId: r.recordset?.[0]?.NewAppointmentId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.patch("/api/appointments/:id/status", async (req, res) => {
    try {
        const appointmentId = Number(req.params.id);
        const { Status } = req.body;

        const p = await getPool();
        const r = await p
            .request()
            .input("AppointmentId", sql.Int, appointmentId)
            .input("Status", sql.NVarChar(30), Status)
            .execute("dbo.spAppointmentSetStatus");

        res.json(r.recordset?.[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`API running on http://localhost:${port}`));