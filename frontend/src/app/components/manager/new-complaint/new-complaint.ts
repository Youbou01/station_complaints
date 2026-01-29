import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { form, FormField } from '@angular/forms/signals';
import { 
  ComplaintFormData, 
  complaintInitialData, 
  complaintSchema,
  COMPLAINT_TYPES,
  SEVERITY_LEVELS,
  ComplaintType
} from '../../../models/complaint';
import { ComplaintsService } from '../../../services/complaints-service';

@Component({
  selector: 'app-new-complaint',
  imports: [FormField],
  templateUrl: './new-complaint.html',
  styleUrl: './new-complaint.css',
})
export class NewComplaint {
  private router = inject(Router);
  private complaintsService = inject(ComplaintsService);

  complaintModel = signal<ComplaintFormData>(complaintInitialData);
  complaintForm = form(this.complaintModel, complaintSchema);

  types = COMPLAINT_TYPES;
  severityLevels = SEVERITY_LEVELS;

  isLoading = signal(false);
  errorMessage = signal('');

  selectType(type: ComplaintType) {
    this.complaintModel.update(data => ({ ...data, type }));
  }

  selectSeverity(severity: number) {
    this.complaintModel.update(data => ({ ...data, severity }));
  }

  async onSubmit() {
    if (this.complaintForm().invalid()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    const data = this.complaintModel();

    try {
      await this.complaintsService.createComplaint({
        title: data.title,
        description: data.description,
        type: data.type as ComplaintType,
        severity: data.severity
      });
      this.router.navigate(['/manager/complaints']);
    } catch (error) {
      this.errorMessage.set(error as string);
    } finally {
      this.isLoading.set(false);
    }
  }

  cancel() {
    this.router.navigate(['/manager/complaints']);
  }
}