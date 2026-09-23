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
  import SearchableSelect from '../Components/SearchableSelect.svelte';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import type { Journal, JournalSlotView } from '../types';

  import { cn } from '$lib/utils.js';
  import { BookOpen, Pencil, Plus, Trash2 } from '@lucide/svelte';

  interface JournalRow extends Journal {
    class_name?: string;
    subject_name?: string;
  }

  type AttendanceStatus = 'present' | 'sick' | 'leave' | 'absent';
  interface RosterStudent { id: string; name: string; nis: string }

  let {
    permissions,
    journals = [],
    journalSlots = [],
    confirmedToday = true,
    rosterByClass = {},
    attendanceByJournal = {},
  }: {
    permissions: { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean };
    journals?: JournalRow[];
    journalSlots?: JournalSlotView[];
    confirmedToday?: boolean;
    rosterByClass?: Record<string, RosterStudent[]>;
    attendanceByJournal?: Record<string, { student_id: string; status: string }[]>;
  } = $props();

  let isOpen = $state(false);
  let isDeleteOpen = $state(false);
  let form = $state({ schedule_id: '', material: '' });
  let attendance = $state<Record<string, AttendanceStatus>>({});
  let selected: JournalRow | null = $state(null);

  const todayLabel = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  const slotLabel = (slot: JournalSlotView) =>
    `${formatDate(slot.date)} · ${slot.class_name} · ${slot.subject_name} · ${slot.time}${slot.is_late ? ' · susulan' : ''}`;

  const journalBySlot = $derived(
    new Map(journalSlots.filter(s => s.journal_id).map(s => [s.schedule_id, journals.find(j => j.id === s.journal_id) ?? null])),
  );

  const selectedSlot = $derived(journalSlots.find(s => s.schedule_id === form.schedule_id));
  const roster = $derived<RosterStudent[]>(selectedSlot ? (rosterByClass[selectedSlot.class_id] ?? []) : []);
  const selectedDateLabel = $derived(selectedSlot ? formatDate(selectedSlot.date) : todayLabel);

  const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
    { value: 'present', label: 'Hadir' },
    { value: 'sick', label: 'Sakit' },
    { value: 'leave', label: 'Izin' },
    { value: 'absent', label: 'Alpa' },
  ];

  const attendanceCounts = $derived.by(() => {
    const c = { present: 0, sick: 0, leave: 0, absent: 0 };
    for (const st of roster) c[attendance[st.id] ?? 'present']++;
    return c;
  });

  function loadAttendance(journalId: string | null): void {
    const map: Record<string, AttendanceStatus> = {};
    const existing = journalId ? (attendanceByJournal[journalId] ?? []) : [];
    const existingMap = new Map(existing.map(a => [a.student_id, a.status as AttendanceStatus]));
    for (const st of roster) map[st.id] = existingMap.get(st.id) ?? 'present';
    attendance = map;
  }

  function openCreate(): void {
    selected = null;
    form = { schedule_id: '', material: '' };
    attendance = {};
    isOpen = true;
  }

  function openEdit(item: JournalRow): void {
    selected = item;
    form = { schedule_id: item.schedule_id, material: item.material };
    loadAttendance(item.id);
    isOpen = true;
  }

  function onScheduleChange(): void {
    const existing = journalBySlot.get(form.schedule_id);
    if (existing) {
      selected = existing;
      form.material = existing.material;
      loadAttendance(existing.id);
    } else {
      selected = null;
      form.material = '';
      loadAttendance(null);
    }
  }

  function confirmDelete(item: JournalRow): void { selected = item; isDeleteOpen = true; }

  async function submit(): Promise<void> {
    const payload = {
      schedule_id: form.schedule_id,
      ...(selectedSlot ? { date: selectedSlot.date } : {}),
      material: form.material,
      attendance: roster.map(st => ({ student_id: st.id, status: attendance[st.id] ?? 'present' })),
    };
    const result = selected
      ? await api(() => axios.put(`/journals/${selected!.id}`, { material: form.material, attendance: payload.attendance }))
      : await api(() => axios.post('/journals', payload));
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
        <Button onclick={openCreate} size="lg" disabled={journalSlots.length === 0}>
          <Plus class="w-4 h-4" /> Tambah Jurnal
        </Button>
      {/if}
    {/snippet}
  </PageHeader>

  {#if permissions.canCreate && journalSlots.length === 0}
    <div class="relative overflow-hidden rounded-2xl border border-border bg-card p-5 mb-6 flex items-center gap-3 shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none">
      <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-success-500/10 shrink-0"><BookOpen class="h-4.5 w-4.5 text-success-600 dark:text-success-400" /></span>
      <p class="text-sm text-muted-foreground">Semua sesi tiga hari terakhir sudah terisi jurnal — tidak ada yang menunggu.</p>
    </div>
  {/if}

  <DataTable {columns} rows={journals} rowAction={rowActions} cell={journalCell} emptyMessage="Belum ada jurnal yang diisi. Klik 'Tambah Jurnal' untuk mulai." />

<Modal bind:open={isOpen} title={selected ? 'Edit Jurnal' : 'Tambah Jurnal'} description="Pilih sesi yang sudah berlangsung. Jurnal susulan hanya bisa diisi bila Anda tercatat hadir pada hari itu.">
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <div class="rounded-xl border border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
      Tanggal: <strong class="text-foreground">{selectedDateLabel}</strong>
      {#if !confirmedToday}
        <p class="mt-1 text-destructive text-xs">Anda belum konfirmasi kehadiran hari ini — scan QR absen dulu untuk sesi hari ini.</p>
      {/if}
    </div>
    <div class="flex flex-col gap-0">
      <Label for="schedule" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Jadwal</Label>
      <SearchableSelect id="schedule" bind:value={form.schedule_id} onchange={onScheduleChange} placeholder="Pilih sesi yang belum dijurnal" disabled={!!selected} options={journalSlots.map(s => ({ value: s.schedule_id, label: `${slotLabel(s)}${journalBySlot.get(s.schedule_id) ? ' · sudah ada jurnal' : ''}` }))} />
      {#if journalBySlot.get(form.schedule_id) && !selected}
        <p class="mt-1.5 text-xs text-primary">Jurnal untuk sesi ini sudah ada — materi akan diperbarui.</p>
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
    {#if roster.length > 0}
      <div class="flex flex-col gap-0">
        <div class="flex items-center justify-between mb-1.5">
          <Label class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground">Presensi Siswa</Label>
          <span class="text-xs text-muted-foreground font-mono-accent">
            <span class="text-primary font-semibold">{attendanceCounts.present}</span> Hadir ·
            <span class="text-warning-600 dark:text-warning-400 font-semibold">{attendanceCounts.sick}</span> Sakit ·
            {attendanceCounts.leave} Izin ·
            <span class="text-destructive font-semibold">{attendanceCounts.absent}</span> Alpa
          </span>
        </div>
        <div class="rounded-xl border border-border divide-y divide-border max-h-64 overflow-y-auto">
          {#each roster as st (st.id)}
            <div class="flex items-center gap-3 px-3.5 py-2.5">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-foreground truncate">{st.name}</p>
                <p class="text-xs text-muted-foreground font-mono-accent">{st.nis}</p>
              </div>
              <div class="flex gap-1 shrink-0">
                {#each STATUS_OPTIONS as opt}
                  <button
                    type="button"
                    onclick={() => attendance[st.id] = opt.value}
                    class={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors border',
                      (attendance[st.id] ?? 'present') === opt.value
                        ? opt.value === 'present' ? 'bg-primary/10 border-primary/30 text-primary'
                          : opt.value === 'sick' ? 'bg-warning-500/10 border-warning-500/30 text-warning-600 dark:text-warning-400'
                          : opt.value === 'absent' ? 'bg-destructive/10 border-destructive/30 text-destructive'
                          : 'bg-secondary border-border text-foreground'
                        : 'border-transparent text-muted-foreground hover:bg-secondary/60'
                    )}
                  >{opt.label}</button>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    <div class="flex justify-end gap-2 pt-4 border-t border-border mt-2">
      <Button variant="outline" onclick={() => isOpen = false}>Batal</Button>
      <Button type="submit" disabled={!form.schedule_id || !form.material.trim()}>{selected ? 'Perbarui' : 'Simpan'}</Button>
    </div>
  </form>
</Modal>

<ConfirmDialog bind:open={isDeleteOpen} title="Hapus Jurnal" onConfirm={remove} destructive />
</PageShell>
