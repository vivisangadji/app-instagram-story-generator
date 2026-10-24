# 📸 Fake Instagram Story Generator (AU Creator)

[![Vue 3](https://img.shields.io/badge/Vue-3.5-42b883?style=for-the-badge&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

Aplikasi web modern berbasis **Vue 3** & **Tailwind CSS** untuk membuat tangkapan layar dan video mockup **Instagram Story** palsu dengan visual *pixel-perfect* 100% otentik menyerupai tampilan UI Instagram terbaru.

Sangat cocok digunakan oleh **penulis AU (Alternate Universe)** di X/Twitter, **konten kreator** TikTok/Reels, **roleplayer**, pembuat meme, hingga desainer *mockup*.

---

## ✨ Fitur Utama (Key Features)

### 1. 🎭 Profil & Identitas Akun Realistis
- **Custom Identitas**: Ubah username, foto profil avatar, dan estimasi waktu upload (misal: `12m`, `2h`, `1d`).
- **Centang Biru Resmi (Verified Badge)**: Ikon lencana verifikasi Instagram berbasis SVG vektor presisi.
- **Manajemen Akun Cepat**: Simpan daftar multi-akun dan beralih profil hanya dengan satu klik.

### 2. ✍️ Teks Cerita & Dialog AU (Aa Text Sticker)
- **5 Gaya Tipografi Ikonik Instagram**:
  - `Modern` (Bold Sans-serif Instagram)
  - `Kotak` (Highlight box pill karaoke)
  - `Ketik` (Typewriter monospace aesthetic)
  - `Neon` (Glow neon vibran)
  - `Serif` (Aesthetic novel quote)
- **Canva-Style Interactive Resize**:
  - Tarik handle bulat di samping teks langsung pada kanvas untuk mengatur lebar tulisan.
  - Slider lebar blok tulisan (30% - 95%) dengan preset cepat (*Sempit 50%*, *Sedang 75%*, *Lebar 90%*).
- **Pengatur Bayangan (Shadow)**:
  - Tampilan teks *flat & clean* (0% bayangan) seperti aplikasi asli, atau atur ketebalan bayangan tipis hingga kontras.
- **Format Teks Lengkap**: Pilihan perataan (kiri, tengah, kanan), warna teks bebas, warna background highlight, dan drag-and-drop posisi teks di kanvas.

### 3. 🎵 Stiker Musik & Lirik Bergerak
- **Stiker Lagu Mengambang (Floating Music Sticker)**: Menampilkan cover art album, judul lagu, nama artis, dan animasi gelombang suara *equalizer*.
- **Lirik Berjalan (Synced Lyrics)**:
  - Sinkronisasi otomatis lirik lagu dengan ketukan audio musik.
  - Mendukung format timestamp LRC dan database pencarian lirik online.
  - 4 gaya tampilan lirik: *Bold Typography*, *White Box*, *3-Line Scrolling*, dan *Typewriter*.
- **Pemutar Audio Terintegrasi**: Unggah audio MP3/M4A Anda sendiri atau dengarkan pratinjau langsung di editor.

### 4. 🎛️ Elemen UI Instagram Story Otentik
- **Segmented Progress Bar**: Atur jumlah garis segmen story di atas (1 hingga 10+ baris) serta tentukan segmen aktif.
- **Ikon Header Presisi**: Ikon jeda (`||`), tombol opsi (`•••`), ikon speaker audio, dan tombol close (`X`).
- **Footer Interaktif**:
  - Kolom pesan interaktif (*"Kirim pesan ke {username}..."*).
  - Tombol Like Hati ❤️ dengan efek animasi confetti pop.
  - Tombol Paper Plane share.

### 5. ⚡ Ekspor Resolusi Tinggi (1080 × 1920 Full HD)
- **Ekspor Gambar (PNG / JPG)**: Hasil tajam resolusi tinggi 1080p tanpa penurunan kualitas atau teks pecah.
- **Ekspor Video MP4 (Audio + Video Tersinkron)**: Didukung teknologi `mp4-muxer` & hardware-accelerated WebCodecs untuk menghasilkan berkas video `.mp4` asli yang kompatibel di iOS, Android, dan PC.

### 6. 💾 Penyimpanan Otomatis (Auto-Save Offline)
- Menggunakan **IndexedDB** & **LocalStorage** untuk menyimpan draf foto latar, audio musik, profil akun, dan teks cerita Anda secara otomatis sehingga tidak akan hilang saat halaman di-refresh.

---

## 🚀 Panduan Memulai (Quick Start)

### Prasyarat
Pastikan Anda telah menginstal:
- [Node.js](https://nodejs.org/) (Versi 18 atau lebih baru)
- NPM atau PNPM

### Instalasi & Menjalankan Lokal

1. **Clone repository ini:**
   ```bash
   git clone https://github.com/username-anda/nama-repo.git
   cd nama-repo
   ```

2. **Instal dependensi:**
   ```bash
   npm install
   ```

3. **Jalankan development server:**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:5173`.

4. **Build untuk production:**
   ```bash
   npm run build
   ```
   Hasil build siap deploy akan berada di folder `/dist`.

---

## 🛠️ Tech Stack & Library

| Kategori | Teknologi | Deskripsi |
|---|---|---|
| **Framework** | [Vue 3](https://vuejs.org/) | Reaktivitas Composition API modern |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | Utilitas styling responsif & tema gelap |
| **Build Tool** | [Vite](https://vitejs.dev/) | Development server ultra-cepat |
| **Icons** | [Lucide Vue Next](https://lucide.dev/) | Kumpulan ikon vektor UI modern |
| **Video Engine** | [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) | Multiplexer WebCodecs MP4 resolusi 1080p |
| **Image Render** | [html-to-image](https://github.com/bubkoo/html-to-image) | Konversi elemen DOM ke kanvas gambar raster |
| **Special FX** | [canvas-confetti](https://github.com/catdad/canvas-confetti) | Animasi partikel confetti saat menekan tombol like |

---

## 📱 Tips Workflow untuk Pengguna Mac & iPhone
1. Buka aplikasi di laptop (Mac/PC) agar lebih leluasa mengetik naskah AU dan mengatur komposisi gambar.
2. Klik tombol **"Simpan Gambar"** atau **"Simpan Video"**. Berkas akan langsung terunduh otomatis ke folder `Downloads`.
3. Buka Finder &rarr; klik kanan pada file yang baru diunduh &rarr; pilih **AirDrop** langsung ke iPhone Anda untuk siap diposting!

---

## 📄 Lisensi

Proyek ini dirilis di bawah lisensi [MIT License](LICENSE). Bebas digunakan untuk keperluan pribadi, komunitas, maupun pengembangan lebih lanjut.

---

<p align="center">
  Dibuat dengan ❤️ untuk komunitas AU & kreator konten kreatif.
</p>
