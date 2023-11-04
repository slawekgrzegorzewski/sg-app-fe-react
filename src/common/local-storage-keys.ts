import {User} from "../types";

export const JWT_TOKEN = 'token';
export const LOGGED_IN_USER = 'user';
export const CURRENT_DOMAIN_ID = 'domainId';
export const USER_APPLICATIONS_ACCESS = 'applications';

export function getCurrentUser(): User {
    return JSON.parse(localStorage.getItem(LOGGED_IN_USER)!);
}