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
  import SearchableSelect from '../Components/SearchableSelect.svelte';
  import Pagination from '../Components/Pagination.svelte';
  import type { Parent, ParentForm, PaginationMeta } from '../types';
  import { createEmptyParentForm, parentToForm } from '../types';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import { Pencil, Plus, Trash2 } from '@lucide/svelte';

  type ParentRow = Parent & { user_name: string | null; user_username: string; student_count: number };
  type UserOption = { id: string; name: string | null; username: string };
  type StudentOption = { id: string; nis: string; name: string; class_name: string | null; parent_user_id: string | null };
  let { permissions, parents = [], users = [], students = [], meta }: { permissions: { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean }; parents?: ParentRow[]; users?: UserOption[]; students?: StudentOption[]; meta?: PaginationMeta } = $props();

  let isOpen = $state(false);
  let isDeleteOpen = $state(false);
  let form: ParentForm = $state(createEmptyParentForm());
  let selected: Parent | null = $state(null);
  let studentQuery = $state('');

  const filteredStudents = $derived.by(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s => s.name.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q));
  });

  function toggleStudent(studentId: string): void {
    form.student_ids = form.student_ids.includes(studentId)
      ? form.student_ids.filter(id => id !== studentId)
      : [...form.student_ids, studentId];
  }

  function openCreate(): void { form = createEmptyParentForm(); selected = null; studentQuery = ''; isOpen = true; }
  function openEdit(item: Parent): void {
    selected = item;
    form = { ...parentToForm(item), student_ids: students.filter(s => s.parent_user_id === item.user_id).map(s => s.id) };
    studentQuery = '';
    isOpen = true;
  }
  function confirmDelete(item: Parent): void { selected = item; isDeleteOpen = true; }

  async function submit(): Promise<void> {
    const result = selected
      ? await api(() => axios.put(`/parents/${selected!.id}`, form))
      : await api(() => axios.post('/parents', form));
    if (result.success) { isOpen = false; router.visit('/parents', { preserveScroll: true }); }
  }
  async function remove(): Promise<void> {
    if (!selected) return;
    const result = await api(() => axios.delete(`/parents/${selected!.id}`));
    if (result.success) { isDeleteOpen = false; router.visit('/parents', { preserveScroll: true }); }
  }

  const columns = [{ key: 'user_name', label: 'Pengguna' }, { key: 'student_count', label: 'Anak' }, { key: 'phone', label: 'Telepon' }, { key: 'address', label: 'Alamat' }];
</script>

{#snippet rowActions(item: ParentRow)}
  {#if permissions.canEdit}<Button variant="ghost" size="icon" onclick={() => openEdit(item)}><Pencil class="w-4 h-4" /></Button>{/if}
  {#if permissions.canDelete}<Button variant="ghost" size="icon" onclick={() => confirmDelete(item)}><Trash2 class="w-4 h-4 text-destructive" /></Button>{/if}
{/snippet}

<Sidebar group="parents" />
<PageShell>
  <PageHeader eyebrow="Manajemen Orang Tua" title="Orang Tua." description="Data orang tua siswa. Tambah, edit, atau hapus data wali.">
    {#snippet actions()}
      {#if permissions.canCreate}<Button onclick={openCreate} size="lg"><Plus class="w-4 h-4" /> Tambah Orang Tua</Button>{/if}
    {/snippet}
  </PageHeader>
  <DataTable {columns} rows={parents} rowAction={rowActions} />
  {#if meta}<Pagination {meta} />{/if}

<Modal bind:open={isOpen} title={selected ? 'Edit Orang Tua' : 'Tambah Orang Tua'} description="Tambah atau ubah data orang tua. Pilih pengguna dan isi kontak.">
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <div class="flex flex-col gap-0"><Label for="user" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Pengguna</Label>
      <SearchableSelect id="user" bind:value={form.user_id} placeholder="Pilih pengguna" options={users.map(u => ({ value: u.id, label: u.name ?? u.username }))} />
    </div>
    <div class="flex flex-col gap-0"><Label for="phone" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Telepon</Label><Input id="phone" bind:value={form.phone} /></div>
    <div class="flex flex-col gap-0"><Label for="address" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Alamat</Label><Input id="address" bind:value={form.address} /></div>
    <fieldset>
      <Label class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Anak yang diwakili</Label>
      {#if students.length === 0}
        <p class="text-sm text-muted-foreground">Belum ada data siswa.</p>
      {:else}
        <Input bind:value={studentQuery} placeholder="Cari nama atau NIS siswa..." class="mb-2" />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-xl border border-border p-3">
          {#each filteredStudents as student (student.id)}
            <label class="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm cursor-pointer hover:bg-secondary/40">
              <input type="checkbox" checked={form.student_ids.includes(student.id)} onchange={() => toggleStudent(student.id)} class="h-4 w-4 shrink-0 accent-primary" />
              <span class="truncate">{student.nis} — {student.name} <span class="text-muted-foreground">({student.class_name ?? '—'})</span></span>
            </label>
          {:else}
            <p class="text-sm text-muted-foreground col-span-2">Tidak ada siswa yang cocok.</p>
          {/each}
        </div>
        <p class="text-[11px] text-muted-foreground mt-1.5">{form.student_ids.length} siswa dipilih. Menghapus centang akan melepas tautan siswa dari orang tua ini.</p>
      {/if}
    </fieldset>
    <div class="flex justify-end gap-2 pt-4 border-t border-border mt-2">
      <Button variant="outline" onclick={() => isOpen = false}>Batal</Button>
      <Button type="submit" disabled={!form.user_id}>{selected ? 'Perbarui' : 'Buat'}</Button>
    </div>
  </form>
</Modal>

<ConfirmDialog bind:open={isDeleteOpen} title="Hapus Orang Tua" onConfirm={remove} destructive />
</PageShell>
