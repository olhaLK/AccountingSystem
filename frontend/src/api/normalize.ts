import type { Appointment, AppointmentStatus, Cabinet, Doctor, Patient, Service } from "./types";

function pick(raw: any, keys: string[], fallback: any = undefined) {
    for (const k of keys) {
        if (raw && raw[k] !== undefined && raw[k] !== null) return raw[k];
    }
    return fallback;
}

function num(v: any, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function str(v: any, fallback = "") {
    if (v === null || v === undefined) return fallback;
    return String(v);
}

function parseIntFromString(v: any): number {
    if (v === null || v === undefined) return 0;
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    if (typeof v === "string") {
        const n = parseInt(v.trim(), 10);
        return Number.isFinite(n) ? n : 0;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function durationFromEndStart(startIso: string, endIso: string) {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const ms = e.getTime() - s.getTime();
    if (!Number.isFinite(ms) || ms <= 0) return 0;
    return Math.round(ms / 60000);
}

export function normalizeDoctor(raw: any): Doctor {
    return {
        doctorId: num(pick(raw, ["DoctorId", "doctorId", "id"], 0)),
        fullName: str(pick(raw, ["FullName", "fullName", "Name", "name"], "")),
        specialty: str(pick(raw, ["Specialty", "specialty"], "")) || null,
        isActive: pick(raw, ["IsActive", "isActive"], null),
    };
}

export function normalizeService(raw: any): Service {
    return {
        serviceId: num(pick(raw, ["ServiceId", "serviceId", "id"], 0)),
        serviceName: str(pick(raw, ["ServiceName", "serviceName", "Name", "name", "Title", "title"], "")),
        modality: str(pick(raw, ["Modality", "modality"], "")) || null,
        basePriceUAH: (() => {
            const v = pick(raw, ["BasePriceUAH", "basePriceUAH", "BasePrice", "basePrice", "PriceUAH", "priceUAH", "Price", "price"], null);
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
        })(),
        isActive: pick(raw, ["IsActive", "isActive"], null),
    };
}

export function normalizeCabinet(raw: any): Cabinet {
    return {
        cabinetId: num(pick(raw, ["CabinetId", "cabinetId", "id"], 0)),
        cabinetCode: str(pick(raw, ["CabinetCode", "cabinetCode"], "")) || null,
        cabinetName: str(pick(raw, ["CabinetName", "cabinetName", "Name", "name"], "")),
        modality: str(pick(raw, ["Modality", "modality"], "")) || null,
        isActive: pick(raw, ["IsActive", "isActive"], null),
    };
}

export function normalizePatient(raw: any): Patient {
    return {
        patientId: num(pick(raw, ["PatientId", "patientId", "id"], 0)),
        patientCode: str(pick(raw, ["PatientCode", "patientCode"], "")) || null,
        displayName: str(pick(raw, ["DisplayName", "displayName", "FullName", "fullName", "Name", "name"], "")),
        phoneLast4: str(pick(raw, ["PhoneLast4", "phoneLast4", "Phone", "phone", "PhoneNumber", "phoneNumber"], "")) || null,
    };
}

export function normalizeAppointment(raw: any): Appointment {
    const startAt = str(pick(raw, ["StartAt", "startAt", "Start", "start", "start_at"], ""));
    const endAt = pick(raw, ["EndAt", "endAt", "End", "end", "end_at"], null);

    const durationRaw = pick(raw, [
        "DurationMinutes",
        "durationMinutes",
        "Duration",
        "duration",
        "DurationMin",
        "durationMin",
        "DurationMins",
        "durationMins",
        "duration_min",
        "duration_minutes",
    ], 0);

    let durationMinutes = parseIntFromString(durationRaw);

    if (!durationMinutes && startAt && endAt) {
        durationMinutes = durationFromEndStart(startAt, String(endAt));
    }

    const status = str(pick(raw, ["Status", "status"], "NEW")) as AppointmentStatus;

    return {
        appointmentId: num(pick(raw, ["AppointmentId", "appointmentId", "id"], 0)),
        patientId: num(pick(raw, ["PatientId", "patientId"], 0)),
        doctorId: num(pick(raw, ["DoctorId", "doctorId"], 0)),
        serviceId: num(pick(raw, ["ServiceId", "serviceId"], 0)),
        cabinetId: num(pick(raw, ["CabinetId", "cabinetId"], 0)),
        startAt,
        endAt: endAt ? String(endAt) : null,
        durationMinutes,
        priceUAH: (() => {
            const v = pick(raw, ["PriceUAH", "priceUAH", "Price", "price"], null);
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
        })(),
        status,
        createdAt: str(pick(raw, ["CreatedAt", "createdAt"], "")) || null,
    };
}