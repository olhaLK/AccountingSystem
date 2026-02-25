export type Id = number;

export type AppointmentStatus =
    | "NEW"
    | "NEED_INFO"
    | "PRICE_SENT"
    | "CONFIRMED"
    | "PAYMENT_REPORTED"
    | "IN_PROGRESS"
    | "READY"
    | "DONE"
    | "CANCELED";

export interface Doctor {
    doctorId: Id;
    fullName: string;
    specialty?: string | null;
    isActive?: boolean | null;
}

export interface Service {
    serviceId: Id;
    serviceName: string;
    modality?: string | null;
    basePriceUAH?: number | null;
    isActive?: boolean | null;
}

export interface Cabinet {
    cabinetId: Id;
    cabinetName: string;
    cabinetCode?: string | null;
    modality?: string | null;
    isActive?: boolean | null;
}

export interface Patient {
    patientId: Id;
    patientCode?: string | null;
    displayName: string;
    phoneLast4?: string | null;
}

export interface Appointment {
    appointmentId: Id;
    patientId: Id;
    doctorId: Id;
    serviceId: Id;
    cabinetId: Id;
    startAt: string;
    endAt?: string | null;
    durationMinutes: number;
    priceUAH?: number | null;
    status: AppointmentStatus;
    createdAt?: string | null;
}