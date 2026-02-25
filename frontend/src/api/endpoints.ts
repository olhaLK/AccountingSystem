import { http } from "./http";
import type { Appointment, AppointmentStatus, Cabinet, Doctor, Patient, Service } from "./types";
import {
    normalizeAppointment,
    normalizeCabinet,
    normalizeDoctor,
    normalizePatient,
    normalizeService,
} from "./normalize";

export const api = {
    doctors: async (): Promise<Doctor[]> => {
        const rows = await http<any[]>("/api/doctors");
        return (rows ?? []).map(normalizeDoctor);
    },

    services: async (): Promise<Service[]> => {
        const rows = await http<any[]>("/api/services");
        return (rows ?? []).map(normalizeService);
    },

    cabinets: async (): Promise<Cabinet[]> => {
        const rows = await http<any[]>("/api/cabinets");
        return (rows ?? []).map(normalizeCabinet);
    },

    patients: async (): Promise<Patient[]> => {
        const rows = await http<any[]>("/api/patients");
        return (rows ?? []).map(normalizePatient);
    },

    appointments: async (): Promise<Appointment[]> => {
        const rows = await http<any[]>("/api/appointments");
        return (rows ?? []).map(normalizeAppointment);
    },

    createAppointment: async (payload: {
        patientId: number;
        doctorId: number;
        serviceId: number;
        cabinetId: number;
        startAt: string;
        durationMinutes: number;
        status: AppointmentStatus;
    }): Promise<{ NewAppointmentId: number }> => {
        return http<{ NewAppointmentId: number }>("/api/appointments", {
            method: "POST",
            body: {
                PatientId: payload.patientId,
                DoctorId: payload.doctorId,
                ServiceId: payload.serviceId,
                CabinetId: payload.cabinetId,
                StartAt: payload.startAt,
                DurationMinutes: payload.durationMinutes,
                Status: payload.status,
            },
        });
    },

    updateAppointmentStatus: async (id: number, status: AppointmentStatus) => {
        return http(`/api/appointments/${id}/status`, {
            method: "PATCH",
            body: { status, Status: status },
        });
    },
};