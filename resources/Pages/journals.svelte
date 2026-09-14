<script lang="ts">
  import { router } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import Sidebar from '../Components/Sidebar.svelte';
  import DataTable from '../Components/DataTable.svelte';
  import Button from '../Components/Button.svelte';
  import Label from '../Components/Label.svelte';
  import Modal from '../Components/Modal.svelte';
  import ConfirmDialog from '../Components/ConfirmDialog.svelte';
  import Select from '../Components/Select.svelte';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import type { Journal, Schedule } from '../types';

  interface TeacherDailySchedule extends Schedule {
    class_name: string;
    subject_name: string;
  }
  import { timestampToTimeInput } from '$lib/utils/datetime';
  import { BookOpen, Pencil, Plus, Trash2 } from '@lucide/svelte';

  interface JournalRow extends Journal {
    class_name?: string;
    subject_name?: string;
  }

  let {
    permissions,
    journals = [],
    todaySchedules = [],
    todayJournalIds = {},
    confirmedToday = true,
  }: {
    permissions: { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean };
    journals?: JournalRow[];
    todaySchedules?: TeacherDailySchedule[];
    todayJournalIds?: Record<string, string>;
    confirmedToday?: boolean;
  } = $props();

  let isOpen = $state(false);
  let isDeleteOpen = $state(false);
  let form = $state({ schedule_id: '', material: '' });
  let selected: JournalRow | null = $state(null);

  const todayLabel = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  const scheduleLabel = (s: TeacherDailySchedule) =>
    `${s.class_name ?? ''} · ${s.subject_name ?? ''} · ${timestampToTimeInput(s.start_time)}–${timestampToTimeInput(s.end_time)}`;

  const journalBySchedule = $derived(
    new Map(journals.filter(j => todayJournalIds[j.schedule_id] === j.id).map(j => [j.schedule_id, j])),
  );

  function openCreate(): void {
    selected = null;
    form = { schedule_id: '', material: '' };
    isOpen = true;
  }

  function openEdit(item: JournalRow): void {
    selected = item;
    form = { schedule_id: item.schedule_id, material: item.material };
    isOpen = true;
  }

  function onScheduleChange(): void {
    const existing = journalBySchedule.get(form.schedule_id);
    if (existing) {
      selected = existing;
      form.material = existing.material;
    } else {
      selected = null;
      form.material = '';
    }
  }

  function confirmDelete(item: JournalRow): void { selected = item; isDeleteOpen = true; }

  async function submit(): Promise<void> {
    const result = selected
      ? await api(() => axios.put(`/journals/${selected!.id}`, { material: form.material }))
      : await api(() => axios.post('/journals', form));
    if (result.success) { isOpen = false; router.visit('/journals', { preserveScroll: true }); }
  }

  async function remove(): Promise<void> {
    if (!selected) return;
    const result = await api(() => axios.delete(`/journals/${selected!.id}`));
    if (result.success) { isDeleteOpen = false; router.visit('/journals', { preserveScroll: true }); }
  }

  const columns = [
    { key: 'class_name', label: 'Kelas' },
    { key: 'subject_name', label: 'Mapel' },
    { key: 'date', label: 'Tanggal' },
    { key: 'material', label: 'Materi' },
  ];

  const formatDate = (ts: number) =>
    new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(ts));
</script>

{#snippet rowActions(item: JournalRow)}
  {#if permissions.canEdit}<Button variant="ghost" size="icon" onclick={() => openEdit(item)}><Pencil class="w-4 h-4" /></Button>{/if}
  {#if permissions.canDelete}<Button variant="ghost" size="icon" onclick={() => confirmDelete(item)}><Trash2 class="w-4 h-4 text-destructive" /></Button>{/if}
{/snippet}

{#snippet journalCell({ row, columnKey, value }: { row: Record<string, unknown>; columnKey: string; value: unknown })}
  {#if columnKey === 'date'}
    {formatDate(value as number)}
  {:else if columnKey === 'material'}
    <span class="whitespace-normal line-clamp-2 max-w-md inline-block">{String(value ?? '-')}</span>
  {:else}
    {String(value ?? '-')}
  {/if}
{/snippet}

<Sidebar group="journals" />
<PageShell>
  <PageHeader eyebrow="Jurnal Mengajar" title="Jurnal." description="Catatan harian kegiatan belajar mengajar per jadwal.">
    {#snippet actions()}
      {#if permissions.canCreate}
        <Button onclick={openCreate} size="lg" disabled={todaySchedules.length === 0}>
          <Plus class="w-4 h-4" /> Tambah Jurnal
        </Button>
      {/if}
    {/snippet}
  </PageHeader>

  {#if permissions.canCreate && todaySchedules.length === 0}
    <div class="relative overflow-hidden rounded-2xl border border-border bg-card p-5 mb-6 flex items-center gap-3 shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none">
      <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-warning-500/10 shrink-0"><BookOpen class="h-4.5 w-4.5 text-warning-600 dark:text-warning-400" /></span>
      <p class="text-sm text-muted-foreground">Tidak ada jadwal mengajar hari ini — jurnal hanya bisa diisi untuk jadwal hari ini.</p>
    </div>
  {/if}

  <DataTable {columns} rows={journals} rowAction={rowActions} cell={journalCell} emptyMessage="Belum ada jurnal yang diisi hari ini. Klik 'Tambah Jurnal' untuk mulai." />

<Modal bind:open={isOpen} title={selected ? 'Edit Jurnal' : 'Tambah Jurnal'} description="Jurnal untuk jadwal hari ini. Tanggal dan konfirmasi kehadiran terisi otomatis.">
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <div class="rounded-xl border border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
      Tanggal: <strong class="text-foreground">{todayLabel}</strong>
      {#if !confirmedToday}
        <p class="mt-1 text-destructive text-xs">Anda belum konfirmasi kehadiran hari ini — scan QR absen dulu.</p>
      {/if}
    </div>
    <div class="flex flex-col gap-0">
      <Label for="schedule" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Jadwal</Label>
      <Select id="schedule" bind:value={form.schedule_id} onchange={onScheduleChange} placeholder="Pilih jadwal hari ini" disabled={!!selected}>
        {#each todaySchedules as s}
          <option value={s.id}>{scheduleLabel(s)}{journalBySchedule.has(s.id) ? ' · sudah ada jurnal' : ''}</option>
        {/each}
      </Select>
      {#if journalBySchedule.has(form.schedule_id) && !selected}
        <p class="mt-1.5 text-xs text-primary">Jurnal untuk jadwal ini sudah ada — materi akan diperbarui.</p>
      {/if}
    </div>
    <div class="flex flex-col gap-0">
      <Label for="material" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Materi</Label>
      <textarea
        id="material"
        bind:value={form.material}
        required
        rows="4"
        placeholder="Materi yang diajarkan hari ini..."
        class="border-input bg-card selection:bg-primary/20 dark:bg-input/30 ring-offset-background placeholder:text-muted-foreground font-body flex w-full min-w-0 rounded-xl border px-3.5 py-2.5 text-sm transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
      ></textarea>
    </div>
    <div class="flex justify-end gap-2 pt-4 border-t border-border mt-2">
      <Button variant="outline" onclick={() => isOpen = false}>Batal</Button>
      <Button type="submit" disabled={!form.schedule_id || !form.material.trim()}>{selected ? 'Perbarui' : 'Simpan'}</Button>
    </div>
  </form>
</Modal>

<ConfirmDialog bind:open={isDeleteOpen} title="Hapus Jurnal" onConfirm={remove} destructive />
</PageShell>
