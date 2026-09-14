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

  let { canManage = false, announcements = [] }: { canManage?: boolean; announcements?: AnnouncementView[] } = $props();

  let isOpen = $state(false);
  let isDeleteOpen = $state(false);
  let title = $state('');
  let body = $state('');
  let selected: AnnouncementView | null = $state(null);

  const displayRows = $derived(announcements.map(a => ({
    id: a.id,
    judul: a.title,
    isi: a.body,
    oleh: a.author_name,
    tanggal: new Date(a.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
  })));

  const columns = [
    { key: 'judul', label: 'Judul' },
    { key: 'isi', label: 'Isi' },
    { key: 'oleh', label: 'Oleh' },
    { key: 'tanggal', label: 'Tanggal' },
  ];

  function openCreate(): void {
    selected = null;
    title = '';
    body = '';
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
      : await api(() => axios.post('/announcements', { title, body }));
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
    <Button variant="ghost" size="icon" onclick={() => openEdit(item)}><Pencil class="w-4 h-4" /></Button>
    <Button variant="ghost" size="icon" onclick={() => confirmDelete(item)}><Trash2 class="w-4 h-4 text-destructive" /></Button>
  {/if}
{/snippet}

<Sidebar group="announcements" />
<PageShell>
  <PageHeader eyebrow="Informasi Sekolah" title="Pengumuman." description="Informasi resmi sekolah yang terlihat di dashboard guru, orang tua, dan kepala sekolah.">
    {#snippet actions()}
      {#if canManage}<Button onclick={openCreate} size="lg"><Megaphone class="w-4 h-4 mr-1" /> Buat Pengumuman</Button>{/if}
    {/snippet}
  </PageHeader>
  <DataTable {columns} rows={displayRows} rowAction={rowActions} emptyMessage="Belum ada pengumuman." />

<Modal bind:open={isOpen} title={selected ? 'Edit Pengumuman' : 'Buat Pengumuman'} description="Tulis judul dan isi pengumuman.">
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <div class="flex flex-col gap-0"><Label for="title" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Judul</Label><Input id="title" bind:value={title} required /></div>
    <div class="flex flex-col gap-0">
      <Label for="body" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Isi</Label>
      <textarea id="body" bind:value={body} required rows={5}
        class="w-full rounded-xl border border-input bg-card px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-[color,box-shadow] focus:border-ring focus:ring-2 focus:ring-ring/30"></textarea>
    </div>
    <div class="flex justify-end gap-2 pt-4 border-t border-border mt-2">
      <Button variant="outline" onclick={() => isOpen = false}>Batal</Button>
      <Button type="submit">{selected ? 'Perbarui' : 'Terbitkan'}</Button>
    </div>
  </form>
</Modal>

<ConfirmDialog bind:open={isDeleteOpen} title="Hapus Pengumuman" onConfirm={remove} destructive />
</PageShell>
