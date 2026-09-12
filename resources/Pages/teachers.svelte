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
  import Pagination from '../Components/Pagination.svelte';
  import type { Teacher, TeacherForm, Subject, PaginationMeta } from '../types';
  import { createEmptyTeacherForm, teacherToForm } from '../types';
  import { CalendarClock, Pencil, Trash2 } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  type TeacherRow = Teacher & { user_name: string | null; user_username: string; subject_names: string | null };

  let { permissions, teachers = [], subjects = [], meta, search = '' }: { permissions: { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean }; teachers?: TeacherRow[]; subjects?: Subject[]; meta?: PaginationMeta; search?: string } = $props();

  let isOpen = $state(false);
  let isDeleteOpen = $state(false);
  let form: TeacherForm = $state(createEmptyTeacherForm());
  let selected: TeacherRow | null = $state(null);
  let searchValue = $state('');

  $effect(() => { searchValue = search; });

  function openCreate(): void { form = createEmptyTeacherForm(); selected = null; isOpen = true; }
  async function openEdit(item: TeacherRow): Promise<void> {
    selected = item;
    form = teacherToForm(item);
    const result = await api<{ subjects: { subject_id: string }[] }>(() => axios.get(`/teachers/${item.id}`), { showSuccessToast: false });
    if (result.success && result.data) {
      form.subject_ids = result.data.subjects.map(entry => entry.subject_id);
    }
    isOpen = true;
  }
  function confirmDelete(item: TeacherRow): void { selected = item; isDeleteOpen = true; }

  function toggleSubject(subjectId: string): void {
    form.subject_ids = form.subject_ids.includes(subjectId)
      ? form.subject_ids.filter(id => id !== subjectId)
      : [...form.subject_ids, subjectId];
  }

  function submitSearch(): void {
    const query = searchValue.trim();
    router.visit(query ? `/teachers?search=${encodeURIComponent(query)}` : '/teachers', { preserveScroll: true });
  }

  function openAssignments(item: TeacherRow): void {
    router.visit(`/teacher-assignments?teacher_id=${item.id}`);
  }

  async function submit(): Promise<void> {
    const payload = { nip: form.nip.trim(), name: form.name.trim(), subject_ids: form.subject_ids };
    const result = selected
      ? await api(() => axios.put(`/teachers/${selected!.id}`, payload))
      : await api(() => axios.post('/teachers', payload));
    if (result.success) { isOpen = false; router.visit('/teachers', { preserveScroll: true }); }
  }
  async function remove(): Promise<void> {
    if (!selected) return;
    const result = await api(() => axios.delete(`/teachers/${selected!.id}`));
    if (result.success) { isDeleteOpen = false; router.visit('/teachers', { preserveScroll: true }); }
  }

  const columns = [{ key: 'employee_id', label: 'NIP' }, { key: 'user_name', label: 'Nama' }, { key: 'subject_names', label: 'Daftar Mapel' }];
</script>

{#snippet rowActions(item: TeacherRow)}
  <Button variant="ghost" size="icon" title="Kontrak Mengajar" onclick={() => openAssignments(item)}><CalendarClock class="w-4 h-4" /></Button>
  {#if permissions.canEdit}<Button variant="ghost" size="icon" onclick={() => openEdit(item)}><Pencil class="w-4 h-4" /></Button>{/if}
  {#if permissions.canDelete}<Button variant="ghost" size="icon" onclick={() => confirmDelete(item)}><Trash2 class="w-4 h-4 text-destructive" /></Button>{/if}
{/snippet}

<Sidebar group="teachers" />
<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8" in:fly={{ y: 20, duration: 800 }}>
    <div>
      <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Manajemen Guru</p>
      <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground">
        Guru.
      </h1>
      <p class="mt-4 text-base text-muted-foreground leading-relaxed max-w-[52ch]">
        Data guru terdaftar beserta NIP dan mata pelajaran. Tambah, edit, atau hapus.
      </p>
    </div>
    {#if permissions.canCreate}<Button onclick={openCreate} size="lg">Tambah Guru</Button>{/if}
  </div>
  <div class="flex flex-col md:flex-row gap-3 mb-6">
    <form class="flex flex-1 gap-2" onsubmit={(event) => { event.preventDefault(); submitSearch(); }}>
      <Input type="search" placeholder="Cari NIP atau nama guru..." bind:value={searchValue} class="flex-1" />
      <Button type="submit" variant="outline">Cari</Button>
    </form>
  </div>
  <DataTable {columns} rows={teachers} rowAction={rowActions} />
  {#if meta}<Pagination {meta} />{/if}
</div>

<Modal bind:open={isOpen} title={selected ? 'Edit Guru' : 'Tambah Guru'} description={selected ? 'Ubah NIP, nama, dan kompetensi mata pelajaran guru.' : 'Akun login dibuat otomatis: guru_[4 digit terakhir NIP] dengan kata sandi guru123.'}>
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <div class="flex flex-col gap-0"><Label for="nip" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">NIP</Label><Input id="nip" bind:value={form.nip} required /></div>
    <div class="flex flex-col gap-0"><Label for="name" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Nama</Label><Input id="name" bind:value={form.name} required /></div>
    <fieldset>
      <Label class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Mata Pelajaran</Label>
      {#if subjects.length === 0}
        <p class="text-sm text-muted-foreground">Belum ada mata pelajaran. Tambahkan dulu di menu Mata Pelajaran.</p>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto rounded-xl border border-border p-3">
          {#each subjects as subject (subject.id)}
            <label class="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm cursor-pointer hover:bg-secondary/40">
              <input type="checkbox" checked={form.subject_ids.includes(subject.id)} onchange={() => toggleSubject(subject.id)} class="h-4 w-4 shrink-0 accent-primary" />
              <span class="truncate">{subject.name}</span>
            </label>
          {/each}
        </div>
      {/if}
    </fieldset>
    <div class="flex justify-end gap-2 pt-4 border-t border-border mt-2">
      <Button variant="outline" onclick={() => isOpen = false}>Batal</Button>
      <Button type="submit">{selected ? 'Perbarui' : 'Buat'}</Button>
    </div>
  </form>
</Modal>

<ConfirmDialog bind:open={isDeleteOpen} title="Hapus Guru" onConfirm={remove} destructive />
