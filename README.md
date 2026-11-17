# YANG MULIA POS — MVP

PWA kasir + manajemen stok untuk Batagor & Siomay Ikan YANG MULIA.

## Stack

- HTML/CSS/JavaScript ES Modules
- Supabase Auth + PostgreSQL + RLS + RPC
- IndexedDB untuk data offline
- Service Worker + Web App Manifest
- GitHub Pages + GitHub Actions

## 1. Supabase

1. Buat project Supabase.
2. Buka SQL Editor.
3. Jalankan `supabase/schema.sql`.
4. Buka Authentication > Users dan buat user pertama.
5. Ambil UUID user tersebut.
6. Jalankan:
   `update public.profiles set role='owner', full_name='Nama Owner' where id='UUID_USER';`
7. Ambil Project URL dan Publishable/Anon key dari Supabase.

## 2. Konfigurasi frontend

Edit `src/config.js`:

```js
export const SUPABASE_URL = "https://PROJECT.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR_PUBLISHABLE_OR_ANON_KEY";
```

Jangan pernah memasukkan `service_role` key ke frontend.

## 3. Jalankan lokal

Karena PWA/service worker membutuhkan HTTP(S), gunakan static server.

Contoh Python:

```bash
python -m http.server 8080
```

Buka `http://localhost:8080`.

## 4. GitHub Pages

1. Push project ke repository GitHub.
2. Settings > Pages.
3. Source: GitHub Actions.
4. Push ke branch `main`.
5. Workflow `.github/workflows/deploy.yml` akan deploy.

## 5. Login pertama

Login dengan user Supabase yang dibuat pada langkah 1.

## 6. Offline

Offline penuh tersedia setelah aplikasi pernah dibuka/login dan data awal berhasil tersimpan di device.

- Produk/kategori: cache IndexedDB.
- Transaksi offline: masuk ke queue.
- Saat online kembali: queue dikirim ke RPC `create_sale`.
- Stok server dikurangi di dalam transaksi database.

## 7. Catatan MVP

MVP ini sengaja fokus pada fondasi yang runnable:

- login
- role/profile
- dashboard
- CRUD produk
- POS
- pembayaran
- stok
- transaksi
- offline queue
- PWA install
- GitHub Actions

Tahap berikutnya dapat menambahkan:
- laporan omzet/laba
- supplier & pembelian
- stock opname
- waste
- expense
- audit log
- shift kasir
- barcode
- thermal printer
- multi-cabang
- conflict resolution yang lebih ketat untuk multi-device offline.
