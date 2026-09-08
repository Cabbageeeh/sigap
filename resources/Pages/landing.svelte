<script lang="ts">
  import { inertia, page } from '@inertiajs/svelte';
  import {
    ArrowRight,
    BookOpen,
    CalendarDays,
    ChevronRight,
    GraduationCap,
    MapPin,
    Menu,
    ShieldCheck,
    UserCheck,
    Users,
    X,
  } from '@lucide/svelte';
  import DarkModeToggle from '../Components/DarkModeToggle.svelte';
  import SigapIcon from '../Components/SigapIcon.svelte';

  interface User {
    id: string;
    name: string;
    username: string;
    roles: string[];
    permissions: string[];
  }

  const user = page.props.user as User | undefined;
  let mobileMenuOpen = $state(false);

  const year = new Date().getFullYear();

  const modules = [
    'Absensi guru',
    'Jurnal mengajar',
    'Nilai & rapor',
    'Jadwal pelajaran',
    'Portal orang tua',
    'QR & geolokasi',
  ];

  const steps = [
    {
      number: '01',
      title: 'Siapkan struktur sekolah',
      description: 'Atur tahun ajaran, kelas, mata pelajaran, jadwal, guru, dan lokasi sekolah dalam satu tempat.',
    },
    {
      number: '02',
      title: 'Guru bekerja dari alur yang sama',
      description: 'Kehadiran, konfirmasi lokasi, jurnal mengajar, dan input nilai mengikuti jadwal yang sudah tersusun.',
    },
    {
      number: '03',
      title: 'Data langsung terkonsolidasi',
      description: 'Admin dan kepala sekolah melihat progres, anomali, dan rekap tanpa menggabungkan banyak file terpisah.',
    },
    {
      number: '04',
      title: 'Orang tua mendapat informasi relevan',
      description: 'Data akademik dan kehadiran anak tersedia dari sumber yang sama, dengan akses sesuai peran.',
    },
  ];
</script>

<svelte:head>
  <title>SIGAP — Sistem Informasi Guru, Absensi, dan Prestasi</title>
  <meta
    name="description"
    content="SIGAP membantu sekolah mengelola absensi guru, jurnal, nilai, jadwal, rapor, dan portal orang tua dalam satu sistem yang terhubung."
  />
</svelte:head>

<div class="landing-shell min-h-[100dvh] overflow-x-hidden bg-[#f7faf8] text-[#142019] transition-colors dark:bg-[#09110d] dark:text-[#edf7f0]">
  <!-- Navigation -->
  <header class="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
    <nav
      class="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-2xl border border-black/[0.06] bg-white/90 px-4 shadow-[0_8px_30px_rgba(18,46,31,0.06)] backdrop-blur-xl sm:px-5 dark:border-white/[0.08] dark:bg-[#101a14]/90 dark:shadow-none"
      aria-label="Navigasi utama"
    >
      <a href="/" use:inertia class="flex items-center gap-3" aria-label="SIGAP Beranda">
        <SigapIcon size={30} />
      </a>

      <div class="hidden items-center gap-7 text-[13px] font-semibold text-[#55635a] lg:flex dark:text-[#9dafA4]">
        <a href="#platform" class="transition-colors hover:text-[#138a4b] dark:hover:text-[#55d98a]">Platform</a>
        <a href="#fitur" class="transition-colors hover:text-[#138a4b] dark:hover:text-[#55d98a]">Fitur</a>
        <a href="#peran" class="transition-colors hover:text-[#138a4b] dark:hover:text-[#55d98a]">Untuk siapa</a>
        <a href="#cara-kerja" class="transition-colors hover:text-[#138a4b] dark:hover:text-[#55d98a]">Cara kerja</a>
      </div>

      <div class="flex items-center gap-2">
        <DarkModeToggle />
        <div class="hidden items-center gap-2 sm:flex">
          {#if user}
            <a
              href="/dashboard"
              use:inertia
              class="inline-flex h-10 items-center gap-2 rounded-xl bg-[#168c4c] px-4 text-sm font-semibold text-white transition hover:bg-[#117540]"
            >
              Dashboard
              <ArrowRight class="h-4 w-4" />
            </a>
          {:else}
            <a
              href="/login"
              use:inertia
              class="inline-flex h-10 items-center rounded-xl px-3.5 text-sm font-semibold text-[#304138] transition hover:bg-[#edf5f0] dark:text-[#dce9df] dark:hover:bg-white/[0.06]"
            >
              Masuk
            </a>
            <a
              href="/login"
              use:inertia
              class="inline-flex h-10 items-center gap-2 rounded-xl bg-[#168c4c] px-4 text-sm font-semibold text-white transition hover:bg-[#117540]"
            >
              Mulai gunakan
              <ArrowRight class="h-4 w-4" />
            </a>
          {/if}
        </div>

        <button
          type="button"
          class="grid h-10 w-10 place-items-center rounded-xl text-[#425249] transition hover:bg-[#edf5f0] lg:hidden dark:text-[#cfddd2] dark:hover:bg-white/[0.06]"
          aria-label="Buka menu"
          aria-expanded={mobileMenuOpen}
          onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
        >
          {#if mobileMenuOpen}
            <X class="h-5 w-5" />
          {:else}
            <Menu class="h-5 w-5" />
          {/if}
        </button>
      </div>
    </nav>

    {#if mobileMenuOpen}
      <div class="mx-auto mt-2 max-w-7xl rounded-2xl border border-black/[0.06] bg-white p-3 shadow-xl lg:hidden dark:border-white/[0.08] dark:bg-[#101a14]">
        <div class="grid gap-1 text-sm font-semibold text-[#46564c] dark:text-[#c7d6ca]">
          {#each [
            { href: '#platform', label: 'Platform' },
            { href: '#fitur', label: 'Fitur' },
            { href: '#peran', label: 'Untuk siapa' },
            { href: '#cara-kerja', label: 'Cara kerja' },
          ] as item}
            <a
              href={item.href}
              class="rounded-xl px-3 py-2.5 hover:bg-[#f1f6f3] dark:hover:bg-white/[0.05]"
              onclick={() => (mobileMenuOpen = false)}
            >{item.label}</a>
          {/each}
          <div class="mt-2 border-t border-[#e7ede9] pt-3 dark:border-white/[0.08]">
            <a
              href={user ? '/dashboard' : '/login'}
              use:inertia
              class="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#168c4c] px-4 text-sm font-semibold text-white"
            >
              {user ? 'Buka dashboard' : 'Masuk ke SIGAP'}
              <ArrowRight class="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    {/if}
  </header>

  <!-- Hero -->
  <main>
    <section class="relative px-4 pb-14 pt-32 sm:px-6 sm:pb-20 sm:pt-36 lg:px-8 lg:pb-24 lg:pt-40">
      <div class="relative mx-auto max-w-7xl">
        <div class="mx-auto max-w-4xl text-center">
          <p class="mb-6 text-xs font-bold uppercase tracking-[0.16em] text-[#168c4c] dark:text-[#65d993]">Operasional sekolah dalam satu alur</p>

          <h1 class="text-balance text-[clamp(2.75rem,7vw,5.8rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-[#132018] dark:text-[#f0f8f2]">
            Sekolah berjalan lebih rapi ketika
            <span class="text-[#168c4c] dark:text-[#5dd88d]"> semua data terhubung.</span>
          </h1>

          <p class="mx-auto mt-7 max-w-2xl text-balance text-base leading-7 text-[#617068] sm:text-lg sm:leading-8 dark:text-[#9eafa4]">
            SIGAP menyatukan absensi guru, jurnal mengajar, jadwal, nilai, rapor, dan akses orang tua—tanpa memaksa sekolah bekerja dari banyak sistem yang terpisah.
          </p>

          <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={user ? '/dashboard' : '/login'}
              use:inertia
              class="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#168c4c] px-6 text-sm font-bold text-white shadow-[0_10px_30px_rgba(22,140,76,0.22)] transition hover:-translate-y-0.5 hover:bg-[#117540] sm:w-auto"
            >
              {user ? 'Buka dashboard' : 'Masuk ke SIGAP'}
              <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#fitur"
              class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#dbe6df] bg-white px-6 text-sm font-bold text-[#33453a] transition hover:-translate-y-0.5 hover:border-[#bdd5c5] hover:bg-[#fbfdfc] sm:w-auto dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-[#dfece2] dark:hover:bg-white/[0.07]"
            >
              Lihat kemampuan platform
              <ChevronRight class="h-4 w-4" />
            </a>
          </div>

          <div class="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs font-medium text-[#77857d] dark:text-[#819188]">
            <span>Berbasis peran</span>
            <span aria-hidden="true" class="text-[#b3beb7] dark:text-[#536158]">·</span>
            <span>Verifikasi geolokasi</span>
            <span aria-hidden="true" class="text-[#b3beb7] dark:text-[#536158]">·</span>
            <span>Data akademik terhubung</span>
          </div>
        </div>

        <!-- Product preview -->
        <div id="platform" class="relative mx-auto mt-14 max-w-6xl sm:mt-16">
          <div class="product-glow"></div>
          <div class="relative overflow-hidden rounded-[28px] border border-black/[0.07] bg-white p-2 shadow-[0_35px_90px_rgba(16,58,34,0.16)] sm:p-3 dark:border-white/[0.09] dark:bg-[#111b15] dark:shadow-[0_35px_90px_rgba(0,0,0,0.35)]">
            <div class="overflow-hidden rounded-[21px] border border-[#e5ebe7] bg-[#f7faf8] dark:border-white/[0.07] dark:bg-[#0c130f]">
              <div class="flex h-12 items-center justify-between border-b border-[#e1e9e4] bg-white px-4 sm:px-5 dark:border-white/[0.07] dark:bg-[#121c16]">
                <div class="flex items-center gap-3">
                  <SigapIcon size={21} showText={false} />
                  <span class="hidden text-xs font-bold text-[#29382f] sm:inline dark:text-[#dbe7de]">Dashboard Sekolah</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="hidden rounded-lg bg-[#f0f5f2] px-2.5 py-1 text-[10px] font-semibold text-[#718078] sm:inline dark:bg-white/[0.05] dark:text-[#86968c]">TA 2026/2027</span>
                  <span class="grid h-7 w-7 place-items-center rounded-full bg-[#daf1e2] text-[10px] font-extrabold text-[#137442] dark:bg-[#173523] dark:text-[#64d993]">AD</span>
                </div>
              </div>

              <div class="grid min-h-[520px] lg:grid-cols-[190px_1fr]">
                <aside class="hidden border-r border-[#e2e9e4] bg-white px-3 py-5 lg:block dark:border-white/[0.07] dark:bg-[#101813]">
                  <p class="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[#9aa69f]">Workspace</p>
                  <div class="space-y-1 text-xs font-semibold">
                    <div class="flex items-center gap-2 rounded-xl bg-[#e9f6ee] px-3 py-2.5 text-[#157743] dark:bg-[#173023] dark:text-[#63d58e]"><span class="h-1.5 w-1.5 rounded-full bg-current"></span> Ringkasan</div>
                    <div class="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[#66756c] dark:text-[#8fa096]"><CalendarDays class="h-3.5 w-3.5" /> Jadwal</div>
                    <div class="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[#66756c] dark:text-[#8fa096]"><UserCheck class="h-3.5 w-3.5" /> Kehadiran</div>
                    <div class="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[#66756c] dark:text-[#8fa096]"><BookOpen class="h-3.5 w-3.5" /> Jurnal</div>
                    <div class="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[#66756c] dark:text-[#8fa096]"><GraduationCap class="h-3.5 w-3.5" /> Nilai & rapor</div>
                    <div class="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[#66756c] dark:text-[#8fa096]"><Users class="h-3.5 w-3.5" /> Orang tua</div>
                  </div>
                </aside>

                <div class="p-4 sm:p-6 lg:p-7">
                  <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div>
                      <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a9890]">Selasa, 8 September</p>
                      <h2 class="mt-1 text-xl font-bold tracking-[-0.025em] text-[#1e2c23] sm:text-2xl dark:text-[#e6f0e9]">Selamat datang, Admin.</h2>
                    </div>
                    <div class="inline-flex items-center gap-2 self-start rounded-xl border border-[#dce8e0] bg-white px-3 py-2 text-[11px] font-semibold text-[#596b60] dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-[#9aac9f]">
                      <span class="relative flex h-2 w-2">
                        <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#24a85c] opacity-50"></span>
                        <span class="relative inline-flex h-2 w-2 rounded-full bg-[#24a85c]"></span>
                      </span>
                      Data hari ini
                    </div>
                  </div>

                  <div class="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <div class="rounded-2xl border border-[#e2eae5] bg-white p-4 dark:border-white/[0.07] dark:bg-[#121c16]">
                      <div class="flex items-center justify-between"><span class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b9991]">Guru hadir</span><UserCheck class="h-4 w-4 text-[#168c4c]" /></div>
                      <p class="mt-3 text-2xl font-extrabold tracking-tight text-[#1b2a21] dark:text-[#edf5ef]">42<span class="text-sm font-semibold text-[#98a39d]">/45</span></p>
                      <p class="mt-1 text-[10px] font-semibold text-[#168c4c]">93% terverifikasi</p>
                    </div>
                    <div class="rounded-2xl border border-[#e2eae5] bg-white p-4 dark:border-white/[0.07] dark:bg-[#121c16]">
                      <div class="flex items-center justify-between"><span class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b9991]">Jurnal masuk</span><BookOpen class="h-4 w-4 text-[#168c4c]" /></div>
                      <p class="mt-3 text-2xl font-extrabold tracking-tight text-[#1b2a21] dark:text-[#edf5ef]">38</p>
                      <p class="mt-1 text-[10px] font-semibold text-[#6f7d75] dark:text-[#839188]">dari 41 sesi selesai</p>
                    </div>
                    <div class="rounded-2xl border border-[#e2eae5] bg-white p-4 dark:border-white/[0.07] dark:bg-[#121c16]">
                      <div class="flex items-center justify-between"><span class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b9991]">Kelas aktif</span><GraduationCap class="h-4 w-4 text-[#168c4c]" /></div>
                      <p class="mt-3 text-2xl font-extrabold tracking-tight text-[#1b2a21] dark:text-[#edf5ef]">18</p>
                      <p class="mt-1 text-[10px] font-semibold text-[#6f7d75] dark:text-[#839188]">6 tingkat berjalan</p>
                    </div>
                    <div class="rounded-2xl border border-[#e2eae5] bg-white p-4 dark:border-white/[0.07] dark:bg-[#121c16]">
                      <div class="flex items-center justify-between"><span class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b9991]">Alert lokasi</span><MapPin class="h-4 w-4 text-amber-500" /></div>
                      <p class="mt-3 text-2xl font-extrabold tracking-tight text-[#1b2a21] dark:text-[#edf5ef]">2</p>
                      <p class="mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">perlu ditinjau</p>
                    </div>
                  </div>

                  <div class="mt-3 grid gap-3 xl:grid-cols-[1.25fr_.75fr]">
                    <div class="rounded-2xl border border-[#e2eae5] bg-white p-4 sm:p-5 dark:border-white/[0.07] dark:bg-[#121c16]">
                      <div class="flex items-center justify-between">
                        <div>
                          <p class="text-sm font-bold text-[#26362d] dark:text-[#dce8df]">Aktivitas mengajar hari ini</p>
                          <p class="mt-0.5 text-[10px] text-[#849189]">Sesi terbaru dari jadwal sekolah</p>
                        </div>
                        <span class="rounded-lg bg-[#edf7f1] px-2 py-1 text-[9px] font-bold text-[#168c4c] dark:bg-[#153021] dark:text-[#64d48f]">LIVE</span>
                      </div>
                      <div class="mt-4 space-y-2.5">
                        {#each [
                          { time: '07:00', teacher: 'Budi Santoso', class: 'X-A · Matematika', status: 'Terverifikasi' },
                          { time: '08:30', teacher: 'Siti Rahmawati', class: 'XI-B · Biologi', status: 'Jurnal masuk' },
                          { time: '10:00', teacher: 'Ahmad Fauzi', class: 'XII-A · Bahasa Inggris', status: 'Berlangsung' },
                        ] as row}
                          <div class="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-xl bg-[#f7faf8] px-3 py-2.5 dark:bg-white/[0.035]">
                            <span class="text-[10px] font-bold text-[#7e8c84]">{row.time}</span>
                            <div class="min-w-0">
                              <p class="truncate text-[11px] font-bold text-[#2b3b31] dark:text-[#d5e2d8]">{row.teacher}</p>
                              <p class="mt-0.5 truncate text-[9px] text-[#8b9891]">{row.class}</p>
                            </div>
                            <span class="hidden rounded-lg bg-white px-2 py-1 text-[9px] font-bold text-[#168c4c] shadow-sm sm:inline dark:bg-[#19251d] dark:text-[#63d58e]">{row.status}</span>
                          </div>
                        {/each}
                      </div>
                    </div>

                    <div class="rounded-2xl border border-[#e2eae5] bg-[#143d27] p-5 text-white dark:border-[#285139] dark:bg-[#153b27]">
                      <div class="flex items-center justify-between">
                        <div class="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><ShieldCheck class="h-4 w-4" /></div>
                        <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-white/45">Verifikasi</span>
                      </div>
                      <p class="mt-7 text-lg font-bold tracking-[-0.02em]">Kehadiran yang punya konteks, bukan sekadar tombol hadir.</p>
                      <p class="mt-2 text-xs leading-5 text-white/65">Lokasi sekolah, radius, jadwal, dan identitas guru menjadi bagian dari proses verifikasi.</p>
                      <div class="mt-6 space-y-2.5 text-[10px] font-semibold text-white/80">
                        <div class="flex items-center justify-between border-b border-white/10 pb-2.5"><span>Geolokasi</span><span class="text-[#6ce09b]">Aktif</span></div>
                        <div class="flex items-center justify-between border-b border-white/10 pb-2.5"><span>Radius sekolah</span><span>200 m</span></div>
                        <div class="flex items-center justify-between"><span>Audit aktivitas</span><span class="text-[#6ce09b]">Tercatat</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p class="mt-4 text-center text-[11px] font-medium text-[#8a978f] dark:text-[#718178]">Visualisasi produk menggunakan data ilustratif.</p>
        </div>
      </div>
    </section>

    <!-- Module strip -->
    <section class="border-y border-[#e3ebe6] bg-white py-6 dark:border-white/[0.07] dark:bg-[#0d1510]">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-4 px-6 lg:justify-between">
        <span class="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#94a099]">Terhubung dalam SIGAP</span>
        {#each modules as module}
          <span class="text-xs font-bold text-[#536259] dark:text-[#a6b5aa]">{module}</span>
        {/each}
      </div>
    </section>

    <!-- Features -->
    <section id="fitur" class="px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
      <div class="mx-auto max-w-7xl">
        <div class="max-w-3xl">
          <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#168c4c]">Fitur utama</p>
          <h2 class="mt-4 text-balance text-[clamp(2rem,5vw,3.8rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-[#18251d] dark:text-[#edf6ef]">Dibangun mengikuti ritme sekolah sehari-hari.</h2>
          <p class="mt-5 max-w-2xl text-base leading-7 text-[#68766e] dark:text-[#98a89d]">Bukan kumpulan fitur yang berdiri sendiri. Data dari jadwal, guru, kelas, kehadiran, dan nilai saling mengisi sehingga pekerjaan administrasi tidak berulang.</p>
        </div>

        <div class="mt-12 grid gap-4 lg:grid-cols-12">
          <article class="feature-card lg:col-span-7 lg:min-h-[430px]">
            <div class="flex h-full flex-col">
              <div class="max-w-xl">
                <p class="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#168c4c] dark:text-[#64d993]">Absensi & verifikasi</p>
                <h3 class="text-2xl font-bold tracking-[-0.03em] text-[#203027] sm:text-3xl dark:text-[#e5eee8]">Absensi guru yang memahami lokasi dan jadwal.</h3>
                <p class="mt-3 text-sm leading-6 text-[#6e7c73] dark:text-[#93a399]">Konfirmasi kehadiran dapat dikaitkan dengan lokasi sekolah, radius, dan sesi mengajar. Data anomali tetap terlihat untuk ditinjau, bukan hilang di balik rekap.</p>
              </div>
              <div class="mt-auto pt-8">
                <div class="rounded-2xl border border-[#dfe9e2] bg-[#f6faf7] p-4 dark:border-white/[0.07] dark:bg-white/[0.035]">
                  <div class="grid gap-2 sm:grid-cols-3">
                    {#each [
                      { label: 'Lokasi', value: 'Main Campus' },
                      { label: 'Radius', value: '200 meter' },
                      { label: 'Status', value: 'Terverifikasi' },
                    ] as item}
                      <div class="rounded-xl bg-white px-3 py-3 dark:bg-[#152019]">
                        <p class="text-[9px] font-bold uppercase tracking-[0.12em] text-[#99a49e]">{item.label}</p>
                        <p class="mt-1 text-xs font-extrabold text-[#33443a] dark:text-[#d9e5dc]">{item.value}</p>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article class="feature-card lg:col-span-5">
            <p class="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#168c4c] dark:text-[#64d993]">Jurnal</p>
            <h3 class="mt-3 text-xl font-bold tracking-[-0.025em] text-[#203027] dark:text-[#e5eee8]">Jurnal mengajar tanpa input berulang.</h3>
            <p class="mt-3 text-sm leading-6 text-[#6e7c73] dark:text-[#93a399]">Jadwal membantu memberi konteks kelas dan mata pelajaran, sehingga jurnal tersusun lebih konsisten dan mudah direkap.</p>
            <div class="mt-7 space-y-2">
              {#each ['Kelas X-A · Matematika', 'Materi: Sistem Persamaan Linear', 'Kehadiran siswa: 31/32'] as text, i}
                <div class="flex items-center gap-3 rounded-xl border border-[#e3ebe6] bg-[#fafcfb] px-3 py-2.5 text-[11px] font-semibold text-[#607067] dark:border-white/[0.06] dark:bg-white/[0.025] dark:text-[#a0afa5]">
                  <span class="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[#e8f5ed] text-[9px] font-extrabold text-[#168c4c] dark:bg-[#193023]">{i + 1}</span>{text}
                </div>
              {/each}
            </div>
          </article>

          <article class="feature-card lg:col-span-4">
            <p class="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#168c4c] dark:text-[#64d993]">Akademik</p>
            <h3 class="mt-3 text-xl font-bold tracking-[-0.025em] text-[#203027] dark:text-[#e5eee8]">Nilai, audit, dan rapor.</h3>
            <p class="mt-3 text-sm leading-6 text-[#6e7c73] dark:text-[#93a399]">Kelola komponen nilai, lihat perubahan, lalu susun informasi akademik dari sumber data yang sama.</p>
          </article>

          <article class="feature-card lg:col-span-4">
            <p class="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#168c4c] dark:text-[#64d993]">Jadwal</p>
            <h3 class="mt-3 text-xl font-bold tracking-[-0.025em] text-[#203027] dark:text-[#e5eee8]">Jadwal sebagai fondasi alur kerja.</h3>
            <p class="mt-3 text-sm leading-6 text-[#6e7c73] dark:text-[#93a399]">Kelas, guru, mata pelajaran, dan sesi mengajar terhubung agar konteks tidak perlu diketik ulang di tiap modul.</p>
          </article>

          <article class="feature-card lg:col-span-4">
            <p class="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#168c4c] dark:text-[#64d993]">Orang tua</p>
            <h3 class="mt-3 text-xl font-bold tracking-[-0.025em] text-[#203027] dark:text-[#e5eee8]">Portal orang tua yang relevan.</h3>
            <p class="mt-3 text-sm leading-6 text-[#6e7c73] dark:text-[#93a399]">Orang tua melihat data anak yang memang mereka perlukan tanpa masuk ke area administrasi sekolah.</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Roles -->
    <section id="peran" class="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div class="mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-[#123d27] px-5 py-12 text-white sm:px-8 sm:py-16 lg:px-12 lg:py-20 dark:bg-[#143421]">
        <div class="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
          <div class="max-w-lg">
            <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#71dfa0]">Akses sesuai peran</p>
            <h2 class="mt-4 text-balance text-[clamp(2rem,4.5vw,3.6rem)] font-semibold leading-[1.03] tracking-[-0.045em]">Satu data sekolah, tampilan yang berbeda untuk setiap tanggung jawab.</h2>
            <p class="mt-5 text-sm leading-6 text-white/65 sm:text-base sm:leading-7">Guru tidak perlu melihat pengaturan admin. Orang tua tidak perlu melihat data sekolah lain. Kepala sekolah membutuhkan ringkasan yang berbeda dari operator. SIGAP memisahkan akses tanpa memisahkan sumber datanya.</p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <article class="role-card">
              <div><p class="text-xs font-extrabold uppercase tracking-[0.12em] text-[#73dda0]">Guru</p><h3 class="mt-1.5 text-lg font-bold">Datang, konfirmasi, mengajar.</h3></div>
              <p class="mt-4 text-sm leading-6 text-white/58">Lihat jadwal, konfirmasi kehadiran, isi jurnal, dan kelola nilai dari alur yang sama.</p>
            </article>
            <article class="role-card">
              <div><p class="text-xs font-extrabold uppercase tracking-[0.12em] text-[#73dda0]">Admin</p><h3 class="mt-1.5 text-lg font-bold">Atur tanpa kehilangan kontrol.</h3></div>
              <p class="mt-4 text-sm leading-6 text-white/58">Kelola struktur sekolah, pengguna, role, jadwal, QR, lokasi, dan data master lainnya.</p>
            </article>
            <article class="role-card">
              <div><p class="text-xs font-extrabold uppercase tracking-[0.12em] text-[#73dda0]">Kepala sekolah</p><h3 class="mt-1.5 text-lg font-bold">Lihat gambaran besar lebih cepat.</h3></div>
              <p class="mt-4 text-sm leading-6 text-white/58">Pantau kehadiran guru, progres nilai, kelengkapan jurnal, dan kondisi kelas secara read-only.</p>
            </article>
            <article class="role-card">
              <div><p class="text-xs font-extrabold uppercase tracking-[0.12em] text-[#73dda0]">Orang tua</p><h3 class="mt-1.5 text-lg font-bold">Informasi anak, tanpa kebisingan.</h3></div>
              <p class="mt-4 text-sm leading-6 text-white/58">Akses ringkasan anak, kehadiran, dan nilai dari portal yang memang dibuat untuk orang tua.</p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <!-- Workflow -->
    <section id="cara-kerja" class="px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
      <div class="mx-auto max-w-7xl">
        <div class="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <div class="lg:sticky lg:top-28 lg:self-start">
            <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#168c4c]">Cara kerja</p>
            <h2 class="mt-4 text-balance text-[clamp(2rem,4.5vw,3.7rem)] font-semibold leading-[1.03] tracking-[-0.045em] text-[#18251d] dark:text-[#edf6ef]">Dari setup sampai dipakai sehari-hari, alurnya tetap jelas.</h2>
            <p class="mt-5 max-w-xl text-base leading-7 text-[#69776f] dark:text-[#97a79c]">SIGAP tidak mengandalkan satu fitur “ajaib”. Nilainya muncul ketika data dasar sekolah tertata lalu digunakan bersama di seluruh aktivitas.</p>
          </div>

          <div class="divide-y divide-[#dfe8e2] border-y border-[#dfe8e2] dark:divide-white/[0.08] dark:border-white/[0.08]">
            {#each steps as step}
              <article class="grid gap-4 py-7 sm:grid-cols-[64px_1fr] sm:py-9">
                <span class="text-sm font-black tracking-[-0.02em] text-[#168c4c]">{step.number}</span>
                <div>
                  <h3 class="text-xl font-bold tracking-[-0.025em] text-[#26362d] dark:text-[#e0ebe3]">{step.title}</h3>
                  <p class="mt-2 max-w-2xl text-sm leading-6 text-[#6d7b72] dark:text-[#92a298]">{step.description}</p>
                </div>
              </article>
            {/each}
          </div>
        </div>
      </div>
    </section>

    <!-- Trust / detail -->
    <section class="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
      <div class="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
        <article class="trust-card">
          <h3 class="text-base font-bold text-[#28382e] dark:text-[#dfe9e2]">Hak akses berbasis peran</h3>
          <p class="mt-2 text-sm leading-6 text-[#718078] dark:text-[#8e9e94]">Setiap pengguna mendapatkan area kerja sesuai tanggung jawab dan izin yang diberikan.</p>
        </article>
        <article class="trust-card">
          <h3 class="text-base font-bold text-[#28382e] dark:text-[#dfe9e2]">Verifikasi lokasi sekolah</h3>
          <p class="mt-2 text-sm leading-6 text-[#718078] dark:text-[#8e9e94]">Lokasi dan radius membantu sekolah memberi konteks pada konfirmasi kehadiran guru.</p>
        </article>
        <article class="trust-card">
          <h3 class="text-base font-bold text-[#28382e] dark:text-[#dfe9e2]">Jejak data yang lebih mudah ditinjau</h3>
          <p class="mt-2 text-sm leading-6 text-[#718078] dark:text-[#8e9e94]">Audit nilai, laporan, dan ringkasan membantu perubahan penting tetap dapat ditelusuri.</p>
        </article>
      </div>
    </section>

    <!-- CTA -->
    <section class="px-4 pb-8 sm:px-6 sm:pb-10 lg:px-8">
      <div class="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-[#cfe4d6] bg-[#eaf7ee] px-5 py-14 sm:px-10 sm:py-16 lg:px-14 dark:border-[#254f37] dark:bg-[#12271a]">
        <div class="relative z-10 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <div class="max-w-3xl">
            <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#168c4c] dark:text-[#67d895]">SIGAP untuk sekolah Anda</p>
            <h2 class="mt-4 text-balance text-[clamp(2.1rem,5vw,4.3rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[#173021] dark:text-[#edf8f0]">Administrasi lebih sedikit. Konteks lebih lengkap.</h2>
            <p class="mt-5 max-w-2xl text-base leading-7 text-[#61736a] dark:text-[#97aa9e]">Masuk untuk melanjutkan ke workspace sekolah Anda. Jika belum memiliki akses, hubungi administrator sekolah untuk mendapatkan akun.</p>
          </div>
          <a
            href={user ? '/dashboard' : '/login'}
            use:inertia
            class="group inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-[#153d28] px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#0f3220] dark:bg-[#64d992] dark:text-[#0c2114] dark:hover:bg-[#75e5a2]"
          >
            {user ? 'Buka dashboard' : 'Masuk sekarang'}
            <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </section>
  </main>

  <footer class="px-4 pb-6 pt-8 sm:px-6 lg:px-8">
    <div class="mx-auto flex max-w-7xl flex-col gap-7 border-t border-[#dfe8e2] py-8 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.08]">
      <div class="flex items-center gap-4">
        <SigapIcon size={28} />
        <span class="hidden h-5 w-px bg-[#d9e3dc] sm:block dark:bg-white/[0.1]"></span>
        <p class="max-w-md text-xs leading-5 text-[#7b8980] dark:text-[#7f9085]">Sistem Informasi Guru, Absensi, dan Prestasi.</p>
      </div>
      <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold text-[#87948c] dark:text-[#77877d]">
        <span>© {year} SIGAP</span>
        <span>MIT License</span>
        <a href="https://github.com/MasRama/nara" target="_blank" rel="noopener noreferrer" class="transition hover:text-[#168c4c]">Built with Nara</a>
      </div>
    </div>
  </footer>
</div>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }

  .landing-shell {
    font-family: 'Public Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .product-glow {
    position: absolute;
    inset: 6% 9% -5%;
    border-radius: 4rem;
    background: rgba(42, 154, 86, 0.14);
    filter: blur(55px);
    pointer-events: none;
  }

  .feature-card {
    border: 1px solid #dfe8e2;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.82);
    padding: 1.5rem;
    box-shadow: 0 8px 30px rgba(25, 68, 43, 0.035);
    transition: border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
  }

  .feature-card:hover {
    transform: translateY(-2px);
    border-color: #c7dbce;
    box-shadow: 0 16px 40px rgba(25, 68, 43, 0.06);
  }

  .role-card {
    display: flex;
    min-height: 250px;
    flex-direction: column;
    border: 1px solid rgba(255, 255, 255, 0.11);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.055);
    padding: 1.4rem;
    backdrop-filter: blur(8px);
  }

  .trust-card {
    border: 1px solid #e0e9e3;
    border-radius: 22px;
    background: #fff;
    padding: 1.4rem;
  }

  :global(.dark) .feature-card {
    border-color: rgba(255, 255, 255, 0.075);
    background: rgba(17, 27, 21, 0.88);
    box-shadow: none;
  }

  :global(.dark) .feature-card:hover {
    border-color: rgba(101, 217, 145, 0.23);
    box-shadow: none;
  }

  :global(.dark) .trust-card {
    border-color: rgba(255, 255, 255, 0.075);
    background: #101914;
  }

  @media (min-width: 640px) {
    .feature-card {
      padding: 1.75rem;
    }

    .role-card,
    .trust-card {
      padding: 1.6rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(html) {
      scroll-behavior: auto;
    }

    .feature-card,
    a {
      transition: none !important;
    }
  }
</style>
