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
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import type { Student, Subject, Class, AcademicYear, ClassSubjectSummary } from '../types';
  import { FileSpreadsheet, LockKeyhole, Save, Loader2 } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  const GRADE_TYPES = [
    { value: 'task', label: 'Tugas' },
    { value: 'daily_quiz', label: 'Kuis Harian' },
    { value: 'midterm', label: 'UTS' },
    { value: 'final', label: 'UAS' },
  ] as const;
  type GradeType = (typeof GRADE_TYPES)[number]['value'];

  let {
    permissions,
    students = [],
    subjects = [],
    classes = [],
    years = [],
    summary = null,
    classId = '',
    subjectId = '',
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
    confirmationRequired?: boolean;
  } = $props();

  let filterClassId = $state(classId);
  let filterSubjectId = $state(subjectId);
  let filterType = $state<GradeType>('task');

  let editingCell = $state<string | null>(null);
  let editValue = $state('');
  let pending = $state<Record<string, number>>({});
  let isSaving = $state(false);

  const canEdit = $derived(!!permissions.canEdit || !!permissions.canCreate);
  const typeLabel = $derived(GRADE_TYPES.find(t => t.value === filterType)?.label ?? filterType);

  function showRekap(): void {
    if (!filterClassId || !filterSubjectId) return;
    pending = {};
    editingCell = null;
    router.visit(`/grades?class_id=${filterClassId}&subject_id=${filterSubjectId}`, { preserveScroll: true });
  }

  function cellKey(studentId: string): string {
    return `${studentId}:${filterType}`;
  }

  function displayScore(row: ClassSubjectSummary['rows'][number]): number | null {
    const key = cellKey(row.student_id);
    if (key in pending) return pending[key];
    return row.scores[filterType] ?? null;
  }

  function isDirty(row: ClassSubjectSummary['rows'][number]): boolean {
    return cellKey(row.student_id) in pending;
  }

  function startEdit(row: ClassSubjectSummary['rows'][number]): void {
    if (!canEdit) return;
    editingCell = cellKey(row.student_id);
    const current = displayScore(row);
    editValue = current === null ? '' : String(current);
  }

  function commitEdit(row: ClassSubjectSummary['rows'][number]): void {
    if (editingCell !== cellKey(row.student_id)) return;
    editingCell = null;
    const trimmed = editValue.trim();
    if (trimmed === '') return;
    const score = Number(trimmed);
    if (Number.isNaN(score) || score < 0 || score > 100) {
      Toast('Nilai harus antara 0 dan 100', 'error');
      return;
    }
    const original = row.scores[filterType] ?? null;
    const key = cellKey(row.student_id);
    if (original === score) {
      const { [key]: _drop, ...rest } = pending;
      pending = rest;
      return;
    }
    pending = { ...pending, [key]: score };
  }

  function onCellKeydown(e: KeyboardEvent, row: ClassSubjectSummary['rows'][number]): void {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(row); }
    if (e.key === 'Escape') { editingCell = null; }
  }

  const pendingCount = $derived(Object.keys(pending).length);

  async function saveAll(): Promise<void> {
    if (!summary || pendingCount === 0 || isSaving) return;
    const entries = Object.entries(pending).map(([key, score]) => ({
      student_id: key.split(':')[0],
      score,
    }));
    isSaving = true;
    const result = await api(() => axios.post('/grades/bulk', {
      class_id: filterClassId,
      subject_id: filterSubjectId,
      type: filterType,
      entries,
    }), { showSuccessToast: false });
    isSaving = false;
    if (result.success) {
      Toast(`${entries.length} nilai berhasil disimpan`, 'success');
      pending = {};
      router.visit(`/grades?class_id=${filterClassId}&subject_id=${filterSubjectId}`, { preserveScroll: true });
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
      <p class="relative text-sm text-muted-foreground mt-2 leading-relaxed">Scan QR sekolah sekali setiap hari sebelum membuka daftar kelas dan mengisi nilai.</p>
      <a href="/teacher/confirm" use:inertia class="relative inline-flex mt-5"><Button>Scan QR Absen</Button></a>
    </div>
  {:else}
    <div class="relative overflow-hidden bg-card border border-border rounded-2xl p-4 mb-8 shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none" in:fly={{ y: 20, duration: 700, delay: 100 }}>
      <div class="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/[0.03] to-transparent dark:from-white/[0.03]"></div>
      <div class="relative flex flex-col sm:flex-row gap-3 items-end">
        <div class="flex flex-col gap-1 flex-1 w-full">
          <Label for="filter-class" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1">Kelas</Label>
          <Select id="filter-class" bind:value={filterClassId} placeholder="Pilih kelas">
            <option value="">Pilih kelas</option>
            {#each classes as c}<option value={c.id}>{c.name}</option>{/each}
          </Select>
        </div>
        <div class="flex flex-col gap-1 flex-1 w-full">
          <Label for="filter-subject" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1">Mapel</Label>
          <Select id="filter-subject" bind:value={filterSubjectId} placeholder="Pilih mapel">
            <option value="">Pilih mapel</option>
            {#each subjects as s}<option value={s.id}>{s.name}</option>{/each}
          </Select>
        </div>
        <div class="flex flex-col gap-1 flex-1 w-full">
          <Label for="filter-type" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1">Jenis Penilaian</Label>
          <Select id="filter-type" bind:value={filterType}>
            {#each GRADE_TYPES as t}<option value={t.value}>{t.label}</option>{/each}
          </Select>
        </div>
        <Button onclick={showRekap} disabled={!filterClassId || !filterSubjectId}><FileSpreadsheet class="w-4 h-4 mr-1" /> Lihat Rekap</Button>
      </div>
    </div>

    {#if summary}
      <div in:fly={{ y: 20, duration: 700, delay: 150 }}>
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><FileSpreadsheet class="h-4.5 w-4.5 text-primary" /></span>
            <div>
              <h2 class="font-heading font-semibold tracking-[-0.02em]">Rekap Nilai — {summary.subjectName} ({summary.className})</h2>
              <p class="text-xs text-muted-foreground mt-0.5">
                {#if canEdit}Klik sel kolom <strong class="text-foreground">{typeLabel}</strong> untuk mengisi nilai.{:else}Mode lihat saja.{/if}
              </p>
            </div>
          </div>
          <p class="text-xs text-muted-foreground font-mono-accent">KKM {summary.kkm}</p>
        </div>

        <div class="relative overflow-x-auto rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none">
          <div class="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-foreground/[0.03] to-transparent dark:from-white/[0.03]"></div>
          <table class="w-full text-sm">
            <thead class="bg-secondary/50 border-b border-border">
              <tr>
                <th class="px-4 py-3.5 text-left font-heading text-[10px] uppercase tracking-[0.13em] font-semibold text-muted-foreground">Siswa</th>
                {#each summary.components as c}
                  <th class="px-4 py-3.5 text-right font-heading text-[10px] uppercase tracking-[0.13em] font-semibold {c.type === filterType ? 'text-primary' : 'text-muted-foreground'}">
                    {c.name}{#if c.type === filterType} <span class="normal-case">· edit</span>{/if}
                  </th>
                {/each}
                <th class="px-4 py-3.5 text-right font-heading text-[10px] uppercase tracking-[0.13em] font-semibold text-muted-foreground">Nilai Akhir</th>
                <th class="px-4 py-3.5 text-center font-heading text-[10px] uppercase tracking-[0.13em] font-semibold text-muted-foreground">Predikat</th>
                <th class="px-4 py-3.5 text-center font-heading text-[10px] uppercase tracking-[0.13em] font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              {#if summary.rows.length === 0}
                <tr><td colspan={summary.components.length + 4} class="px-4 py-12 text-center text-sm text-muted-foreground">Belum ada siswa di kelas ini.</td></tr>
              {:else}
                {#each summary.rows as row (row.student_id)}
                  <tr class="odd:bg-secondary/[0.12] hover:bg-secondary/40 transition-colors">
                    <td class="px-4 py-3 whitespace-nowrap">
                      <p class="font-medium text-foreground">{row.student_name}</p>
                      <p class="text-xs text-muted-foreground font-mono-accent">{row.nis}</p>
                    </td>
                    {#each summary.components as c}
                      {@const editable = canEdit && c.type === filterType}
                      {@const val = c.type === filterType ? displayScore(row) : (row.scores[c.type] ?? null)}
                      <td
                        class="px-4 py-3 text-right whitespace-nowrap {editable ? 'cursor-cell' : ''} {c.type === filterType ? 'bg-primary/[0.04]' : ''}"
                        onclick={() => editable && startEdit(row)}
                      >
                        {#if editingCell === cellKey(row.student_id) && c.type === filterType}
                          <input
                            type="number" min="0" max="100" step="1"
                            bind:value={editValue}
                            onblur={() => commitEdit(row)}
                            onkeydown={(e) => onCellKeydown(e, row)}
                            class="w-16 rounded-lg border border-primary/50 bg-card px-2 py-1 text-right text-sm font-semibold outline-none ring-2 ring-primary/20"
                            autofocus
                          />
                        {:else if val === null}
                          <span class="text-muted-foreground/60">—</span>
                        {:else}
                          <span class="font-mono-accent font-medium {isDirty(row) && c.type === filterType ? 'text-primary' : 'text-foreground'}">{val}</span>
                          {#if isDirty(row) && c.type === filterType}<span class="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle"></span>{/if}
                        {/if}
                      </td>
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
</PageShell>
