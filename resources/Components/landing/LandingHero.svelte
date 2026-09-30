<script lang="ts">
  import { inertia, page } from '@inertiajs/svelte';
  import {
    ArrowRight,
    BookOpen,
    CalendarDays,
    ChevronRight,
    GraduationCap,
    MapPin,
    ShieldCheck,
    UserCheck,
    Users,
  } from '@lucide/svelte';
  import SigapIcon from '../SigapIcon.svelte';

  interface User {
    id: string;
    name: string | null;
    username: string;
  }

  const user = page.props.user as User | undefined;

  const previewRows = [
    { time: '07:00', teacher: 'Budi Santoso', class: 'X-A · Matematika', status: 'Terverifikasi' },
    { time: '08:30', teacher: 'Siti Rahmawati', class: 'XI-B · Biologi', status: 'Jurnal masuk' },
    { time: '10:00', teacher: 'Ahmad Fauzi', class: 'XII-A · Bahasa Inggris', status: 'Berlangsung' },
  ];
</script>

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
                <div class="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[#746e64] dark:text-[#9b9488]"><GraduationCap class="h-3.5 w-3.5" /> Nilai &amp; rapor</div>
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
                    {#each previewRows as row}
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

<style>
  .product-glow {
    position: absolute;
    inset: 6% 9% -5%;
    border-radius: 4rem;
    background: rgba(180, 135, 47, 0.13);
    filter: blur(55px);
    pointer-events: none;
  }
</style>
