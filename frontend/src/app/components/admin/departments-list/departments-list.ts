import { Component, inject, OnInit, signal } from '@angular/core';
import { DepartmentsService, Department, DepartmentCreate } from '../../../services/departments-service';
import { UsersService, User } from '../../../services/users-service';
import { COMPLAINT_TYPES, ComplaintType } from '../../../models/complaint';

@Component({
  selector: 'app-departments-list',
  imports: [],
  templateUrl: './departments-list.html',
  styleUrl: './departments-list.css',
})
export class DepartmentsList implements OnInit {
  departmentsService = inject(DepartmentsService);
  usersService = inject(UsersService);

  complaintTypes = COMPLAINT_TYPES;
  
  showCreateModal = signal(false);
  showAssignModal = signal(false);
  selectedDepartment = signal<Department | null>(null);
  
  newDeptName = signal('');
  newDeptType = signal<ComplaintType | ''>('');
  selectedIntervenantId = signal<number | null>(null);
  
  errorMessage = signal('');

  ngOnInit() {
    this.departmentsService.loadDepartments();
    this.usersService.loadUsers();
  }

  get intervenants(): User[] {
    return this.usersService.users().filter(u => u.role === 'intervenant' && u.is_active);
  }

  getIntervenantEmail(id: number | null): string {
    if (!id) return 'Not assigned';
    const user = this.usersService.users().find(u => u.id === id);
    return user?.email || 'Unknown';
  }

  getTypeLabel(type: string): string {
    return this.complaintTypes.find(t => t.value === type)?.label || type;
  }

  getMissingTypes(): { value: ComplaintType; label: string }[] {
    const existingTypes = this.departmentsService.departments().map(d => d.complaint_type);
    return this.complaintTypes.filter(t => !existingTypes.includes(t.value));
  }

  openCreateModal() {
    this.newDeptName.set('');
    this.newDeptType.set('');
    this.selectedIntervenantId.set(null);
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  selectType(type: ComplaintType) {
    this.newDeptType.set(type);
    this.newDeptName.set(this.getTypeLabel(type) + ' Department');
  }

  selectIntervenantForCreate(id: number) {
    this.selectedIntervenantId.set(id);
  }

  async createDepartment(event: Event) {
    event.preventDefault();
    
    const type = this.newDeptType();
    const name = this.newDeptName();
    
    if (!type || !name) {
      this.errorMessage.set('Please select a type and enter a name');
      return;
    }

    try {
      const payload: DepartmentCreate = {
        name,
        complaint_type: type as ComplaintType
      };
      
      if (this.selectedIntervenantId()) {
        payload.intervenant_id = this.selectedIntervenantId()!;
      }
      
      await this.departmentsService.createDepartment(payload);
      this.closeCreateModal();
    } catch (error) {
      this.errorMessage.set(error as string);
    }
  }

  openAssignModal(department: Department) {
    this.selectedDepartment.set(department);
    this.selectedIntervenantId.set(department.intervenant_id);
    this.showAssignModal.set(true);
  }

  closeAssignModal() {
    this.selectedDepartment.set(null);
    this.showAssignModal.set(false);
  }

  selectIntervenant(id: number) {
    this.selectedIntervenantId.set(id);
  }

  async assignIntervenant(event: Event) {
    event.preventDefault();
    
    const dept = this.selectedDepartment();
    const intervenantId = this.selectedIntervenantId();
    
    if (!dept || !intervenantId) return;

    try {
      await this.departmentsService.updateDepartment(dept.id, { intervenant_id: intervenantId });
      this.closeAssignModal();
    } catch (error) {
      this.errorMessage.set(error as string);
    }
  }
}