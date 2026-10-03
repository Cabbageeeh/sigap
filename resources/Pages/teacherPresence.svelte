<script lang="ts">
  import { inertia, router } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import Sidebar from '../Components/Sidebar.svelte';
  import Button from '../Components/Button.svelte';
  import Input from '../Components/Input.svelte';
  import Label from '../Components/Label.svelte';
  import Switch from '../Components/Switch.svelte';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import { ArrowRight, Loader2, Timer, MonitorPlay, UserCheck, QrCode } from '@lucide/svelte';
  import { fly } from 'svelte/transition';
  import type { TeacherPresenceMode } from '../types';

  let {
    permissions = { canEdit: false },
    mode = 'qr' as TeacherPresenceMode,
    qrRefreshInterval = 5,
    schoolName = null,
  }: {
    permissions?: { canEdit: boolean };
    mode?: TeacherPresenceMode;
    qrRefreshInterval?: number;
    schoolName?: string | null;
  } = $props();

  let presenceOn = $state(mode === 'qr');
  let interval = $state(qrRefreshInterval);
  let isSavingMode = $state(false);
  let isSavingInterval = $state(false);

  $effect(() => { presenceOn = mode === 'qr'; interval = qrRefreshInterval; });

  async function postSettings(nextMode: boolean, nextInterval: number): Promise<boolean> {
    const result = await api(() => axios.post('/teacher-presence', {
      mode: nextMode ? 'qr' : 'off',
      qr_refresh_interval: nextInterval,
    }), { showSuccessToast: false });
    return result.success;
  }

  // The switch is the school-wide gate, so it commits on click rather than
  // waiting for a form button that lives in another card.
  async function saveMode(next: boolean): Promise<void> {
    presenceOn = next;
    isSavingMode = true;
    const ok = await postSettings(next, interval);
    isSavingMode = false;
    if (!ok) { presenceOn = !next; return; }
    router.visit('/teacher-presence', { preserveScroll: true });
  }

  async function saveInterval(): Promise<void> {
    isSavingInterval = true;
    await postSettings(presenceOn, interval);
    isSavingInterval = false;
  }
</script>

<Sidebar group="teacher-presence" />

<PageShell>
  <PageHeader eyebrow="Pengaturan" title="Kehadiran Guru." description="Tentukan apakah guru mencatat kehadiran lewat QR di sekolah ini. Jurnal mengajar, absensi siswa, dan nilai tetap berjalan apa pun pilihan Anda." />

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6" in:fly={{ y: 20, duration: 700, delay: 100 }}>
    <!-- Presence method card -->
    <div class="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none p-6 sm:p-7">
      <div class="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/[0.03] to-transparent dark:from-white/[0.03]"></div>
      <div class="relative flex items-center gap-3 mb-6">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><UserCheck class="h-4.5 w-4.5 text-primary" /></span>
        <div>
          <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Metode Kehadiran</p>
          <h3 class="font-heading text-xl font-semibold tracking-[-0.02em]">Absensi QR Sekolah</h3>
        </div>
      </div>
      <div class="flex flex-col gap-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-medium text-foreground">Guru scan QR saat datang</p>
            <p class="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Sekolah menampilkan kode QR yang berganti berkala. Guru memindainya sebagai bukti kehadiran.
            </p>
          </div>
          <Switch checked={presenceOn} disabled={!permissions.canEdit || isSavingMode} onCheckedChange={saveMode} />
        </div>
        <p class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {#if isSavingMode}<Loader2 class="w-3 h-3 animate-spin" /> Menyimpan…{:else}Sakelar ini tersimpan otomatis.{/if}
        </p>

        {#if presenceOn}
          <p class="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-4">
            Jurnal mengajar dan input nilai hanya terbuka bagi guru yang sudah tercatat hadir pada hari itu.
          </p>
        {:else}
          <div class="rounded-xl border border-warning-500/30 bg-warning-500/10 p-4">
            <p class="text-sm font-medium text-foreground">Absensi guru tidak dicatat di SIGAP</p>
            <p class="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Guru dapat langsung mengisi jurnal mengajar dan nilai tanpa konfirmasi kehadiran. Menu absensi, layar QR, dan laporan kehadiran guru disembunyikan. Data kehadiran yang sudah tersimpan tetap aman dan akan muncul kembali jika fitur ini diaktifkan lagi.
            </p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Rotation card -->
    <div class="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none p-6 sm:p-7 transition-opacity {presenceOn ? '' : 'opacity-50'}">
      <div class="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/[0.03] to-transparent dark:from-white/[0.03]"></div>
      <div class="relative flex items-center gap-3 mb-6">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><Timer class="h-4.5 w-4.5 text-primary" /></span>
        <div>
          <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Interval Refresh</p>
          <h3 class="font-heading text-xl font-semibold tracking-[-0.02em]">Rotasi Kode QR</h3>
        </div>
      </div>
      <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); if (permissions.canEdit) saveInterval(); }}>
        <div class="flex flex-col gap-2">
          <Label for="interval" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground">Interval (menit)</Label>
          <Input id="interval" type="number" min="1" max="1440" bind:value={interval} disabled={!permissions.canEdit || !presenceOn} class="h-11" />
          <p class="text-[11px] text-muted-foreground">Rentang 1–1440 menit. Default 5 menit. QR berputar untuk mencegah kode difoto lalu dipakai orang lain.</p>
        </div>
        {#if permissions.canEdit}
          <div class="flex justify-end pt-2 border-t border-border">
            <Button type="submit" disabled={isSavingInterval || interval === qrRefreshInterval}>
              {#if isSavingInterval}<Loader2 class="w-4 h-4 animate-spin" />{/if}
              Simpan Interval
            </Button>
          </div>
        {/if}
      </form>
    </div>

    <!-- Display link card -->
    {#if presenceOn}
      <div class="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none p-6 sm:p-7">
        <div class="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/[0.03] to-transparent dark:from-white/[0.03]"></div>
        <div class="relative flex items-center gap-3 mb-6">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><MonitorPlay class="h-4.5 w-4.5 text-primary" /></span>
          <div>
            <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Layar QR Absen</p>
            <h3 class="font-heading text-xl font-semibold tracking-[-0.02em]">Tampilan Layar</h3>
          </div>
        </div>
        <div class="flex flex-col gap-4">
          <p class="text-sm text-muted-foreground leading-relaxed">
            Buka halaman layar QR untuk ditampilkan di TV atau proyektor di area guru. QR code akan otomatis berputar setiap {interval} menit.
          </p>
          {#if schoolName}
            <p class="text-xs text-muted-foreground font-mono-accent">Sekolah: {schoolName}</p>
          {/if}
          <div class="pt-2 border-t border-border">
            <a href="/qr-display" use:inertia class="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-heading font-semibold text-foreground transition-colors hover:bg-secondary">
              Buka Layar QR Absen <ArrowRight class="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    {:else}
      <div class="relative overflow-hidden rounded-2xl border border-dashed border-border bg-card p-6 sm:p-7">
        <div class="flex items-center gap-3 mb-4">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-muted"><QrCode class="h-4.5 w-4.5 text-muted-foreground" /></span>
          <div>
            <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Layar QR Absen</p>
            <h3 class="font-heading text-xl font-semibold tracking-[-0.02em] text-muted-foreground">Tidak Digunakan</h3>
          </div>
        </div>
        <p class="text-sm text-muted-foreground leading-relaxed">
          Halaman layar QR tidak ditampilkan selama absensi guru dinonaktifkan.
        </p>
      </div>
    {/if}
  </div>
</PageShell>
