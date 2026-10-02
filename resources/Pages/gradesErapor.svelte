<script lang="ts">
  import { inertia, router } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import { Toast } from '$lib/toast';
  import { ArrowLeft, Download, FileSpreadsheet, Loader2, Save, Upload } from '@lucide/svelte';
  import Sidebar from '../Components/Sidebar.svelte';
  import Button from '../Components/Button.svelte';
  import Label from '../Components/Label.svelte';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';

  interface ClassOption {
    id: string;
    name: string;
    grade: string;
    academic_year_id: string;
  }

  interface SubjectOption {
    id: string;
    name: string;
    code: string;
  }

  interface GradeColumn {
    external_id: string;
    label: string;
  }

  interface GradeCell extends GradeColumn {
    score: number | null;
  }

  interface StudentRow {
    student_id: string;
    name: string;
    nis: string;
    external_member_id: string;
    scores: GradeCell[];
  }

  interface PagePermissions {
    canView: boolean;
    canEdit: boolean;
    canExport: boolean;
  }

  let {
    classes = [],
    subjects = [],
    classId = '',
    subjectId = '',
    semester = 1,
    template = null,
    columns = [],
    matrix = [],
    rosterReady = false,
    permissions = { canView: false, canEdit: false, canExport: false },
    attendanceConfirmed = true,
  }: {
    classes?: ClassOption[];
    subjects?: SubjectOption[];
    classId?: string;
    subjectId?: string;
    semester?: number;
    template?: { source_file_name: string; mapel_id: string } | null;
    columns?: GradeColumn[];
    matrix?: StudentRow[];
    rosterReady?: boolean;
    permissions?: PagePermissions;
    attendanceConfirmed?: boolean;
  } = $props();

  let selectedClassId = $state('');
  let selectedSubjectId = $state('');
  let selectedSemester = $state('1');
  let selectedFile = $state<File | null>(null);
  let fileInput = $state<HTMLInputElement | null>(null);
  let scoreDrafts = $state<Record<string, string>>({});
  let isImporting = $state(false);
  let isSaving = $state(false);

  $effect(() => {
    selectedClassId = classId;
    selectedSubjectId = subjectId;
    selectedSemester = String(semester);
    scoreDrafts = {};
  });

  const selectedClass = $derived(classes.find(item => item.id === selectedClassId));
  const selectedSubject = $derived(subjects.find(item => item.id === selectedSubjectId));
  const semesterLabel = $derived(selectedSemester === '1' ? 'Semester I' : 'Semester II');
  const hasTemplate = $derived(!!template && columns.length > 0);

  function selectionUrl(): string {
    const query = new URLSearchParams({ class_id: selectedClassId, subject_id: selectedSubjectId, semester: selectedSemester });
    return `/grades/erapor?${query.toString()}`;
  }

  function exportUrl(format: 'xls' | 'xlsx'): string {
    const query = new URLSearchParams({ class_id: selectedClassId, subject_id: selectedSubjectId, semester: selectedSemester, format });
    return `/grades/erapor/export?${query.toString()}`;
  }

  function showSelection(): void {
    if (!selectedClassId || !selectedSubjectId) return;
    scoreDrafts = {};
    router.visit(selectionUrl(), { preserveScroll: true });
  }

  function draftKey(studentId: string, externalId: string): string {
    return `${studentId}:${externalId}`;
  }

  function currentScore(row: StudentRow, column: GradeColumn): string {
    const key = draftKey(row.student_id, column.external_id);
    if (key in scoreDrafts) return scoreDrafts[key] ?? '';
    const score = row.scores.find(item => item.external_id === column.external_id)?.score;
    return score === null || score === undefined ? '' : String(score);
  }

  function setScore(row: StudentRow, column: GradeColumn, value: string): void {
    scoreDrafts = { ...scoreDrafts, [draftKey(row.student_id, column.external_id)]: value };
  }

  async function importWorkbook(): Promise<void> {
    if (!selectedFile || !selectedClassId || !selectedSubjectId || isImporting) return;
    const form = new FormData();
    form.append('file', selectedFile);
    form.append('class_id', selectedClassId);
    form.append('subject_id', selectedSubjectId);
    form.append('semester', selectedSemester);
    isImporting = true;
    const result = await api<{ scores_saved: number }>(() => axios.post('/grades/erapor/import', form), { showSuccessToast: false });
    isImporting = false;
    if (!result.success) return;
    selectedFile = null;
    if (fileInput) fileInput.value = '';
    Toast(`Template tersimpan; ${result.data?.scores_saved ?? 0} perubahan nilai diimpor`, 'success');
    router.visit(selectionUrl(), { preserveScroll: true });
  }

  async function saveScores(): Promise<void> {
    if (!hasTemplate || !permissions.canEdit || !rosterReady || isSaving || matrix.length === 0) return;
    const entries = matrix.map(row => ({
      student_id: row.student_id,
      scores: columns.map(column => {
        const raw = currentScore(row, column).trim();
        return { external_id: column.external_id, score: raw === '' ? null : Number(raw) };
      }),
    }));
    const values = entries.flatMap(entry => entry.scores.map(item => item.score).filter((value): value is number => value !== null));
    if (values.some(value => !Number.isFinite(value) || value < 0 || value > 100)) {
      Toast('Nilai harus berupa angka antara 0 dan 100', 'error');
      return;
    }
    isSaving = true;
    const result = await api<{ saved: number }>(() => axios.post('/grades/erapor/scores', {
      class_id: selectedClassId,
      subject_id: selectedSubjectId,
      semester: Number(selectedSemester),
      entries,
    }), { showSuccessToast: false });
    isSaving = false;
    if (!result.success) return;
    scoreDrafts = {};
    Toast(`${result.data?.saved ?? 0} perubahan nilai tersimpan`, 'success');
    router.visit(selectionUrl(), { preserveScroll: true });
  }
</script>

<Sidebar group="grades" />
<PageShell>
  <PageHeader eyebrow="Penilaian" title="e-Rapor SMP." description="Kelola nilai dengan format impor e-Rapor 2025.2, lalu unduh file siap unggah." />

  <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
    <a href="/grades" use:inertia class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft class="h-4 w-4" /> Kembali ke Nilai</a>
    {#if permissions.canExport && hasTemplate && rosterReady}
      <div class="flex flex-wrap gap-2">
        <a href={exportUrl('xls')} download class="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-secondary/50">
          <Download class="h-4 w-4" /> Unduh .xls (format sekolah)
        </a>
        <a href={exportUrl('xlsx')} download class="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <Download class="h-4 w-4" /> Unduh .xlsx
        </a>
      </div>
    {/if}
  </div>

  {#if !attendanceConfirmed}
    <div class="mb-6 rounded-xl border border-primary/30 bg-card p-4 text-sm text-foreground">
      Konfirmasi kehadiran hari ini diperlukan sebelum mengakses nilai. <a href="/teacher/confirm" use:inertia class="font-semibold text-primary underline">Buka halaman konfirmasi</a>.
    </div>
  {/if}

  <section class="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
    <div class="grid gap-4 md:grid-cols-[1fr_1fr_180px_auto] md:items-end">
      <div class="flex flex-col gap-2">
        <Label for="erapor-class">Kelas</Label>
        <select id="erapor-class" bind:value={selectedClassId} class="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
          <option value="">Pilih kelas</option>
          {#each classes as item (item.id)}<option value={item.id}>{item.grade} · {item.name}</option>{/each}
        </select>
      </div>
      <div class="flex flex-col gap-2">
        <Label for="erapor-subject">Mata pelajaran</Label>
        <select id="erapor-subject" bind:value={selectedSubjectId} class="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
          <option value="">Pilih mata pelajaran</option>
          {#each subjects as item (item.id)}<option value={item.id}>{item.name}</option>{/each}
        </select>
      </div>
      <div class="flex flex-col gap-2">
        <Label for="erapor-semester">Semester</Label>
        <select id="erapor-semester" bind:value={selectedSemester} class="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
          <option value="1">Semester I</option>
          <option value="2">Semester II</option>
        </select>
      </div>
      <Button variant="outline" onclick={showSelection} disabled={!selectedClassId || !selectedSubjectId}>Tampilkan nilai</Button>
    </div>
    {#if selectedClass && selectedSubject}
      <p class="mt-4 text-xs text-muted-foreground">{selectedSubject.name} · {selectedClass.name} · {semesterLabel}</p>
    {/if}
  </section>

  {#if selectedClassId && selectedSubjectId}
    <section class="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10"><Upload class="h-4 w-4 text-primary" /></span>
        <div>
          <h2 class="font-heading font-semibold">Unggah template atau nilai</h2>
          <p class="mt-1 max-w-3xl text-sm text-muted-foreground">Unduh format impor untuk kelas, mapel, dan semester ini dari e-Rapor SMP 2025.2, lalu unggah file .xls di sini. Nilai yang sudah diisi akan disimpan ke SIGAP; file kosong dapat digunakan untuk mendaftarkan format.</p>
        </div>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div class="flex-1">
          <Label for="erapor-file">File nilai e-Rapor (.xls, maksimal 2 MB)</Label>
          <input bind:this={fileInput} id="erapor-file" type="file" accept=".xls,application/vnd.ms-excel" onchange={(event) => { selectedFile = (event.currentTarget as HTMLInputElement).files?.[0] ?? null; }} class="mt-2 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-semibold" />
        </div>
        <Button onclick={importWorkbook} disabled={!permissions.canEdit || !selectedFile || isImporting}>
          {#if isImporting}<Loader2 class="mr-2 h-4 w-4 animate-spin" />{:else}<Upload class="mr-2 h-4 w-4" />{/if}
          Unggah ke SIGAP
        </Button>
      </div>
      {#if template}
        <p class="mt-3 text-xs text-muted-foreground">Format tersimpan: {template.source_file_name} · ID mapel e-Rapor {template.mapel_id}</p>
      {/if}
    </section>
  {/if}

  {#if hasTemplate && permissions.canView}
    {#if !rosterReady}
      <div class="mb-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">Pemetaan siswa belum cocok dengan roster SIGAP. Unggah ulang template terbaru untuk kelas ini.</div>
    {/if}
    <section class="rounded-2xl border border-border bg-card shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <h2 class="font-heading font-semibold">Nilai {semesterLabel}</h2>
          <p class="mt-1 text-xs text-muted-foreground">{#if permissions.canEdit}Isi atau kosongkan sel, lalu simpan. Nilai kosong menghapus nilai tersimpan.{:else}Mode lihat saja.{/if}</p>
        </div>
        {#if permissions.canEdit}
          <Button onclick={saveScores} disabled={!rosterReady || isSaving || matrix.length === 0}>
            {#if isSaving}<Loader2 class="mr-2 h-4 w-4 animate-spin" />{:else}<Save class="mr-2 h-4 w-4" />{/if}
            Simpan nilai
          </Button>
        {/if}
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-max text-sm">
          <thead class="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th class="sticky left-0 bg-secondary/50 px-4 py-3 text-left">Siswa</th>
              {#each columns as column (column.external_id)}<th class="px-3 py-3 text-center">{column.label}</th>{/each}
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            {#each matrix as row (row.student_id)}
              <tr class="odd:bg-secondary/[0.12]">
                <td class="sticky left-0 bg-card px-4 py-3">
                  <p class="whitespace-nowrap font-medium">{row.name}</p>
                  <p class="text-xs text-muted-foreground">NIS {row.nis} · ID rombel {row.external_member_id || 'belum dipetakan'}</p>
                </td>
                {#each columns as column (column.external_id)}
                  <td class="px-2 py-2">
                    <input type="number" min="0" max="100" step="0.01" value={currentScore(row, column)} oninput={(event) => setScore(row, column, (event.currentTarget as HTMLInputElement).value)} disabled={!permissions.canEdit || !rosterReady} aria-label={`${column.label} ${row.name}`} class="h-9 w-24 rounded-md border border-border bg-background px-2 text-right text-sm text-foreground disabled:opacity-60" />
                  </td>
                {/each}
              </tr>
            {/each}
            {#if matrix.length === 0}
              <tr><td colspan={columns.length + 1} class="px-4 py-10 text-center text-muted-foreground">Belum ada data siswa untuk ditampilkan.</td></tr>
            {/if}
          </tbody>
        </table>
      </div>
    </section>
  {:else if selectedClassId && selectedSubjectId}
    <section class="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
      <FileSpreadsheet class="mx-auto h-8 w-8 text-muted-foreground" />
      <h2 class="mt-3 font-heading font-semibold">Unggah template e-Rapor terlebih dahulu</h2>
      <p class="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Template menyediakan ID mapel, ID anggota rombel, dan kolom penilaian yang diperlukan untuk membuat file siap unggah.</p>
    </section>
  {/if}
</PageShell>
