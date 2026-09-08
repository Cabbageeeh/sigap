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
  import Select from '../Components/Select.svelte';
  import Pagination from '../Components/Pagination.svelte';
  import type { Student, StudentForm, Class, User } from '../types';
  import { createEmptyStudentForm, studentToForm } from '../types';
  import { ArrowLeft, Pencil, Trash2, Upload } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let {
    permissions,
    students = [],
    classes = [],
    parents = [],
    meta,
    search = '',
    classId = null,
    classContext = null,
    classScoped = false,
  }: {
    permissions: { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean };
    students?: Student[];
    classes?: Class[];
    parents?: User[];
    meta?: import('../types').PaginationMeta;
    search?: string;
    classId?: string | null;
    classContext?: Class | null;
    classScoped?: boolean;
  } = $props();

  let isOpen = $state(false);
  let isDeleteOpen = $state(false);
  let isImportOpen = $state(false);
  let importFile = $state<File | null>(null);
  let importResult = $state<{ inserted: number; errors: { line: number; message: string }[] } | null>(null);
  let isImporting = $state(false);
  let form: StudentForm = $state(createEmptyStudentForm());
  let selected: Student | null = $state(null);
  let searchValue = $state('');
  let selectedClassId = $state('');

  $effect(() => {
    searchValue = search;
    selectedClassId = classId ?? '';
  });

  function openImport(): void {
    importFile = null;
    importResult = null;
    isImportOpen = true;
  }

  async function submitImport(): Promise<void> {
    if (!importFile) return;
    isImporting = true;
    const formData = new FormData();
    formData.append('file', importFile);
    if (classScoped && classContext) formData.append('class_id', classContext.id);
    const result = await api(() => axios.post('/students/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }));
    if (result.success && result.data) {
      importResult = result.data as { inserted: number; errors: { line: number; message: string }[] };
      importFile = null;
    }
    isImporting = false;
  }

  function openCreate(): void {
    const emptyForm = createEmptyStudentForm();
    form = classScoped && classContext ? { ...emptyForm, class_id: classContext.id } : emptyForm;
    selected = null;
    isOpen = true;
  }
  function openEdit(item: Student): void { selected = item; form = studentToForm(item); isOpen = true; }
  function confirmDelete(item: Student): void { selected = item; isDeleteOpen = true; }

  function studentPagePath(): string {
    return classScoped && classContext ? `/classes/${classContext.id}/students` : '/students';
  }

  function submitSearch(): void {
    const query = searchValue.trim();
    router.visit(query ? `${studentPagePath()}?search=${encodeURIComponent(query)}` : studentPagePath(), { preserveScroll: true });
  }

  function selectClass(): void {
    router.visit(selectedClassId ? `/classes/${selectedClassId}/students` : '/students', { preserveScroll: true });
  }

  async function submit(): Promise<void> {
    const payload = {
      ...form,
      class_id: classScoped && classContext ? classContext.id : form.class_id,
      parent_user_id: form.parent_user_id || null,
    };
    const result = selected
      ? await api(() => axios.put(`/students/${selected!.id}`, payload))
      : await api(() => axios.post('/students', payload));
    if (result.success) { isOpen = false; router.visit(studentPagePath(), { preserveScroll: true }); }
  }
  async function remove(): Promise<void> {
    if (!selected) return;
    const result = await api(() => axios.delete(`/students/${selected!.id}`));
    if (result.success) { isDeleteOpen = false; router.visit(studentPagePath(), { preserveScroll: true }); }
  }


  const classById = $derived(new Map(classes.map(c => [c.id, c.name])));

  const displayRows = $derived(students.map(s => ({
    id: s.id,
    nis: s.nis,
    name: s.name,
    class_name: classById.get(s.class_id) ?? s.class_id,
    parent: '-',
  })));

  const columns = [{ key: 'nis', label: 'NIS' }, { key: 'name', label: 'Nama' }, { key: 'class_name', label: 'Kelas' }, { key: 'parent', label: 'Orang Tua' }];
</script>

{#snippet rowActions(item: Student)}
  {#if permissions.canEdit}<Button variant="ghost" size="icon" onclick={() => openEdit(item)}><Pencil class="w-4 h-4" /></Button>{/if}
  {#if permissions.canDelete}<Button variant="ghost" size="icon" onclick={() => confirmDelete(item)}><Trash2 class="w-4 h-4 text-destructive" /></Button>{/if}
{/snippet}

<Sidebar group={classScoped ? 'classes' : 'students'} />
<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8" in:fly={{ y: 20, duration: 800 }}>
    <div>
      {#if classScoped && classContext}
        <a href="/classes" use:inertia class="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors mb-6">
          <ArrowLeft class="w-4 h-4" /> Kembali ke daftar kelas
        </a>
      {/if}
      <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Manajemen Siswa</p>
      <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground">
        {classScoped && classContext ? `Siswa ${classContext.name}.` : 'Siswa.'}
      </h1>
      <p class="mt-4 text-base text-muted-foreground leading-relaxed max-w-[52ch]">
        {classScoped && classContext
          ? `Kelola daftar siswa kelas ${classContext.name}. Gunakan pencarian untuk menemukan siswa dengan cepat.`
          : 'Pilih kelas untuk mengelola data siswa secara lebih terarah.'}
      </p>
    </div>
    {#if permissions.canCreate}
      <div class="flex gap-2">
        <Button variant="outline" onclick={openImport}><Upload class="w-4 h-4 mr-1" /> Import CSV</Button>
        <Button onclick={openCreate} size="lg">Tambah Siswa</Button>
      </div>
    {/if}
  </div>
  <div class="flex flex-col md:flex-row gap-3 mb-6">
    {#if !classScoped}
      <Select id="student-class-filter" bind:value={selectedClassId} onchange={selectClass}>
        <option value="">Semua kelas</option>
        {#each classes as c}<option value={c.id}>{c.name}</option>{/each}
      </Select>
    {/if}
    <form class="flex flex-1 gap-2" onsubmit={(event) => { event.preventDefault(); submitSearch(); }}>
      <Input type="search" placeholder="Cari NIS atau nama siswa..." bind:value={searchValue} class="flex-1" />
      <Button type="submit" variant="outline">Cari</Button>
    </form>
  </div>
  <DataTable {columns} rows={displayRows} rowAction={rowActions} />
  {#if meta}<Pagination {meta} />{/if}
</div>

<Modal bind:open={isOpen} title={selected ? 'Edit Siswa' : 'Tambah Siswa'} description={classScoped && classContext ? `Tambah atau ubah data siswa kelas ${classContext.name}.` : 'Tambah atau ubah data siswa. Isi NIS, nama, kelas, dan orang tua.'}>
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <div class="flex flex-col gap-0"><Label for="nis" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">NIS</Label><Input id="nis" bind:value={form.nis} required /></div>
    <div class="flex flex-col gap-0"><Label for="name" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Nama</Label><Input id="name" bind:value={form.name} required /></div>
    <div class="flex flex-col gap-0"><Label for="class" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Kelas</Label>
      <Select id="class" bind:value={form.class_id} placeholder="Pilih kelas" disabled={classScoped}>
        {#each classes as c}<option value={c.id}>{c.name}</option>{/each}
      </Select>
    </div>
    <div class="flex flex-col gap-0"><Label for="parent" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Orang Tua</Label>
      <Select id="parent" bind:value={form.parent_user_id} placeholder="Pilih orang tua">
        <option value={null}>Tidak ada</option>
        {#each parents as p}<option value={p.id}>{p.name}</option>{/each}
      </Select>
    </div>
    <div class="flex flex-col gap-0"><Label for="phone" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Telepon</Label><Input id="phone" bind:value={form.phone} /></div>
    <div class="flex flex-col gap-0"><Label for="address" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Alamat</Label><Input id="address" bind:value={form.address} /></div>
    <div class="flex justify-end gap-2 pt-4 border-t border-border mt-2">
      <Button variant="outline" onclick={() => isOpen = false}>Batal</Button>
      <Button type="submit">{selected ? 'Perbarui' : 'Buat'}</Button>
    </div>
  </form>
</Modal>

<Modal bind:open={isImportOpen} title="Import Siswa (CSV)" description={classScoped && classContext ? `Upload CSV siswa untuk kelas ${classContext.name}. Kolom: nis,name,phone,address.` : 'Upload file CSV dengan kolom: nis,name,class,phone,address. Baris pertama opsional sebagai header. Kelas harus sesuai nama kelas yang sudah ada.'}>
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submitImport(); }}>
    <input
      type="file"
      accept=".csv,text/csv"
      class="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-secondary/60 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-secondary"
      onchange={(e) => { importFile = (e.currentTarget as HTMLInputElement).files?.[0] ?? null; importResult = null; }}
    />
    {#if classScoped}
      <pre class="bg-secondary/40 rounded-md px-3 py-2 text-xs text-muted-foreground overflow-x-auto">10011,Andi Saputra,08123456780,Jl. Melati No. 6
10012,Budi Hartono,,</pre>
    {:else}
      <pre class="bg-secondary/40 rounded-md px-3 py-2 text-xs text-muted-foreground overflow-x-auto">10011,Andi Saputra,10A,08123456780,Jl. Melati No. 6
10012,Budi Hartono,10B,,</pre>
    {/if}
    {#if importResult}
      <div class="bg-card border border-border rounded-md px-4 py-3 text-sm">
        <p class="font-medium text-foreground">{importResult.inserted} siswa berhasil diimpor.</p>
        {#if importResult.errors.length > 0}
          <ul class="mt-2 flex flex-col gap-1 text-xs text-destructive max-h-40 overflow-y-auto">
            {#each importResult.errors as err}
              <li>Baris {err.line}: {err.message}</li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}
    <div class="flex justify-end gap-2 pt-4 border-t border-border mt-2">
      <Button variant="outline" onclick={() => isImportOpen = false} type="button">Tutup</Button>
      <Button type="submit" disabled={!importFile || isImporting}>{isImporting ? 'Mengimpor...' : 'Import'}</Button>
    </div>
  </form>
</Modal>

<ConfirmDialog bind:open={isDeleteOpen} title="Hapus Siswa" onConfirm={remove} destructive />
