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
  import Pagination from '../Components/Pagination.svelte';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import type { Student, StudentForm, StudentParentForm, Class } from '../types';
  import { createEmptyStudentForm, createEmptyStudentParentForm, studentToForm } from '../types';
  import { Toast } from '$lib/toast';
  import { ArrowLeft, Download, Pencil, Plus, Trash2, Upload } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let {
    permissions,
    parentPermissions = { canCreate: false, canEdit: false, canDelete: false },
    students = [],
    classes = [],
    parentAccounts = [],
    meta,
    search = '',
    classId = null,
    classContext = null,
    classScoped = false,
  }: {
    permissions: { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean; canExportClassRoster?: boolean };
    parentPermissions?: { canCreate: boolean; canEdit: boolean; canDelete: boolean };
    students?: StudentRow[];
    classes?: Class[];
    parentAccounts?: ParentAccountOption[];
    meta?: import('../types').PaginationMeta;
    search?: string;
    classId?: string | null;
    classContext?: Class | null;
    classScoped?: boolean;
  } = $props();

  type StudentRow = Student & {
    parent_name: string | null;
    parent_username: string | null;
    parent_phone: string | null;
    parent_address: string | null;
  };

  type ParentAccountOption = {
    user_id: string;
    name: string | null;
    username: string;
    phone: string | null;
    address: string | null;
    student_count: number;
  };

  let isOpen = $state(false);
  let isDeleteOpen = $state(false);
  let isParentDeleteOpen = $state(false);
  let isImportOpen = $state(false);
  let importFile = $state<File | null>(null);
  let importResult = $state<{ inserted: number; updated: number; parents_created: number; parents_updated: number; errors: { line: number; message: string }[] } | null>(null);
  let importParentPassword = $state('');
  let isImporting = $state(false);
  let form: StudentForm = $state(createEmptyStudentForm());
  let parentForm: StudentParentForm = $state(createEmptyStudentParentForm());
  let selected: StudentRow | null = $state(null);
  let isParentSubmitting = $state(false);
  let searchValue = $state('');
  let selectedClassId = $state<string | null>('');

  $effect(() => {
    searchValue = search;
    selectedClassId = classId;
  });

  function openImport(): void {
    importFile = null;
    importResult = null;
    importParentPassword = '';
    isImportOpen = true;
  }

  async function submitImport(): Promise<void> {
    if (!importFile) return;
    isImporting = true;
    const formData = new FormData();
    formData.append('file', importFile);
    if (classScoped && classContext) formData.append('class_id', classContext.id);
    if (importParentPassword) formData.append('parent_password', importParentPassword);
    const result = await api(
      () => axios.post('/students/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
      { showSuccessToast: false },
    );
    if (result.success && result.data) {
      const imported = result.data as { inserted: number; updated: number; parents_created: number; parents_updated: number; errors: { line: number; message: string }[] };
      importResult = imported;
      importFile = null;
      const processed = imported.inserted + imported.updated;
      if (processed === 0) {
        Toast(imported.errors.length > 0
          ? 'Tidak ada siswa yang diimpor. Periksa baris yang dilewati.'
          : 'Tidak ada siswa baru untuk diimpor.', 'warning');
      } else if (imported.errors.length > 0) {
        Toast(`${imported.inserted} siswa ditambahkan dan ${imported.updated} siswa diperbarui; ${imported.errors.length} baris dilewati. Periksa rincian pada jendela impor.`, 'warning');
      } else {
        Toast(`${imported.inserted} siswa ditambahkan dan ${imported.updated} siswa diperbarui.`, 'success');
      }
      if (processed > 0) {
        searchValue = '';
        const url = new URL(window.location.href);
        url.searchParams.delete('page');
        url.searchParams.delete('search');
        router.visit(`${url.pathname}${url.search}`, {
          only: ['students', 'meta', 'search'],
          preserveScroll: true,
          preserveState: true,
          replace: true,
          onSuccess: () => {
            if (imported.errors.length === 0) isImportOpen = false;
          },
        });
      }
    }
    isImporting = false;
  }

  function openCreate(): void {
    const emptyForm = createEmptyStudentForm();
    form = classScoped && classContext ? { ...emptyForm, class_id: classContext.id } : emptyForm;
    selected = null;
    isOpen = true;
  }
  function openEdit(item: StudentRow): void {
    selected = item;
    form = studentToForm(item);
    parentForm = item.parent_user_id
      ? {
          mode: 'new',
          existing_parent_user_id: null,
          name: item.parent_name ?? '',
          phone: item.parent_phone ?? '',
          address: item.parent_address ?? '',
          password: '',
        }
      : createEmptyStudentParentForm();
    isOpen = true;
  }
  function confirmDelete(item: StudentRow): void { selected = item; isDeleteOpen = true; }

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

  async function createOrLinkParent(): Promise<void> {
    if (!selected) return;
    isParentSubmitting = true;
    const payload = parentForm.mode === 'existing'
      ? { mode: 'existing', parent_user_id: parentForm.existing_parent_user_id }
      : {
          mode: 'new',
          name: parentForm.name,
          phone: parentForm.phone || null,
          address: parentForm.address || null,
          password: parentForm.password,
        };
    const result = await api(() => axios.post(`/students/${selected!.id}/parent`, payload));
    isParentSubmitting = false;
    if (result.success) {
      isOpen = false;
      router.visit(studentPagePath(), { preserveScroll: true });
    }
  }

  async function updateParent(): Promise<void> {
    if (!selected?.parent_user_id) return;
    isParentSubmitting = true;
    const result = await api(() => axios.put(`/students/${selected!.id}/parent`, {
      name: parentForm.name,
      phone: parentForm.phone,
      address: parentForm.address,
      password: parentForm.password || undefined,
    }));
    isParentSubmitting = false;
    if (result.success) {
      isOpen = false;
      router.visit(studentPagePath(), { preserveScroll: true });
    }
  }

  async function removeParent(): Promise<void> {
    if (!selected?.parent_user_id) return;
    isParentSubmitting = true;
    const result = await api(() => axios.delete(`/students/${selected!.id}/parent`));
    isParentSubmitting = false;
    if (result.success) {
      isParentDeleteOpen = false;
      isOpen = false;
      router.visit(studentPagePath(), { preserveScroll: true });
    }
  }


  const classById = $derived(new Map(classes.map(c => [c.id, c.name])));

  const displayRows = $derived(students.map(s => ({
    ...s,
    class_name: classById.get(s.class_id) ?? s.class_id,
    parent: s.parent_name ?? 'Belum diatur',
  })));

  const columns = [{ key: 'nis', label: 'NIS' }, { key: 'name', label: 'Nama' }, { key: 'class_name', label: 'Kelas' }, { key: 'parent', label: 'Orang Tua' }];
</script>

{#snippet rowActions(item: StudentRow)}
  {#if permissions.canEdit || parentPermissions.canCreate || parentPermissions.canEdit || parentPermissions.canDelete}<Button variant="outline" size="icon-sm" title="Ubah data siswa" aria-label="Ubah data siswa" class="mr-1" onclick={() => openEdit(item)}><Pencil class="w-4 h-4" /></Button>{/if}
  {#if permissions.canDelete}<Button variant="outline" size="icon-sm" title="Hapus siswa" aria-label="Hapus siswa" class="text-destructive hover:bg-destructive/10 hover:text-destructive" onclick={() => confirmDelete(item)}><Trash2 class="w-4 h-4" /></Button>{/if}
{/snippet}

<Sidebar group={classScoped ? 'classes' : 'students'} />
<PageShell>
  {#if classScoped && classContext}
    <a href="/classes" use:inertia class="mb-6 inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-border bg-card px-3 font-heading text-sm font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer" in:fly={{ y: 20, duration: 800 }}>
      <ArrowLeft class="w-4 h-4" /> Kembali ke daftar kelas
    </a>
  {/if}
  <PageHeader
    eyebrow="Manajemen Siswa"
    title={classScoped && classContext ? `Siswa ${classContext.name}.` : 'Siswa.'}
    description={classScoped && classContext
      ? `Kelola daftar siswa kelas ${classContext.name}. Gunakan pencarian untuk menemukan siswa dengan cepat.`
      : 'Pilih kelas untuk mengelola data siswa secara lebih terarah.'}
  >
    {#snippet actions()}
      {#if permissions.canCreate}
        {#if classScoped && classContext && permissions.canExportClassRoster}
          <Button href={`/classes/${classContext.id}/students/import-template`} download variant="outline"><Download class="w-4 h-4" /> Unduh data kelas (.xlsx)</Button>
        {/if}
        <Button variant="outline" onclick={openImport}><Upload class="w-4 h-4 mr-1" /> Impor daftar siswa</Button>
        <Button onclick={openCreate} size="lg"><Plus class="w-4 h-4" /> Tambah Siswa</Button>
      {/if}
    {/snippet}
  </PageHeader>
  <div class="flex flex-col md:flex-row gap-3 mb-6">
    {#if !classScoped}
      <SearchableSelect id="student-class-filter" bind:value={selectedClassId} onchange={selectClass} placeholder="Semua kelas" options={classes.map(c => ({ value: c.id, label: c.name }))} />
    {/if}
    <form class="flex flex-1 gap-2" onsubmit={(event) => { event.preventDefault(); submitSearch(); }}>
      <Input type="search" placeholder="Cari NIS atau nama siswa..." bind:value={searchValue} class="flex-1" />
      <Button type="submit" variant="outline">Cari</Button>
    </form>
  </div>
  <DataTable {columns} rows={displayRows} rowAction={rowActions} />
  {#if meta}<Pagination {meta} />{/if}

<Modal bind:open={isOpen} title={selected ? 'Detail Siswa' : 'Tambah Siswa'} description={classScoped && classContext ? `Kelola data siswa kelas ${classContext.name}.` : 'Kelola identitas siswa dan akun orang tua dari satu tempat.'}>
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <div class="flex flex-col gap-0"><Label for="nis" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">NIS</Label><Input id="nis" bind:value={form.nis} required disabled={selected !== null && !permissions.canEdit} /></div>
    <div class="flex flex-col gap-0"><Label for="name" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Nama</Label><Input id="name" bind:value={form.name} required disabled={selected !== null && !permissions.canEdit} /></div>
    <div class="flex flex-col gap-0"><Label for="class" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Kelas</Label>
      <SearchableSelect id="class" bind:value={form.class_id} placeholder="Pilih kelas" disabled={classScoped || (selected !== null && !permissions.canEdit)} options={classes.map(c => ({ value: c.id, label: c.name }))} />
    </div>
    <div class="flex flex-col gap-0"><Label for="phone" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Telepon</Label><Input id="phone" bind:value={form.phone} disabled={selected !== null && !permissions.canEdit} /></div>
    <div class="flex flex-col gap-0"><Label for="address" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Alamat</Label><Input id="address" bind:value={form.address} disabled={selected !== null && !permissions.canEdit} /></div>

    {#if selected}
      <div class="mt-2 rounded-xl border border-border bg-secondary/20 p-4">
        <div class="mb-4">
          <p class="font-heading text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Akun Orang Tua</p>
          <p class="mt-1 text-xs text-muted-foreground">Buat, hubungkan, atau ubah akun orang tua langsung dari siswa ini.</p>
        </div>

        {#if selected.parent_user_id}
          <div class="mb-4 rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
            <p class="font-medium text-foreground">{selected.parent_name ?? 'Orang Tua'}</p>
            <p class="text-xs text-muted-foreground">Login: @{selected.parent_username}</p>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5 sm:col-span-2"><Label for="parent-name">Nama orang tua</Label><Input id="parent-name" bind:value={parentForm.name} disabled={!parentPermissions.canEdit} /></div>
            <div class="flex flex-col gap-1.5"><Label for="parent-phone">Telepon orang tua</Label><Input id="parent-phone" bind:value={parentForm.phone} disabled={!parentPermissions.canEdit} /></div>
            <div class="flex flex-col gap-1.5"><Label for="parent-password">Kata sandi baru</Label><Input id="parent-password" type="password" bind:value={parentForm.password} placeholder="Kosongkan jika tidak diubah" disabled={!parentPermissions.canEdit} /></div>
            <div class="flex flex-col gap-1.5 sm:col-span-2"><Label for="parent-address">Alamat orang tua</Label><Input id="parent-address" bind:value={parentForm.address} disabled={!parentPermissions.canEdit} /></div>
          </div>
          <p class="mt-2 text-[11px] text-muted-foreground">Perubahan akun berlaku untuk semua anak yang terhubung ke orang tua ini.</p>
          <div class="mt-4 flex flex-wrap justify-between gap-2">
            {#if parentPermissions.canDelete}<Button type="button" variant="outline" class="text-destructive hover:bg-destructive/10 hover:text-destructive" onclick={() => isParentDeleteOpen = true}>Lepas akun orang tua</Button>{/if}
            {#if parentPermissions.canEdit}<Button type="button" onclick={updateParent} disabled={isParentSubmitting || !parentForm.name}>{isParentSubmitting ? 'Menyimpan...' : 'Simpan orang tua'}</Button>{/if}
          </div>
        {:else if parentPermissions.canCreate}
          <div class="mb-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={parentForm.mode === 'new' ? 'default' : 'outline'} onclick={() => parentForm.mode = 'new'}>Buat akun baru</Button>
            <Button type="button" size="sm" variant={parentForm.mode === 'existing' ? 'default' : 'outline'} onclick={() => parentForm.mode = 'existing'}>Pakai akun yang ada</Button>
          </div>

          {#if parentForm.mode === 'existing'}
            <div class="flex flex-col gap-3">
              <div class="flex flex-col gap-1.5">
                <Label for="existing-parent">Akun orang tua</Label>
                <SearchableSelect id="existing-parent" bind:value={parentForm.existing_parent_user_id} placeholder="Pilih akun orang tua" options={parentAccounts.map(parent => ({ value: parent.user_id, label: `${parent.name ?? parent.username} — @${parent.username}` }))} />
              </div>
              <div class="flex justify-end"><Button type="button" onclick={createOrLinkParent} disabled={isParentSubmitting || !parentForm.existing_parent_user_id}>{isParentSubmitting ? 'Menghubungkan...' : 'Hubungkan orang tua'}</Button></div>
            </div>
          {:else}
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="flex flex-col gap-1.5 sm:col-span-2"><Label for="new-parent-name">Nama orang tua</Label><Input id="new-parent-name" bind:value={parentForm.name} /></div>
              <div class="flex flex-col gap-1.5"><Label for="new-parent-phone">Telepon orang tua</Label><Input id="new-parent-phone" bind:value={parentForm.phone} /></div>
              <div class="flex flex-col gap-1.5"><Label for="new-parent-password">Kata sandi</Label><Input id="new-parent-password" type="password" bind:value={parentForm.password} placeholder="Minimal 8 karakter" /></div>
              <div class="flex flex-col gap-1.5 sm:col-span-2"><Label for="new-parent-address">Alamat orang tua</Label><Input id="new-parent-address" bind:value={parentForm.address} /></div>
              <div class="sm:col-span-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">Username login otomatis memakai NIS <span class="font-medium text-foreground">{selected.nis}</span>.</div>
            </div>
            <div class="mt-4 flex justify-end"><Button type="button" onclick={createOrLinkParent} disabled={isParentSubmitting || !parentForm.name || parentForm.password.length < 8}>{isParentSubmitting ? 'Membuat...' : 'Buat akun orang tua'}</Button></div>
          {/if}
        {:else}
          <p class="text-sm text-muted-foreground">Belum ada akun orang tua yang terhubung.</p>
        {/if}
      </div>
    {/if}
    <div class="flex justify-end gap-2 pt-4 border-t border-border mt-2">
      <Button variant="outline" onclick={() => isOpen = false}>Batal</Button>
      {#if !selected || permissions.canEdit}<Button type="submit">{selected ? 'Perbarui' : 'Buat'}</Button>{/if}
    </div>
  </form>
</Modal>

<Modal bind:open={isImportOpen} title="Impor daftar siswa" description="Isi template Excel yang sudah tersusun per kolom, lalu unggah kembali ke SIGAP. File CSV lama tetap didukung.">
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submitImport(); }}>
    <div class="rounded-xl border border-border bg-secondary/20 p-4">
      <ol class="space-y-2 text-sm text-foreground">
        <li><span class="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">1</span>{classScoped ? 'Unduh data kelas dari halaman ini; file sudah memuat data siswa yang tersedia.' : 'Unduh template Excel lalu buka file tersebut.'}</li>
        <li><span class="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">2</span>{classScoped ? 'Lengkapi kolom yang kosong atau tambahkan siswa baru pada baris berikutnya.' : 'Isi data siswa mulai dari baris kedua; satu siswa untuk setiap baris.'}</li>
        <li><span class="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">3</span>Simpan file Excel, lalu pilih file itu di bawah.</li>
      </ol>
      <div class="mt-3 flex flex-wrap gap-2">
        {#if classScoped && classContext && permissions.canExportClassRoster}
          <Button href={`/classes/${classContext.id}/students/import-template`} download variant="outline"><Download class="h-4 w-4" /> Unduh data kelas (.xlsx)</Button>
        {:else}
          <Button href="/public/templates/import-siswa.xlsx" download variant="outline"><Download class="h-4 w-4" /> Unduh Excel (.xlsx)</Button>
          <Button href="/public/templates/import-siswa.csv" download variant="outline"><Download class="h-4 w-4" /> Unduh CSV (.csv)</Button>
        {/if}
      </div>
      {#if classScoped}<p class="mt-3 text-xs text-muted-foreground">Jangan ubah kolom ID Siswa SIGAP. Untuk siswa lama, NIS/nama atau kolom lain yang dibiarkan kosong tidak menghapus data tersimpan. Baris siswa baru wajib memiliki NIS dan nama.</p>{/if}
    </div>
    <div class="grid gap-3 sm:grid-cols-2">
      <div class="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
        <p class="font-semibold text-foreground">Wajib diisi</p>
        <p class="mt-1 text-muted-foreground">{classScoped ? 'NIS dan nama untuk setiap siswa baru.' : 'NIS, nama siswa, serta kelas.'}</p>
      </div>
      <div class="rounded-xl border border-border bg-card p-3 text-sm">
        <p class="font-semibold text-foreground">Opsional</p>
        <p class="mt-1 text-muted-foreground">Telepon dan alamat. Isi nama orang tua untuk membuat akun orang tua otomatis.</p>
      </div>
    </div>
    {#if classScoped && classContext}
      <p class="rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">Semua siswa dari file ini masuk ke kelas <span class="font-medium text-foreground">{classContext.name}</span>. Kolom kelas pada file diabaikan.</p>
    {:else}
      <p class="text-xs text-muted-foreground">Nama kelas di file harus sama dengan nama kelas yang sudah terdaftar di SIGAP.</p>
    {/if}
    <Label for="student-csv">Pilih file Excel (.xlsx) atau CSV</Label>
    <input
      id="student-csv"
      type="file"
      accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
      class="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-secondary/60 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-secondary"
      onchange={(e) => { importFile = (e.currentTarget as HTMLInputElement).files?.[0] ?? null; importResult = null; }}
    />
    <div class="rounded-xl border border-border p-3">
      <Label for="import-parent-password">Kata sandi awal akun orang tua</Label>
      <Input id="import-parent-password" type="password" bind:value={importParentPassword} placeholder="Minimal 8 karakter" />
      <p class="mt-1 text-xs text-muted-foreground">Wajib untuk akun orang tua baru. Perubahan data orang tua yang sudah memiliki akun tidak memerlukan kata sandi baru. Nama login memakai NIS siswa.</p>
    </div>
    {#if importResult}
      <div class="bg-card border border-border rounded-md px-4 py-3 text-sm">
        <p class="font-medium text-foreground">{importResult.inserted} siswa ditambahkan · {importResult.updated} siswa diperbarui.</p>
        {#if importResult.parents_created > 0}
          <p class="mt-1 text-xs text-muted-foreground">{importResult.parents_created} akun orang tua dibuat dengan login NIS anak.</p>
        {/if}
        {#if importResult.parents_updated > 0}<p class="mt-1 text-xs text-muted-foreground">{importResult.parents_updated} data akun orang tua diperbarui.</p>{/if}
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
      <Button type="submit" disabled={!importFile || isImporting}>{isImporting ? 'Mengimpor...' : 'Impor siswa'}</Button>
    </div>
  </form>
</Modal>

<ConfirmDialog bind:open={isDeleteOpen} title="Hapus Siswa" onConfirm={remove} destructive />
<ConfirmDialog bind:open={isParentDeleteOpen} title="Lepas Akun Orang Tua" description="Akun akan dilepas dari siswa ini. Jika tidak terhubung ke siswa lain, akun orang tua juga akan dihapus." onConfirm={removeParent} destructive />
</PageShell>
