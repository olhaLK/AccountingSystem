export type Id = number;

export interface Doctor {
    DoctorId: Id;
    FullName: string;
    Specialty?: string | null;
}

export interface Service {
    ServiceId: Id;
    ServiceName: string;
    Modality?: string | null;
    BasePrice?: number | null;
}

export interface Cabinet {
    CabinetId: Id;
    CabinetName: string;
    Location?: string | null;
    Modality?: string | null;
}

export interface Patient {
    PatientId: Id;
    FullName: string;
    Phone?: string | null;
}

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

export interface Appointment {
    AppointmentId: Id;
    PatientId: Id;
    ServiceId: Id;
    DoctorId: Id;
    CabinetId: Id;
    StartAt: string;
    DurationMinutes: number;
    Status: AppointmentStatus;
}