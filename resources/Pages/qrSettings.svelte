<script lang="ts">
  import { inertia } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import Sidebar from '../Components/Sidebar.svelte';
  import Button from '../Components/Button.svelte';
  import Input from '../Components/Input.svelte';
  import Label from '../Components/Label.svelte';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import { ArrowRight, Loader2, Timer, MonitorPlay } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { permissions = { canEdit: false }, qrRefreshInterval = 5, schoolName = null }: { permissions?: { canEdit: boolean }; qrRefreshInterval?: number; schoolName?: string | null } = $props();

  let interval = $state(qrRefreshInterval);
  let isSaving = $state(false);

  $effect(() => { interval = qrRefreshInterval; });

  async function save(): Promise<void> {
    isSaving = true;
    const result = await api(() => axios.post('/qr-settings', { qr_refresh_interval: interval }));
    isSaving = false;
    if (result.success) {
      // stay on page; interval already persisted server-side
    }
  }
</script>

<Sidebar group="qr-settings" />

<PageShell>
  <PageHeader eyebrow="Pengaturan Absen" title="Pengaturan QR Absen." description="Atur interval refresh QR code untuk absen guru harian. QR code berputar setiap {interval} menit untuk mencegah penyalinan kode." />

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6" in:fly={{ y: 20, duration: 700, delay: 100 }}>
    <!-- Settings card -->
    <div class="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none p-6 sm:p-7">
      <div class="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/[0.03] to-transparent dark:from-white/[0.03]"></div>
      <div class="relative flex items-center gap-3 mb-6">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><Timer class="h-4.5 w-4.5 text-primary" /></span>
        <div>
          <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Interval Refresh</p>
          <h3 class="font-heading text-xl font-semibold tracking-[-0.02em]">Rotasi Kode QR</h3>
        </div>
      </div>
      <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); if (permissions.canEdit) save(); }}>
        <div class="flex flex-col gap-2">
          <Label for="interval" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground">Interval (menit)</Label>
          <Input id="interval" type="number" min="1" max="1440" bind:value={interval} disabled={!permissions.canEdit} class="h-11" />
          <p class="text-[11px] text-muted-foreground">Rentang 1–1440 menit. Default 5 menit.</p>
        </div>
        {#if permissions.canEdit}
          <div class="flex justify-end pt-2 border-t border-border">
            <Button type="submit" disabled={isSaving || interval === qrRefreshInterval}>
              {#if isSaving}<Loader2 class="w-4 h-4 animate-spin" />{/if}
              Simpan Pengaturan
            </Button>
          </div>
        {/if}
      </form>
    </div>

    <!-- Display link card -->
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
          <a href="/qr-display" use:inertia class="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
            Buka Layar QR Absen <ArrowRight class="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  </div>
</PageShell>
