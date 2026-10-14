<script lang="ts">
  import { inertia, router } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import { Toast } from '$lib/toast';
  import Sidebar from '../Components/Sidebar.svelte';
  import Button from '../Components/Button.svelte';
  import Input from '../Components/Input.svelte';
  import Label from '../Components/Label.svelte';
  import Select from '../Components/Select.svelte';
  import SearchableSelect from '../Components/SearchableSelect.svelte';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import { Download, FileSpreadsheet, LockKeyhole, Save, Loader2, Plus, Pencil, Trash2 } from '@lucide/svelte';
  import Modal from '../Components/Modal.svelte';
  import ConfirmDialog from '../Components/ConfirmDialog.svelte';

  const GRADE_TYPES = [
    { value: 'task', label: 'Tugas' },
    { value: 'daily_quiz', label: 'Kuis Harian' },
    { value: 'midterm', label: 'UTS' },
    { value: 'final', label: 'UAS' },
  ] as const;


  let {
    permissions,
    students = [],
    subjects = [],
    classes = [],
    years = [],
    summary = null,
    classId = '',
    subjectId = '',
    type: typeProp = 'task',
    confirmationRequired = false,
  }: {
    permissions: { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean };
    students?: Student[];
    subjects?: Subject[];
    classes?: Class[];
    years?: AcademicYear[];
    summary?: ClassSubjectSummary | null;
    classId?: string;
    subjectId?: string;
    type?: string;
    confirmationRequired?: boolean;
  } = $props();
  let filterClassId = $state(classId);
  let filterSubjectId = $state(subjectId);
  let filterType = $state<string>(typeProp);

  let editingCell = $state<string | null>(null);
  let editValue = $state('');
  let pending = $state<Record<string, number | null>>({});
  let isSaving = $state(false);
  let isSavingCalculation = $state(false);
  let calculationMode = $state<'weighted' | 'average'>('average');
  let weightRows = $state<{ type: string; name: string; weight: number }[]>([]);
  let isTypeOpen = $state(false);
  let newTypeName = $state('');
  let isRenameOpen = $state(false);
  let renameTypeName = $state('');
  let isDeleteTypeOpen = $state(false);

  const canEdit = $derived(!!permissions.canEdit || !!permissions.canCreate);
  const typeOptions = $derived(
    summary?.components?.length
      ? summary.components.map(c => ({ value: c.type, label: c.name }))
      : [...GRADE_TYPES],
  );
  const typeLabel = $derived(typeOptions.find(t => t.value === filterType)?.label ?? filterType);
  const weightTotal = $derived(weightRows.reduce((sum, row) => sum + (Number(row.weight) || 0), 0));

  $effect(() => {
    if (!summary) return;
    calculationMode = summary.calculation_mode;
    weightRows = summary.components.map(component => ({
      ...component,
      weight: summary.component_weights[component.type] ?? 0,
    }));
  });

  function showRekap(): void {
    if (!filterClassId || !filterSubjectId) return;
    pending = {};
    editingCell = null;
    router.visit(`/grades?class_id=${filterClassId}&subject_id=${filterSubjectId}&type=${filterType}`, { preserveScroll: true });
  }

  async function addType(): Promise<void> {
    const name = newTypeName.trim();
    if (!name || !filterClassId || !filterSubjectId) return;
    const result = await api(() => axios.post('/grades/components', {
      class_id: filterClassId,
      subject_id: filterSubjectId,
      name,
    }));
    if (result.success) {
      isTypeOpen = false;
      newTypeName = '';
      router.visit(`/grades?class_id=${filterClassId}&subject_id=${filterSubjectId}`, { preserveScroll: true });
    }
  }

  const selectedTypeExists = $derived(!!summary?.components?.some(c => c.type === filterType));

  function openRenameType(): void {
    renameTypeName = typeLabel;
    isRenameOpen = true;
  }

  async function renameType(): Promise<void> {
    const name = renameTypeName.trim();
    if (!name || !filterClassId || !filterSubjectId) return;
    const result = await api(() => axios.put(`/grades/components/${filterType}`, {
      class_id: filterClassId,
      subject_id: filterSubjectId,
      name,
    }));
    if (result.success) {
      isRenameOpen = false;
      router.visit(`/grades?class_id=${filterClassId}&subject_id=${filterSubjectId}&type=${filterType}`, { preserveScroll: true });
    }
  }

  async function deleteType(): Promise<void> {
    if (!filterClassId || !filterSubjectId) return;
    const result = await api(() => axios.delete(`/grades/components/${filterType}`, {
      data: { class_id: filterClassId, subject_id: filterSubjectId },
    }));
    if (result.success) {
      isDeleteTypeOpen = false;
      const next = summary?.components?.find(c => c.type !== filterType)?.type ?? 'task';
      filterType = next;
      router.visit(`/grades?class_id=${filterClassId}&subject_id=${filterSubjectId}&type=${next}`, { preserveScroll: true });
    }
  }

  type ScoreField = 'initial' | 'final';
  const scoreFields = [
    { key: 'initial', label: 'Nilai awal' },
    { key: 'final', label: 'Nilai akhir' },
  ] as const;

  function cellKey(studentId: string, field: ScoreField): string {
    return `${studentId}:${filterType}:${field}`;
  }

  function sourceScore(row: ClassSubjectSummary['rows'][number], field: ScoreField): number | null {
    return field === 'initial'
      ? row.initial_scores[filterType] ?? null
      : row.scores[filterType] ?? null;
  }

  function displayScore(row: ClassSubjectSummary['rows'][number], field: ScoreField): number | null {
    const key = cellKey(row.student_id, field);
    if (key in pending) return pending[key];
    return sourceScore(row, field);
  }

  function isDirty(row: ClassSubjectSummary['rows'][number], field: ScoreField): boolean {
    return cellKey(row.student_id, field) in pending;
  }

  function startEdit(row: ClassSubjectSummary['rows'][number], field: ScoreField): void {
    if (!canEdit) return;
    editingCell = cellKey(row.student_id, field);
    const current = displayScore(row, field);
    editValue = current === null ? '' : String(current);
  }

  function commitEdit(row: ClassSubjectSummary['rows'][number], field: ScoreField): void {
    const key = cellKey(row.student_id, field);
    if (editingCell !== key) return;
    editingCell = null;
    const trimmed = String(editValue ?? '').trim();
    if (trimmed === '' && field === 'final') return;
    const score = trimmed === '' ? null : Number(trimmed);
    if (score !== null && (Number.isNaN(score) || score < 0 || score > 100)) {
      Toast('Nilai harus antara 0 dan 100', 'error');
      return;
    }
    const original = sourceScore(row, field);
    if (original === score) {
      const { [key]: _drop, ...rest } = pending;
      pending = rest;
      return;
    }
    pending = { ...pending, [key]: score };
  }

  function onCellKeydown(e: KeyboardEvent, row: ClassSubjectSummary['rows'][number], field: ScoreField): void {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(row, field); }
    if (e.key === 'Escape') { editingCell = null; }
  }

  const pendingCount = $derived(Object.keys(pending).length);

  async function saveAll(): Promise<void> {
    if (!summary || pendingCount === 0 || isSaving) return;
    const studentIds = [...new Set(Object.keys(pending).map(key => key.split(':')[0]))];
    const entries = studentIds.map(student_id => {
      const row = summary.rows.find(item => item.student_id === student_id);
      if (!row) return null;
      const initialKey = cellKey(student_id, 'initial');
      const finalKey = cellKey(student_id, 'final');
      const score = finalKey in pending ? pending[finalKey] : sourceScore(row, 'final');
      const initial_score = initialKey in pending ? pending[initialKey] : sourceScore(row, 'initial');
      if (score === null) return null;
      return { student_id, score, initial_score };
    });
    if (entries.some(entry => entry === null)) {
      Toast('Isi Nilai Akhir untuk siswa sebelum menyimpan Nilai Awal', 'error');
      return;
    }
    const validEntries = entries.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    isSaving = true;
    const result = await api(() => axios.post('/grades/bulk', {
      class_id: filterClassId,
      subject_id: filterSubjectId,
      type: filterType,
      entries: validEntries,
    }), { showSuccessToast: false });
    isSaving = false;
    if (result.success) {
      Toast(`${validEntries.length} nilai berhasil disimpan`, 'success');
      pending = {};
      router.visit(`/grades?class_id=${filterClassId}&subject_id=${filterSubjectId}`, { preserveScroll: true });
    }
  }

  async function saveCalculationSettings(): Promise<void> {
    if (!filterClassId || !filterSubjectId || !summary || pendingCount > 0 || isSavingCalculation) return;
    if (calculationMode === 'weighted' && Math.abs(weightTotal - 100) >= 0.001) {
      Toast(`Total bobot harus 100 (sekarang ${weightTotal})`, 'error');
      return;
    }
    isSavingCalculation = true;
    const result = await api(() => axios.put('/grades/calculation-settings', {
      class_id: filterClassId,
      subject_id: filterSubjectId,
      mode: calculationMode,
      weights: calculationMode === 'weighted'
        ? weightRows.map(({ type, weight }) => ({ type, weight: Number(weight) || 0 }))
        : [],
    }));
    isSavingCalculation = false;
    if (result.success) {
      router.visit(`/grades?class_id=${filterClassId}&subject_id=${filterSubjectId}&type=${filterType}`, { preserveScroll: true });
    }
  }
</script>

<Sidebar group="grades" />
<PageShell>
  <PageHeader eyebrow="Penilaian" title="Nilai." description="Pilih kelas, mapel, dan jenis penilaian — lalu isi nilai langsung di tabel rekap." />

  {#if confirmationRequired}
    <div class="relative overflow-hidden bg-card border border-primary/30 rounded-2xl p-6 max-w-2xl shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none" in:fly={{ y: 20, duration: 700, delay: 100 }}>
      <div class="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/[0.03] to-transparent dark:from-white/[0.03]"></div>
      <div class="relative flex items-center gap-3 mb-3">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><LockKeyhole class="h-4.5 w-4.5 text-primary" /></span>
        <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-primary">Akses terkunci</p>
      </div>
      <h2 class="relative font-heading text-xl font-semibold text-foreground">Konfirmasi kehadiran diperlukan.</h2>
      <p class="relative text-sm text-muted-foreground mt-2 leading-relaxed">Pada hari Anda terjadwal mengajar, scan QR sekolah sekali sebelum membuka daftar kelas dan mengisi nilai. Di hari tanpa jam mengajar, daftar nilai terbuka seperti biasa.</p>
      <a href="/teacher/confirm" use:inertia class="relative mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-7 py-2 font-heading text-sm font-semibold text-background transition-colors hover:bg-foreground/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">Scan QR Absen</a>
    </div>
  {:else}
    <div class="relative overflow-hidden bg-card border border-border rounded-2xl p-4 mb-8 shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none" in:fly={{ y: 20, duration: 700, delay: 100 }}>
      <div class="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/[0.03] to-transparent dark:from-white/[0.03]"></div>
      <div class="relative flex flex-col sm:flex-row gap-3 items-end">
        <div class="flex flex-col gap-1 flex-1 w-full">
          <Label for="filter-class" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1">Kelas</Label>
          <SearchableSelect id="filter-class" bind:value={filterClassId} placeholder="Pilih kelas" options={classes.map(c => ({ value: c.id, label: c.name }))} disabled={pendingCount > 0} />
        </div>
        <div class="flex flex-col gap-1 flex-1 w-full">
          <Label for="filter-subject" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1">Mapel</Label>
          <SearchableSelect id="filter-subject" bind:value={filterSubjectId} placeholder="Pilih mapel" options={subjects.map(s => ({ value: s.id, label: s.name }))} disabled={pendingCount > 0} />
        </div>
        <div class="flex flex-col gap-1 flex-1 w-full">
          <Label for="filter-type" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1">Jenis Penilaian</Label>
          <div class="flex gap-1.5">
            <Select id="filter-type" bind:value={filterType} class="flex-1" disabled={pendingCount > 0}>
              {#each typeOptions as t}<option value={t.value}>{t.label}</option>{/each}
            </Select>
            {#if canEdit && filterClassId && filterSubjectId && selectedTypeExists}
              <Button variant="outline" size="icon" title="Ubah nama jenis nilai" onclick={openRenameType}><Pencil class="w-4 h-4" /></Button>
              <Button variant="outline" size="icon" title="Hapus jenis nilai" onclick={() => isDeleteTypeOpen = true}><Trash2 class="w-4 h-4 text-destructive" /></Button>
            {/if}
            {#if canEdit && filterClassId && filterSubjectId}
              <Button variant="outline" size="icon" title="Tambah jenis nilai" onclick={() => isTypeOpen = true}><Plus class="w-4 h-4" /></Button>
            {/if}
          </div>
        </div>
        <Button onclick={showRekap} disabled={!filterClassId || !filterSubjectId}><FileSpreadsheet class="w-4 h-4 mr-1" /> Lihat Rekap</Button>
        <Button variant="outline" onclick={() => router.visit(`/grades/erapor?class_id=${filterClassId}&subject_id=${filterSubjectId}&semester=1`)}>
          <FileSpreadsheet class="w-4 h-4 mr-1" /> Impor / Ekspor e-Rapor
        </Button>
        {#if filterClassId}
          <Button href={`/exports/grades/${filterClassId}`} download variant="outline">
            <Download class="w-4 h-4" /> Unduh PDF Rekap
          </Button>
        {/if}
      </div>
    </div>

    {#if summary}
      <div in:fly={{ y: 20, duration: 700, delay: 150 }}>
        <div class="mb-5 rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div class="max-w-2xl">
              <h2 class="font-heading font-semibold">Perhitungan Nilai Akhir Mapel</h2>
              <p class="mt-1 text-sm text-muted-foreground">
                Pengaturan ini hanya berlaku untuk {summary.subjectName} kelas {summary.className} pada akun guru Anda. Nilai akhir tiap penilaian diisi manual dan dipakai untuk menghitung nilai akhir mapel.
              </p>
            </div>
            {#if canEdit}
              <div class="flex flex-wrap items-end gap-3">
                <div class="flex min-w-56 flex-col gap-1">
                  <Label for="calculation-mode" class="text-xs uppercase tracking-[0.15em] font-heading text-muted-foreground">Metode</Label>
                  <Select id="calculation-mode" bind:value={calculationMode}>
                    <option value="average">Rata-rata biasa</option>
                    <option value="weighted">Pakai bobot</option>
                  </Select>
                </div>
                <Button onclick={saveCalculationSettings} disabled={pendingCount > 0 || isSavingCalculation}>
                  {isSavingCalculation ? 'Menyimpan...' : 'Simpan metode'}
                </Button>
              </div>
            {:else}
              <p class="rounded-xl bg-secondary/60 px-3 py-2 text-sm font-medium">
                {summary.calculation_mode === 'weighted' ? 'Menggunakan bobot guru' : 'Menggunakan rata-rata biasa'}
              </p>
            {/if}
          </div>
          {#if canEdit && calculationMode === 'weighted'}
            <div class="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
              {#each weightRows as row (row.type)}
                <div class="flex items-center gap-3">
                  <Label for="weight-{row.type}" class="flex-1 text-sm">{row.name}</Label>
                  <div class="flex w-28 items-center gap-2">
                    <Input id="weight-{row.type}" type="number" min={0} max={100} step="0.1" bind:value={row.weight} />
                    <span class="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              {/each}
              <p class="self-center text-sm {Math.abs(weightTotal - 100) < 0.001 ? 'text-muted-foreground' : 'text-destructive'}">Total bobot: {weightTotal}% (harus 100%)</p>
            </div>
          {/if}
        </div>

        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><FileSpreadsheet class="h-4.5 w-4.5 text-primary" /></span>
            <div>
              <h2 class="font-heading font-semibold tracking-[-0.02em]">Rekap Nilai — {summary.subjectName} ({summary.className})</h2>
              <p class="text-xs text-muted-foreground mt-0.5">
                {#if canEdit}Klik kolom Nilai Awal atau Nilai Akhir pada <strong class="text-foreground">{typeLabel}</strong> untuk mengisi nilai.{:else}Mode lihat saja.{/if}
              </p>
            </div>
          </div>
          <p class="text-xs text-muted-foreground font-mono-accent">KKM {summary.kkm} · {summary.calculation_mode === 'weighted' ? 'bobot khusus guru' : 'rata-rata biasa'}</p>
        </div>

        <div class="relative overflow-x-auto rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none">
          <div class="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-foreground/[0.03] to-transparent dark:from-white/[0.03]"></div>
          <table class="w-full text-sm">
            <thead class="bg-secondary/50 border-b border-border">
              <tr>
                <th rowspan="2" class="px-4 py-3.5 text-left font-heading text-[10px] uppercase tracking-[0.13em] font-semibold text-muted-foreground">Siswa</th>
                {#each summary.components as c}
                  <th colspan="2" class="px-4 py-3.5 text-center font-heading text-[10px] uppercase tracking-[0.13em] font-semibold {c.type === filterType ? 'text-primary' : 'text-muted-foreground'}">
                    {c.name}{#if c.type === filterType} <span class="normal-case">· edit</span>{/if}
                  </th>
                {/each}
                <th rowspan="2" class="px-4 py-3.5 text-right font-heading text-[10px] uppercase tracking-[0.13em] font-semibold text-muted-foreground">Nilai Akhir Mapel</th>
                <th rowspan="2" class="px-4 py-3.5 text-center font-heading text-[10px] uppercase tracking-[0.13em] font-semibold text-muted-foreground">Predikat</th>
                <th rowspan="2" class="px-4 py-3.5 text-center font-heading text-[10px] uppercase tracking-[0.13em] font-semibold text-muted-foreground">Status</th>
              </tr>
              <tr>
                {#each summary.components as c}
                  {#each scoreFields as field}
                    <th class="px-3 pb-3 text-right font-heading text-[9px] uppercase tracking-[0.1em] font-semibold {c.type === filterType ? 'text-primary' : 'text-muted-foreground'}">{field.label}</th>
                  {/each}
                {/each}
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              {#if summary.rows.length === 0}
                <tr><td colspan={summary.components.length * 2 + 4} class="px-4 py-12 text-center text-sm text-muted-foreground">Belum ada siswa di kelas ini.</td></tr>
              {:else}
                {#each summary.rows as row (row.student_id)}
                  <tr class="odd:bg-secondary/[0.12] hover:bg-secondary/40 transition-colors">
                    <td class="px-4 py-3 whitespace-nowrap">
                      <p class="font-medium text-foreground">{row.student_name}</p>
                      <p class="text-xs text-muted-foreground font-mono-accent">{row.nis}</p>
                    </td>
                    {#each summary.components as c}
                      {#each scoreFields as field}
                        {@const editable = canEdit && c.type === filterType}
                        {@const key = cellKey(row.student_id, field.key)}
                        {@const val = c.type === filterType ? displayScore(row, field.key) : (field.key === 'initial' ? (row.initial_scores[c.type] ?? null) : (row.scores[c.type] ?? null))}
                        <td
                          class="px-3 py-3 text-right whitespace-nowrap {editable ? 'cursor-cell' : ''} {c.type === filterType ? 'bg-primary/[0.04]' : ''}"
                          onclick={() => editable && startEdit(row, field.key)}
                        >
                          {#if editingCell === key && editable}
                            <input
                              type="text" inputmode="decimal"
                              bind:value={editValue}
                              onblur={() => commitEdit(row, field.key)}
                              onkeydown={(e) => onCellKeydown(e, row, field.key)}
                              class="w-16 rounded-lg border border-primary/50 bg-card px-2 py-1 text-right text-sm font-semibold outline-none ring-2 ring-primary/20"
                              autofocus
                            />
                          {:else if val === null}
                            <span class="text-muted-foreground/60">—</span>
                          {:else}
                            <span class="font-mono-accent font-medium {isDirty(row, field.key) ? 'text-primary' : 'text-foreground'}">{val}</span>
                            {#if isDirty(row, field.key)}<span class="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle"></span>{/if}
                          {/if}
                        </td>
                      {/each}
                    {/each}
                    <td class="px-4 py-3 text-right font-mono-accent font-semibold text-foreground whitespace-nowrap">{row.final_score ?? '—'}</td>
                    <td class="px-4 py-3 text-center whitespace-nowrap">{row.predikat ?? '—'}</td>
                    <td class="px-4 py-3 text-center whitespace-nowrap">
                      {#if row.is_passed === null}
                        <span class="text-muted-foreground/60">—</span>
                      {:else}
                        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-heading font-semibold {row.is_passed ? 'bg-success-500/10 text-success-600 dark:text-success-400' : 'bg-destructive/10 text-destructive'}">
                          {row.is_passed ? 'Tuntas' : 'Belum Tuntas'}
                        </span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>

        {#if canEdit}
          <div class="sticky bottom-4 z-20 mt-4 flex justify-end">
            <div class="flex items-center gap-3 rounded-2xl border border-border bg-card/90 px-4 py-3 shadow-[0_8px_30px_-8px_rgba(32,36,38,0.25)] backdrop-blur-md dark:bg-card/80">
              <p class="text-xs text-muted-foreground">{pendingCount > 0 ? `${pendingCount} perubahan belum disimpan` : 'Tidak ada perubahan'}</p>
              <Button onclick={saveAll} disabled={pendingCount === 0 || isSaving} size="lg">
                {#if isSaving}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Save class="h-4 w-4" />{/if}
                {isSaving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
              </Button>
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <div class="relative overflow-hidden rounded-2xl border border-border bg-card flex flex-col items-center justify-center py-20 px-8 text-center shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none" in:fly={{ y: 20, duration: 700, delay: 150 }}>
        <div class="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/[0.03] to-transparent dark:from-white/[0.03]"></div>
        <div class="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center mb-5">
          <FileSpreadsheet class="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 class="font-heading font-semibold text-lg tracking-tight text-foreground mb-1.5">Pilih kelas dan mapel</h3>
        <p class="text-sm text-muted-foreground max-w-sm">Tabel rekap nilai akan tampil di sini dan bisa langsung diedit per jenis penilaian.</p>
      </div>
    {/if}
  {/if}

<Modal bind:open={isTypeOpen} title="Tambah Jenis Nilai" description="Jenis baru (misal Tugas 1, Praktikum) muncul sebagai kolom di rekap dan tidak mempengaruhi bobot nilai akhir.">
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); addType(); }}>
    <div class="flex flex-col gap-0">
      <Label for="new-type" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Nama Jenis</Label>
      <Input id="new-type" bind:value={newTypeName} placeholder="Tugas 1" required />
    </div>
    <div class="flex justify-end gap-2 pt-4 border-t border-border mt-2">
      <Button variant="outline" onclick={() => isTypeOpen = false}>Batal</Button>
      <Button type="submit" disabled={!newTypeName.trim()}>Tambah</Button>
    </div>
  </form>
</Modal>

<Modal bind:open={isRenameOpen} title="Ubah Nama Jenis Nilai" description={`Ganti nama "${typeLabel}". Nama baru berlaku untuk semua kelas pada tahun ajaran ini.`}>
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); renameType(); }}>
    <div class="flex flex-col gap-0">
      <Label for="rename-type" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Nama Jenis</Label>
      <Input id="rename-type" bind:value={renameTypeName} placeholder="Tugas 2" required />
    </div>
    <div class="flex justify-end gap-2 pt-4 border-t border-border mt-2">
      <Button variant="outline" onclick={() => isRenameOpen = false}>Batal</Button>
      <Button type="submit" disabled={!renameTypeName.trim() || renameTypeName.trim() === typeLabel}>Simpan</Button>
    </div>
  </form>
</Modal>

<ConfirmDialog bind:open={isDeleteTypeOpen} title="Hapus Jenis Nilai" description={`Jenis "${typeLabel}" beserta seluruh nilai yang sudah diisi akan dihapus permanen untuk tahun ajaran ini. Lanjutkan?`} confirmLabel="Hapus" cancelLabel="Batal" onConfirm={deleteType} destructive />
</PageShell>
