export interface Department {
  id: number;
  name: string;
  complaint_type: string;
  intervenant_id: number | null;
}

export interface DepartmentCreate {
  name: string;
  complaint_type: string;
  intervenant_id: number | null;
}

export interface DepartmentUpdate {
  name?: string;
  intervenant_id?: number | null;
}
