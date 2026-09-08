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

<div class="landing-shell min-h-[100dvh] overflow-x-hidden bg-[#f6f5f1] text-[#202426] transition-colors dark:bg-[#10110f] dark:text-[#f2f1ec]">
  <!-- Navigation -->
  <header class="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
    <nav
      class="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-2xl border border-black/[0.06] bg-white/90 px-4 shadow-[0_8px_30px_rgba(18,46,31,0.06)] backdrop-blur-xl sm:px-5 dark:border-white/[0.08] dark:bg-[#171915]/90 dark:shadow-none"
      aria-label="Navigasi utama"
    >
      <a href="/" use:inertia class="flex items-center gap-3" aria-label="SIGAP Beranda">
        <SigapIcon size={30} />
      </a>

      <div class="hidden items-center gap-7 text-[13px] font-semibold text-[#69645a] lg:flex dark:text-[#a3a6a4]">
        <a href="#platform" class="transition-colors hover:text-[#b9472f] dark:hover:text-[#f29a84]">Platform</a>
        <a href="#fitur" class="transition-colors hover:text-[#b9472f] dark:hover:text-[#f29a84]">Fitur</a>
        <a href="#peran" class="transition-colors hover:text-[#b9472f] dark:hover:text-[#f29a84]">Untuk siapa</a>
        <a href="#cara-kerja" class="transition-colors hover:text-[#b9472f] dark:hover:text-[#f29a84]">Cara kerja</a>
      </div>

      <div class="flex items-center gap-2">
        <DarkModeToggle />
        <div class="hidden items-center gap-2 sm:flex">
          {#if user}
            <a
              href="/dashboard"
              use:inertia
              class="inline-flex h-10 items-center gap-2 rounded-xl bg-[#202426] px-4 text-sm font-semibold text-white transition hover:bg-[#34393b] dark:bg-[#b9472f] dark:hover:bg-[#963822]"
            >
              Dashboard
              <ArrowRight class="h-4 w-4" />
            </a>
          {:else}
            <a
              href="/login"
              use:inertia
              class="inline-flex h-10 items-center rounded-xl px-3.5 text-sm font-semibold text-[#3d3a33] transition hover:bg-[#efeee9] dark:text-[#e5ded0] dark:hover:bg-white/[0.06]"
            >
              Masuk
            </a>
            <a
              href="/login"
              use:inertia
              class="inline-flex h-10 items-center gap-2 rounded-xl bg-[#202426] px-4 text-sm font-semibold text-white transition hover:bg-[#34393b] dark:bg-[#b9472f] dark:hover:bg-[#963822]"
            >
              Mulai gunakan
              <ArrowRight class="h-4 w-4" />
            </a>
          {/if}
        </div>

        <button
          type="button"
          class="grid h-10 w-10 place-items-center rounded-xl text-[#4f4b42] transition hover:bg-[#efeee9] lg:hidden dark:text-[#d8d0c1] dark:hover:bg-white/[0.06]"
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
      <div class="mx-auto mt-2 max-w-7xl rounded-2xl border border-black/[0.06] bg-white p-3 shadow-xl lg:hidden dark:border-white/[0.08] dark:bg-[#171915]">
        <div class="grid gap-1 text-sm font-semibold text-[#565149] dark:text-[#d4ccbe]">
          {#each [
            { href: '#platform', label: 'Platform' },
            { href: '#fitur', label: 'Fitur' },
            { href: '#peran', label: 'Untuk siapa' },
            { href: '#cara-kerja', label: 'Cara kerja' },
          ] as item}
            <a
              href={item.href}
              class="rounded-xl px-3 py-2.5 hover:bg-[#f1f0eb] dark:hover:bg-white/[0.05]"
              onclick={() => (mobileMenuOpen = false)}
            >{item.label}</a>
          {/each}
          <div class="mt-2 border-t border-[#e7ede9] pt-3 dark:border-white/[0.08]">
            <a
              href={user ? '/dashboard' : '/login'}
              use:inertia
              class="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#202426] px-4 text-sm font-semibold text-white dark:bg-[#b9472f]"
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
          <p class="mb-6 text-xs font-bold uppercase tracking-[0.16em] text-[#b9472f] dark:text-[#f29a84]">Operasional sekolah dalam satu alur</p>

          <h1 class="text-balance text-[clamp(2.75rem,7vw,5.8rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-[#202426] dark:text-[#f7f1e5]">
            Sekolah berjalan lebih rapi ketika
            <span class="text-[#b9472f] dark:text-[#ef8b73]"> semua data terhubung.</span>
          </h1>

          <p class="mx-auto mt-7 max-w-2xl text-balance text-base leading-7 text-[#716b61] sm:text-lg sm:leading-8 dark:text-[#a5a8a6]">
            SIGAP menyatukan absensi guru, jurnal mengajar, jadwal, nilai, rapor, dan akses orang tua—tanpa memaksa sekolah bekerja dari banyak sistem yang terpisah.
          </p>

          <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={user ? '/dashboard' : '/login'}
              use:inertia
              class="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#202426] px-6 text-sm font-bold text-white shadow-[0_10px_30px_rgba(32,36,38,0.16)] transition hover:-translate-y-0.5 hover:bg-[#34393b] sm:w-auto dark:bg-[#b9472f] dark:hover:bg-[#963822] dark:shadow-none"
            >
              {user ? 'Buka dashboard' : 'Masuk ke SIGAP'}
              <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#fitur"
              class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#deddd8] bg-white px-6 text-sm font-bold text-[#454139] transition hover:-translate-y-0.5 hover:border-[#d4c5a6] hover:bg-[#fff] sm:w-auto dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-[#e6dfd2] dark:hover:bg-white/[0.07]"
            >
              Lihat kemampuan platform
              <ChevronRight class="h-4 w-4" />
            </a>
          </div>

          <div class="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs font-medium text-[#7c807e] dark:text-[#918a7e]">
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
          <div class="relative overflow-hidden rounded-[28px] border border-black/[0.07] bg-white p-2 shadow-[0_35px_90px_rgba(88,70,35,0.14)] sm:p-3 dark:border-white/[0.09] dark:bg-[#111b15] dark:shadow-[0_35px_90px_rgba(0,0,0,0.35)]">
            <div class="overflow-hidden rounded-[21px] border border-[#e3e2dd] bg-[#f6f5f1] dark:border-white/[0.07] dark:bg-[#121310]">
              <div class="flex h-12 items-center justify-between border-b border-[#e1e9e4] bg-white px-4 sm:px-5 dark:border-white/[0.07] dark:bg-[#1a1c17]">
                <div class="flex items-center gap-3">
                  <SigapIcon size={21} showText={false} />
                  <span class="hidden text-xs font-bold text-[#3b382f] sm:inline dark:text-[#e4ddcf]">Dashboard Sekolah</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="hidden rounded-lg bg-[#f1ece2] px-2.5 py-1 text-[10px] font-semibold text-[#7c756a] sm:inline dark:bg-white/[0.05] dark:text-[#86968c]">TA 2026/2027</span>
                  <span class="grid h-7 w-7 place-items-center rounded-full bg-[#eee3df] text-[10px] font-extrabold text-[#8f3425] dark:bg-[#30231f] dark:text-[#ef8b73]">AD</span>
                </div>
              </div>

              <div class="grid min-h-[520px] lg:grid-cols-[190px_1fr]">
                <aside class="hidden border-r border-[#e1e0db] bg-white px-3 py-5 lg:block dark:border-white/[0.07] dark:bg-[#171915]">
                  <p class="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[#9a9489]">Workspace</p>
                  <div class="space-y-1 text-xs font-semibold">
                    <div class="flex items-center gap-2 rounded-xl bg-[#f1e8e4] px-3 py-2.5 text-[#a6412d] dark:bg-[#2a211f] dark:text-[#ef947d]"><span class="h-1.5 w-1.5 rounded-full bg-current"></span> Ringkasan</div>
                    <div class="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[#746e64] dark:text-[#9b9488]"><CalendarDays class="h-3.5 w-3.5" /> Jadwal</div>
                    <div class="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[#746e64] dark:text-[#9b9488]"><UserCheck class="h-3.5 w-3.5" /> Kehadiran</div>
                    <div class="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[#746e64] dark:text-[#9b9488]"><BookOpen class="h-3.5 w-3.5" /> Jurnal</div>
                    <div class="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[#746e64] dark:text-[#9b9488]"><GraduationCap class="h-3.5 w-3.5" /> Nilai & rapor</div>
                    <div class="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[#746e64] dark:text-[#9b9488]"><Users class="h-3.5 w-3.5" /> Orang tua</div>
                  </div>
                </aside>

                <div class="p-4 sm:p-6 lg:p-7">
                  <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div>
                      <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c908e]">Selasa, 8 September</p>
                      <h2 class="mt-1 text-xl font-bold tracking-[-0.025em] text-[#302d27] sm:text-2xl dark:text-[#eee8db]">Selamat datang, Admin.</h2>
                    </div>
                    <div class="inline-flex items-center gap-2 self-start rounded-xl border border-[#deddd8] bg-white px-3 py-2 text-[11px] font-semibold text-[#6a645a] dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-[#a4a7a5]">
                      <span class="relative flex h-2 w-2">
                        <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#b9472f] opacity-50"></span>
                        <span class="relative inline-flex h-2 w-2 rounded-full bg-[#b9472f]"></span>
                      </span>
                      Data hari ini
                    </div>
                  </div>

                  <div class="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <div class="rounded-2xl border border-[#dddcd7] bg-white p-4 dark:border-white/[0.07] dark:bg-[#1a1c17]">
                      <div class="flex items-center justify-between"><span class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8d918f]">Guru hadir</span><UserCheck class="h-4 w-4 text-[#b9472f]" /></div>
                      <p class="mt-3 text-2xl font-extrabold tracking-tight text-[#2d2a24] dark:text-[#f2ede2]">42<span class="text-sm font-semibold text-[#9f988d]">/45</span></p>
                      <p class="mt-1 text-[10px] font-semibold text-[#b9472f]">93% terverifikasi</p>
                    </div>
                    <div class="rounded-2xl border border-[#dddcd7] bg-white p-4 dark:border-white/[0.07] dark:bg-[#1a1c17]">
                      <div class="flex items-center justify-between"><span class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8d918f]">Jurnal masuk</span><BookOpen class="h-4 w-4 text-[#b9472f]" /></div>
                      <p class="mt-3 text-2xl font-extrabold tracking-tight text-[#2d2a24] dark:text-[#f2ede2]">38</p>
                      <p class="mt-1 text-[10px] font-semibold text-[#79736a] dark:text-[#8d918f]">dari 41 sesi selesai</p>
                    </div>
                    <div class="rounded-2xl border border-[#dddcd7] bg-white p-4 dark:border-white/[0.07] dark:bg-[#1a1c17]">
                      <div class="flex items-center justify-between"><span class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8d918f]">Kelas aktif</span><GraduationCap class="h-4 w-4 text-[#b9472f]" /></div>
                      <p class="mt-3 text-2xl font-extrabold tracking-tight text-[#2d2a24] dark:text-[#f2ede2]">18</p>
                      <p class="mt-1 text-[10px] font-semibold text-[#79736a] dark:text-[#8d918f]">6 tingkat berjalan</p>
                    </div>
                    <div class="rounded-2xl border border-[#dddcd7] bg-white p-4 dark:border-white/[0.07] dark:bg-[#1a1c17]">
                      <div class="flex items-center justify-between"><span class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8d918f]">Alert lokasi</span><MapPin class="h-4 w-4 text-amber-500" /></div>
                      <p class="mt-3 text-2xl font-extrabold tracking-tight text-[#2d2a24] dark:text-[#f2ede2]">2</p>
                      <p class="mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">perlu ditinjau</p>
                    </div>
                  </div>

                  <div class="mt-3 grid gap-3 xl:grid-cols-[1.25fr_.75fr]">
                    <div class="rounded-2xl border border-[#dddcd7] bg-white p-4 sm:p-5 dark:border-white/[0.07] dark:bg-[#1a1c17]">
                      <div class="flex items-center justify-between">
                        <div>
                          <p class="text-sm font-bold text-[#3a3d3e] dark:text-[#dddcd7]">Aktivitas mengajar hari ini</p>
                          <p class="mt-0.5 text-[10px] text-[#8c908e]">Sesi terbaru dari jadwal sekolah</p>
                        </div>
                        <span class="rounded-lg bg-[#f1e8e4] px-2 py-1 text-[9px] font-bold text-[#b9472f] dark:bg-[#2a211f] dark:text-[#ef947d]">LIVE</span>
                      </div>
                      <div class="mt-4 space-y-2.5">
                        {#each [
                          { time: '07:00', teacher: 'Budi Santoso', class: 'X-A · Matematika', status: 'Terverifikasi' },
                          { time: '08:30', teacher: 'Siti Rahmawati', class: 'XI-B · Biologi', status: 'Jurnal masuk' },
                          { time: '10:00', teacher: 'Ahmad Fauzi', class: 'XII-A · Bahasa Inggris', status: 'Berlangsung' },
                        ] as row}
                          <div class="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-xl bg-[#f6f5f1] px-3 py-2.5 dark:bg-white/[0.035]">
                            <span class="text-[10px] font-bold text-[#8c857b]">{row.time}</span>
                            <div class="min-w-0">
                              <p class="truncate text-[11px] font-bold text-[#3b3730] dark:text-[#ddd6c8]">{row.teacher}</p>
                              <p class="mt-0.5 truncate text-[9px] text-[#938c82]">{row.class}</p>
                            </div>
                            <span class="hidden rounded-lg bg-white px-2 py-1 text-[9px] font-bold text-[#b9472f] shadow-sm sm:inline dark:bg-[#241a1c] dark:text-[#ef947d]">{row.status}</span>
                          </div>
                        {/each}
                      </div>
                    </div>

                    <div class="rounded-2xl border border-[#dddcd7] bg-[#202426] p-5 text-white dark:border-[#4a4f51] dark:bg-[#191d1f]">
                      <div class="flex items-center justify-between">
                        <div class="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><ShieldCheck class="h-4 w-4" /></div>
                        <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-white/45">Verifikasi</span>
                      </div>
                      <p class="mt-7 text-lg font-bold tracking-[-0.02em]">Kehadiran yang punya konteks, bukan sekadar tombol hadir.</p>
                      <p class="mt-2 text-xs leading-5 text-white/65">Lokasi sekolah, radius, jadwal, dan identitas guru menjadi bagian dari proses verifikasi.</p>
                      <div class="mt-6 space-y-2.5 text-[10px] font-semibold text-white/80">
                        <div class="flex items-center justify-between border-b border-white/10 pb-2.5"><span>Geolokasi</span><span class="text-[#ef8b73]">Aktif</span></div>
                        <div class="flex items-center justify-between border-b border-white/10 pb-2.5"><span>Radius sekolah</span><span>200 m</span></div>
                        <div class="flex items-center justify-between"><span>Audit aktivitas</span><span class="text-[#ef8b73]">Tercatat</span></div>
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
    <section class="border-y border-[#e3e2dd] bg-white py-6 dark:border-white/[0.07] dark:bg-[#0d1510]">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-4 px-6 lg:justify-between">
        <span class="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9a9388]">Terhubung dalam SIGAP</span>
        {#each modules as module}
          <span class="text-xs font-bold text-[#625d54] dark:text-[#aaa295]">{module}</span>
        {/each}
      </div>
    </section>

    <!-- Features -->
    <section id="fitur" class="px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
      <div class="mx-auto max-w-7xl">
        <div class="max-w-3xl">
          <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#b9472f]">Fitur utama</p>
          <h2 class="mt-4 text-balance text-[clamp(2rem,5vw,3.8rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-[#292d2f] dark:text-[#efeee9]">Dibangun mengikuti ritme sekolah sehari-hari.</h2>
          <p class="mt-5 max-w-2xl text-base leading-7 text-[#746e64] dark:text-[#a39b8e]">Bukan kumpulan fitur yang berdiri sendiri. Data dari jadwal, guru, kelas, kehadiran, dan nilai saling mengisi sehingga pekerjaan administrasi tidak berulang.</p>
        </div>

        <div class="mt-12 grid gap-4 lg:grid-cols-12">
          <article class="feature-card lg:col-span-7 lg:min-h-[430px]">
            <div class="flex h-full flex-col">
              <div class="max-w-xl">
                <p class="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#b9472f] dark:text-[#ef8b73]">Absensi & verifikasi</p>
                <h3 class="text-2xl font-bold tracking-[-0.03em] text-[#2b2f31] sm:text-3xl dark:text-[#eee7da]">Absensi guru yang memahami lokasi dan jadwal.</h3>
                <p class="mt-3 text-sm leading-6 text-[#777b7a] dark:text-[#9da09e]">Konfirmasi kehadiran dapat dikaitkan dengan lokasi sekolah, radius, dan sesi mengajar. Data anomali tetap terlihat untuk ditinjau, bukan hilang di balik rekap.</p>
              </div>
              <div class="mt-auto pt-8">
                <div class="rounded-2xl border border-[#e6dfd2] bg-[#f8f4eb] p-4 dark:border-white/[0.07] dark:bg-white/[0.035]">
                  <div class="grid gap-2 sm:grid-cols-3">
                    {#each [
                      { label: 'Lokasi', value: 'Main Campus' },
                      { label: 'Radius', value: '200 meter' },
                      { label: 'Status', value: 'Terverifikasi' },
                    ] as item}
                      <div class="rounded-xl bg-white px-3 py-3 dark:bg-[#22231e]">
                        <p class="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9d968b]">{item.label}</p>
                        <p class="mt-1 text-xs font-extrabold text-[#454038] dark:text-[#e0d8ca]">{item.value}</p>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article class="feature-card lg:col-span-5">
            <p class="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#b9472f] dark:text-[#ef8b73]">Jurnal</p>
            <h3 class="mt-3 text-xl font-bold tracking-[-0.025em] text-[#2b2f31] dark:text-[#eee7da]">Jurnal mengajar tanpa input berulang.</h3>
            <p class="mt-3 text-sm leading-6 text-[#777b7a] dark:text-[#9da09e]">Jadwal membantu memberi konteks kelas dan mata pelajaran, sehingga jurnal tersusun lebih konsisten dan mudah direkap.</p>
            <div class="mt-7 space-y-2">
              {#each ['Kelas X-A · Matematika', 'Materi: Sistem Persamaan Linear', 'Kehadiran siswa: 31/32'] as text, i}
                <div class="flex items-center gap-3 rounded-xl border border-[#e3e2dd] bg-[#fff] px-3 py-2.5 text-[11px] font-semibold text-[#6f685f] dark:border-white/[0.06] dark:bg-white/[0.025] dark:text-[#a79f92]">
                  <span class="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[#eee5e2] text-[9px] font-extrabold text-[#b9472f] dark:bg-[#2d1d21]">{i + 1}</span>{text}
                </div>
              {/each}
            </div>
          </article>

          <article class="feature-card lg:col-span-4">
            <p class="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#b9472f] dark:text-[#ef8b73]">Akademik</p>
            <h3 class="mt-3 text-xl font-bold tracking-[-0.025em] text-[#2b2f31] dark:text-[#eee7da]">Nilai, audit, dan rapor.</h3>
            <p class="mt-3 text-sm leading-6 text-[#777b7a] dark:text-[#9da09e]">Kelola komponen nilai, lihat perubahan, lalu susun informasi akademik dari sumber data yang sama.</p>
          </article>

          <article class="feature-card lg:col-span-4">
            <p class="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#b9472f] dark:text-[#ef8b73]">Jadwal</p>
            <h3 class="mt-3 text-xl font-bold tracking-[-0.025em] text-[#2b2f31] dark:text-[#eee7da]">Jadwal sebagai fondasi alur kerja.</h3>
            <p class="mt-3 text-sm leading-6 text-[#777b7a] dark:text-[#9da09e]">Kelas, guru, mata pelajaran, dan sesi mengajar terhubung agar konteks tidak perlu diketik ulang di tiap modul.</p>
          </article>

          <article class="feature-card lg:col-span-4">
            <p class="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#b9472f] dark:text-[#ef8b73]">Orang tua</p>
            <h3 class="mt-3 text-xl font-bold tracking-[-0.025em] text-[#2b2f31] dark:text-[#eee7da]">Portal orang tua yang relevan.</h3>
            <p class="mt-3 text-sm leading-6 text-[#777b7a] dark:text-[#9da09e]">Orang tua melihat data anak yang memang mereka perlukan tanpa masuk ke area administrasi sekolah.</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Roles -->
    <section id="peran" class="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div class="mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-[#202426] px-5 py-12 text-white sm:px-8 sm:py-16 lg:px-12 lg:py-20 dark:bg-[#171a1c]">
        <div class="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
          <div class="max-w-lg">
            <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ef8b73]">Akses sesuai peran</p>
            <h2 class="mt-4 text-balance text-[clamp(2rem,4.5vw,3.6rem)] font-semibold leading-[1.03] tracking-[-0.045em]">Satu data sekolah, tampilan yang berbeda untuk setiap tanggung jawab.</h2>
            <p class="mt-5 text-sm leading-6 text-white/65 sm:text-base sm:leading-7">Guru tidak perlu melihat pengaturan admin. Orang tua tidak perlu melihat data sekolah lain. Kepala sekolah membutuhkan ringkasan yang berbeda dari operator. SIGAP memisahkan akses tanpa memisahkan sumber datanya.</p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <article class="role-card">
              <div><p class="text-xs font-extrabold uppercase tracking-[0.12em] text-[#ef8b73]">Guru</p><h3 class="mt-1.5 text-lg font-bold">Datang, konfirmasi, mengajar.</h3></div>
              <p class="mt-4 text-sm leading-6 text-white/58">Lihat jadwal, konfirmasi kehadiran, isi jurnal, dan kelola nilai dari alur yang sama.</p>
            </article>
            <article class="role-card">
              <div><p class="text-xs font-extrabold uppercase tracking-[0.12em] text-[#ef8b73]">Admin</p><h3 class="mt-1.5 text-lg font-bold">Atur tanpa kehilangan kontrol.</h3></div>
              <p class="mt-4 text-sm leading-6 text-white/58">Kelola struktur sekolah, pengguna, role, jadwal, QR, lokasi, dan data master lainnya.</p>
            </article>
            <article class="role-card">
              <div><p class="text-xs font-extrabold uppercase tracking-[0.12em] text-[#ef8b73]">Kepala sekolah</p><h3 class="mt-1.5 text-lg font-bold">Lihat gambaran besar lebih cepat.</h3></div>
              <p class="mt-4 text-sm leading-6 text-white/58">Pantau kehadiran guru, progres nilai, kelengkapan jurnal, dan kondisi kelas secara read-only.</p>
            </article>
            <article class="role-card">
              <div><p class="text-xs font-extrabold uppercase tracking-[0.12em] text-[#ef8b73]">Orang tua</p><h3 class="mt-1.5 text-lg font-bold">Informasi anak, tanpa kebisingan.</h3></div>
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
            <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#b9472f]">Cara kerja</p>
            <h2 class="mt-4 text-balance text-[clamp(2rem,4.5vw,3.7rem)] font-semibold leading-[1.03] tracking-[-0.045em] text-[#292d2f] dark:text-[#efeee9]">Dari setup sampai dipakai sehari-hari, alurnya tetap jelas.</h2>
            <p class="mt-5 max-w-xl text-base leading-7 text-[#756e64] dark:text-[#a39b8e]">SIGAP tidak mengandalkan satu fitur “ajaib”. Nilainya muncul ketika data dasar sekolah tertata lalu digunakan bersama di seluruh aktivitas.</p>
          </div>

          <div class="divide-y divide-[#e6dfd2] border-y border-[#e6dfd2] dark:divide-white/[0.08] dark:border-white/[0.08]">
            {#each steps as step}
              <article class="grid gap-4 py-7 sm:grid-cols-[64px_1fr] sm:py-9">
                <span class="text-sm font-black tracking-[-0.02em] text-[#b9472f]">{step.number}</span>
                <div>
                  <h3 class="text-xl font-bold tracking-[-0.025em] text-[#3a3d3e] dark:text-[#e0ebe3]">{step.title}</h3>
                  <p class="mt-2 max-w-2xl text-sm leading-6 text-[#787168] dark:text-[#9f978b]">{step.description}</p>
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
          <h3 class="text-base font-bold text-[#363a3b] dark:text-[#e6dfd2]">Hak akses berbasis peran</h3>
          <p class="mt-2 text-sm leading-6 text-[#7c756a] dark:text-[#9c9488]">Setiap pengguna mendapatkan area kerja sesuai tanggung jawab dan izin yang diberikan.</p>
        </article>
        <article class="trust-card">
          <h3 class="text-base font-bold text-[#363a3b] dark:text-[#e6dfd2]">Verifikasi lokasi sekolah</h3>
          <p class="mt-2 text-sm leading-6 text-[#7c756a] dark:text-[#9c9488]">Lokasi dan radius membantu sekolah memberi konteks pada konfirmasi kehadiran guru.</p>
        </article>
        <article class="trust-card">
          <h3 class="text-base font-bold text-[#363a3b] dark:text-[#e6dfd2]">Jejak data yang lebih mudah ditinjau</h3>
          <p class="mt-2 text-sm leading-6 text-[#7c756a] dark:text-[#9c9488]">Audit nilai, laporan, dan ringkasan membantu perubahan penting tetap dapat ditelusuri.</p>
        </article>
      </div>
    </section>

    <!-- CTA -->
    <section class="px-4 pb-8 sm:px-6 sm:pb-10 lg:px-8">
      <div class="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-[#dfd8d3] bg-[#efede9] px-5 py-14 sm:px-10 sm:py-16 lg:px-14 dark:border-[#4c4128] dark:bg-[#211f18]">
        <div class="relative z-10 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <div class="max-w-3xl">
            <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#b9472f] dark:text-[#ef8b73]">SIGAP untuk sekolah Anda</p>
            <h2 class="mt-4 text-balance text-[clamp(2.1rem,5vw,4.3rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[#292d2f] dark:text-[#f5efe2]">Administrasi lebih sedikit. Konteks lebih lengkap.</h2>
            <p class="mt-5 max-w-2xl text-base leading-7 text-[#716a60] dark:text-[#a39b8f]">Masuk untuk melanjutkan ke workspace sekolah Anda. Jika belum memiliki akses, hubungi administrator sekolah untuk mendapatkan akun.</p>
          </div>
          <a
            href={user ? '/dashboard' : '/login'}
            use:inertia
            class="group inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-[#202426] px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#34393b] dark:bg-[#ef8b73] dark:text-[#241d1b] dark:hover:bg-[#f2a18d]"
          >
            {user ? 'Buka dashboard' : 'Masuk sekarang'}
            <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </section>
  </main>

  <footer class="px-4 pb-6 pt-8 sm:px-6 lg:px-8">
    <div class="mx-auto flex max-w-7xl flex-col gap-7 border-t border-[#e6dfd2] py-8 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.08]">
      <div class="flex items-center gap-4">
        <SigapIcon size={28} />
        <span class="hidden h-5 w-px bg-[#e2dacd] sm:block dark:bg-white/[0.1]"></span>
        <p class="max-w-md text-xs leading-5 text-[#7c807e] dark:text-[#918a7f]">Sistem Informasi Guru, Absensi, dan Prestasi.</p>
      </div>
      <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold text-[#8e877d] dark:text-[#898277]">
        <span>© {year} SIGAP</span>
        <span>MIT License</span>
        <a href="https://github.com/MasRama/nara" target="_blank" rel="noopener noreferrer" class="transition hover:text-[#b9472f]">Built with Nara</a>
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
    background: rgba(180, 135, 47, 0.13);
    filter: blur(55px);
    pointer-events: none;
  }

  .feature-card {
    border: 1px solid #e6dfd2;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.82);
    padding: 1.5rem;
    box-shadow: 0 8px 30px rgba(66, 52, 26, 0.035);
    transition: border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
  }

  .feature-card:hover {
    transform: translateY(-2px);
    border-color: #d6c6a4;
    box-shadow: 0 16px 40px rgba(66, 52, 26, 0.06);
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
    border: 1px solid #dddcd7;
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
