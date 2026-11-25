import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import {
  BackupItem,
  MeterReading,
  ReadingPeriod,
  ServerHealth,
  Tower,
  TowerSummary,
  UserProfile
} from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-layout">
      <!-- 1. TOP NAVIGATION BAR -->
      <header class="app-header">
        <div class="brand-group">
          <div class="brand-logo">
            <span class="logo-bolt">⚡</span>
            <span>TARES</span>
          </div>
          <div class="brand-info">
            <h1 class="brand-title">Taman Anggrek Residence</h1>
            <p class="brand-sub">Portal Web Admin &bull; Monitoring Listrik &amp; Air</p>
          </div>
        </div>

        <div class="header-right">
          <!-- Server Status Indicator -->
          <div class="server-badge" [class.online]="isServerOnline()" [class.offline]="!isServerOnline()">
            <span class="status-dot"></span>
            <span>{{ isServerOnline() ? 'Server ONLINE' : 'Server OFFLINE' }}</span>
          </div>

          <div class="nav-divider"></div>

          <!-- Action Buttons -->
          <div class="header-actions">
            <!-- Single Primary Solid Blue Button -->
            <button class="btn btn-primary" (click)="openModal('new-period')" title="Buka Periode Pembacaan Baru">
              <span class="btn-icon">📅</span>
              <span>Buka Periode Baru</span>
            </button>

            <!-- Secondary Actions: Clean borderless ghost buttons -->
            <div class="ghost-actions-group">
              <button class="btn btn-ghost" (click)="openModal('manage-periods')" title="Kelola Riwayat Periode">
                <span class="btn-icon">🗓️</span>
                <span>Kelola Periode</span>
              </button>
              <button class="btn btn-ghost" (click)="openModal('backup')" title="Backup &amp; Arsip Database">
                <span class="btn-icon">💾</span>
                <span>Backup &amp; Arsip</span>
              </button>
              <button class="btn btn-ghost" (click)="openModal('users')" title="Penugasan Akun &amp; Petugas">
                <span class="btn-icon">👥</span>
                <span>Akun &amp; Petugas</span>
              </button>
              <a href="http://localhost:8000/download/apk" target="_blank" class="btn btn-ghost" download title="Unduh Berkas Aplikasi Android">
                <span class="btn-icon">📲</span>
                <span>Download APK</span>
              </a>
            </div>

            <!-- Subtle soft-red outline/ghost button for Tutup Periode -->
            <button class="btn btn-soft-danger" (click)="openModal('close-period')" title="Kunci &amp; Tutup Periode">
              <span class="btn-icon">🔒</span>
              <span>Tutup Periode</span>
            </button>
          </div>

          <div class="nav-divider"></div>

          <!-- User Profile & Logout -->
          <div class="user-profile">
            <div class="user-avatar" [title]="currentUser()?.role || 'User'">
              {{ (currentUser()?.full_name || currentUser()?.email || 'A').slice(0, 1).toUpperCase() }}
            </div>
            <div class="user-meta">
              <span class="user-name">{{ currentUser()?.full_name || currentUser()?.email }}</span>
              <span class="user-role">{{ currentUser()?.role }}</span>
            </div>
            <button class="btn btn-ghost btn-sm btn-logout" (click)="logout()" title="Keluar dari sesi">
              Keluar
            </button>
          </div>
        </div>
      </header>

      <!-- MAIN CONTENT -->
      <main class="main-content">
        <!-- 2. KPI SUMMARY CARDS (Tower A - F) -->
        <section class="tower-cards-grid">
          @for (ts of towerSummaries(); track ts.name) {
            <div
              class="tower-card"
              [class.active]="selectedTower === ts.name"
              (click)="filterByTower(ts.name)"
            >
              <div class="tc-header">
                <div class="tc-title-wrap">
                  <span class="tc-title">{{ ts.name }}</span>
                  <span class="tc-code">{{ ts.code }}</span>
                </div>
                <span class="tc-percent">{{ ts.progressPercent.toFixed(1) }}%</span>
              </div>
              <div class="tc-stats">
                <span class="tc-label">Tercatat</span>
                <span class="tc-count">{{ ts.recordedUnits | number }} <span class="tc-total">/ {{ ts.totalUnits | number }} Unit</span></span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" [style.width.%]="ts.progressPercent"></div>
              </div>
            </div>
          }
        </section>

        <!-- 3. FILTER & ACTION BAR -->
        <section class="toolbar-card">
          <div class="filter-controls">
            <!-- Period Filter -->
            <div class="ctrl-item">
              <label class="ctrl-label" for="period-select">Periode:</label>
              <div class="ctrl-select-group">
                <select id="period-select" class="form-select-unified" [(ngModel)]="selectedPeriodId" (change)="onPeriodChange()">
                  @for (p of periods(); track p.id) {
                    <option [value]="p.id">{{ p.period_month }} ({{ p.status }})</option>
                  }
                </select>
                <button class="btn-icon-delete" (click)="deleteSelectedPeriod()" title="Hapus periode terpilih">
                  🗑️
                </button>
              </div>
            </div>

            <!-- Tower Filter -->
            <div class="ctrl-item">
              <label class="ctrl-label" for="tower-select">Tower:</label>
              <select id="tower-select" class="form-select-unified" [(ngModel)]="selectedTower" (change)="applyFilters()">
                <option value="all">Semua Tower (A - F)</option>
                <option value="Tower A">Tower A</option>
                <option value="Tower B">Tower B</option>
                <option value="Tower C">Tower C</option>
                <option value="Tower D">Tower D</option>
                <option value="Tower E">Tower E</option>
                <option value="Tower F">Tower F</option>
              </select>
            </div>

            <!-- Meter Type Filter -->
            <div class="ctrl-item">
              <label class="ctrl-label" for="meter-type-select">Jenis Meter:</label>
              <select id="meter-type-select" class="form-select-unified" [(ngModel)]="selectedMeterType" (change)="applyFilters()">
                <option value="all">Semua Jenis</option>
                <option value="electricity">Listrik (kWh)</option>
                <option value="water">Air (m³)</option>
              </select>
            </div>

            <!-- Unit Search -->
            <div class="ctrl-item search-item">
              <div class="search-box">
                <span class="search-icon">🔍</span>
                <input
                  type="text"
                  class="form-input-unified"
                  [(ngModel)]="searchQuery"
                  (input)="applyFilters()"
                  placeholder="Cari unit (mis: A-0101, STF-GF)..."
                />
              </div>
            </div>
          </div>

          <!-- Export Actions -->
          <div class="export-controls">
            <button class="btn btn-secondary-outline" (click)="downloadPdf()" [disabled]="isExporting()">
              <span class="btn-icon">📄</span>
              <span>Cetak PDF</span>
            </button>
            <button class="btn btn-emerald" (click)="downloadExcel()" [disabled]="isExporting()">
              <span class="btn-icon">📊</span>
              <span>Ekspor Excel</span>
            </button>
          </div>
        </section>

        <!-- 4. DATA TABLE -->
        <section class="table-card">
          <div class="table-header-info">
            <div class="table-title-group">
              <span class="info-title">Daftar Pembacaan Stand Meter</span>
              <span class="info-count">{{ filteredReadings().length | number }} baris data</span>
            </div>
          </div>

          <div class="table-wrapper">
            <table class="enterprise-table">
              <thead>
                <tr>
                  <th>Tower</th>
                  <th>Unit</th>
                  <th>Lantai</th>
                  <th>No. Meter</th>
                  <th>Jenis</th>
                  <th class="num-col">Stand Awal</th>
                  <th class="num-col">Stand Akhir</th>
                  <th class="num-col">Pemakaian</th>
                  <th>Petugas</th>
                  <th>Waktu</th>
                  <th>Status</th>
                  <th>Foto</th>
                  <th style="text-align:center;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                @if (isLoading()) {
                  <tr>
                    <td colspan="13" class="empty-cell">
                      <div class="table-loading-wrap">
                        <span class="spinner-sm"></span>
                        <span>Memuat data pembacaan dari server...</span>
                      </div>
                    </td>
                  </tr>
                } @else if (filteredReadings().length === 0) {
                  <tr>
                    <td colspan="13" class="empty-cell">
                      <div class="empty-state-content">
                        <span class="empty-icon">🔍</span>
                        <p>Tidak ada data pembacaan yang sesuai dengan filter saat ini.</p>
                      </div>
                    </td>
                  </tr>
                } @else {
                  @for (r of paginatedReadings(); track r.id) {
                    <tr>
                      <td><span class="tower-tag">{{ r.tower_name || '-' }}</span></td>
                      <td><strong class="unit-code">{{ r.unit_number }}</strong></td>
                      <td><span class="floor-code">{{ r.floor || '-' }}</span></td>
                      <td class="font-mono text-muted">{{ r.meter_number }}</td>
                      <td>
                        <span class="badge" [class.badge-electric]="isElectric(r)" [class.badge-water]="!isElectric(r)">
                          {{ isElectric(r) ? '⚡ Listrik' : '💧 Air' }}
                        </span>
                      </td>
                      <td class="num-col">{{ r.previous_value !== null ? (r.previous_value | number:'1.1-2') : '-' }}</td>
                      <td class="num-col"><strong class="stand-val">{{ r.meter_value | number:'1.1-2' }}</strong></td>
                      <td class="num-col" [class.text-danger]="(r.usage ?? 0) < 0">
                        <span class="usage-pill" [class.negative]="(r.usage ?? 0) < 0">
                          {{ r.usage !== null ? (r.usage | number:'1.1-2') : '-' }}
                        </span>
                      </td>
                      <td><span class="officer-name">{{ r.officer_name || '-' }}</span></td>
                      <td class="date-col">{{ r.reading_timestamp ? (r.reading_timestamp | date:'dd/MM/yy HH:mm') : '-' }}</td>
                      <td>
                        <span class="badge" [ngClass]="getStatusBadgeClass(r.verification_status)">
                          {{ r.verification_status }}
                        </span>
                      </td>
                      <td>
                        @if (r.has_photo || r.photo_url || r.photo_filename) {
                          <button class="btn-photo-pill" (click)="openPhotoModal(r)" title="Lihat Foto Bukti Fisik Meter">
                            <span>📷</span>
                            <span>Foto</span>
                          </button>
                        } @else {
                          <span class="text-subtle">-</span>
                        }
                      </td>
                      <td style="text-align:center;">
                        <button class="btn-edit-action" (click)="openEditModal(r)" title="Koreksi Stand Meter">
                          <span>✏️</span>
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="pagination-bar">
              <span class="pagination-info">Halaman <strong class="text-dark">{{ currentPage() }}</strong> dari <strong class="text-dark">{{ totalPages() }}</strong></span>
              <div class="pagination-btns">
                <button
                  class="btn btn-page"
                  [disabled]="currentPage() === 1"
                  (click)="setPage(currentPage() - 1)"
                >
                  ◀ Sebelumnya
                </button>
                <button
                  class="btn btn-page"
                  [disabled]="currentPage() === totalPages()"
                  (click)="setPage(currentPage() + 1)"
                >
                  Berikutnya ▶
                </button>
              </div>
            </div>
          }
        </section>
      </main>

      <!-- MODALS -->

      <!-- 1. PHOTO MODAL -->
      @if (activeModal() === 'photo' && selectedReading()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-box photo-modal-box" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title">Foto Fisik Meter — {{ selectedReading()?.unit_number }} ({{ selectedReading()?.meter_number }})</div>
              <button class="modal-close" (click)="closeModal()">&times;</button>
            </div>
            <div class="modal-body text-center">
              @if (isPhotoLoading()) {
                <div class="photo-loading-box">
                  <span class="spinner-sm"></span>
                  <p>Memuat foto meter...</p>
                </div>
              }
              @if (photoLoadError()) {
                <div class="alert-error" style="margin-bottom:1rem; text-align:left;">
                  <span>⚠️ Foto meter tidak ditemukan di server atau belum diunggah.</span>
                </div>
              }
              <img
                [src]="photoModalUrl()"
                alt="Foto Meter"
                class="photo-preview-img"
                [style.display]="photoLoadError() ? 'none' : (isPhotoLoading() ? 'none' : 'block')"
                (load)="onPhotoLoad()"
                (error)="onPhotoError($event)"
              />
              <div class="photo-meta">
                <p><strong>Stand Tercatat:</strong> {{ selectedReading()?.meter_value }} {{ selectedReading()?.unit_of_measure }}</p>
                <p><strong>Waktu Foto:</strong> {{ selectedReading()?.reading_timestamp | date:'dd MMM yyyy, HH:mm:ss' }}</p>
                <p><strong>Petugas:</strong> {{ selectedReading()?.officer_name || selectedReading()?.user_id || 'Petugas Lapangan' }}</p>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeModal()">Tutup</button>
            </div>
          </div>
        </div>
      }

      <!-- 2. EDIT READING MODAL -->
      @if (activeModal() === 'edit' && selectedReading()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-box" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title">Koreksi Stand Meter — {{ selectedReading()?.unit_number }}</div>
              <button class="modal-close" (click)="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <label>Nomor Meter:</label>
                <strong>{{ selectedReading()?.meter_number }} ({{ selectedReading()?.meter_type }})</strong>
              </div>
              <div class="form-row">
                <label>Stand Sebelumnya (Awal):</label>
                <span>{{ selectedReading()?.previous_value }} {{ selectedReading()?.unit_of_measure }}</span>
              </div>
              <div class="form-group" style="margin-top:1rem;">
                <label><strong>Stand Baru (Koreksi):</strong></label>
                <input
                  type="number"
                  step="0.1"
                  [(ngModel)]="editForm.meter_value"
                  (input)="recalcUsage()"
                />
              </div>
              <div class="form-row" style="background:#F1F5F9; padding:0.5rem 0.75rem; border-radius:6px; margin:0.75rem 0;">
                <label>Kalkulasi Pemakaian Baru:</label>
                <strong [class.text-danger]="editCalculatedUsage < 0">{{ editCalculatedUsage | number:'1.1-2' }} {{ selectedReading()?.unit_of_measure }}</strong>
              </div>
              <div class="form-group">
                <label><strong>Alasan Koreksi (Wajib untuk Audit Log):</strong></label>
                <input
                  type="text"
                  [(ngModel)]="editForm.reason"
                  placeholder="Misal: Salah catat angka digit terakhir oleh petugas"
                />
              </div>
              <div class="form-group">
                <label>Catatan Tambahan:</label>
                <input
                  type="text"
                  [(ngModel)]="editForm.notes"
                  placeholder="Keterangan opsional"
                />
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeModal()">Batal</button>
              <button class="btn btn-primary" (click)="saveEditReading()" [disabled]="isSaving()">
                💾 Simpan Koreksi
              </button>
            </div>
          </div>
        </div>
      }

      <!-- 3. NEW PERIOD MODAL -->
      @if (activeModal() === 'new-period') {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-box" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title">Buka Periode Pembacaan Baru</div>
              <button class="modal-close" (click)="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
              <p class="text-muted" style="margin-bottom:1rem;">
                Format bulan pembacaan adalah <code>YYYY-MM</code> (contoh: <code>2026-11</code>).
                Saat periode baru dibuka, stand akhir periode sebelumnya otomatis menjadi stand awal periode baru.
              </p>
              <div class="form-group">
                <label>Bulan Periode (YYYY-MM):</label>
                <input type="text" [(ngModel)]="newPeriodMonth" placeholder="2026-11" />
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeModal()">Batal</button>
              <button class="btn btn-primary" (click)="createPeriod()" [disabled]="isSaving()">
                📅 Buka Periode Sekarang
              </button>
            </div>
          </div>
        </div>
      }

      <!-- 4. MANAGE PERIODS MODAL -->
      @if (activeModal() === 'manage-periods') {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-box" style="max-width:640px;" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title">Kelola Periode Pembacaan</div>
              <button class="modal-close" (click)="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
              <table style="width:100%; font-size:0.85rem;">
                <thead>
                  <tr style="text-align:left; border-bottom:1px solid #E2E8F0;">
                    <th style="padding:0.5rem;">Bulan</th>
                    <th style="padding:0.5rem;">Status</th>
                    <th style="padding:0.5rem;">Dibuka</th>
                    <th style="padding:0.5rem; text-align:right;">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of periods(); track p.id) {
                    <tr style="border-bottom:1px solid #F1F5F9;">
                      <td style="padding:0.5rem;"><strong>{{ p.period_month }}</strong></td>
                      <td style="padding:0.5rem;">
                        <span class="badge" [class.badge-success]="p.status==='active'" [class.badge-neutral]="p.status==='closed'">
                          {{ p.status }}
                        </span>
                      </td>
                      <td style="padding:0.5rem; color:#64748B;">{{ p.opened_at | date:'dd/MM/yy' }}</td>
                      <td style="padding:0.5rem; text-align:right;">
                        <button class="btn btn-danger btn-xs" (click)="deletePeriod(p.id)">Hapus</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- 5. CLOSE PERIOD MODAL -->
      @if (activeModal() === 'close-period') {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-box" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title">Tutup Periode Pembacaan</div>
              <button class="modal-close" (click)="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
              <p style="margin-bottom:1rem; color:#64748B;">
                Periode yang ditutup akan dikunci sehingga petugas lapangan tidak dapat lagi mengubah data stand meter pada periode tersebut.
              </p>
              <div style="margin-bottom:1rem;">
                <label>Pilih Periode untuk Ditutup:</label>
                <select [(ngModel)]="periodToCloseId">
                  @for (p of activePeriods(); track p.id) {
                    <option [value]="p.id">{{ p.period_month }} ({{ p.status }})</option>
                  }
                </select>
              </div>
              <div style="display:flex; align-items:center; gap:0.5rem; margin-top:1rem;">
                <input type="checkbox" id="chk-purge" [(ngModel)]="purgePhotosOnClose" />
                <label for="chk-purge" style="font-size:0.85rem;">Hapus foto fisik meter yang sudah lewat 60 hari untuk menghemat memori server.</label>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeModal()">Batal</button>
              <button class="btn btn-danger" (click)="closePeriod()" [disabled]="isSaving()">
                🔒 Kunci & Tutup Periode
              </button>
            </div>
          </div>
        </div>
      }

      <!-- 6. BACKUP MODAL -->
      @if (activeModal() === 'backup') {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-box" style="max-width:650px;" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title">Manajemen Backup & Arsip Sistem</div>
              <button class="modal-close" (click)="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
              <p style="color:#64748B; margin-bottom:1rem;">
                Backup menyimpan snapshot database SQLite beserta verifikasi hash SHA-256 integritas file ke folder penyimpanan lokal server.
              </p>
              <button class="btn btn-primary" (click)="triggerBackup()" [disabled]="isSaving()" style="margin-bottom:1.25rem;">
                ⚡ Buat Backup Sekarang
              </button>

              <div style="font-weight:600; margin-bottom:0.5rem;">Daftar Berkas Backup:</div>
              <div style="max-height:220px; overflow-y:auto; border:1px solid #E2E8F0; border-radius:6px; padding:0.5rem;">
                @if (backups().length === 0) {
                  <p style="text-align:center; padding:1rem; color:#94A3B8;">Belum ada arsip backup.</p>
                } @else {
                  @for (b of backups(); track b.filename) {
                    <div style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid #F1F5F9; font-size:0.8rem;">
                      <div>
                        <strong>{{ b.filename }}</strong>
                        <div style="color:#64748B;">{{ b.created_at | date:'dd MMM yyyy HH:mm' }} • {{ b.size_mb }} MB</div>
                      </div>
                      <span class="badge badge-success" style="align-self:center;">Terverifikasi</span>
                    </div>
                  }
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- 7. USERS MODAL -->
      @if (activeModal() === 'users') {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-box" style="max-width:650px;" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title">Penugasan Tower Petugas Lapangan</div>
              <button class="modal-close" (click)="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
              <table style="width:100%; font-size:0.85rem;">
                <thead>
                  <tr style="text-align:left; border-bottom:1px solid #E2E8F0;">
                    <th style="padding:0.5rem;">Petugas</th>
                    <th style="padding:0.5rem;">Role</th>
                    <th style="padding:0.5rem;">Penugasan Tower</th>
                  </tr>
                </thead>
                <tbody>
                  @for (u of users(); track u.id) {
                    <tr style="border-bottom:1px solid #F1F5F9;">
                      <td style="padding:0.5rem;">
                        <strong>{{ u.full_name }}</strong>
                        <div style="font-size:0.75rem; color:#64748B;">{{ u.email }}</div>
                      </td>
                      <td style="padding:0.5rem;">
                        <span class="badge" [class.badge-success]="u.role==='admin'" [class.badge-warning]="u.role==='petugas'">
                          {{ u.role }}
                        </span>
                      </td>
                      <td style="padding:0.5rem;">
                        @if (u.role === 'petugas') {
                          <select [ngModel]="u.assigned_tower_id || ''" (ngModelChange)="onAssignTower(u.id, $event)">
                            <option value="">Belum Ditugaskan</option>
                            @for (t of towers(); track t.id) {
                              <option [value]="t.id">{{ t.name }}</option>
                            }
                          </select>
                        } @else {
                          <span style="color:#64748B;">Semua Tower (Akses Penuh)</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-layout {
      min-height: 100vh;
      background: #F8FAFC;
      display: flex;
      flex-direction: column;
    }

    /* 1. TOP NAVIGATION BAR */
    .app-header {
      background: #FFFFFF;
      border-bottom: 1px solid #E2E8F0;
      padding: 0.75rem 1.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .brand-group {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .brand-logo {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: #2563EB;
      color: #FFFFFF;
      font-weight: 700;
      font-size: 0.875rem;
      padding: 0.35rem 0.65rem;
      border-radius: 8px;
      letter-spacing: 0.04em;
    }
    .logo-bolt {
      font-size: 0.9rem;
    }
    .brand-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #0F172A;
      letter-spacing: -0.01em;
      line-height: 1.25;
    }
    .brand-sub {
      font-size: 0.725rem;
      color: #64748B;
      line-height: 1.2;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      flex-wrap: wrap;
    }
    .server-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      border: 1px solid transparent;
      white-space: nowrap;
    }
    .server-badge.online {
      background: #F0FDF4;
      color: #15803D;
      border-color: #DCFCE7;
    }
    .server-badge.offline {
      background: #FEF2F2;
      color: #B91C1C;
      border-color: #FEE2E2;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
    .nav-divider {
      width: 1px;
      height: 24px;
      background: #E2E8F0;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      flex-wrap: wrap;
    }
    .ghost-actions-group {
      display: flex;
      align-items: center;
      gap: 0.2rem;
    }
    .btn-icon {
      font-size: 0.875rem;
      display: inline-flex;
      align-items: center;
    }
    .user-profile {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #EFF6FF;
      color: #2563EB;
      font-weight: 600;
      font-size: 0.8125rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #DBEAFE;
    }
    .user-meta {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    .user-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #0F172A;
      line-height: 1.2;
    }
    .user-role {
      font-size: 0.675rem;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: #64748B;
      line-height: 1;
    }
    .btn-logout {
      font-size: 0.775rem;
      padding: 0.3rem 0.6rem;
      color: #64748B;
    }
    .btn-logout:hover {
      color: #DC2626;
      background: #FEF2F2;
    }

    /* MAIN CONTAINER */
    .main-content {
      padding: 1.5rem 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      max-width: 1600px;
      margin: 0 auto;
      width: 100%;
    }

    /* 2. KPI SUMMARY CARDS */
    .tower-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 1rem;
    }
    .tower-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 1.25rem;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }
    .tower-card:hover {
      border-color: #CBD5E1;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.06);
    }
    .tower-card.active {
      border-color: #2563EB;
      box-shadow: 0 0 0 1px #2563EB, 0 4px 12px -2px rgba(37, 99, 235, 0.1);
    }
    .tc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.65rem;
    }
    .tc-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .tc-title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: #0F172A;
    }
    .tc-code {
      font-size: 0.6875rem;
      font-weight: 600;
      color: #64748B;
      background: #F1F5F9;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      letter-spacing: 0.03em;
    }
    .tc-percent {
      font-size: 0.9375rem;
      font-weight: 600;
      color: #2563EB;
      font-variant-numeric: tabular-nums;
    }
    .tc-stats {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 0.8125rem;
      margin-bottom: 0.65rem;
    }
    .tc-label {
      color: #64748B;
    }
    .tc-count {
      color: #0F172A;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .tc-total {
      color: #94A3B8;
      font-weight: 400;
    }
    .progress-bar-bg {
      height: 5px;
      background: #F1F5F9;
      border-radius: 9999px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: #2563EB;
      border-radius: 9999px;
      transition: width 0.4s ease;
    }

    /* 3. FILTER & ACTION BAR */
    .toolbar-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 0.875rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }
    .filter-controls {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.85rem;
    }
    .ctrl-item {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .ctrl-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: #64748B;
      white-space: nowrap;
    }
    .ctrl-select-group {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .form-select-unified {
      height: 36px;
      padding: 0.4rem 0.75rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: #0F172A;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      width: auto;
    }
    .form-select-unified:focus {
      outline: none;
      border-color: #2563EB;
      background: #FFFFFF;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    .btn-icon-delete {
      background: transparent;
      border: 1px solid #FEE2E2;
      color: #DC2626;
      padding: 0.35rem 0.5rem;
      border-radius: 8px;
      cursor: pointer;
      height: 36px;
      font-size: 0.8125rem;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .btn-icon-delete:hover {
      background: #FEF2F2;
      border-color: #FECACA;
    }
    .search-box {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 0.75rem;
      font-size: 0.8125rem;
      color: #94A3B8;
      pointer-events: none;
    }
    .form-input-unified {
      height: 36px;
      padding: 0.4rem 0.75rem 0.4rem 2.25rem;
      font-size: 0.8125rem;
      color: #0F172A;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      min-width: 240px;
      transition: all 0.15s ease;
    }
    .form-input-unified:focus {
      outline: none;
      border-color: #2563EB;
      background: #FFFFFF;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    .export-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* 4. DATA TABLE */
    .table-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }
    .table-header-info {
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #F1F5F9;
    }
    .table-title-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .info-title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: #0F172A;
      letter-spacing: -0.01em;
    }
    .info-count {
      font-size: 0.75rem;
      font-weight: 500;
      color: #64748B;
      background: #F1F5F9;
      padding: 0.2rem 0.65rem;
      border-radius: 9999px;
      font-variant-numeric: tabular-nums;
    }
    .table-wrapper {
      overflow-x: auto;
    }
    .enterprise-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.835rem;
    }
    .enterprise-table th {
      background: #F8FAFC;
      color: #64748B;
      font-weight: 600;
      font-size: 0.725rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.875rem 1.125rem;
      border-bottom: 1px solid #E2E8F0;
      white-space: nowrap;
    }
    .enterprise-table td {
      padding: 0.95rem 1.125rem;
      border-bottom: 1px solid #F1F5F9;
      color: #334155;
      font-size: 0.835rem;
      vertical-align: middle;
      white-space: nowrap;
    }
    .enterprise-table tbody tr {
      transition: background-color 0.12s ease;
    }
    .enterprise-table tbody tr:hover {
      background-color: #F8FAFC;
    }
    .tower-tag {
      font-weight: 600;
      color: #0F172A;
    }
    .unit-code {
      font-weight: 600;
      color: #0F172A;
    }
    .floor-code {
      color: #64748B;
    }
    .num-col {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-feature-settings: "tnum";
      font-weight: 500;
      color: #0F172A;
    }
    .stand-val {
      font-weight: 600;
      color: #0F172A;
      font-variant-numeric: tabular-nums;
    }
    .usage-pill {
      display: inline-block;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: #0F172A;
    }
    .usage-pill.negative {
      color: #DC2626 !important;
      font-weight: 700;
    }
    .officer-name {
      color: #475569;
    }
    .date-col {
      font-size: 0.775rem;
      color: #64748B;
      font-variant-numeric: tabular-nums;
    }
    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.8rem;
    }
    .text-muted {
      color: #64748B;
    }
    .text-subtle {
      color: #CBD5E1;
    }
    .text-danger {
      color: #DC2626 !important;
    }
    .text-dark {
      color: #0F172A;
    }

    /* Table Action Buttons */
    .btn-photo-pill {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #475569;
      padding: 0.3rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-photo-pill:hover {
      background: #EFF6FF;
      border-color: #BFDBFE;
      color: #2563EB;
    }
    .btn-edit-action {
      background: transparent;
      border: 1px solid transparent;
      color: #2563EB;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.15s ease;
    }
    .btn-edit-action:hover {
      background: #EFF6FF;
      border-color: #DBEAFE;
      color: #1D4ED8;
    }

    /* Table States */
    .empty-cell {
      text-align: center;
      padding: 3rem 1.5rem;
      color: #64748B;
    }
    .table-loading-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      font-size: 0.875rem;
      color: #64748B;
    }
    .empty-state-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
    .empty-icon {
      font-size: 1.5rem;
      opacity: 0.6;
    }

    /* Pagination */
    .pagination-bar {
      padding: 0.875rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #FFFFFF;
      border-top: 1px solid #F1F5F9;
      font-size: 0.8125rem;
      color: #64748B;
    }
    .pagination-btns {
      display: flex;
      gap: 0.5rem;
    }
    .btn-page {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      color: #334155;
      font-size: 0.8125rem;
      font-weight: 500;
      border-radius: 6px;
      padding: 0.35rem 0.75rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-page:hover:not(:disabled) {
      background: #F8FAFC;
      border-color: #CBD5E1;
      color: #0F172A;
    }
    .btn-page:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    /* Photo Modal Elements */
    .photo-modal-box {
      max-width: 520px;
    }
    .photo-preview-img {
      max-width: 100%;
      max-height: 420px;
      border-radius: 8px;
      border: 1px solid #CBD5E1;
      margin-bottom: 1rem;
      object-fit: contain;
    }
    .photo-loading-box {
      padding: 2.5rem 1rem;
      color: #64748B;
      font-size: 0.875rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
    .spinner-sm {
      width: 24px;
      height: 24px;
      border: 2px solid #E2E8F0;
      border-top-color: #2563EB;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .photo-meta {
      font-size: 0.8125rem;
      color: #475569;
      text-align: left;
      background: #F8FAFC;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      border: 1px solid #F1F5F9;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .form-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.85rem;
    }
    .form-group {
      margin-bottom: 0.75rem;
    }
    .form-group label {
      display: block;
      font-size: 0.85rem;
      margin-bottom: 0.3rem;
      font-weight: 500;
    }
    .text-center {
      text-align: center;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private api = inject(ApiService);

  // State Signals
  currentUser = this.authService.currentUser;
  isServerOnline = signal(true);
  isLoading = signal(false);
  isSaving = signal(false);
  isExporting = signal(false);

  // Data
  periods = signal<ReadingPeriod[]>([]);
  towers = signal<Tower[]>([]);
  readings = signal<MeterReading[]>([]);
  backups = signal<BackupItem[]>([]);
  users = signal<UserProfile[]>([]);

  // Filter Signals
  selectedPeriodId = '';
  selectedTower = 'all';
  selectedMeterType = 'all';
  searchQuery = '';
  currentPage = signal(1);
  pageSize = 50;

  // Active Modals: null | 'photo' | 'edit' | 'new-period' | 'manage-periods' | 'close-period' | 'backup' | 'users'
  activeModal = signal<string | null>(null);
  selectedReading = signal<MeterReading | null>(null);
  photoModalUrl = signal<string>('');
  isPhotoLoading = signal(false);
  photoLoadError = signal(false);

  // Forms
  editForm = {
    meter_value: 0,
    notes: '',
    reason: ''
  };
  editCalculatedUsage = 0;
  newPeriodMonth = '';
  periodToCloseId = '';
  purgePhotosOnClose = false;

  // Computed tower summaries
  towerSummaries = computed(() => {
    const list = this.readings();
    const towerConfigs = [
      { name: 'Tower A', code: 'CTA', total: 454 },
      { name: 'Tower B', code: 'CTB', total: 396 },
      { name: 'Tower C', code: 'STC', total: 602 },
      { name: 'Tower D', code: 'STD', total: 778 },
      { name: 'Tower E', code: 'STE', total: 778 },
      { name: 'Tower F', code: 'STF', total: 749 },
    ];

    return towerConfigs.map(tc => {
      const towerReadings = list.filter(r => (r.tower_name || '').toUpperCase().includes(tc.name.toUpperCase()));
      const recorded = towerReadings.filter(r => r.meter_value > 0 || r.verification_status !== 'unrecorded').length;
      const count = recorded > 0 ? recorded : 0;
      const pct = tc.total > 0 ? Math.min(100, (count / (tc.total * 2)) * 100) : 0; // 2 meters per unit (electric & water)
      return {
        name: tc.name,
        code: tc.code,
        totalUnits: tc.total,
        recordedUnits: count,
        progressPercent: pct
      } as TowerSummary;
    });
  });

  // Filtered readings
  filteredReadings = computed(() => {
    let list = this.readings();
    const tw = this.selectedTower;
    const mt = this.selectedMeterType;
    const q = this.searchQuery.trim().toLowerCase();

    if (tw !== 'all') {
      list = list.filter(r => (r.tower_name || '').toUpperCase().includes(tw.toUpperCase()));
    }
    if (mt !== 'all') {
      list = list.filter(r => (r.meter_type || '').toLowerCase().includes(mt.toLowerCase()));
    }
    if (q) {
      list = list.filter(r =>
        (r.unit_number || '').toLowerCase().includes(q) ||
        (r.meter_number || '').toLowerCase().includes(q)
      );
    }
    return list;
  });

  // Pagination
  totalPages = computed(() => Math.ceil(this.filteredReadings().length / this.pageSize) || 1);
  paginatedReadings = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredReadings().slice(start, start + this.pageSize);
  });

  activePeriods = computed(() => this.periods().filter(p => p.status === 'active' || p.status === 'draft'));

  constructor() {}

  ngOnInit(): void {
    this.checkHealth();
    this.loadInitialData();
  }

  checkHealth(): void {
    this.api.checkHealth().subscribe({
      next: () => this.isServerOnline.set(true),
      error: () => this.isServerOnline.set(false)
    });
  }

  loadInitialData(): void {
    this.isLoading.set(true);

    // 1. Load Towers
    this.api.getTowers().subscribe({
      next: (t) => this.towers.set(t),
      error: () => {}
    });

    // 2. Load Periods
    this.api.getPeriods().subscribe({
      next: (pList) => {
        this.periods.set(pList);
        if (pList.length > 0) {
          // Pilih periode active pertama atau periode pertama
          const active = pList.find(p => p.status === 'active') || pList[0];
          this.selectedPeriodId = active.id;
          this.periodToCloseId = active.id;
          this.loadReadings();
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadReadings(): void {
    if (!this.selectedPeriodId) return;
    this.isLoading.set(true);

    this.api.getReadings({
      period_id: this.selectedPeriodId,
      limit: 10000
    }).subscribe({
      next: (data) => {
        this.readings.set(data);
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onPeriodChange(): void {
    this.loadReadings();
  }

  applyFilters(): void {
    this.currentPage.set(1);
  }

  filterByTower(towerName: string): void {
    this.selectedTower = towerName;
    this.applyFilters();
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  isElectric(r: MeterReading): boolean {
    const t = (r.meter_type || '').toLowerCase();
    return t.includes('elect') || t.includes('listrik');
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'verified': return 'badge-success';
      case 'anomaly': return 'badge-danger';
      case 'pending_verification': return 'badge-warning';
      default: return 'badge-neutral';
    }
  }

  // Modals
  openModal(name: string): void {
    this.activeModal.set(name);
    if (name === 'backup') {
      this.api.getBackups().subscribe({
        next: (b) => this.backups.set(b),
        error: () => {}
      });
    } else if (name === 'users') {
      this.api.getUsers().subscribe({
        next: (u) => this.users.set(u),
        error: () => {}
      });
    }
  }

  closeModal(): void {
    this.activeModal.set(null);
    this.selectedReading.set(null);
  }

  openPhotoModal(r: MeterReading): void {
    this.selectedReading.set(r);
    this.photoLoadError.set(false);
    this.isPhotoLoading.set(true);
    const target = r.photo_url || r.photo_filename || r.id;
    this.photoModalUrl.set(this.api.getPhotoUrl(target));
    this.activeModal.set('photo');
  }

  onPhotoLoad(): void {
    this.isPhotoLoading.set(false);
    this.photoLoadError.set(false);
  }

  onPhotoError(event: any): void {
    this.isPhotoLoading.set(false);
    this.photoLoadError.set(true);
  }

  openEditModal(r: MeterReading): void {
    this.selectedReading.set(r);
    this.editForm = {
      meter_value: r.meter_value,
      notes: r.notes || '',
      reason: ''
    };
    this.recalcUsage();
    this.activeModal.set('edit');
  }

  recalcUsage(): void {
    const r = this.selectedReading();
    if (!r) return;
    const prev = r.previous_value ?? 0;
    this.editCalculatedUsage = Math.max(0, this.editForm.meter_value - prev);
  }

  saveEditReading(): void {
    const r = this.selectedReading();
    if (!r) return;

    if (!this.editForm.reason.trim()) {
      alert('Harap isi alasan koreksi (Wajib untuk audit trail).');
      return;
    }

    this.isSaving.set(true);
    this.api.updateReading(r.id, {
      meter_value: Number(this.editForm.meter_value),
      notes: this.editForm.notes,
      reason: this.editForm.reason
    }).subscribe({
      next: (updated) => {
        this.isSaving.set(false);
        this.closeModal();
        // Update reading in list
        this.readings.update(list => list.map(item => item.id === updated.id ? { ...item, ...updated } : item));
        alert('Data stand meter berhasil diperbarui!');
      },
      error: (err) => {
        this.isSaving.set(false);
        alert('Gagal menyimpan koreksi: ' + (err?.error?.detail || err.message));
      }
    });
  }

  createPeriod(): void {
    if (!this.newPeriodMonth.trim()) {
      alert('Masukkan format bulan YYYY-MM (misal: 2026-11).');
      return;
    }
    this.isSaving.set(true);
    this.api.createPeriod(this.newPeriodMonth.trim()).subscribe({
      next: (p) => {
        this.isSaving.set(false);
        this.closeModal();
        this.periods.update(list => [p, ...list]);
        this.selectedPeriodId = p.id;
        this.loadReadings();
        alert(`Periode ${p.period_month} berhasil dibuka!`);
      },
      error: (err) => {
        this.isSaving.set(false);
        alert('Gagal membuka periode: ' + (err?.error?.detail || err.message));
      }
    });
  }

  closePeriod(): void {
    if (!this.periodToCloseId) return;
    if (!confirm('Yakin ingin menutup periode pembacaan ini? Data akan dikunci.')) return;

    this.isSaving.set(true);
    this.api.closePeriod(this.periodToCloseId, this.purgePhotosOnClose).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeModal();
        this.loadInitialData();
        alert('Periode berhasil ditutup!');
      },
      error: (err) => {
        this.isSaving.set(false);
        alert('Gagal menutup periode: ' + (err?.error?.detail || err.message));
      }
    });
  }

  deleteSelectedPeriod(): void {
    if (!this.selectedPeriodId) return;
    this.deletePeriod(this.selectedPeriodId);
  }

  deletePeriod(periodId: string): void {
    if (!confirm('PERINGATAN: Menghapus periode akan menghapus seluruh data pembacaan dalam periode ini. Lanjutkan?')) return;

    this.api.deletePeriod(periodId).subscribe({
      next: () => {
        alert('Periode berhasil dihapus.');
        this.loadInitialData();
      },
      error: (err) => alert('Gagal menghapus periode: ' + (err?.error?.detail || err.message))
    });
  }

  triggerBackup(): void {
    this.isSaving.set(true);
    this.api.triggerBackup().subscribe({
      next: (res) => {
        this.isSaving.set(false);
        alert('Backup sistem berhasil dibuat: ' + (res?.filename || ''));
        this.openModal('backup');
      },
      error: (err) => {
        this.isSaving.set(false);
        alert('Gagal membuat backup: ' + (err?.error?.detail || err.message));
      }
    });
  }

  onAssignTower(userId: string, towerId: string): void {
    this.api.assignTower(userId, towerId).subscribe({
      next: () => {
        this.openModal('users');
      },
      error: (err) => alert('Gagal menugaskan tower: ' + (err?.error?.detail || err.message))
    });
  }

  downloadPdf(): void {
    this.isExporting.set(true);
    this.api.downloadPdf(this.selectedPeriodId, this.selectedTower).subscribe({
      next: (blob) => {
        this.isExporting.set(false);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Laporan_Meter_${this.selectedTower}_${this.selectedPeriodId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.isExporting.set(false);
        alert('Gagal mengunduh PDF: ' + (err?.error?.detail || err.message));
      }
    });
  }

  downloadExcel(): void {
    this.isExporting.set(true);
    this.api.downloadExcel(this.selectedPeriodId, this.selectedTower).subscribe({
      next: (blob) => {
        this.isExporting.set(false);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Rekap_Meter_${this.selectedTower}_${this.selectedPeriodId}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.isExporting.set(false);
        alert('Gagal mengunduh Excel: ' + (err?.error?.detail || err.message));
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
