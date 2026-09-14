<script lang="ts">
  import { router } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import Sidebar from '../Components/Sidebar.svelte';
  import Button from '../Components/Button.svelte';
  import Input from '../Components/Input.svelte';
  import Label from '../Components/Label.svelte';
  import Badge from '../Components/Badge.svelte';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import type { SchoolLocation, SchoolLocationForm } from '../types';
  import { createEmptySchoolLocationForm, schoolLocationToForm } from '../types';
  import { School, UserRound, Phone, Mail, MapPin, Save, LocateFixed, Clock, Loader2 } from '@lucide/svelte';
  import { Toast } from '$lib/toast';
  import { fly } from 'svelte/transition';

  let { permissions, profile = null }: { permissions: { canView?: boolean; canEdit?: boolean }; profile?: SchoolLocation | null } = $props();

  let form: SchoolLocationForm = $state(createEmptySchoolLocationForm());
  let isSaving = $state(false);

  $effect(() => { form = schoolLocationToForm(profile); });

  const geofenceActive = $derived(profile !== null && profile !== undefined && profile.latitude !== null && profile.longitude !== null && profile.radius_meters !== null);

  let isLocating = $state(false);

  function useCurrentLocation(): void {
    if (!permissions.canEdit || isLocating) return;
    if (!('geolocation' in navigator)) {
      Toast('Browser tidak mendukung geolokasi', 'error');
      return;
    }
    isLocating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        form.latitude = pos.coords.latitude.toFixed(6);
        form.longitude = pos.coords.longitude.toFixed(6);
        isLocating = false;
        Toast('Koordinat terisi dari lokasi saat ini');
      },
      () => {
        isLocating = false;
        Toast('Gagal membaca lokasi. Izinkan akses lokasi di browser.', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function toNumberOrNull(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isNaN(value) ? null : value;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }

  function toStringOrNull(value: string | number | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    return trimmed ? trimmed : null;
  }

  async function submit(): Promise<void> {
    if (!permissions.canEdit || isSaving) return;
    isSaving = true;
    const payload = {
      name: form.name.trim(),
      npsn: toStringOrNull(form.npsn),
      headmaster_name: toStringOrNull(form.headmaster_name),
      phone: toStringOrNull(form.phone),
      email: toStringOrNull(form.email),
      address: toStringOrNull(form.address),
      latitude: toNumberOrNull(form.latitude),
      longitude: toNumberOrNull(form.longitude),
      radius_meters: toNumberOrNull(form.radius_meters),
      start_time: toStringOrNull(form.start_time),
    };
    const result = await api(() => axios.put('/school-locations', payload));
    isSaving = false;
    if (result.success) router.visit('/school-locations', { preserveScroll: true });
  }
</script>

<Sidebar group="school-locations" />
<PageShell>
  <PageHeader eyebrow="Manajemen Sekolah" title="Profil Sekolah." description="Identitas sekolah dan konfigurasi geofencing untuk validasi absensi guru." />

  {#if !permissions.canView}
    <div class="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">Kamu tidak memiliki akses ke halaman ini.</div>
  {:else}
    <section class="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none mb-6" in:fly={{ y: 20, duration: 800, delay: 60 }}>
      <div class="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-foreground/[0.035] to-transparent dark:from-white/[0.04]"></div>
      <div class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/[0.08] blur-3xl"></div>
      <div class="relative px-6 sm:px-8 py-7 flex flex-col sm:flex-row sm:items-center gap-5">
        <span class="relative flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:shadow-none">
          <School class="h-7 w-7 text-primary" />
        </span>
        <div class="min-w-0 flex-1">
          <h2 class="font-heading text-2xl font-semibold tracking-[-0.02em] truncate">{profile?.name ?? 'Profil sekolah belum dilengkapi'}</h2>
          <p class="mt-1 text-sm text-muted-foreground truncate">{profile?.address ?? 'Alamat belum diisi'}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Badge variant="outline">NPSN: {profile?.npsn ?? '-'}</Badge>
          {#if geofenceActive}
            <Badge><MapPin class="h-3 w-3" /> Geofencing aktif · {profile?.radius_meters} m</Badge>
          {:else}
            <Badge variant="secondary">Geofencing nonaktif</Badge>
          {/if}
          {#if profile?.start_time}
            <Badge variant="outline"><Clock class="h-3 w-3" /> Masuk {profile.start_time}</Badge>
          {/if}
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6" in:fly={{ y: 20, duration: 800, delay: 120 }}>
      <div class="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 flex items-center gap-4 shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-12px_rgba(32,36,38,0.16)] dark:shadow-none">
        <div class="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-info-500/[0.08] blur-2xl"></div>
        <span class="flex items-center justify-center h-10 w-10 rounded-xl bg-info-500/10 shrink-0"><UserRound class="h-5 w-5 text-info-600 dark:text-info-400" /></span>
        <div class="min-w-0">
          <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Kepala Sekolah</p>
          <p class="mt-1 text-sm font-medium truncate">{profile?.headmaster_name ?? '-'}</p>
        </div>
      </div>
      <div class="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 flex items-center gap-4 shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-12px_rgba(32,36,38,0.16)] dark:shadow-none">
        <div class="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-success-500/[0.08] blur-2xl"></div>
        <span class="flex items-center justify-center h-10 w-10 rounded-xl bg-success-500/10 shrink-0"><Phone class="h-5 w-5 text-success-600 dark:text-success-400" /></span>
        <div class="min-w-0">
          <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Telepon</p>
          <p class="mt-1 text-sm font-medium truncate">{profile?.phone ?? '-'}</p>
        </div>
      </div>
      <div class="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 flex items-center gap-4 shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-12px_rgba(32,36,38,0.16)] dark:shadow-none">
        <div class="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-warning-500/[0.08] blur-2xl"></div>
        <span class="flex items-center justify-center h-10 w-10 rounded-xl bg-warning-500/10 shrink-0"><Mail class="h-5 w-5 text-warning-600 dark:text-warning-400" /></span>
        <div class="min-w-0">
          <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Email</p>
          <p class="mt-1 text-sm font-medium truncate">{profile?.email ?? '-'}</p>
        </div>
      </div>
    </section>

    <form class="grid grid-cols-1 xl:grid-cols-2 gap-6" onsubmit={(e) => { e.preventDefault(); submit(); }} in:fly={{ y: 20, duration: 800, delay: 180 }}>
      <section class="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none">
        <div class="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/[0.03] to-transparent dark:from-white/[0.03]"></div>
        <div class="relative flex items-center gap-3 mb-6">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><School class="h-4.5 w-4.5 text-primary" /></span>
          <div>
            <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Identitas</p>
            <h3 class="font-heading text-xl font-semibold tracking-[-0.02em]">Informasi Umum</h3>
          </div>
        </div>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-0"><Label for="school-name" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Nama Sekolah</Label><Input id="school-name" bind:value={form.name} disabled={!permissions.canEdit} required /></div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex flex-col gap-0"><Label for="school-npsn" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">NPSN</Label><Input id="school-npsn" bind:value={form.npsn} disabled={!permissions.canEdit} placeholder="cth. 20100001" /></div>
            <div class="flex flex-col gap-0"><Label for="school-headmaster" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Kepala Sekolah</Label><Input id="school-headmaster" bind:value={form.headmaster_name} disabled={!permissions.canEdit} /></div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex flex-col gap-0"><Label for="school-phone" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Telepon</Label><Input id="school-phone" bind:value={form.phone} disabled={!permissions.canEdit} placeholder="cth. (021) 1234567" /></div>
            <div class="flex flex-col gap-0"><Label for="school-email" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Email</Label><Input id="school-email" type="email" bind:value={form.email} disabled={!permissions.canEdit} placeholder="cth. info@sekolah.sch.id" /></div>
          </div>
          <div class="flex flex-col gap-0"><Label for="school-address" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Alamat</Label><Input id="school-address" bind:value={form.address} disabled={!permissions.canEdit} /></div>
        </div>
      </section>
      <section class="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none">
        <div class="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/[0.03] to-transparent dark:from-white/[0.03]"></div>
        <div class="relative flex items-center gap-3 mb-6">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><MapPin class="h-4.5 w-4.5 text-primary" /></span>
          <div>
            <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Validasi Absensi</p>
            <h3 class="font-heading text-xl font-semibold tracking-[-0.02em]">Geofencing</h3>
          </div>
        </div>
        <div class="rounded-xl border border-border bg-secondary/20 px-4 py-3 mb-5 text-sm text-muted-foreground flex gap-3">
          <MapPin class="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {#if geofenceActive}
              Absensi guru di luar radius <strong class="text-foreground">{profile?.radius_meters} meter</strong> dari titik sekolah otomatis ditolak.
            {:else}
              Isi ketiga kolom di bawah untuk mengaktifkan geofencing. Absensi guru di luar radius akan otomatis ditolak.
            {/if}
          </span>
        </div>

        <div class="relative mb-5 flex items-center justify-center rounded-xl border border-border bg-secondary/10 py-4 overflow-hidden">
          <svg viewBox="0 0 200 110" class="h-24 w-full" aria-hidden="true">
            <circle cx="100" cy="55" r="46" fill="none" class="stroke-primary/30" stroke-width="1.5" stroke-dasharray="4 4" />
            <circle cx="100" cy="55" r="30" class="fill-primary/[0.07] stroke-primary/40" stroke-width="1" />
            <circle cx="100" cy="55" r="4" class="fill-primary" />
            <line x1="100" y1="55" x2="146" y2="55" class="stroke-primary/50" stroke-width="1" stroke-dasharray="3 3" />
            <text x="123" y="50" text-anchor="middle" class="fill-primary" font-size="9" font-weight="600">{form.radius_meters ? `${form.radius_meters} m` : 'radius'}</text>
          </svg>
          {#if permissions.canEdit}
            <Button type="button" variant="outline" size="sm" class="absolute bottom-3 right-3" onclick={useCurrentLocation} disabled={isLocating}>
              {#if isLocating}<Loader2 class="h-3.5 w-3.5 animate-spin" />{:else}<LocateFixed class="h-3.5 w-3.5" />{/if}
              {isLocating ? 'Membaca...' : 'Lokasi saya'}
            </Button>
          {/if}
        </div>
        <div class="flex flex-col gap-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex flex-col gap-0"><Label for="school-lat" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Latitude</Label><Input id="school-lat" type="number" step="any" bind:value={form.latitude} disabled={!permissions.canEdit} placeholder="cth. -6.2" /></div>
            <div class="flex flex-col gap-0"><Label for="school-lng" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Longitude</Label><Input id="school-lng" type="number" step="any" bind:value={form.longitude} disabled={!permissions.canEdit} placeholder="cth. 106.8" /></div>
          </div>
          <div class="flex flex-col gap-0"><Label for="school-radius" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Radius (meter)</Label><Input id="school-radius" type="number" step="1" min="1" bind:value={form.radius_meters} disabled={!permissions.canEdit} placeholder="cth. 200" /></div>
        </div>
        <div class="rounded-xl border border-border bg-secondary/20 px-4 py-3 mt-5 mb-5 text-sm text-muted-foreground">
          Konfirmasi setelah jam masuk standar ditandai <strong class="text-foreground">Terlambat</strong> di log kehadiran guru.
        </div>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-0"><Label for="school-start" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Jam Masuk Standar</Label><Input id="school-start" type="time" bind:value={form.start_time} disabled={!permissions.canEdit} /></div>
        </div>
      </section>
    </form>

    {#if permissions.canEdit}
      <div class="sticky bottom-4 z-20 mt-6 flex justify-end">
        <div class="flex items-center gap-3 rounded-2xl border border-border bg-card/90 px-4 py-3 shadow-[0_8px_30px_-8px_rgba(32,36,38,0.25)] backdrop-blur-md dark:bg-card/80">
          <p class="hidden sm:block text-xs text-muted-foreground">Perubahan berlaku untuk validasi absensi berikutnya.</p>
          <Button onclick={submit} disabled={isSaving} size="lg">
            {#if isSaving}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Save class="h-4 w-4" />{/if}
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </div>
    {/if}
  {/if}
</PageShell>
