<script lang="ts">
  import { inertia, router } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import { extractQrTokenFromScan } from '$lib/qr';
  import Sidebar from '../../Components/Sidebar.svelte';
  import Button from '../../Components/Button.svelte';
  import QrScanner from '../../Components/QrScanner.svelte';
  import { fly } from 'svelte/transition';
  let {
    scheduleId: initialScheduleId = null,
    qrToken: initialQrToken = null,
    qrTokenValid = false,
    qrTokenExpired = false,
    alreadyConfirmed = false,
    geofenceRequired = false,
  }: {
    scheduleId?: string | null;
    qrToken?: string | null;
    qrTokenValid?: boolean;
    qrTokenExpired?: boolean;
    alreadyConfirmed?: boolean;
    geofenceRequired?: boolean;
  } = $props();

  let scheduleId = $state(initialScheduleId ?? '');
  $effect(() => {
    scheduleId = initialScheduleId ?? '';
  });

  let coords = $state<{ latitude: number; longitude: number } | null>(null);
  let geoError = $state<string | null>(null);
  let geoRequested = $state(false);
  let isLoading = $state(false);
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

  function requestLocation(): void {
    if (!navigator.geolocation) {
      geoError = 'Perangkat tidak mendukung geolokasi.';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        geoError = null;
      },
      () => {
        geoError = 'Lokasi tidak didapatkan. Pastikan GPS aktif dan izin lokasi diizinkan, lalu perbarui lokasi.';
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  $effect(() => {
    if (qrTokenValid && !alreadyConfirmed && !coords && !geoRequested) {
      geoRequested = true;
      requestLocation();
    }
  });

  async function submit(): Promise<void> {
    if (!initialQrToken || !qrTokenValid) { geoError = 'Silakan scan QR absen sekolah yang masih berlaku'; return; }
    if (geofenceRequired && !coords) { geoError = 'Silakan bagikan lokasi Anda'; return; }
    isLoading = true;
    const payload = {
      qr_token: initialQrToken,
      ...(scheduleId ? { schedule_id: scheduleId } : {}),
      ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
    };
    const result = await api(() => axios.post('/teacher/confirmations', payload));
    isLoading = false;
    if (result.success) router.visit('/teacher/schedule', { preserveScroll: true });
  }
</script>

<Sidebar group="teacher-confirm" />

<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased selection:bg-primary/20 selection:text-foreground pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div in:fly={{ y: 20, duration: 700 }}>
    <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Verifikasi Kehadiran</p>
    <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground mb-2">Konfirmasi Kehadiran</h1>
    <p class="text-sm text-muted-foreground mb-8">Scan QR sekolah sekali setiap hari untuk mencatat kehadiran.</p>
  </div>

  {#if alreadyConfirmed}
    <div class="bg-card border border-primary/30 rounded-2xl p-6 max-w-2xl" in:fly={{ y: 20, duration: 700, delay: 100 }}>
      <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-primary mb-3">Sudah terverifikasi</p>
      <h2 class="font-heading text-xl font-semibold text-foreground">Kehadiran hari ini sudah tercatat.</h2>
      <p class="text-sm text-muted-foreground mt-2">Buka jadwal untuk melihat kelas dan mapel yang Anda ajar hari ini.</p>
      <a href="/teacher/schedule" use:inertia class="inline-flex mt-5">
        <Button>Lihat Jadwal Hari Ini</Button>
      </a>
    </div>
  {:else if !qrTokenValid}
    <div class="bg-card border border-border rounded-2xl overflow-hidden max-w-2xl" in:fly={{ y: 20, duration: 700, delay: 100 }}>
      <div class="px-5 py-3 bg-secondary/60 border-b border-border">
        <span class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Scan QR Absen</span>
      </div>
      <div class="p-5">
        <h2 class="font-heading text-xl font-semibold text-foreground">
          {qrTokenExpired ? 'QR absen sudah kedaluwarsa.' : 'Scan QR absen sekolah.'}
        </h2>
        <p class="text-sm text-muted-foreground mt-2">Arahkan kamera ke QR yang ditampilkan sekolah. Pemindaian berjalan langsung di halaman ini, tidak perlu aplikasi kamera lain.</p>
        <div class="mt-4 max-w-md">
          <QrScanner onDetected={handleScannedQr} onError={(message) => scanError = message} />
        </div>
        {#if scanError}
          <div class="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-start gap-3 mt-4">
            <span class="w-2 h-2 rounded-full bg-destructive shrink-0 mt-1.5"></span>
            <span class="text-sm text-destructive leading-relaxed">{scanError}</span>
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="mb-6 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4" in:fly={{ y: 20, duration: 700, delay: 100 }}>
      <p class="font-heading font-medium text-foreground">QR absen valid</p>
      <p class="text-sm text-muted-foreground mt-1">Satu langkah lagi: pastikan lokasi aktif, lalu kirim konfirmasi.</p>
    </div>

    <div class="bg-card border border-border rounded-2xl overflow-hidden max-w-2xl" in:fly={{ y: 20, duration: 700, delay: 150 }}>
      <div class="px-5 py-3 bg-secondary/60 border-b border-border flex items-center justify-between">
        <span class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Lokasi Anda</span>
        {#if coords}
          <span class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-primary"></span>
            <span class="font-mono-accent text-[10px] uppercase tracking-[0.15em] text-primary">Aktif</span>
          </span>
        {/if}
      </div>
      <div class="p-5">
        {#if coords}
          <dl class="flex flex-col gap-2 font-mono-accent text-xs">
            <div class="flex justify-between border-b border-border/60 pb-2">
              <dt class="text-muted-foreground">Latitude</dt>
              <dd class="text-foreground">{coords.latitude.toFixed(6)}°</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted-foreground">Longitude</dt>
              <dd class="text-foreground">{coords.longitude.toFixed(6)}°</dd>
            </div>
          </dl>
        {:else}
          <p class="text-sm text-muted-foreground">Menunggu izin lokasi...</p>
        {/if}
        <div class="flex flex-wrap items-center gap-2 mt-4">
          <Button onclick={submit} disabled={isLoading || (geofenceRequired && !coords)} size="lg">
            {isLoading ? 'Memproses...' : 'Kirim Konfirmasi'}
          </Button>
          <Button variant="outline" onclick={requestLocation}>Perbarui lokasi</Button>
        </div>
        {#if geoError}
          <div class="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-start gap-3 mt-4">
            <span class="w-2 h-2 rounded-full bg-destructive shrink-0 mt-1.5"></span>
            <span class="text-sm text-destructive leading-relaxed">{geoError}</span>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
