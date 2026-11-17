export type Role = "administrator" | "manager" | "assistant" | "intervenant" | "director";
export type ComplaintType = "technical" | "mechanical" | "oil_related" | "safety" | "administrative";
export type ComplaintStatus = "open" | "assigned" | "in_progress" | "resolved" | "on_hold";

export interface User {
  id: number;
  email: string;
  role: Role;
  is_active: boolean;
}
export interface Station {
  id: number;
  name: string;
  code: string;
  address: string | null;
  governorate: string;
  is_active: boolean;
  manager_id: number | null;
  assistant_id: number | null;
}
export interface Department {
  id: number;
  name: string;
  complaint_type: ComplaintType;
  intervenant_id: number | null;
  created_at?: string;
}
export interface Complaint {
  id: number;
  title: string;
  description: string;
  type: ComplaintType;
  severity: number;
  status: ComplaintStatus;
  station_id: number;
  created_by_id: number;
  assigned_to_id: number | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;
  assigned_at: string | null;
  on_hold_at: string | null;
  total_on_hold_seconds: number;
  manager_feedback: string | null;
  manager_feedback_at: string | null;
}
export interface ComplaintDetail extends Complaint {
  station: { id: number; name: string; code: string; governorate: string };
  created_by: User;
  assigned_to: User | null;
}
export interface Rating {
  id: number;
  complaint_id: number;
  intervenant_id: number;
  director_id: number;
  resolution_time_hours: number;
  rating_score: number;
  created_at: string;
}

export const ROLES: { value: Role; label: string }[] = [
  { value: "manager", label: "Station Manager" },
  { value: "assistant", label: "SNDP Assistant" },
  { value: "intervenant", label: "Intervenant" },
  { value: "director", label: "Director" },
  { value: "administrator", label: "Administrator" }
];
export const COMPLAINT_TYPES: { value: ComplaintType; label: string }[] = [
  { value: "technical", label: "Technical" },
  { value: "mechanical", label: "Mechanical" },
  { value: "oil_related", label: "Oil Related" },
  { value: "safety", label: "Safety" },
  { value: "administrative", label: "Administrative" }
];
export const COMPLAINT_STATUSES: { value: ComplaintStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "resolved", label: "Resolved" }
];
export const GOVERNORATES = [
  "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan", "Bizerte",
  "Béja", "Jendouba", "Kef", "Siliana", "Sousse", "Monastir", "Mahdia",
  "Sfax", "Kairouan", "Kasserine", "Sidi Bouzid", "Gabès", "Médenine",
  "Tataouine", "Gafsa", "Tozeur", "Kebili"
];
