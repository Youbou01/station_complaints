import { email, minLength, pattern, required, schema } from "@angular/forms/signals";

export enum Role{
    ADMINISTRATOR = "administrator",
    MANAGER = "manager",
    ASSISTANT = "assistant",
    INTERVENANT = "intervenant",
    DIRECTOR = "director"
}
export const ROLE_OPTIONS = [
  { value: Role.MANAGER, label: "Station Manager" },
  { value: Role.ASSISTANT, label: "SNDP Assistant" },
  { value: Role.INTERVENANT, label: "Intervenant" },
  { value: Role.DIRECTOR, label: "Director" },
];

export interface LoginData {
    email: string;
    password: string;
}

export const loginInitialData: LoginData = {
    email: '',
    password: ''
};
export const loginSchema = schema<LoginData>((root) => {
    required(root.email, { message: 'Email is required' });
    email(root.email, { message: 'Please enter a valid email' });
    required(root.password, { message: 'Password is required' });
});


// ============== SIGN UP ==============
export interface SignUpData {
    email: string;
    password: string;
    confirmPassword: string;
    role: Role | null;
}

export const signUpInitialData: SignUpData = {
    email: '',
    password: '',
    confirmPassword: '',
    role: null
};
export const signUpSchema = schema<SignUpData>((root) => {
    // Email validation
    required(root.email, { message: 'Email is required' });
    email(root.email, { message: 'Please enter a valid email' });
    
    // Password validation
    required(root.password, { message: 'Password is required' });
    minLength(root.password, 8, { message: 'At least 8 characters' });
    
    // [[[[OPTIONAL]]]]
    // pattern(root.password, /[0-9]+/, { message: 'At least one number' });
    // pattern(root.password, /[A-Z]+/, { message: 'At least one uppercase letter' });
    // pattern(root.password, /[#@*_/\-!$%^&]+/, { message: 'At least one special character' });
    // [[[[OPTIONAL]]]]

    // Confirm password
    required(root.confirmPassword, { message: 'Please confirm your password' });
    
    // Role validation
    required(root.role, { message: 'Please select your role' });
});

    //naamlo aka 3 texts eli yetbadlo green/red-x/done lel fields taa l mdp, yodhhro ki l field touched w yetbadlo irl Time
