import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BackupItem,
  MeterReading,
  ReadingPeriod,
  ServerHealth,
  Tower,
  UserProfile
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  checkHealth(): Observable<ServerHealth> {
    return this.http.get<ServerHealth>(`${this.baseUrl}/health`);
  }

  // Periods
  getPeriods(): Observable<ReadingPeriod[]> {
    return this.http.get<ReadingPeriod[]>(`${this.baseUrl}/periods`);
  }

  createPeriod(periodMonth: string): Observable<ReadingPeriod> {
    return this.http.post<ReadingPeriod>(`${this.baseUrl}/periods`, { period_month: periodMonth });
  }

  closePeriod(periodId: string, purgePhotos: boolean = false): Observable<any> {
    return this.http.post(`${this.baseUrl}/periods/${periodId}/close`, { purge_photos: purgePhotos });
  }

  deletePeriod(periodId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/periods/${periodId}`);
  }

  // Towers & Units
  getTowers(): Observable<Tower[]> {
    return this.http.get<Tower[]>(`${this.baseUrl}/towers`);
  }

  // Readings
  getReadings(filters: {
    period_id?: string;
    tower?: string;
    tower_id?: string;
    meter_type?: string;
    unit_search?: string;
    verification_status?: string;
    limit?: number;
    offset?: number;
  }): Observable<MeterReading[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && val !== 'all') {
        params = params.set(key, val.toString());
      }
    });

    return this.http.get<MeterReading[]>(`${this.baseUrl}/readings`, { params });
  }

  getReading(readingId: string): Observable<MeterReading> {
    return this.http.get<MeterReading>(`${this.baseUrl}/readings/${readingId}`);
  }

  updateReading(readingId: string, data: {
    meter_value?: number;
    notes?: string;
    reason?: string;
    verification_status?: string;
  }): Observable<MeterReading> {
    return this.http.put<MeterReading>(`${this.baseUrl}/readings/${readingId}`, data);
  }

  // Reports
  downloadPdf(periodId?: string, towerId?: string): Observable<Blob> {
    let params = new HttpParams();
    if (periodId) params = params.set('period_id', periodId);
    if (towerId && towerId !== 'all') params = params.set('tower_id', towerId);

    return this.http.get(`${this.baseUrl}/reports/pdf`, {
      params,
      responseType: 'blob'
    });
  }

  downloadExcel(periodId?: string, towerId?: string): Observable<Blob> {
    let params = new HttpParams();
    if (periodId) params = params.set('period_id', periodId);
    if (towerId && towerId !== 'all') params = params.set('tower_id', towerId);

    return this.http.get(`${this.baseUrl}/reports/excel`, {
      params,
      responseType: 'blob'
    });
  }

  // Backups
  getBackups(): Observable<BackupItem[]> {
    return this.http.get<BackupItem[]>(`${this.baseUrl}/admin/backups`);
  }

  triggerBackup(): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/backup`, {});
  }

  // Users & Officers
  getUsers(): Observable<UserProfile[]> {
    return this.http.get<any[]>(`${this.baseUrl}/users`).pipe(
      map(users => users.map(u => ({
        ...u,
        email: u.email || u.username || '',
        full_name: u.full_name || u.display_name || u.username || '',
        assigned_tower_id: u.assigned_tower_id || u.assigned_tower?.id || null,
        assigned_tower_name: u.assigned_tower_name || u.assigned_tower?.name || null
      })))
    );
  }

  createUser(userData: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    tower_id?: string;
  }): Observable<UserProfile> {
    return this.http.post<UserProfile>(`${this.baseUrl}/users`, userData);
  }

  assignTower(userId: string, towerId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/users/${userId}/assign-tower`, { tower_id: towerId });
  }

  // Photos
  getPhotoUrl(filenameOrId: string): string {
    if (!filenameOrId) return '';
    if (filenameOrId.startsWith('http://') || filenameOrId.startsWith('https://')) return filenameOrId;
    const clean = filenameOrId.replace(/^(\/api\/photos\/|\/photos\/)/, '');
    return `${this.baseUrl}/photos/${clean}`;
  }
}
