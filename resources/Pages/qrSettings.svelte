<script lang="ts">
  import { inertia } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import Sidebar from '../Components/Sidebar.svelte';
  import Button from '../Components/Button.svelte';
  import Input from '../Components/Input.svelte';
  import Label from '../Components/Label.svelte';
  import { ArrowRight, Loader2 } from '@lucide/svelte';
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

<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div in:fly={{ y: 20, duration: 700 }}>
    <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Pengaturan Absen</p>
    <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground mb-2">Pengaturan QR Absen</h1>
    <p class="text-sm text-muted-foreground max-w-[52ch]">
      Atur interval refresh QR code untuk absen guru harian. QR code berputar setiap {interval} menit untuk mencegah penyalinan kode.
    </p>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10" in:fly={{ y: 20, duration: 700, delay: 100 }}>
    <!-- Settings card -->
    <div class="bg-card border border-border rounded-2xl overflow-hidden">
      <div class="px-5 py-3 bg-secondary/60 border-b border-border">
        <span class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Interval Refresh</span>
      </div>
      <div class="p-5">
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
    </div>

    <!-- Display link card -->
    <div class="bg-card border border-border rounded-2xl overflow-hidden">
      <div class="px-5 py-3 bg-secondary/60 border-b border-border">
        <span class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Layar QR Absen</span>
      </div>
      <div class="p-5 flex flex-col gap-4">
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
</div>
