import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoginForm } from "./components/login-form/login-form";
import { SignUpForm } from "./components/sign-up-form/sign-up-form";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoginForm, SignUpForm],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
}
