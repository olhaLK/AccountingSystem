import { http } from "./http";
import type { Appointment, AppointmentStatus, Cabinet, Doctor, Patient, Service } from "./types";

export const api = {
    doctors: () => http<Doctor[]>("/api/doctors"),
    services: () => http<Service[]>("/api/services"),
    cabinets: () => http<Cabinet[]>("/api/cabinets"),
    patients: () => http<Patient[]>("/api/patients"),
    appointments: () => http<Appointment[]>("/api/appointments"),
    createAppointment: (payload: Omit<Appointment, "AppointmentId">) =>
        http<{ NewAppointmentId: number }>("/api/appointments", { method: "POST", body: payload }),
    updateAppointmentStatus: (id: number, status: AppointmentStatus) =>
        http<{ AppointmentId: number; Status: AppointmentStatus }>(`/api/appointments/${id}/status`, {
            method: "PATCH",
            body: { status },
        }),
};