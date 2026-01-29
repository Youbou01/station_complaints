import { Component, inject, OnInit, signal } from '@angular/core';
import { User, UsersService } from '../../../services/users-service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-users-list',
  imports: [FormsModule],
  templateUrl: './users-list.html',
  styleUrl: './users-list.css',
})
export class UsersList implements OnInit {
  usersService = inject(UsersService);
  errorMessage = signal('');
  successMessage = signal('');
  showCreateModal = signal(false);
  createEmail = signal('');
  createPassword = signal('');
  createRole = signal('manager');

  ngOnInit() {
    this.usersService.loadUsers();
  }

  openCreateModal() {
    this.showCreateModal.set(true);
    this.createEmail.set('');
    this.createPassword.set('');
    this.createRole.set('manager');
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  async createUser(event: Event) {
    event.preventDefault();
    
    if (!this.createEmail() || !this.createPassword()) {
      this.errorMessage.set('Email and password are required');
      return;
    }

    if (this.createPassword().length < 8) {
      this.errorMessage.set('Password must be at least 8 characters');
      return;
    }

    try {
      await this.usersService.createUser(
        this.createEmail(),
        this.createPassword(),
        this.createRole()
      );
      this.successMessage.set('User created successfully');
      this.closeCreateModal();
    } catch (error) {
      this.errorMessage.set(error as string);
    }
  }

  async activateUser(user: User) {
    try {
      await this.usersService.activateUser(user.id);
      this.successMessage.set('User activated successfully');
    } catch (error) {
      this.errorMessage.set(error as string);
    }
  }

  async deactivateUser(user: User) {
    try {
      await this.usersService.deactivateUser(user.id);
      this.successMessage.set('User deactivated successfully');
    } catch (error) {
      this.errorMessage.set(error as string);
    }
  }
}