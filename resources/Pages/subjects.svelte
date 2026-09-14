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
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import type { Subject, SubjectForm } from '../types';
  import { createEmptySubjectForm, subjectToForm } from '../types';
  import { Pencil, Plus, Trash2 } from '@lucide/svelte';

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
<PageShell>
  <PageHeader eyebrow="Manajemen Mapel" title="Mapel." description="Mata pelajaran yang diajarkan di sekolah. Atur kode dan nama mapel.">
    {#snippet actions()}
      {#if permissions.canCreate}<Button onclick={openCreate} size="lg"><Plus class="w-4 h-4" /> Tambah Mapel</Button>{/if}
    {/snippet}
  </PageHeader>
  <DataTable {columns} rows={subjects} rowAction={rowActions} />

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
</PageShell>
