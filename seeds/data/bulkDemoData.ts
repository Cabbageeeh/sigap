/**
 * Static pools for the bulk demo seed. Kept out of the seed file so the seed
 * stays readable; every list is hand-written Indonesian school data.
 */

export interface SubjectSeed {
  code: string;
  name: string;
  kkm: number;
}

export interface TeacherSeed {
  username: string;
  name: string;
  subjects: string[];
}

export interface ClassSeed {
  name: string;
  grade: number;
  homeroom: string;
}

// Existing MAT/BIO/ENG rows are renamed to Indonesian by the seed.
export const SUBJECTS: SubjectSeed[] = [
  { code: 'BIN', name: 'Bahasa Indonesia', kkm: 75 },
  { code: 'FIZ', name: 'Fisika', kkm: 72 },
  { code: 'KIM', name: 'Kimia', kkm: 72 },
  { code: 'GEO', name: 'Geografi', kkm: 74 },
  { code: 'SOS', name: 'Sosiologi', kkm: 74 },
  { code: 'EKO', name: 'Ekonomi', kkm: 75 },
  { code: 'HIS', name: 'Sejarah Indonesia', kkm: 74 },
  { code: 'PPK', name: 'Pendidikan Pancasila', kkm: 75 },
  { code: 'PJOK', name: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kkm: 70 },
  { code: 'INF', name: 'Informatika', kkm: 73 },
  { code: 'AGA', name: 'Pendidikan Agama dan Budi Pekerti', kkm: 75 },
  { code: 'SID', name: 'Seni Budaya', kkm: 72 },
];

export const RENAMED_SUBJECTS: Record<string, string> = {
  MAT: 'Matematika',
  BIO: 'Biologi',
  ENG: 'Bahasa Inggris',
};

export const TEACHERS: TeacherSeed[] = [
  { username: 'ratna', name: 'Ratna Dewi Puspitasari', subjects: ['BIN'] },
  { username: 'yusuf', name: 'Yusuf Maulana Ibrahim', subjects: ['HIS', 'PPK'] },
  { username: 'endang', name: 'Endang Sulistyorini', subjects: ['GEO', 'SOS'] },
  { username: 'agus', name: 'Agus Priambodo', subjects: ['MAT', 'FIZ'] },
  { username: 'nia', name: 'Nia Kurniasih', subjects: ['KIM', 'BIO'] },
  { username: 'dwi', name: 'Dwi Haryanto', subjects: ['EKO', 'SOS'] },
  { username: 'tri', name: 'Tri Waluyo Jati', subjects: ['PJOK'] },
  { username: 'laksmi', name: 'Laksmi Wardhani', subjects: ['SID', 'HIS'] },
  { username: 'hafiz', name: 'Hafiz Ramadhan', subjects: ['INF', 'MAT'] },
  { username: 'nur', name: 'Nur Hidayah Assegaf', subjects: ['AGA', 'BIN'] },
  { username: 'bambang', name: 'Bambang Sutrisno', subjects: ['MAT', 'KIM'] },
  { username: 'retno', name: 'Retno Palupi', subjects: ['BIO', 'ENG'] },
  { username: 'fitri', name: 'Fitriani Handayani', subjects: ['ENG', 'BIN'] },
  { username: 'hendra', name: 'Hendra Gunawan', subjects: ['FIZ', 'INF'] },
  { username: 'maskur', name: 'Maskur Abdurrahman', subjects: ['PPK', 'AGA'] },
];

export const CLASSES: ClassSeed[] = [
  { name: '10A', grade: 10, homeroom: 'ratna' },
  { name: '10B', grade: 10, homeroom: 'siti' },
  { name: '10C', grade: 10, homeroom: 'budi' },
  { name: '10D', grade: 10, homeroom: 'agus' },
  { name: '11A', grade: 11, homeroom: 'endang' },
  { name: '11B', grade: 11, homeroom: 'nia' },
  { name: '11C', grade: 11, homeroom: 'dwi' },
  { name: '12A', grade: 12, homeroom: 'bambang' },
  { name: '12B', grade: 12, homeroom: 'retno' },
];

// The first three subjects of a grade run twice a week; the rest once.
export const SUBJECTS_BY_GRADE: Record<number, string[]> = {
  10: ['MAT', 'BIN', 'ENG', 'FIZ', 'KIM', 'HIS', 'PPK', 'PJOK'],
  11: ['MAT', 'BIN', 'ENG', 'BIO', 'GEO', 'SOS', 'EKO', 'INF'],
  12: ['MAT', 'BIN', 'ENG', 'FIZ', 'KIM', 'AGA', 'SID', 'HIS'],
};

export const MALE_FIRST = [
  'Ahmad', 'Bagas', 'Bayu', 'Damar', 'Fahri', 'Galang', 'Hafiz', 'Ilham', 'Jefri', 'Krisna',
  'Luthfi', 'Naufal', 'Rangga', 'Reza', 'Satria', 'Taufik', 'Vino', 'Wahyu', 'Yoga', 'Zaki',
  'Aditya', 'Bimo', 'Candra', 'Dimas', 'Elang', 'Farhan', 'Gilang', 'Hendra', 'Irfan', 'Jacky',
];

export const FEMALE_FIRST = [
  'Alya', 'Bunga', 'Cindy', 'Dinda', 'Eka', 'Fitri', 'Gita', 'Hana', 'Intan', 'Jihan',
  'Kirana', 'Laras', 'Maya', 'Nadia', 'Oktaviani', 'Putri', 'Qori', 'Rina', 'Salsabila', 'Tika',
  'Umi', 'Vina', 'Wulan', 'Xena', 'Yuni', 'Zahra', 'Anindya', 'Belinda', 'Cahya', 'Devi',
];

export const LAST_NAMES = [
  'Pratama', 'Nugroho', 'Saputra', 'Wijaya', 'Kusuma', 'Lestari', 'Anggraini', 'Santoso', 'Hidayat', 'Permata',
  'Maulana', 'Setiawan', 'Halim', 'Wibowo', 'Firmansyah', 'Rahmawati', 'Hutapea', 'Simbolon', 'Maharani', 'Susanto',
  'Utami', 'Siregar', 'Prasetyo', 'Wijayanti', 'Safitri', 'Handoko', 'Jayaprana', 'Kartika', 'Permana', 'Yulianto',
];

export const ADULT_MALE = [
  'Slamet Widodo', 'Suparman', 'Bambang Heryanto', 'Sutopo', 'Ridwan Maulana', 'Sugeng Riyadi', 'Mulyadi',
  'Harjito', 'Anwar Sadat', 'Djoko Santoso', 'Nurhadi', 'Teguh Imam Santoso', 'Zainal Arifin', 'Marwoto',
  'Sukirman', 'Edy Purwanto',
];

export const ADULT_FEMALE = [
  'Sri Wahyuni', 'Siti Mariam', 'Endang Lestari', 'Wahyu Retnowati', 'Rukmini', 'Suprihatin', 'Nur Aisyah',
  'Darmawati', 'Sulastri', 'Kusnawati', 'Rohmah Yulida', 'Halimahatussaadiyah', 'Tri Murti', 'Ponirah',
  'Istiqomah', 'Chomsyah',
];

export const STREETS = [
  'Jl. Raya Kendalsari', 'Jl. Babatan Indah', 'Jl. Wiyung Indah', 'Jl. Menganti Raya', 'Jl. Pradah Permai',
  'Jl. Gunung Anyar Timur', 'Jl. Kedung Baruk', 'Jl. Rungkut Industri', 'Jl. Raya Kali Rungkut', 'Jl. Siwalankerto',
  'Jl. Made Timur', 'Jl. Panjang Jiwo', 'Jl. Ir. Rauf Cipta', 'Jl. Arief Rahman Hakim', 'Jl. Dharmahusada Indah',
  'Jl. Mulyorejo Jaya', 'Jl. Kejawan Putih', 'Jl. Sukomanunggal Jaya', 'Jl. Tanjung Wokam', 'Jl. Pagesangan Baru',
  'Jl. Undaan Kulon', 'Jl. Gubeng Kertajaya', 'Jl. Karah Agung', 'Jl. Jambangan Jaya',
];

export const AREA_SUFFIX = [
  'Kec. Wiyung, Kota Surabaya', 'Kec. Babatan, Kota Surabaya', 'Kec. Menganti, Kab. Gresik', 'Kec. Rungkut, Kota Surabaya',
  'Kec. Sukomanunggal, Kota Surabaya', 'Kec. Mulyorejo, Kota Surabaya', 'Kec. Gubeng, Kota Surabaya', 'Kec. Jambangan, Kota Surabaya',
];

export const MATERIALS: Record<string, string[]> = {
  MAT: ['Persamaan kuadrat dan diskriminan', 'Barisan dan deret aritmetika', 'Trigonometri: identitas jumlah dan selisih'],
  BIN: ['Teks eksposisi: tesis dan argumen', 'Surat dinas dan kaidah penulisan', 'Poi lama: menganalisis tema dan nada'],
  ENG: ['Narrative text: orientation, complication, resolution', 'Report text: describing natural phenomena', 'Interview questions for spoken practice'],
  BIO: ['Sel sebagai unit kehidupan', 'Sistem transportasi pada manusia', 'Ekosistem: aliran energi dan daur biogeokimia'],
  FIZ: ['Gerak lurus berubah beraturan', 'Hukum Newton dan gaya gesek', 'Kalor dan perpindahan energi'],
  KIM: ['Struktur atom dan konfigurasi elektron', 'Ikatan ion dan ikatan kovalen', 'Stoikiometri persamaan reaksi'],
  GEO: ['Peta, skala, dan proyeksi', 'Siklus hidrologi dan sumber daya air', 'Litosfer dan proses pembentukan muka bumi'],
  SOS: ['Nilai dan norma sosial', 'Mobilitas dan stratifikasi sosial', 'Kelompok sosial dan konflik masyarakat'],
  EKO: ['Permintaan, penawaran, dan harga keseimbangan', 'Pendapatan nasional dan inflasi', 'Kebijakan fiskal dan moneter'],
  HIS: ['Kebangkitan nasional 1908-1945', 'Perang Diponegoro dan perlawanan daerah', 'Peran pemuda dalam proklamasi'],
  PPK: ['Norma dan pembudayaan nilai Pancasila', 'UUD NRI 1945 dan struktur ketatanegaraan', 'Bhinneka Tunggal Ika dalam kehidupan sekolah'],
  PJOK: ['Teknik dasar pass bawah bola voli', 'Lari jarak menengah dan pengaturan napas', 'Kebugaran jasmani: sirkuit training'],
  INF: ['Algoritma pengurutan dan pencarian', 'Basis data relasi dan query sederhana', 'Keamanan digital dan jejak kaki daring'],
  AGA: ['Adab menuntut ilmu', 'Sejarah perkembangan ilmu pengetahuan Islam', 'Kerukunan hidup antarumat beragama'],
  SID: ['Unsur rupa dalam karya dua dimensi', 'Apresiasi seni musik daerah', 'Praktik mewarnai dengan teknik basah'],
};

export const ANNOUNCEMENTS: { title: string; body: string }[] = [
  {
    title: 'Jadwal Penilaian Sumatif Akhir Semester',
    body: 'Sumatif akhir semester gasal dimulai Senin pekan depan. Guru pengampu menutup pengisian nilai komponen paling lambat satu hari sebelum ujian agar rapor sempat diverifikasi wali kelas.',
  },
  {
    title: 'Pengumpulan Berkas Laporan Jurnal Mengajar',
    body: 'Jurnal mengajar bulan ini sudah dapat direkap dari menu Jurnal. Kepala sekolah akan memeriksa kelengkapan per guru pada rapat dewan guru hari Jumat.',
  },
  {
    title: 'Pembaruan Titik Koordinat Gerbang Utama',
    body: 'Radius absensi diperluas 50 meter ke sisi gerbang utama. Guru yang memindai QR di area parkir kini tercatat di dalam sekolah. Silakan buka ulang aplikasi untuk mengambil profil terbaru.',
  },
];
