<script lang="ts">
  import { router } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import Sidebar from '../Components/Sidebar.svelte';
  import DataTable from '../Components/DataTable.svelte';
  import Button from '../Components/Button.svelte';
  import Input from '../Components/Input.svelte';
  import Label from '../Components/Label.svelte';
  import Modal from '../Components/Modal.svelte';
  import ConfirmDialog from '../Components/ConfirmDialog.svelte';
  import Select from '../Components/Select.svelte';
  import type { Subject, SubjectForm } from '../types';
  import { createEmptySubjectForm, subjectToForm } from '../types';
  import { Pencil, Trash2 } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { permissions, subjects = [] }: { permissions: { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean }; subjects?: Subject[] } = $props();

  let isOpen = $state(false);
  let isDeleteOpen = $state(false);
  let form: SubjectForm = $state(createEmptySubjectForm());
  let selected: Subject | null = $state(null);

  function openCreate(): void { form = createEmptySubjectForm(); selected = null; isOpen = true; }
  function openEdit(item: Subject): void { selected = item; form = subjectToForm(item); isOpen = true; }
  function confirmDelete(item: Subject): void { selected = item; isDeleteOpen = true; }

  async function submit(): Promise<void> {
    const result = selected
      ? await api(() => axios.put(`/subjects/${selected!.id}`, form))
      : await api(() => axios.post('/subjects', form));
    if (result.success) { isOpen = false; router.visit('/subjects', { preserveScroll: true }); }
  }
  async function remove(): Promise<void> {
    if (!selected) return;
    const result = await api(() => axios.delete(`/subjects/${selected!.id}`));
    if (result.success) { isDeleteOpen = false; router.visit('/subjects', { preserveScroll: true }); }
  }

  const columns = [{ key: 'code', label: 'Kode' }, { key: 'name', label: 'Nama' }, { key: 'kkm', label: 'KKM', align: 'center' as const }];
</script>

{#snippet rowActions(item: Subject)}
  {#if permissions.canEdit}<Button variant="ghost" size="icon" onclick={() => openEdit(item)}><Pencil class="w-4 h-4" /></Button>{/if}
  {#if permissions.canDelete}<Button variant="ghost" size="icon" onclick={() => confirmDelete(item)}><Trash2 class="w-4 h-4 text-destructive" /></Button>{/if}
{/snippet}

<Sidebar group="subjects" />
<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12" in:fly={{ y: 20, duration: 800 }}>
    <div>
      <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Manajemen Mapel</p>
      <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground">
        Mapel.
      </h1>
      <p class="mt-4 text-base text-muted-foreground leading-relaxed max-w-[52ch]">
        Mata pelajaran yang diajarkan di sekolah. Atur kode dan nama mapel.
      </p>
    </div>
    {#if permissions.canCreate}<Button onclick={openCreate} size="lg">Tambah Mapel</Button>{/if}
  </div>
  <DataTable {columns} rows={subjects} rowAction={rowActions} />
</div>

<Modal bind:open={isOpen} title={selected ? 'Edit Mapel' : 'Tambah Mapel'} description="Tambah atau ubah mata pelajaran. Kode, nama, dan KKM wajib diisi.">
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <div class="flex flex-col gap-0"><Label for="code" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Kode</Label><Input id="code" bind:value={form.code} required /></div>
    <div class="flex flex-col gap-0"><Label for="name" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Nama</Label><Input id="name" bind:value={form.name} required /></div>
    <div class="flex flex-col gap-0"><Label for="kkm" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">KKM</Label><Input id="kkm" type="number" min={0} max={100} bind:value={form.kkm} required /></div>
    <div class="flex justify-end gap-2 pt-4 border-t border-border mt-2">
      <Button variant="outline" onclick={() => isOpen = false}>Batal</Button>
      <Button type="submit">{selected ? 'Perbarui' : 'Buat'}</Button>
    </div>
  </form>
</Modal>

<ConfirmDialog bind:open={isDeleteOpen} title="Hapus Mapel" onConfirm={remove} destructive />
