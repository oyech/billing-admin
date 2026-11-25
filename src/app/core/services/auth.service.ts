import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse, UserProfile } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'tares_auth_token';
  private readonly USER_KEY = 'tares_auth_user';

  private currentUserSignal = signal<UserProfile | null>(this.getStoredUser());
  private tokenSignal = signal<string | null>(this.getStoredToken());

  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => !!this.tokenSignal());
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'admin');

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<any>(`${environment.apiUrl}/auth/login`, {
      username: credentials.email,
      password: credentials.password
    }).pipe(
      map((res: any): LoginResponse => {
        const token = res.token;
        const user = res.user;
        const mapped: LoginResponse = {
          access_token: token,
          token_type: res.token_type || 'bearer',
          role: user.role,
          user_id: user.id,
          email: user.username,
          full_name: user.display_name
        };
        this.setSession(mapped);
        return mapped;
      })
    );
  }

  logout(): void {
    try {
      this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({ error: () => {} });
    } catch (_) {}
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  fetchMe(): Observable<UserProfile> {
    return this.http.get<any>(`${environment.apiUrl}/auth/me`).pipe(
      map((user: any): UserProfile => {
        const mapped: UserProfile = {
          id: user.id,
          email: user.username || user.email || '',
          full_name: user.display_name || user.full_name || user.username || '',
          role: user.role,
          active: user.active ?? true,
          assigned_tower_id: user.assigned_tower?.id || user.assigned_tower_id || null,
          assigned_tower_name: user.assigned_tower?.name || user.assigned_tower_name || null
        };
        this.currentUserSignal.set(mapped);
        localStorage.setItem(this.USER_KEY, JSON.stringify(mapped));
        return mapped;
      })
    );
  }

  private setSession(authResult: LoginResponse): void {
    localStorage.setItem(this.TOKEN_KEY, authResult.access_token);
    this.tokenSignal.set(authResult.access_token);

    const user: UserProfile = {
      id: authResult.user_id,
      email: authResult.email,
      full_name: authResult.full_name,
      role: authResult.role as 'admin' | 'petugas',
      active: true
    };
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSignal.set(user);
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private getStoredUser(): UserProfile | null {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
