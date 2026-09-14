<script lang="ts">
  import { router } from '@inertiajs/svelte';
  import Sidebar from '../Components/Sidebar.svelte';
  import DataTable, { type DataTableCell } from '../Components/DataTable.svelte';
  import Button from '../Components/Button.svelte';
  import Input from '../Components/Input.svelte';
  import Label from '../Components/Label.svelte';
  import Select from '../Components/Select.svelte';
  import Badge from '../Components/Badge.svelte';
  import Pagination from '../Components/Pagination.svelte';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import type { TeacherConfirmationLogView, PaginationMeta } from '../types';
  import { UserCheck } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  type TeacherOption = { user_id: string; user_name: string | null; user_username: string };
  interface LogFilters { start_date: string; end_date: string; teacher_id: string }
  interface DaySummary { confirmed: number; total: number }

  let {
    records = [],
    meta,
    filters = { start_date: '', end_date: '', teacher_id: '' },
    summary = null,
    schoolStartTime = null,
    teachers = [],
    isOwnView = false,
  }: {
    records?: TeacherConfirmationLogView[];
    meta?: PaginationMeta;
    filters?: LogFilters;
    summary?: DaySummary | null;
    schoolStartTime?: string | null;
    teachers?: TeacherOption[];
    isOwnView?: boolean;
  } = $props();

  let startDate = $state('');
  let endDate = $state('');
  let teacherId = $state('');

  $effect(() => {
    startDate = filters.start_date;
    endDate = filters.end_date;
    teacherId = filters.teacher_id;
  });

  function toMinutes(label: string): number | null {
    const [hours, minutes] = label.split(':').map(Number);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
    return hours * 60 + minutes;
  }

  const displayRows = $derived(records.map(r => {
    const at = new Date(r.confirmed_at);
    const waktu = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
    const standard = schoolStartTime ? toMinutes(schoolStartTime) : null;
    const actual = at.getHours() * 60 + at.getMinutes();
    return {
      id: r.id,
      guru: r.teacher_name,
      tanggal: new Date(r.confirmation_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }),
      waktu,
      status: standard === null ? null : (actual <= standard ? 'ontime' : 'late'),
    };
  }));

  const hasFilters = $derived(startDate !== '' || endDate !== '' || teacherId !== '');

  function applyFilters(): void {
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    if (!isOwnView && teacherId) params.set('teacher_id', teacherId);
    const query = params.toString();
    router.visit(query ? `/teacher/confirmations?${query}` : '/teacher/confirmations', { preserveScroll: true });
  }

  function resetFilters(): void {
    router.visit('/teacher/confirmations', { preserveScroll: true });
  }

  const columns = [
    { key: 'guru', label: 'Guru' },
    { key: 'tanggal', label: 'Tanggal' },
    { key: 'waktu', label: 'Waktu Konfirmasi' },
  ];
</script>

{#snippet timeCell(ctx: DataTableCell)}
  {#if ctx.columnKey === 'waktu'}
    <span class="font-medium">{String(ctx.value ?? '-')}</span>
    {#if ctx.row.status === 'late'}
      <Badge variant="destructive" class="ml-2">Terlambat</Badge>
    {:else if ctx.row.status === 'ontime'}
      <Badge class="ml-2">Tepat Waktu</Badge>
    {/if}
  {:else}
    {String(ctx.value ?? '-')}
  {/if}
{/snippet}

<Sidebar group="teacher-confirmations" />
<PageShell>
  <PageHeader eyebrow="Konfirmasi Guru" title="Log Kehadiran Guru." description="Riwayat konfirmasi kehadiran guru berdasarkan scan QR absen harian." />

  {#if summary}
    <section class="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none p-5 flex items-center gap-4 mb-6" in:fly={{ y: 20, duration: 800, delay: 60 }}>
      <div class="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/[0.03] to-transparent dark:from-white/[0.03]"></div>
      <span class="flex items-center justify-center h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
        <UserCheck class="h-5 w-5 text-primary" />
      </span>
      <div class="min-w-0">
        <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Ringkasan Hari Ini</p>
        <p class="mt-1 text-sm">
          <strong class="font-semibold">{summary.confirmed} dari {summary.total}</strong> guru sudah konfirmasi hari ini{#if schoolStartTime}<span class="text-muted-foreground"> · Batas tepat waktu {schoolStartTime}</span>{/if}
        </p>
      </div>
    </section>
  {/if}

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] gap-3 mb-6">
    <div class="flex flex-col gap-0">
      <Label for="log-start" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Dari Tanggal</Label>
      <Input id="log-start" type="date" bind:value={startDate} onchange={applyFilters} />
    </div>
    <div class="flex flex-col gap-0">
      <Label for="log-end" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Sampai Tanggal</Label>
      <Input id="log-end" type="date" bind:value={endDate} onchange={applyFilters} />
    </div>
    {#if !isOwnView}
      <div class="flex flex-col gap-0">
        <Label for="log-teacher" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Guru</Label>
        <Select id="log-teacher" bind:value={teacherId} onchange={applyFilters} placeholder="Semua guru">
          {#each teachers as t}<option value={t.user_id}>{t.user_name || t.user_username}</option>{/each}
        </Select>
      </div>
    {/if}
    {#if hasFilters}
      <div class="flex items-end">
        <Button variant="outline" onclick={resetFilters}>Reset</Button>
      </div>
    {/if}
  </div>

  <DataTable {columns} rows={displayRows} cell={timeCell} emptyMessage={hasFilters ? 'Tidak ada data yang cocok dengan filter.' : 'Belum ada konfirmasi kehadiran.'} />
  {#if meta}<Pagination {meta} />{/if}
</PageShell>
