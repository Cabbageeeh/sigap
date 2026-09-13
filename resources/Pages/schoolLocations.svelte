<script lang="ts">
  import { router } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import Sidebar from '../Components/Sidebar.svelte';
  import Button from '../Components/Button.svelte';
  import Input from '../Components/Input.svelte';
  import Label from '../Components/Label.svelte';
  import Badge from '../Components/Badge.svelte';
  import type { SchoolLocation, SchoolLocationForm } from '../types';
  import { createEmptySchoolLocationForm, schoolLocationToForm } from '../types';
  import { School, UserRound, Phone, Mail, MapPin, Save } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { permissions, profile = null }: { permissions: { canView?: boolean; canEdit?: boolean }; profile?: SchoolLocation | null } = $props();

  let form: SchoolLocationForm = $state(createEmptySchoolLocationForm());
  let isSaving = $state(false);

  $effect(() => { form = schoolLocationToForm(profile); });

  const geofenceActive = $derived(profile !== null && profile !== undefined && profile.latitude !== null && profile.longitude !== null && profile.radius_meters !== null);

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
<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8" in:fly={{ y: 20, duration: 800 }}>
    <div>
      <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Manajemen Sekolah</p>
      <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground">
        Profil Sekolah.
      </h1>
      <p class="mt-4 text-base text-muted-foreground leading-relaxed max-w-[52ch]">
        Identitas sekolah dan konfigurasi geofencing untuk validasi absensi guru.
      </p>
    </div>
  </div>

  {#if !permissions.canView}
    <div class="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">Kamu tidak memiliki akses ke halaman ini.</div>
  {:else}
    <section class="rounded-2xl border border-border bg-card overflow-hidden mb-6" in:fly={{ y: 20, duration: 800, delay: 60 }}>
      <div class="px-6 sm:px-8 py-7 flex flex-col sm:flex-row sm:items-center gap-5">
        <span class="flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 shrink-0">
          <School class="h-7 w-7 text-primary" />
        </span>
        <div class="min-w-0 flex-1">
          <h2 class="font-heading text-2xl font-semibold tracking-[-0.02em] truncate">{profile?.name ?? 'Profil sekolah belum dilengkapi'}</h2>
          <p class="mt-1 text-sm text-muted-foreground truncate">{profile?.address ?? 'Alamat belum diisi'}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Badge variant="outline">NPSN: {profile?.npsn ?? '-'}</Badge>
          {#if geofenceActive}
            <Badge>Geofencing aktif · {profile?.radius_meters} m</Badge>
          {:else}
            <Badge variant="secondary">Geofencing nonaktif</Badge>
          {/if}
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6" in:fly={{ y: 20, duration: 800, delay: 120 }}>
      <div class="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
        <span class="flex items-center justify-center h-10 w-10 rounded-xl bg-secondary/60 border border-border shrink-0"><UserRound class="h-5 w-5 text-muted-foreground" /></span>
        <div class="min-w-0">
          <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Kepala Sekolah</p>
          <p class="mt-1 text-sm font-medium truncate">{profile?.headmaster_name ?? '-'}</p>
        </div>
      </div>
      <div class="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
        <span class="flex items-center justify-center h-10 w-10 rounded-xl bg-secondary/60 border border-border shrink-0"><Phone class="h-5 w-5 text-muted-foreground" /></span>
        <div class="min-w-0">
          <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Telepon</p>
          <p class="mt-1 text-sm font-medium truncate">{profile?.phone ?? '-'}</p>
        </div>
      </div>
      <div class="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
        <span class="flex items-center justify-center h-10 w-10 rounded-xl bg-secondary/60 border border-border shrink-0"><Mail class="h-5 w-5 text-muted-foreground" /></span>
        <div class="min-w-0">
          <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Email</p>
          <p class="mt-1 text-sm font-medium truncate">{profile?.email ?? '-'}</p>
        </div>
      </div>
    </section>

    <form class="grid grid-cols-1 xl:grid-cols-2 gap-6" onsubmit={(e) => { e.preventDefault(); submit(); }} in:fly={{ y: 20, duration: 800, delay: 180 }}>
      <section class="rounded-2xl border border-border bg-card p-6 sm:p-7">
        <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground mb-1">Identitas</p>
        <h3 class="font-heading text-xl font-semibold tracking-[-0.02em] mb-6">Informasi Umum</h3>
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

      <section class="rounded-2xl border border-border bg-card p-6 sm:p-7">
        <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground mb-1">Validasi Absensi</p>
        <h3 class="font-heading text-xl font-semibold tracking-[-0.02em] mb-6">Geofencing</h3>
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
      <div class="flex justify-end mt-6">
        <Button onclick={submit} disabled={isSaving} size="lg">
          <Save class="h-4 w-4" />
          {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </div>
    {/if}
  {/if}
</div>
