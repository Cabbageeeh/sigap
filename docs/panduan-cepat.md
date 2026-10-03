# Panduan Cepat SIGAP
### Impor siswa dan alur nilai e-Rapor SMP 2025.2

Panduan ringkas untuk admin sekolah dan guru. Gunakan manual lengkap untuk fitur lain dan penjelasan rinci.

## Alur singkat

1. **Admin menyiapkan daftar siswa** di kelas SIGAP dan mengisi NIS asli.
2. **Admin menyimpan template e-Rapor** untuk setiap kombinasi kelas, mapel, dan semester.
3. **Admin memetakan kolom nilai** yang akan mengambil nilai dari SIGAP.
4. **Guru mengisi nilai rutin sekali** di halaman Nilai Siswa. Kolom yang dipetakan mengikuti nilai itu.
5. Guru mengisi kolom yang tidak dipetakan langsung di halaman e-Rapor, menyimpan, lalu mengunduh `.xls` atau `.xlsx`.
6. Admin memublikasikan nilai agar orang tua dapat melihatnya.

## 1. Impor atau lengkapi data siswa per kelas

Cara ini paling mudah untuk melengkapi NIS dan data orang tua tanpa menyalin ulang roster.

1. Buka **Kelas & Siswa**, lalu pilih kelas.
2. Klik **Unduh data kelas (.xlsx)**. File `data-kelas-[nama-kelas].xlsx` memuat data yang sudah tersimpan. Jika kelas belum memiliki siswa, file berisi judul kolom saja.
3. Lengkapi kolom yang diperlukan. Jangan ubah atau hapus **ID Siswa SIGAP** pada siswa lama. Untuk siswa baru, tambahkan baris dan biarkan ID tersebut kosong; isi NIS dan nama.
4. Klik **Impor daftar siswa**, pilih file yang sudah dilengkapi, lalu klik **Impor siswa**. Semua baris masuk ke kelas yang sedang dibuka.

**Aturan data:**

- NIS dan Nama Siswa wajib untuk siswa baru. NIS harus asli dan belum digunakan siswa lain.
- Data yang dikosongkan pada baris siswa lama tidak menghapus data lama. Isi hanya kolom yang memang ingin diubah.
- Data orang tua bersifat opsional. Untuk membuat akun orang tua baru, isi **Nama Orang Tua** dan **Kata sandi awal akun orang tua** minimal 8 karakter. Username orang tua memakai NIS anak.
- Jika akun orang tua sudah tertaut, impor dapat memperbarui nama dan kontaknya tanpa mengganti kata sandi.
- Gunakan template umum `.xlsx` atau `.csv` untuk menambah daftar baru. Template umum meminta NIS, nama, dan kelas. Untuk mengisi roster kelas yang sudah ada, gunakan **Unduh data kelas (.xlsx)** agar ID SIGAP tetap terbawa.

## 2. Admin: simpan template e-Rapor

Lakukan untuk setiap kombinasi kelas, mata pelajaran, dan semester.

1. Buka **Penilaian > Pengaturan e-Rapor**.
2. Pilih kelas, mata pelajaran, dan Semester I atau II yang sama dengan file sumber.
3. Unggah file `.xls` asli yang diunduh dari e-Rapor SMP 2025.2, atau `.xlsx` yang benar-benar disimpan ulang dari Excel. Batas ukuran 2 MB. Jangan hanya mengganti nama ekstensi file.
4. Klik **Periksa dan unggah**. File kosong dapat menyimpan struktur template; jika file berisi nilai, nilai itu juga akan diimpor.
5. Jika muncul pratinjau siswa baru, cocokkan nama dan ID anggota rombel, lalu isi **NIS asli** setiap siswa. Klik **Buat siswa dan simpan**. Siswa baru tidak otomatis mendapat akun orang tua.

**Sebelum mengunggah, pastikan:**

- Kelas, tingkat, mapel, dan semester pada file sama dengan pilihan di SIGAP. NPSN juga harus cocok jika Profil Sekolah SIGAP sudah diisi.
- File mempertahankan struktur asli e-Rapor, termasuk header `mapel_id`, `id_anggota_rombel`, dan `status kunci`.
- Tersedia satu atau lebih kolom Sumatif serta kolom **Akhir Semester Non Tes** dan **Akhir Semester Tes**.
- Daftar siswa pada file sesuai dengan kelas SIGAP. Jika ada siswa SIGAP yang tidak ada di file, periksa dan selaraskan roster terlebih dahulu.

ID anggota rombel berasal dari file e-Rapor. Saat siswa berhasil dicocokkan, SIGAP menyimpan pemetaannya. ID internal SIGAP dan NIS adalah identitas yang berbeda; jangan menyalin ID anggota rombel ke kolom NIS.

## 3. Admin: petakan sumber nilai

Di bagian **Sumber setiap kolom e-Rapor**, tentukan bagaimana setiap kolom diisi.

| Pilihan sumber | Perilaku |
|---|---|
| Jenis nilai SIGAP, misalnya Sumatif 1 | Nilai dari jenis tersebut ditampilkan di kolom e-Rapor dan ikut diekspor. Guru mengisi nilainya sekali di halaman Nilai Siswa. |
| **Isi langsung di halaman e-Rapor** | Kolom tetap diisi oleh guru pada tabel e-Rapor. Nilai ini tersimpan sebagai nilai e-Rapor. |

1. Pilih komponen yang sesuai untuk setiap kolom, misalnya memetakan **Sumatif 1** ke **Sumatif 1** dan **Sumatif 2** ke **Sumatif 2**.
2. Gunakan komponen yang berbeda jika Semester I dan II membutuhkan nilai yang berbeda.
3. Pemetaan selalu disimpan untuk kelas, mapel, dan semester yang sedang dibuka. Untuk menerapkannya juga sebagai default, centang **Terapkan juga sebagai default**, pilih **Semua mapel** atau **Mapel ini**, lalu klik satu tombol **Simpan pemetaan**.

Default berlaku pada template lain untuk tahun ajaran dan semester yang sama jika kolomnya belum memiliki pemetaan khusus. Default khusus mapel mengalahkan default semua mapel; pemetaan khusus pada sebuah template tetap menjadi prioritas tertinggi. Kolom tanpa sumber dipetakan tetap bisa diisi manual oleh guru di halaman e-Rapor.

Jika pemetaan diganti, nilai lama tetap tersimpan pada jenis sebelumnya. Periksa sumber lama dan baru setelah mengganti. Nilai langsung yang sudah ada dapat disalin ke sumber baru bila sumber itu masih kosong. Kolom yang memakai sumber SIGAP ditampilkan dari sumber tersebut dan tidak dapat diedit langsung pada tabel e-Rapor.

## 4. Guru: isi dan ekspor nilai

### Isi nilai SIGAP

1. Buka **Penilaian > Nilai Siswa**, pilih kelas, mapel, dan jenis penilaian.
2. Klik **Lihat Rekap**, isi nilai siswa, lalu klik **Simpan Semua Perubahan**.
3. Komponen yang sudah dipetakan admin ke kolom e-Rapor akan mengisi kolom itu secara otomatis.

### Lengkapi dan unduh e-Rapor

1. Dari Nilai Siswa, klik **Impor / Ekspor e-Rapor**.
2. Pilih kelas, mapel, dan semester yang sama dengan template, lalu klik **Tampilkan nilai**.
3. Bila template belum tersimpan, pilih file e-Rapor sumber dan klik **Periksa dan unggah**. Jika daftar siswa berbeda, minta admin memeriksa roster. Guru tidak dapat membuat siswa baru dari pratinjau.
4. Kolom yang mengambil nilai SIGAP akan terisi otomatis. Isi kolom **Isi langsung di halaman e-Rapor**, lalu klik **Simpan nilai**. Mengosongkan nilai langsung lalu menyimpannya akan menghapus nilai tersebut.
5. Setelah pemetaan siswa lengkap, unduh **.xls (format sekolah)** atau **.xlsx**. Pilih format yang diminta e-Rapor sekolah.
6. Periksa kelas, mapel, semester, daftar siswa, dan kolom nilai pada file unduhan sebelum mengunggahnya ke e-Rapor.

> Guru perlu memiliki akses nilai untuk kelas dan mapel tersebut. Pada hari terjadwal mengajar, konfirmasi QR mungkin diperlukan.

## 5. Jika terjadi masalah

| Pesan atau kondisi | Yang perlu diperiksa |
|---|---|
| File tidak dikenali sebagai format e-Rapor | Unduh ulang file asli dari e-Rapor SMP 2025.2. Untuk `.xlsx`, gunakan **File > Save As > Excel Workbook (.xlsx)** di Excel dan pertahankan header serta susunan kolom. |
| Kelas atau mapel tidak cocok | Samakan pilihan kelas, tingkat, mapel, dan semester dengan isi file. |
| NPSN berbeda | Cocokkan NPSN file dengan **Profil Sekolah** di SIGAP. |
| Impor meminta NIS siswa baru | Admin isi NIS asli dan unik pada pratinjau. Jangan memakai ID internal SIGAP atau ID anggota rombel sebagai NIS. |
| Ada siswa SIGAP yang tidak ada pada file | Perbarui atau periksa roster kelas sebelum mengunggah template. |
| Tombol ekspor belum tampil | Pastikan template tersimpan dan semua siswa pada roster sudah cocok dengan ID anggota rombel di template. |
| Kolom e-Rapor kosong | Admin periksa **Sumber setiap kolom e-Rapor**. Kolom dengan sumber langsung perlu diisi guru pada halaman e-Rapor. |

## 6. Publikasi untuk orang tua

Setelah data diperiksa, admin buka **Periode Akademik** dan pilih **Publikasikan Nilai**. Setelah nilai dipublikasikan, orang tua dapat melihat rekap SIGAP. Bagian **Nilai Resmi e-Rapor** tampil terpisah jika template dan nilai e-Rapor tersedia. Nilai harian tetap ada pada rekap SIGAP.

## Daftar cek sebelum file dikirim ke e-Rapor

- [ ] Kelas, mapel, semester, dan NPSN benar.
- [ ] Daftar siswa dan ID anggota rombel sudah cocok.
- [ ] Setiap kolom e-Rapor sudah dipetakan atau diisi langsung.
- [ ] Perubahan nilai langsung sudah disimpan.
- [ ] File hasil ekspor dibuka dan diperiksa sebelum diunggah.

Unduh versi PDF terbaru: [Panduan Cepat](../output/pdf/Panduan-Cepat-SIGAP.pdf) · [Manual Book](../output/pdf/Manual-Book-SIGAP.pdf).

Untuk penjelasan lengkap seluruh fitur SIGAP, lihat [Manual Book](manual-book.md).
