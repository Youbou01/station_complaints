import { Component, inject, OnInit, signal } from '@angular/core';
import { User, UsersService } from '../../../services/users-service';

@Component({
  selector: 'app-users-list',
  imports: [],
  templateUrl: './users-list.html',
  styleUrl: './users-list.css',
})
export class UsersList implements OnInit {
  usersService = inject(UsersService);
  errorMessage = signal('');

  ngOnInit() {
    this.usersService.loadUsers();
  }

  async activateUser(user: User) {
    try {
      await this.usersService.activateUser(user.id);
    } catch (error) {
      this.errorMessage.set(error as string);
    }
  }

  async deactivateUser(user: User) {
    try {
      await this.usersService.deactivateUser(user.id);
    } catch (error) {
      this.errorMessage.set(error as string);
    }
  }
}