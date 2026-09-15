<script lang="ts">
  import { inertia, router } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import Sidebar from '../Components/Sidebar.svelte';
  import DataTable from '../Components/DataTable.svelte';
  import Button from '../Components/Button.svelte';
  import Input from '../Components/Input.svelte';
  import Label from '../Components/Label.svelte';
  import Modal from '../Components/Modal.svelte';
  import ConfirmDialog from '../Components/ConfirmDialog.svelte';
  import SearchableSelect from '../Components/SearchableSelect.svelte';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import type { Class, ClassForm, AcademicYear } from '../types';
  import { createEmptyClassForm, classToForm } from '../types';
  import { ArrowRight, Pencil, Plus, Trash2 } from '@lucide/svelte';

  let {
    permissions,
    classes = [],
    years = [],
  }: {
    permissions: { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean; canViewStudents?: boolean };
    classes?: (Class & {
      academic_year_name?: string;
      homeroom_teacher_name?: string | null;
      homeroom_teacher_username?: string | null;
      student_count?: number;
    })[];
    years?: AcademicYear[];
  } = $props();

  let isOpen = $state(false);
  let isDeleteOpen = $state(false);
  let form: ClassForm = $state(createEmptyClassForm());
  let selected: Class | null = $state(null);

  function openCreate(): void { form = createEmptyClassForm(); selected = null; isOpen = true; }
  function openEdit(item: Class): void { selected = item; form = classToForm(item); isOpen = true; }
  function confirmDelete(item: Class): void { selected = item; isDeleteOpen = true; }

  async function submit(): Promise<void> {
    const result = selected
      ? await api(() => axios.put(`/classes/${selected!.id}`, form))
      : await api(() => axios.post('/classes', form));
    if (result.success) { isOpen = false; router.visit('/classes', { preserveScroll: true }); }
  }
  async function remove(): Promise<void> {
    if (!selected) return;
    const result = await api(() => axios.delete(`/classes/${selected!.id}`));
    if (result.success) { isDeleteOpen = false; router.visit('/classes', { preserveScroll: true }); }
  }

  const columns = [
    { key: 'name', label: 'Nama' },
    { key: 'grade', label: 'Tingkat' },
    { key: 'student_count', label: 'Jumlah Siswa', align: 'right' as const },
    { key: 'homeroom_teacher_name', label: 'Wali Kelas' },
    { key: 'academic_year_name', label: 'Tahun Ajaran' },
  ];
</script>

{#snippet rowActions(item: Class & { student_count?: number })}
  {#if permissions.canViewStudents}
    <a href={`/classes/${item.id}/students`} use:inertia class="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors mr-2">
      Kelola siswa <ArrowRight class="w-3.5 h-3.5" />
    </a>
  {/if}
  {#if permissions.canEdit}<Button variant="ghost" size="icon" onclick={() => openEdit(item)}><Pencil class="w-4 h-4" /></Button>{/if}
  {#if permissions.canDelete}<Button variant="ghost" size="icon" onclick={() => confirmDelete(item)}><Trash2 class="w-4 h-4 text-destructive" /></Button>{/if}
{/snippet}

<Sidebar group="classes" />
<PageShell>
  <PageHeader eyebrow="Manajemen Kelas" title="Kelas." description="Daftar kelas sekolah per tahun ajaran. Kelola siswa dari kelas yang dipilih.">
    {#snippet actions()}
      {#if permissions.canCreate}<Button onclick={openCreate} size="lg"><Plus class="w-4 h-4" /> Tambah Kelas</Button>{/if}
    {/snippet}
  </PageHeader>
  <DataTable {columns} rows={classes} rowAction={rowActions} />

<Modal bind:open={isOpen} title={selected ? 'Edit Kelas' : 'Tambah Kelas'} description="Tambah atau ubah data kelas. Pilih tahun ajaran yang aktif.">
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <div class="flex flex-col gap-0"><Label for="name" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Nama</Label><Input id="name" bind:value={form.name} required /></div>
    <div class="flex flex-col gap-0"><Label for="grade" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Tingkat</Label><Input id="grade" bind:value={form.grade} required /></div>
    <div class="flex flex-col gap-0"><Label for="year" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Tahun Ajaran</Label>
      <SearchableSelect id="year" bind:value={form.academic_year_id} placeholder="Pilih tahun ajaran" options={years.map(y => ({ value: y.id, label: y.name }))} />
    </div>
    <div class="flex justify-end gap-2 pt-4 border-t border-border mt-2">
      <Button variant="outline" onclick={() => isOpen = false}>Batal</Button>
      <Button type="submit">{selected ? 'Perbarui' : 'Buat'}</Button>
    </div>
  </form>
</Modal>

<ConfirmDialog bind:open={isDeleteOpen} title="Hapus Kelas" description="Menghapus kelas akan menghapus seluruh data siswa di dalamnya." onConfirm={remove} destructive />
</PageShell>
