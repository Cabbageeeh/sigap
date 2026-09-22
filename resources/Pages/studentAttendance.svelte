<script lang="ts">
  import { router } from '@inertiajs/svelte';
  import Sidebar from '../Components/Sidebar.svelte';
  import DataTable from '../Components/DataTable.svelte';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import SearchableSelect from '../Components/SearchableSelect.svelte';
  import Input from '../Components/Input.svelte';
  import Label from '../Components/Label.svelte';
  import Button from '../Components/Button.svelte';
  import { timestampToDateInput } from '$lib/utils/datetime';
  import { ClipboardCheck, FileText } from '@lucide/svelte';

  interface RecapRow {
    student_id: string;
    student_name: string;
    nis: string;
    present: number;
    sick: number;
    leave: number;
    absent: number;
    total: number;
  }

  let {
    classes = [],
    recap = [],
    filters,
    canViewRapor = false,
  }: {
    classes?: { id: string; name: string }[];
    recap?: RecapRow[];
    filters: { class_id: string; from: number; to: number };
    canViewRapor?: boolean;
  } = $props();

  let classId = $state<string | null>(filters.class_id);
  let fromInput = $state(timestampToDateInput(filters.from));
  let toInput = $state(timestampToDateInput(filters.to));

  function applyFilters(): void {
    const params = new URLSearchParams();
    if (classId) params.set('class_id', classId);
    if (fromInput) params.set('from', String(new Date(fromInput + 'T00:00:00').getTime()));
    if (toInput) params.set('to', String(new Date(toInput + 'T23:59:59').getTime()));
    router.visit(`/attendance?${params.toString()}`, { preserveScroll: true });
  }

  const columns = [
    { key: 'nis', label: 'NIS' },
    { key: 'student_name', label: 'Siswa' },
    { key: 'present', label: 'Hadir' },
    { key: 'sick', label: 'Sakit' },
    { key: 'leave', label: 'Izin' },
    { key: 'absent', label: 'Alpa' },
    { key: 'total', label: 'Total' },
  ];

  const totals = $derived({
    present: recap.reduce((s, r) => s + r.present, 0),
    sick: recap.reduce((s, r) => s + r.sick, 0),
    leave: recap.reduce((s, r) => s + r.leave, 0),
    absent: recap.reduce((s, r) => s + r.absent, 0),
  });
</script>

{#snippet recapCell({ columnKey, value }: { row: Record<string, unknown>; columnKey: string; value: unknown })}
  {#if columnKey === 'present'}
    <span class="font-mono-accent text-primary font-semibold">{value}</span>
  {:else if columnKey === 'sick'}
    <span class="font-mono-accent text-warning-600 dark:text-warning-400">{value}</span>
  {:else if columnKey === 'leave'}
    <span class="font-mono-accent text-muted-foreground">{value}</span>
  {:else if columnKey === 'absent'}
    <span class="font-mono-accent text-destructive font-semibold">{value}</span>
  {:else}
    {String(value ?? '-')}
  {/if}
{/snippet}

{#snippet raporAction(row: RecapRow)}
  <Button variant="ghost" size="sm" onclick={() => router.visit(`/reports/rapor/${row.student_id}`)}>
    <FileText class="w-3.5 h-3.5" /> Rapor
  </Button>
{/snippet}

<Sidebar group="attendance" />
<PageShell>
  <PageHeader eyebrow="Kehadiran Siswa" title="Rekap Kehadiran." description="Rekap kehadiran siswa per kelas — diisi otomatis dari jurnal mengajar." />

  <div class="relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 mb-6 shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none">
    <div class="flex flex-wrap items-end gap-3">
      <div class="flex flex-col gap-0 min-w-40">
        <Label for="f-class" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Kelas</Label>
        <SearchableSelect id="f-class" bind:value={classId} onchange={applyFilters} placeholder="Pilih kelas" options={classes.map(c => ({ value: c.id, label: c.name }))} />
      </div>
      <div class="flex flex-col gap-0">
        <Label for="f-from" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Dari</Label>
        <Input id="f-from" type="date" bind:value={fromInput} onchange={applyFilters} />
      </div>
      <div class="flex flex-col gap-0">
        <Label for="f-to" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Sampai</Label>
        <Input id="f-to" type="date" bind:value={toInput} onchange={applyFilters} />
      </div>
      <Button variant="outline" onclick={applyFilters}>Terapkan</Button>
      <div class="ml-auto flex items-center gap-3 text-xs text-muted-foreground font-mono-accent">
        <span><span class="text-primary font-semibold">{totals.present}</span> Hadir</span>
        <span><span class="text-warning-600 dark:text-warning-400 font-semibold">{totals.sick}</span> Sakit</span>
        <span>{totals.leave} Izin</span>
        <span><span class="text-destructive font-semibold">{totals.absent}</span> Alpa</span>
      </div>
    </div>
  </div>

  {#if classes.length === 0}
    <div class="relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-center shadow-[0_1px_2px_rgba(32,36,38,0.04)] dark:shadow-none">
      <span class="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/60 mb-3"><ClipboardCheck class="h-5 w-5 text-muted-foreground" /></span>
      <p class="text-sm text-muted-foreground">Belum ada kelas yang bisa direkap. Kehadiran siswa diisi lewat form Tambah Jurnal.</p>
    </div>
  {:else}
    <DataTable {columns} rows={recap} keyField="student_id" cell={recapCell} rowAction={canViewRapor ? raporAction : undefined} emptyMessage="Belum ada data kehadiran pada rentang ini — isi lewat form Tambah Jurnal." />
  {/if}
</PageShell>
