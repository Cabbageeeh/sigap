<script lang="ts">
  import { inertia, router } from '@inertiajs/svelte';
  import Sidebar from '../../Components/Sidebar.svelte';
  import Button from '../../Components/Button.svelte';
  import QrScanner from '../../Components/QrScanner.svelte';
  import { extractQrTokenFromScan } from '$lib/qr';
  import { fly } from 'svelte/transition';

  interface TeacherDailySchedule extends Schedule {
    class_name: string;
    subject_name: string;
  }

  let {
    isTeacher = false,
    confirmedToday = false,
    schedules = [],
  }: {
    isTeacher?: boolean;
    confirmedToday?: boolean;
    schedules?: TeacherDailySchedule[];
  } = $props();

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
  let showScanner = $state(false);
  let scanError = $state<string | null>(null);

  function handleScannedQr(rawText: string): void {
    const token = extractQrTokenFromScan(rawText);
    if (!token) {
      scanError = 'QR tidak dikenali. Pastikan yang dipindai adalah QR absen sekolah.';
      return;
    }
    scanError = null;
    router.visit(`/teacher/confirm?qr_token=${encodeURIComponent(token)}`);
  }
</script>

<Sidebar group="teacher" />

<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased selection:bg-primary/20 selection:text-foreground pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div in:fly={{ y: 20, duration: 700 }}>
    <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Jadwal Hari Ini</p>
    <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground mb-8">Jadwal Mengajar</h1>
  </div>

  {#if !isTeacher}
    <div class="bg-card border border-border rounded-2xl px-6 py-12 text-center">
      <p class="text-sm text-muted-foreground">Halaman ini hanya tersedia untuk guru.</p>
    </div>
  {:else if !confirmedToday}
    <div class="bg-card border border-primary/30 rounded-2xl px-6 py-10 max-w-2xl" in:fly={{ y: 20, duration: 700, delay: 100 }}>
      <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-primary mb-3">Akses terkunci</p>
      <h2 class="font-heading text-xl font-semibold text-foreground">Konfirmasi kehadiran sebelum membuka jadwal.</h2>
      <p class="text-sm text-muted-foreground mt-2 leading-relaxed">Scan QR sekolah sekali setiap hari langsung dari halaman ini. Setelah verifikasi berhasil, daftar kelas dan menu penilaian hari ini akan terbuka.</p>
      <div class="flex flex-wrap gap-2 mt-5">
        <Button onclick={() => { showScanner = !showScanner; scanError = null; }}>
          {showScanner ? 'Tutup pemindai' : 'Scan QR di sini'}
        </Button>
        <a href="/teacher/confirm" use:inertia class="inline-flex">
          <Button variant="outline">Buka halaman konfirmasi</Button>
        </a>
      </div>
      {#if showScanner}
        <div class="mt-5 max-w-md">
          <QrScanner onDetected={handleScannedQr} onError={(message) => scanError = message} />
          {#if scanError}
            <p class="text-sm text-destructive mt-3 leading-relaxed">{scanError}</p>
          {/if}
        </div>
      {/if}
    </div>
  {:else if schedules.length === 0}
    <div class="bg-card border border-border rounded-2xl px-6 py-12 text-center" in:fly={{ y: 20, duration: 700, delay: 100 }}>
      <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-primary mb-3">Kehadiran terverifikasi</p>
      <p class="text-sm text-muted-foreground">Tidak ada jadwal mengajar untuk hari ini.</p>
    </div>
  {:else}
    <div class="mb-5 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4" in:fly={{ y: 20, duration: 700, delay: 100 }}>
      <p class="font-heading font-medium text-foreground">Kehadiran hari ini terverifikasi.</p>
      <p class="text-sm text-muted-foreground mt-1">Pilih kelas dan mapel untuk membuka jurnal atau mencatat nilai.</p>
    </div>

    <div class="bg-card border border-border rounded-2xl overflow-hidden" in:fly={{ y: 20, duration: 700, delay: 150 }}>
      <div class="px-5 py-3 bg-secondary/60 border-b border-border flex items-center justify-between">
        <span class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Kelas · Mapel</span>
        <span class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Akses</span>
      </div>

      <div class="divide-y divide-border">
        {#each schedules as schedule}
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-secondary/30 transition-colors">
            <div class="flex items-center gap-4">
              <span class="w-2 h-2 rounded-full shrink-0 bg-primary"></span>
              <div>
                <p class="font-heading font-medium text-foreground">{schedule.class_name} · {schedule.subject_name}</p>
                <p class="font-mono-accent text-xs text-muted-foreground mt-0.5">{formatTime(schedule.start_time)} – {formatTime(schedule.end_time)}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <a href="/grades?class_id={schedule.class_id}&subject_id={schedule.subject_id}&page=1" use:inertia>
                <Button size="sm">Nilai</Button>
              </a>
              <a href="/journals?schedule_id={schedule.id}" use:inertia>
                <Button variant="outline" size="sm">Jurnal</Button>
              </a>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
