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
      <!-- HEADER -->
      <header class="app-header">
        <div class="brand-group">
          <div class="brand-logo">TARES</div>
          <div>
            <h1 class="brand-title">Taman Anggrek Residence</h1>
            <p class="brand-sub">Portal Web Admin — Pencatatan Meter Listrik & Air</p>
          </div>
        </div>

        <div class="header-right">
          <!-- Server Status Indicator -->
          <div class="server-badge" [class.online]="isServerOnline()" [class.offline]="!isServerOnline()">
            <span class="status-dot"></span>
            <span>{{ isServerOnline() ? 'Server ONLINE' : 'Server OFFLINE' }}</span>
          </div>

          <!-- Action Buttons -->
          <div class="header-actions">
            <button class="btn btn-primary" (click)="openModal('new-period')">📅 Buka Periode Baru</button>
            <button class="btn btn-secondary" (click)="openModal('manage-periods')">🗓️ Kelola Periode</button>
            <button class="btn btn-secondary" (click)="openModal('backup')">💾 Backup & Arsip</button>
            <button class="btn btn-secondary" (click)="openModal('users')">👥 Akun & Petugas</button>
            <a href="http://localhost:8000/download/apk" target="_blank" class="btn btn-secondary" download>📲 Download APK</a>
            <button class="btn btn-danger" (click)="openModal('close-period')">🔒 Tutup Periode</button>
          </div>

          <!-- User Profile & Logout -->
          <div class="user-profile">
            <span class="user-badge">{{ currentUser()?.full_name || currentUser()?.email }} ({{ currentUser()?.role }})</span>
            <button class="btn btn-secondary btn-sm" (click)="logout()">Keluar</button>
          </div>
        </div>
      </header>

      <!-- MAIN CONTENT -->
      <main class="main-content">
        <!-- TOWER SUMMARY CARDS -->
        <section class="tower-cards-grid">
          @for (ts of towerSummaries(); track ts.name) {
            <div class="tower-card" (click)="filterByTower(ts.name)">
              <div class="tc-header">
                <span class="tc-title">{{ ts.name }}</span>
                <span class="tc-code">{{ ts.code }}</span>
              </div>
              <div class="tc-stats">
                <span class="tc-count">{{ ts.recordedUnits }} / {{ ts.totalUnits }} Unit</span>
                <span class="tc-percent">{{ ts.progressPercent.toFixed(1) }}%</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" [style.width.%]="ts.progressPercent"></div>
              </div>
            </div>
          }
        </section>

        <!-- TOOLBAR FILTERS & EXPORT -->
        <section class="toolbar-card">
          <div class="filter-controls">
            <!-- Period Filter -->
            <div class="ctrl-item">
              <label>Periode:</label>
              <select [(ngModel)]="selectedPeriodId" (change)="onPeriodChange()">
                @for (p of periods(); track p.id) {
                  <option [value]="p.id">{{ p.period_month }} ({{ p.status }})</option>
                }
              </select>
              <button class="btn-icon-danger" (click)="deleteSelectedPeriod()" title="Hapus periode terpilih">🗑️</button>
            </div>

            <!-- Tower Filter -->
            <div class="ctrl-item">
              <label>Tower:</label>
              <select [(ngModel)]="selectedTower" (change)="applyFilters()">
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
              <label>Jenis Meter:</label>
              <select [(ngModel)]="selectedMeterType" (change)="applyFilters()">
                <option value="all">Semua Jenis</option>
                <option value="electricity">Listrik (kWh)</option>
                <option value="water">Air (m³)</option>
              </select>
            </div>

            <!-- Unit Search -->
            <div class="ctrl-item search-item">
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (input)="applyFilters()"
                placeholder="Cari unit (mis: A-0101, STF-GF)..."
              />
            </div>
          </div>

          <!-- Export Actions -->
          <div class="export-controls">
            <button class="btn btn-primary" (click)="downloadPdf()" [disabled]="isExporting()">
              📄 Cetak PDF
            </button>
            <button class="btn btn-success" (click)="downloadExcel()" [disabled]="isExporting()">
              📊 Ekspor Excel
            </button>
          </div>
        </section>

        <!-- DATA READINGS TABLE -->
        <section class="table-card">
          <div class="table-header-info">
            <span class="info-title">Daftar Pembacaan Stand Meter</span>
            <span class="info-count">Menampilkan {{ filteredReadings().length }} baris</span>
          </div>

          <div class="table-wrapper">
            <table>
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
                    <td colspan="13" class="empty-cell">Memuat data dari server...</td>
                  </tr>
                } @else if (filteredReadings().length === 0) {
                  <tr>
                    <td colspan="13" class="empty-cell">Tidak ada data pembacaan yang sesuai dengan filter.</td>
                  </tr>
                } @else {
                  @for (r of paginatedReadings(); track r.id) {
                    <tr>
                      <td><strong>{{ r.tower_name || '-' }}</strong></td>
                      <td>{{ r.unit_number }}</td>
                      <td>{{ r.floor || '-' }}</td>
                      <td class="font-mono">{{ r.meter_number }}</td>
                      <td>
                        <span class="badge" [class.badge-electric]="isElectric(r)" [class.badge-water]="!isElectric(r)">
                          {{ isElectric(r) ? 'Listrik' : 'Air' }}
                        </span>
                      </td>
                      <td class="num-col">{{ r.previous_value !== null ? (r.previous_value | number:'1.1-2') : '-' }}</td>
                      <td class="num-col"><strong>{{ r.meter_value | number:'1.1-2' }}</strong></td>
                      <td class="num-col font-bold" [class.text-danger]="(r.usage ?? 0) < 0">
                        {{ r.usage !== null ? (r.usage | number:'1.1-2') : '-' }}
                      </td>
                      <td>{{ r.officer_name || '-' }}</td>
                      <td class="date-col">{{ r.reading_timestamp ? (r.reading_timestamp | date:'dd/MM/yy HH:mm') : '-' }}</td>
                      <td>
                        <span class="badge" [ngClass]="getStatusBadgeClass(r.verification_status)">
                          {{ r.verification_status }}
                        </span>
                      </td>
                      <td>
                        @if (r.has_photo || r.photo_url || r.photo_filename) {
                          <button class="btn-table-icon" (click)="openPhotoModal(r)" title="Lihat Foto Bukti">
                            📷
                          </button>
                        } @else {
                          <span class="text-muted">-</span>
                        }
                      </td>
                      <td style="text-align:center;">
                        <button class="btn btn-secondary btn-xs" (click)="openEditModal(r)">
                          ✏️ Edit
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
              <span>Halaman {{ currentPage() }} dari {{ totalPages() }}</span>
              <div class="pagination-btns">
                <button
                  class="btn btn-secondary btn-sm"
                  [disabled]="currentPage() === 1"
                  (click)="setPage(currentPage() - 1)"
                >
                  ◀ Sebelumnya
                </button>
                <button
                  class="btn btn-secondary btn-sm"
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
              <img
                [src]="photoModalUrl()"
                alt="Foto Meter"
                class="photo-preview-img"
                (error)="onPhotoError($event)"
              />
              <div class="photo-meta">
                <p><strong>Stand Tercatat:</strong> {{ selectedReading()?.meter_value }} {{ selectedReading()?.unit_of_measure }}</p>
                <p><strong>Waktu Foto:</strong> {{ selectedReading()?.reading_timestamp | date:'dd MMM yyyy, HH:mm:ss' }}</p>
                <p><strong>Petugas:</strong> {{ selectedReading()?.officer_name || 'Petugas Lapangan' }}</p>
              </div>
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
      display: flex;
      flex-direction: column;
    }
    .app-header {
      background: #FFFFFF;
      border-bottom: 1px solid #E2E8F0;
      padding: 0.75rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .brand-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .brand-logo {
      background: #1565C0;
      color: white;
      font-weight: 800;
      font-size: 1rem;
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      letter-spacing: 0.05em;
    }
    .brand-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #0F172A;
    }
    .brand-sub {
      font-size: 0.75rem;
      color: #64748B;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .server-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .server-badge.online {
      background: #D1FAE5;
      color: #065F46;
    }
    .server-badge.offline {
      background: #FEE2E2;
      color: #991B1B;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .user-profile {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-left: 0.5rem;
      border-left: 1px solid #E2E8F0;
    }
    .user-badge {
      font-size: 0.8rem;
      font-weight: 600;
      color: #334155;
    }
    .main-content {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      max-width: 1600px;
      margin: 0 auto;
      width: 100%;
    }
    /* Tower Cards */
    .tower-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    .tower-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .tower-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 6px rgba(0,0,0,0.06);
      border-color: #CBD5E1;
    }
    .tc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .tc-title {
      font-weight: 700;
      font-size: 0.95rem;
      color: #0F172A;
    }
    .tc-code {
      font-size: 0.75rem;
      color: #64748B;
      background: #F1F5F9;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
    }
    .tc-stats {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: #475569;
      margin-bottom: 0.4rem;
    }
    .tc-percent {
      font-weight: 700;
      color: #1565C0;
    }
    .progress-bar-bg {
      height: 6px;
      background: #E2E8F0;
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: #1565C0;
      border-radius: 3px;
      transition: width 0.3s ease;
    }
    /* Toolbar */
    .toolbar-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
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
      gap: 0.35rem;
      font-size: 0.85rem;
    }
    .ctrl-item select {
      padding: 0.45rem 0.65rem;
      font-size: 0.85rem;
      width: auto;
    }
    .search-item input {
      padding: 0.45rem 0.75rem;
      font-size: 0.85rem;
      min-width: 220px;
    }
    .btn-icon-danger {
      background: transparent;
      border: 1px solid #FCA5A5;
      color: #EF4444;
      padding: 0.4rem 0.55rem;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-icon-danger:hover {
      background: #FEE2E2;
    }
    .export-controls {
      display: flex;
      gap: 0.5rem;
    }
    /* Table */
    .table-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .table-header-info {
      padding: 1rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #E2E8F0;
    }
    .info-title {
      font-weight: 700;
      font-size: 1rem;
      color: #0F172A;
    }
    .info-count {
      font-size: 0.8rem;
      color: #64748B;
    }
    .table-wrapper {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.85rem;
    }
    th {
      background: #F8FAFC;
      color: #475569;
      font-weight: 600;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #E2E8F0;
      white-space: nowrap;
    }
    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #F1F5F9;
      color: #1E293B;
      white-space: nowrap;
    }
    tbody tr:hover {
      background: #F8FAFC;
    }
    .num-col {
      text-align: right;
    }
    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.8rem;
    }
    .font-bold {
      font-weight: 700;
    }
    .text-danger {
      color: #DC2626 !important;
    }
    .text-muted {
      color: #94A3B8;
    }
    .date-col {
      font-size: 0.75rem;
      color: #64748B;
    }
    .empty-cell {
      text-align: center;
      padding: 2.5rem;
      color: #64748B;
    }
    .badge-electric {
      background: #FEF3C7;
      color: #92400E;
    }
    .badge-water {
      background: #E0F2FE;
      color: #0369A1;
    }
    .btn-table-icon {
      background: transparent;
      border: none;
      font-size: 1.15rem;
      cursor: pointer;
      padding: 0.2rem;
    }
    .btn-xs {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }
    .btn-sm {
      padding: 0.35rem 0.65rem;
      font-size: 0.8rem;
    }
    .pagination-bar {
      padding: 0.75rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #F8FAFC;
      border-top: 1px solid #E2E8F0;
      font-size: 0.85rem;
      color: #64748B;
    }
    .pagination-btns {
      display: flex;
      gap: 0.5rem;
    }
    /* Photo Modal */
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
    .photo-meta {
      font-size: 0.85rem;
      color: #475569;
      text-align: left;
      background: #F8FAFC;
      padding: 0.75rem 1rem;
      border-radius: 6px;
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
    const filename = r.photo_filename || (r.photo_url ? r.photo_url.split('/').pop() : '');
    this.photoModalUrl.set(this.api.getPhotoUrl(filename || ''));
    this.activeModal.set('photo');
  }

  onPhotoError(event: any): void {
    event.target.src = 'assets/placeholder-meter.png';
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
