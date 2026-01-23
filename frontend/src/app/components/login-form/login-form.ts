import { Component, effect, signal,  } from '@angular/core';
import { initialData, loginSchema, User } from '../../models/user';
import {form,FormField} from '@angular/forms/signals'
@Component({
  selector: 'app-login-form',
  imports: [FormField],
  templateUrl: './login-form.html',
  styleUrl: './login-form.css',
})
export class LoginForm {
  //form model signal
  loginModel = signal<User>(initialData);
  
  loginForm = form(this.loginModel, loginSchema)
  
  eff = effect(() => {
    console.log('email: ', this.loginModel().email);
  });
}


