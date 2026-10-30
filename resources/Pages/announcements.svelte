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
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import { Pencil, Trash2, Megaphone } from '@lucide/svelte';
  import type { AnnouncementView } from '../types';

  let { canManage = false, canCreateClassTasks = false, classes = [], announcements = [] }: {
    canManage?: boolean;
    canCreateClassTasks?: boolean;
    classes?: Array<{ id: string; name: string; grade: string }>;
    announcements?: AnnouncementView[];
  } = $props();

  let isOpen = $state(false);
  let isDeleteOpen = $state(false);
  let title = $state('');
  let body = $state('');
  let classId = $state('');
  let dueDate = $state('');
  let selected: AnnouncementView | null = $state(null);

  const displayRows = $derived(announcements.map(a => ({
    id: a.id,
    judul: a.title,
    isi: a.body,
    oleh: a.author_name,
    tanggal: new Date(a.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
    kelas: a.class_name ?? 'Semua warga sekolah',
    batas: a.due_date ? new Date(`${a.due_date}T00:00:00`).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : 'Tanpa batas waktu',
  })));

  const columns = [
    { key: 'judul', label: 'Judul' },
    { key: 'isi', label: 'Isi' },
    { key: 'oleh', label: 'Oleh' },
    { key: 'kelas', label: 'Sasaran' },
    { key: 'batas', label: 'Batas tugas' },
    { key: 'tanggal', label: 'Tanggal' },
  ];

  function openCreate(): void {
    selected = null;
    title = '';
    body = '';
    classId = classes[0]?.id ?? '';
    dueDate = '';
    isOpen = true;
  }

  function openEdit(item: AnnouncementView): void {
    selected = item;
    title = item.title;
    body = item.body;
    isOpen = true;
  }

  function confirmDelete(item: AnnouncementView): void {
    selected = item;
    isDeleteOpen = true;
  }

  async function submit(): Promise<void> {
    const result = selected
      ? await api(() => axios.put(`/announcements/${selected!.id}`, { title, body }))
      : await api(() => axios.post('/announcements', canCreateClassTasks
        ? { title, body, class_id: classId, due_date: dueDate }
        : { title, body }));
    if (result.success) { isOpen = false; router.visit('/announcements', { preserveScroll: true }); }
  }

  async function remove(): Promise<void> {
    if (!selected) return;
    const result = await api(() => axios.delete(`/announcements/${selected!.id}`));
    if (result.success) { isDeleteOpen = false; router.visit('/announcements', { preserveScroll: true }); }
  }
</script>

{#snippet rowActions(item: AnnouncementView)}
  {#if canManage}
    <Button variant="outline" size="icon-sm" title="Ubah pengumuman" aria-label="Ubah pengumuman" class="mr-1" onclick={() => openEdit(item)}><Pencil class="w-4 h-4" /></Button>
    <Button variant="outline" size="icon-sm" title="Hapus pengumuman" aria-label="Hapus pengumuman" class="text-destructive hover:bg-destructive/10 hover:text-destructive" onclick={() => confirmDelete(item)}><Trash2 class="w-4 h-4" /></Button>
  {/if}
{/snippet}

<Sidebar group="announcements" />
<PageShell>
  <PageHeader eyebrow={canCreateClassTasks ? 'Tugas Kelas' : 'Informasi Sekolah'} title={canCreateClassTasks ? 'Tugas untuk murid.' : 'Pengumuman.'} description={canCreateClassTasks ? 'Bagikan tugas untuk kelas yang Anda ajar. Orang tua siswa di kelas tersebut akan melihatnya di dashboard.' : 'Informasi resmi sekolah yang terlihat di dashboard guru, orang tua, dan kepala sekolah.'}>
    {#snippet actions()}
      {#if canManage || (canCreateClassTasks && classes.length > 0)}<Button onclick={openCreate} size="lg"><Megaphone class="w-4 h-4 mr-1" /> {canCreateClassTasks ? 'Bagikan Tugas' : 'Buat Pengumuman'}</Button>{/if}
    {/snippet}
  </PageHeader>
  <DataTable {columns} rows={displayRows} rowAction={rowActions} emptyMessage={canCreateClassTasks ? 'Belum ada tugas yang Anda bagikan.' : 'Belum ada pengumuman.'} />

<Modal bind:open={isOpen} title={selected ? 'Edit Pengumuman' : canCreateClassTasks ? 'Bagikan tugas kelas' : 'Buat Pengumuman'} description={canCreateClassTasks ? 'Tugas akan tampil di dashboard orang tua siswa dari kelas yang dipilih.' : 'Tulis judul dan isi pengumuman.'}>
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    {#if canCreateClassTasks}
      <div class="flex flex-col gap-0"><Label for="task-class" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Kelas</Label>
        <select id="task-class" bind:value={classId} required class="h-10 rounded-xl border border-input bg-card px-3 text-sm text-foreground">
          {#each classes as item (item.id)}<option value={item.id}>{item.grade} · {item.name}</option>{/each}
        </select>
      </div>
    {/if}
    <div class="flex flex-col gap-0"><Label for="title" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Judul</Label><Input id="title" bind:value={title} required /></div>
    {#if canCreateClassTasks}
      <div class="flex flex-col gap-0"><Label for="due-date" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Batas pengumpulan (opsional)</Label><Input id="due-date" type="date" bind:value={dueDate} /></div>
    {/if}
    <div class="flex flex-col gap-0">
      <Label for="body" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">{canCreateClassTasks ? 'Rincian tugas' : 'Isi'}</Label>
      <textarea id="body" bind:value={body} required rows={5}
        class="w-full rounded-xl border border-input bg-card px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-[color,box-shadow] focus:border-ring focus:ring-2 focus:ring-ring/30"></textarea>
    </div>
    <div class="flex justify-end gap-2 pt-4 border-t border-border mt-2">
      <Button variant="outline" onclick={() => isOpen = false}>Batal</Button>
      <Button type="submit">{selected ? 'Perbarui' : canCreateClassTasks ? 'Bagikan tugas' : 'Terbitkan'}</Button>
    </div>
  </form>
</Modal>

<ConfirmDialog bind:open={isDeleteOpen} title="Hapus Pengumuman" onConfirm={remove} destructive />
</PageShell>
