export interface AuthenticatedUser { id: string; email: string; displayName?: string; } export interface AuthService { currentUser(): Promise<AuthenticatedUser | null>; }
