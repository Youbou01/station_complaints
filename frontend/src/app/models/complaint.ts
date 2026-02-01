import { required, minLength, schema } from '@angular/forms/signals';

export type ComplaintType = 'technical' | 'mechanical' | 'oil_related' | 'safety' | 'administrative';
export type ComplaintStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'on_hold';

export const COMPLAINT_TYPES: { value: ComplaintType; label: string }[] = [
  { value: 'technical', label: 'Technical' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'oil_related', label: 'Oil Related' },
  { value: 'safety', label: 'Safety' },
  { value: 'administrative', label: 'Administrative' }
];

export const COMPLAINT_STATUSES: { value: ComplaintStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'on_hold', label: 'On Hold' }
];

export const SEVERITY_LEVELS = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Minor' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'High' },
  { value: 5, label: 'Critical' }
];

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
  station: {
    id: number;
    name: string;
    code: string;
    governorate: string;
  };
  created_by: {
    id: number;
    email: string;
    role: string;
  };
  assigned_to: {
    id: number;
    email: string;
    role: string;
  } | null;
}

export interface ComplaintFormData {
  title: string;
  description: string;
  type: ComplaintType | '';
  severity: number;
  station_id?: number;
}

export const complaintInitialData: ComplaintFormData = {
  title: '',
  description: '',
  type: '',
  severity: 3
};

export const complaintSchema = schema<ComplaintFormData>((root) => {
  required(root.title, { message: 'Title is required' });
  minLength(root.title, 5, { message: 'Title must be at least 5 characters' });
  
  required(root.description, { message: 'Description is required' });
  minLength(root.description, 10, { message: 'Description must be at least 10 characters' });
  
  required(root.type, { message: 'Please select a complaint type' });
});