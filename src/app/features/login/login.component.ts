import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-header">
          <div class="brand-badge">TARES</div>
          <h1 class="login-title">Taman Anggrek Residence</h1>
          <p class="login-subtitle">Portal Web Admin Billing Listrik & Air</p>
        </div>

        @if (errorMessage()) {
          <div class="alert-error">
            <span>⚠️</span>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label for="email">Email Admin / Petugas</label>
            <input
              type="email"
              id="email"
              name="email"
              [(ngModel)]="email"
              placeholder="admin@tares.id"
              required
              [disabled]="isLoading()"
            />
          </div>

          <div class="form-group">
            <label for="password">Kata Sandi</label>
            <input
              type="password"
              id="password"
              name="password"
              [(ngModel)]="password"
              placeholder="••••••••"
              required
              [disabled]="isLoading()"
            />
          </div>

          <button type="submit" class="btn btn-primary btn-submit" [disabled]="isLoading()">
            @if (isLoading()) {
              <span>Memproses...</span>
            } @else {
              <span>Masuk ke Dashboard</span>
            }
          </button>
        </form>

        <div class="demo-hints">
          <p class="hints-title">Pilih Akun Demo Cepat:</p>
          <div class="hint-chips">
            <button
              type="button"
              class="chip-btn"
              (click)="fillCredentials('admin@tares.id', 'AdminPass123!')"
            >
              👑 Admin
            </button>
            <button
              type="button"
              class="chip-btn"
              (click)="fillCredentials('petugas@tares.id', 'PetugasPass123!')"
            >
              👷 Petugas Lapangan
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      padding: 1.5rem;
    }
    .login-card {
      background: #FFFFFF;
      width: 100%;
      max-width: 420px;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.2);
      padding: 2.25rem;
    }
    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .brand-badge {
      display: inline-block;
      background: #1565C0;
      color: white;
      font-weight: 800;
      font-size: 0.95rem;
      letter-spacing: 0.1em;
      padding: 0.35rem 0.85rem;
      border-radius: 8px;
      margin-bottom: 0.75rem;
    }
    .login-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 0.25rem;
    }
    .login-subtitle {
      font-size: 0.85rem;
      color: #64748B;
    }
    .alert-error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background-color: #FEE2E2;
      border: 1px solid #FECACA;
      border-radius: 8px;
      color: #991B1B;
      font-size: 0.85rem;
      margin-bottom: 1.25rem;
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .form-group label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
    }
    .btn-submit {
      width: 100%;
      padding: 0.75rem;
      font-size: 0.95rem;
      font-weight: 600;
      margin-top: 0.5rem;
    }
    .demo-hints {
      margin-top: 2rem;
      padding-top: 1.25rem;
      border-top: 1px dashed #E2E8F0;
      text-align: center;
    }
    .hints-title {
      font-size: 0.75rem;
      color: #64748B;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
    }
    .hint-chips {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
    }
    .chip-btn {
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .chip-btn:hover {
      background: #E2E8F0;
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  fillCredentials(email: string, pass: string): void {
    this.email = email;
    this.password = pass;
    this.errorMessage.set(null);
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set('Harap isi email dan kata sandi.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const detail = err?.error?.detail || 'Gagal masuk. Periksa kembali email dan kata sandi Anda.';
        this.errorMessage.set(detail);
      }
    });
  }
}
