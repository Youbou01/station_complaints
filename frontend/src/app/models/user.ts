import { email, minLength, pattern, required, schema } from "@angular/forms/signals";

export enum Role{
    
}
export interface User {
    email:string;
    role?: Role;
    password:string;
}
export const initialData : User = {
    email:'',
    password:''
}
export const loginSchema = schema<User>((rootPath)=>{
    required(rootPath.email, {message: 'Email address is required'})
    email(rootPath.email, {message: 'Enter a valid email adress'})
    minLength(rootPath.password,8,{message: 'Password needs to be at least 8 characters long'});
    pattern(rootPath.password,/[0-9]+/,{message: 'Password must contain at least one number'})
    //naamlo aka 3 texts eli yetbadlo green/red-x/done lel fields taa l mdp, yodhhro ki l field touched w yetbadlo irl Time
    pattern(rootPath.password,/.*[#@*_/-].*/,{message: 'Password must contain at least one special character (# @ * _ / -)'})
})