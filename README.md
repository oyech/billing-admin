# TARES Web Admin Portal (Angular 19) 🏢⚡💧

Frontend Single Page Application (SPA) modern berbasis **Angular 19** (Standalone Components, Signals, TypeScript) untuk Portal Administrasi & Monitoring Pembacaan Meter Listrik dan Air Apartemen Taman Anggrek Residence (TARES).

Aplikasi ini menggantikan dashboard HTML monolitik lama dan terhubung langsung ke REST API [billing-server](file:///Users/soleh/billing-server).

---

## ✨ Fitur Utama

- 📊 **Monitoring Progres Real-Time**: Ringkasan progres pembacaan meter per tower (Tower A sampai Tower F) dengan indikator persentase penyelesaian.
- 🔍 **Filter & Pencarian Fleksibel**:
  - Filter berdasarkan Periode pembacaan.
  - Filter berdasarkan Tower.
  - Filter jenis meter (Semua, Listrik, Air).
  - Pencarian unit instan (contoh: `STF-GF`, `A-0101`).
- ✏️ **Koreksi / Edit Stand Meter**: Admin dapat mengedit stand meter jika ada salah catat dari petugas, lengkap dengan kalkulasi pemakaian otomatis dan pencatatan alasan untuk **Audit Trail**.
- 📷 **Pratinjau Foto Meter Fisik**: Menampilkan foto asli meteran yang diunggah petugas beserta tanggal dan nama petugas.
- 📅 **Manajemen Periode**:
  - Buka Periode Baru (`YYYY-MM`).
  - Kelola & Hapus Periode.
  - Kunci & Tutup Periode (dengan opsi aman pembersihan foto lama >60 hari).
- 💾 **Backup & Arsip Sistem**: Pemicu backup manual dan riwayat berkas backup dengan verifikasi hash SHA-256 integritas data.
- 👥 **Manajemen Petugas**: Penugasan wilayah tower kerja untuk petugas lapangan.
- 📄 **Ekspor Rekap**: Cetak Laporan PDF dan Ekspor Excel resmi langsung dari antarmuka web.
- 🔐 **Autentikasi JWT & Role-Based Guard**: Akses login aman dengan proteksi rute (`AuthGuard`) dan auto-logout saat token kedaluwarsa.

---

## 📁 Struktur Direktori

```text
billing-admin/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── guards/         # AuthGuard proteksi rute
│   │   │   ├── interceptors/   # AuthInterceptor (Bearer Token & 401 handling)
│   │   │   ├── models/         # TypeScript Interfaces & Models
│   │   │   └── services/       # AuthService (Signals) & ApiService
│   │   ├── features/
│   │   │   ├── dashboard/      # Halaman Utama Dashboard Admin & Modals
│   │   │   └── login/          # Halaman Login Admin & Petugas
│   │   ├── app.component.ts    # Root Standalone Component
│   │   ├── app.config.ts       # Application Configuration (HttpClient, Routes)
│   │   └── app.routes.ts       # Routing Configuration
│   ├── environments/           # Konfigurasi Environment (API URL)
│   ├── styles.css              # Styling Modern TARES
│   └── index.html
├── proxy.conf.json             # Proxy lokal dev server ke backend port 8000
├── vercel.json                 # Konfigurasi SPA routing untuk Vercel
├── netlify.toml                # Konfigurasi build & redirect untuk Netlify
└── package.json
```

---

## 🚀 Cara Menjalankan di Komputer Lokal

### 1. Prasyarat
- Node.js versi 18+ atau 20+
- Backend server [billing-server](file:///Users/soleh/billing-server) berjalan di `http://localhost:8000`.

### 2. Jalankan Dev Server
```bash
cd /Users/soleh/billing-admin

# Install dependensi (jika belum)
npm install

# Jalankan server frontend
npm start
```

Buka browser di: **[http://localhost:4200](http://localhost:4200)**.
Semua request `/api/*` akan otomatis diarahkan oleh proxy dev ke backend FastAPI di `http://localhost:8000`.

Akun Login Default:
- **Admin**: `admin@tares.id` / `AdminPass123!`
- **Petugas**: `petugas@tares.id` / `PetugasPass123!`

---

## 🌐 Deploy ke Vercel atau Netlify

Frontend Angular ini 100% statis (SPA) sehingga **sangat cocok** di-hosting gratis dan cepat di **Vercel** atau **Netlify**:

### A. Deploy ke Vercel
1. Push repository ini ke GitHub (lihat langkah di bawah).
2. Buka [vercel.com](https://vercel.com) -> **Add New Project** -> Pilih repo `billing-admin`.
3. Framework Preset: **Angular**.
4. Output Directory: `dist/billing-admin/browser`.
5. Environment Variables:
   - `API_URL` = URL backend server Anda (misal: `https://tares-backend.onrender.com/api`).
6. Klik **Deploy**! Berkas `vercel.json` yang sudah disediakan akan otomatis menangani client-side routing.

### B. Deploy ke Netlify
1. Buka [netlify.com](https://netlify.com) -> **Add new site** -> **Import an existing project**.
2. Pilih repository `billing-admin`.
3. Konfigurasi build otomatis terbaca dari berkas `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist/billing-admin/browser`
4. Klik **Deploy Site**!

---

## 📤 Push ke GitHub

```bash
cd /Users/soleh/billing-admin

# 1. Pastikan semua perubahan sudah ter-commit
git add .
git commit -m "feat: complete TARES Angular 19 admin dashboard portal"

# 2. Hubungkan ke repository GitHub baru
git remote add origin https://github.com/USERNAME/billing-admin.git
git branch -M main

# 3. Push ke GitHub
git push -u origin main
```
