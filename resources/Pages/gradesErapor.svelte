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
  import EraporMappingPanel from '../Components/EraporMappingPanel.svelte';
  import EraporTeacherMappingAccess from '../Components/EraporTeacherMappingAccess.svelte';

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
    source_component_type: string | null;
    source_component_name: string | null;
  }

  interface GradeComponentOption {
    type: string;
    name: string;
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

  interface ImportPreview {
    matched_students: number;
    missing_students: Array<{ row_number: number; external_member_id: string; name: string }>;
  }

  interface ImportRequestResult {
    preview_required?: boolean;
    preview?: ImportPreview;
    created_students?: number;
    scores_saved?: number;
  }

  let {
    classes = [],
    subjects = [],
    classId = '',
    subjectId = '',
    semester = 1,
    template = null,
    columns = [],
    gradeComponents = [],
    canConfigureMappings = false,
    canSaveAsDefault = false,
    canManageMappingAccess = false,
    teacherMappingAccessEnabled = true,
    teacherMappingAccessAudit = [],
    mappingAudit = [],
    canManageStudents = false,
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
    gradeComponents?: GradeComponentOption[];
    canConfigureMappings?: boolean;
    canSaveAsDefault?: boolean;
    canManageMappingAccess?: boolean;
    teacherMappingAccessEnabled?: boolean;
    teacherMappingAccessAudit?: Array<{ id: string; new_value: string | null; changed_by_name: string; changed_at: number }>;
    mappingAudit?: Array<{ id: string; action: 'column_mapping' | 'default_mapping' | 'teacher_mapping_access'; external_id: string | null; column_label: string | null; old_source_component_type: string | null; new_source_component_type: string | null; old_mapping_present: number | null; new_mapping_present: number | null; changed_by_name: string; changed_at: number; scope_label: string | null }>;
    canManageStudents?: boolean;
    matrix?: StudentRow[];
    rosterReady?: boolean;
    permissions?: PagePermissions;
    attendanceConfirmed?: boolean;
  } = $props();

  let selectedClassId = $state('');
  let selectedSubjectId = $state('');
  let selectedSemester = $state('1');
  let selectedFile = $state<File | null>(null);
  let importPreview = $state<ImportPreview | null>(null);
  let newStudentNis = $state<Record<string, string>>({});
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
  const newStudentNisComplete = $derived(!importPreview || importPreview.missing_students.every(student => !!newStudentNis[student.external_member_id]?.trim()));

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

  function clearImportPreview(): void {
    importPreview = null;
    newStudentNis = {};
  }

  function setNewStudentNis(externalMemberId: string, nis: string): void {
    newStudentNis = { ...newStudentNis, [externalMemberId]: nis };
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
    form.append('confirm_import', importPreview ? '1' : '0');
    if (importPreview) {
      form.append('new_students', JSON.stringify(importPreview.missing_students.map(student => ({
        external_member_id: student.external_member_id,
        nis: newStudentNis[student.external_member_id]?.trim() ?? '',
      }))));
    }
    isImporting = true;
    const result = await api<ImportRequestResult>(() => axios.post('/grades/erapor/import', form), { showSuccessToast: false });
    isImporting = false;
    if (!result.success) return;
    if (result.data?.preview_required && result.data.preview) {
      importPreview = result.data.preview;
      newStudentNis = Object.fromEntries(result.data.preview.missing_students.map(student => [student.external_member_id, '']));
      return;
    }
    selectedFile = null;
    clearImportPreview();
    if (fileInput) fileInput.value = '';
    const createdCount = result.data?.created_students ?? 0;
    const importSummary = `Template tersimpan; ${result.data?.scores_saved ?? 0} perubahan nilai diimpor.`;
    Toast(createdCount > 0
      ? `${createdCount} siswa dibuat tanpa akun orang tua. ${importSummary}`
      : importSummary, 'success');
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
  <PageHeader eyebrow="Penilaian" title="e-Rapor SMP." description="Simpan format e-Rapor sekali, lalu siapkan nilai SIGAP untuk diekspor." />

  <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
    <a href="/grades" use:inertia class="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-border bg-card px-3 font-heading text-sm font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer">
      <ArrowLeft class="h-4 w-4" /> Kembali ke Nilai
    </a>
    {#if permissions.canExport && hasTemplate && rosterReady}
      <div class="flex flex-wrap gap-2">
        <Button href={exportUrl('xls')} download variant="outline">
          <Download class="h-4 w-4" /> Unduh .xls (format sekolah)
        </Button>
        <Button href={exportUrl('xlsx')} download>
          <Download class="h-4 w-4" /> Unduh .xlsx
        </Button>
      </div>
    {/if}
  </div>

  {#if !attendanceConfirmed}
    <div class="mb-6 rounded-xl border border-primary/30 bg-card p-4 text-sm text-foreground">
      Konfirmasi kehadiran hari ini diperlukan sebelum mengakses nilai. <a href="/teacher/confirm" use:inertia class="font-semibold text-primary underline">Buka halaman konfirmasi</a>.
    </div>
  {/if}

  <EraporTeacherMappingAccess canManage={canManageMappingAccess} enabled={teacherMappingAccessEnabled} auditLogs={teacherMappingAccessAudit} />

  <section class="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
    <div class="mb-4">
      <h2 class="font-heading font-semibold">Langkah 1 · Pilih kelas, mapel, dan semester</h2>
      <p class="mt-1 text-sm text-muted-foreground">Pilih kelas, mapel, dan semester yang sama dengan file dari e-Rapor.</p>
    </div>
    <div class="grid gap-4 md:grid-cols-[1fr_1fr_180px_auto] md:items-end">
      <div class="flex flex-col gap-2">
        <Label for="erapor-class">Kelas</Label>
        <select id="erapor-class" bind:value={selectedClassId} onchange={clearImportPreview} class="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
          <option value="">Pilih kelas</option>
          {#each classes as item (item.id)}<option value={item.id}>{item.grade} · {item.name}</option>{/each}
        </select>
      </div>
      <div class="flex flex-col gap-2">
        <Label for="erapor-subject">Mata pelajaran</Label>
        <select id="erapor-subject" bind:value={selectedSubjectId} onchange={clearImportPreview} class="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
          <option value="">Pilih mata pelajaran</option>
          {#each subjects as item (item.id)}<option value={item.id}>{item.name}</option>{/each}
        </select>
      </div>
      <div class="flex flex-col gap-2">
        <Label for="erapor-semester">Semester</Label>
        <select id="erapor-semester" bind:value={selectedSemester} onchange={clearImportPreview} class="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
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
          <h2 class="font-heading font-semibold">Langkah 2 · Unggah file dari e-Rapor</h2>
          <p class="mt-1 max-w-3xl text-sm text-muted-foreground">Pilih file .xls dari e-Rapor SMP 2025.2 atau .xlsx yang disimpan dari Excel. File kosong bisa dipakai untuk menyimpan format; nilai yang sudah terisi di file juga akan masuk ke SIGAP.</p>
        </div>
      </div>
      <div class="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
        <p class="font-medium text-foreground">Sebelum mengunggah</p>
        {#if canManageStudents}
          <p class="mt-1 text-muted-foreground">Jika ada siswa di file yang belum terdaftar, SIGAP akan meminta NIS asli sebelum membuat datanya. Siswa yang ada di SIGAP tetapi tidak ada di file harus diperiksa terlebih dahulu.</p>
          <a href={`/classes/${selectedClassId}/students`} use:inertia class="mt-2 inline-flex font-medium text-primary underline">Periksa atau impor siswa kelas ini</a>
        {:else}
          <p class="mt-1 text-muted-foreground">Pastikan daftar siswa sama dengan kelas pada file. Jika berbeda, minta admin SIGAP memperbarui daftar siswa sebelum mengunggah.</p>
        {/if}
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div class="flex-1">
          <Label for="erapor-file">File e-Rapor (.xls atau .xlsx, maksimal 2 MB)</Label>
          <input bind:this={fileInput} id="erapor-file" type="file" accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onchange={(event) => { selectedFile = (event.currentTarget as HTMLInputElement).files?.[0] ?? null; clearImportPreview(); }} class="mt-2 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-semibold" />
        </div>
        <Button onclick={importWorkbook} disabled={(!canManageStudents && !permissions.canEdit) || !selectedFile || isImporting || !newStudentNisComplete}>
          {#if isImporting}<Loader2 class="mr-2 h-4 w-4 animate-spin" />{:else}<Upload class="mr-2 h-4 w-4" />{/if}
          {#if importPreview}Buat siswa dan simpan{:else}Periksa dan unggah{/if}
        </Button>
      </div>
      {#if importPreview}
        <div class="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <h3 class="font-heading text-sm font-semibold">Pratinjau roster e-Rapor</h3>
          <p class="mt-1 text-sm text-muted-foreground">{importPreview.matched_students} siswa cocok; {importPreview.missing_students.length} siswa belum ada di kelas SIGAP. Isi NIS asli sebelum melanjutkan. Siswa baru tidak otomatis mendapat akun orang tua.</p>
          <div class="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {#each importPreview.missing_students as student (student.external_member_id)}
              <div class="grid gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
                <div>
                  <p class="text-sm font-medium text-foreground">{student.name}</p>
                  <p class="text-xs text-muted-foreground">Baris {student.row_number} · ID anggota rombel {student.external_member_id}</p>
                </div>
                <div class="flex flex-col gap-1">
                  <Label for={`student-nis-${student.row_number}`}>NIS asli</Label>
                  <input id={`student-nis-${student.row_number}`} type="text" maxlength="50" autocomplete="off" value={newStudentNis[student.external_member_id] ?? ''} oninput={(event) => setNewStudentNis(student.external_member_id, event.currentTarget.value)} placeholder="Masukkan NIS" class="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
      {#if template}
        <p class="mt-3 text-xs text-muted-foreground">Template tersimpan: {template.source_file_name}. Unggah file lain untuk memperbarui template atau memasukkan nilai.</p>
      {/if}
    </section>
  {/if}

  {#if hasTemplate && permissions.canView}
    {#if !rosterReady}
      <div class="mb-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">Pemetaan siswa belum cocok dengan roster SIGAP. Unggah ulang template terbaru untuk kelas ini.</div>
    {/if}
    <EraporMappingPanel
      classId={selectedClassId}
      subjectId={selectedSubjectId}
      semester={Number(selectedSemester)}
      semesterLabel={semesterLabel}
      subjectName={selectedSubject?.name ?? 'Mapel ini'}
      {columns}
      {gradeComponents}
      {canConfigureMappings}
      {canSaveAsDefault}
      {mappingAudit}
    />
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
                    <input type="number" min="0" max="100" step="0.01" value={currentScore(row, column)} oninput={(event) => setScore(row, column, (event.currentTarget as HTMLInputElement).value)} disabled={!permissions.canEdit || !rosterReady || !!column.source_component_type} title={column.source_component_name ? `Sumber nilai: ${column.source_component_name}` : 'Nilai diisi langsung di sini'} aria-label={`${column.label} ${row.name}`} class="h-9 w-24 rounded-md border border-border bg-background px-2 text-right text-sm text-foreground disabled:opacity-60" />
                    {#if column.source_component_name}<span class="mt-1 block max-w-24 truncate text-[10px] text-muted-foreground" title={column.source_component_name}>{column.source_component_name}</span>{/if}
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
      <h2 class="mt-3 font-heading font-semibold">Unggah file e-Rapor untuk mulai</h2>
      <p class="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Pilih file .xls atau .xlsx dari e-Rapor pada bagian di atas. SIGAP akan membaca daftar siswa dan kolom nilai dari file tersebut agar ekspor mengikuti format sekolah.</p>
    </section>
  {/if}
</PageShell>
