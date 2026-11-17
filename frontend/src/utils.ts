import type { Complaint, Role } from "./types";

export function roleHome(role: Role): string {
  return `/${role}/dashboard`;
}
export function statusLabel(status: string): string {
  return ({ open: "Open", assigned: "Assigned", in_progress: "In Progress", on_hold: "On Hold", resolved: "Resolved" } as Record<string, string>)[status] || status;
}
export function typeLabel(type: string): string {
  return ({ technical: "Technical", mechanical: "Mechanical", oil_related: "Oil Related", safety: "Safety", administrative: "Administrative" } as Record<string, string>)[type] || type;
}
export function dateLabel(value?: string | null, style: "short" | "medium" = "short"): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, style === "medium"
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "short" }).format(date);
}
export function netResolutionSeconds(complaint: Complaint): number | null {
  if (!complaint.assigned_at || !complaint.resolved_at) return null;
  const elapsed = (new Date(complaint.resolved_at).getTime() - new Date(complaint.assigned_at).getTime()) / 1000;
  return Math.max(0, elapsed - (complaint.total_on_hold_seconds || 0));
}
export function durationLabel(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "—";
  const minutes = Math.floor(seconds / 60);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remaining = minutes % 60;
  return days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${remaining}m` : `${remaining}m`;
}
export function roleLabel(role: string): string {
  return ({ administrator: "Administrator", manager: "Station Manager", assistant: "SNDP Assistant", intervenant: "Intervenant", director: "Director" } as Record<string, string>)[role] || role;
}
