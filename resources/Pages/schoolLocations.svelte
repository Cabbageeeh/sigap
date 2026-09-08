<script lang="ts">
  import { router } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import Sidebar from '../Components/Sidebar.svelte';
  import DataTable from '../Components/DataTable.svelte';
  import Button from '../Components/Button.svelte';
  import Input from '../Components/Input.svelte';
  import Label from '../Components/Label.svelte';
  import Switch from '../Components/Switch.svelte';
  import Modal from '../Components/Modal.svelte';
  import ConfirmDialog from '../Components/ConfirmDialog.svelte';
  import type { SchoolLocation, SchoolLocationForm } from '../types';
  import { createEmptySchoolLocationForm, schoolLocationToForm } from '../types';
  import { Pencil, Trash2 } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { permissions, locations = [] }: { permissions: { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean }; locations?: SchoolLocation[] } = $props();

  let isOpen = $state(false);
  let isDeleteOpen = $state(false);
  let form: SchoolLocationForm = $state(createEmptySchoolLocationForm());
  let selected: SchoolLocation | null = $state(null);

  function openCreate(): void { form = createEmptySchoolLocationForm(); selected = null; isOpen = true; }
  function openEdit(item: SchoolLocation): void { selected = item; form = schoolLocationToForm(item); isOpen = true; }
  function confirmDelete(item: SchoolLocation): void { selected = item; isDeleteOpen = true; }

  async function submit(): Promise<void> {
    const payload = { name: form.name, address: form.address || null, is_active: form.is_active ? 1 : 0 };
    const result = selected
      ? await api(() => axios.put(`/school-locations/${selected!.id}`, payload))
      : await api(() => axios.post('/school-locations', payload));
    if (result.success) { isOpen = false; router.visit('/school-locations', { preserveScroll: true }); }
  }
  async function remove(): Promise<void> {
    if (!selected) return;
    const result = await api(() => axios.delete(`/school-locations/${selected!.id}`));
    if (result.success) { isDeleteOpen = false; router.visit('/school-locations', { preserveScroll: true }); }
  }
  function setActive(id: string): void {
    api(() => axios.post(`/school-locations/${id}/activate`)).then(() => router.visit('/school-locations', { preserveScroll: true }));
  }

  const displayRows = $derived(locations.map(l => ({
    ...l,
    is_active: l.is_active === 1 ? 'Aktif' : '—',
  })));

  const columns = [{ key: 'name', label: 'Nama Sekolah' }, { key: 'address', label: 'Alamat' }, { key: 'is_active', label: 'Status', align: 'center' as const }];
</script>

{#snippet rowActions(item: SchoolLocation)}
  {#if permissions.canEdit}<Button variant="ghost" size="icon" onclick={() => openEdit(item)}><Pencil class="w-4 h-4" /></Button>{#if item.is_active !== 1}<Button variant="ghost" onclick={() => setActive(item.id)}>Aktifkan</Button>{/if}{/if}
  {#if permissions.canDelete}<Button variant="ghost" size="icon" onclick={() => confirmDelete(item)}><Trash2 class="w-4 h-4 text-destructive" /></Button>{/if}
{/snippet}

<Sidebar group="school-locations" />
<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12" in:fly={{ y: 20, duration: 800 }}>
    <div>
      <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Manajemen Sekolah</p>
      <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground">
        Profil Sekolah.
      </h1>
      <p class="mt-4 text-base text-muted-foreground leading-relaxed max-w-[52ch]">
        Identitas sekolah yang ditampilkan di laporan dan pengumuman.
      </p>
    </div>
    {#if permissions.canCreate}<Button onclick={openCreate} size="lg">Tambah Profil</Button>{/if}
  </div>
  <DataTable {columns} rows={displayRows} rowAction={rowActions} />
</div>

<Modal bind:open={isOpen} title={selected ? 'Edit Profil Sekolah' : 'Tambah Profil Sekolah'} description="Tambah atau ubah identitas sekolah.">
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <div class="flex flex-col gap-0"><Label for="name" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Nama Sekolah</Label><Input id="name" bind:value={form.name} required /></div>
    <div class="flex flex-col gap-0"><Label for="address" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Alamat</Label><Input id="address" bind:value={form.address} /></div>
    <div class="flex items-center gap-2"><Switch bind:checked={form.is_active} /><Label>Aktif</Label></div>
    <div class="flex justify-end gap-2 pt-4 border-t border-border mt-2">
      <Button variant="outline" onclick={() => isOpen = false}>Batal</Button>
      <Button type="submit">{selected ? 'Perbarui' : 'Buat'}</Button>
    </div>
  </form>
</Modal>

<ConfirmDialog bind:open={isDeleteOpen} title="Hapus Profil Sekolah" onConfirm={remove} destructive />
