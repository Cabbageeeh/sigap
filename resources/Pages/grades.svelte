<script lang="ts">
  import { inertia, router } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import Sidebar from '../Components/Sidebar.svelte';
  import DataTable from '../Components/DataTable.svelte';
  import Button from '../Components/Button.svelte';
  import Input from '../Components/Input.svelte';
  import Label from '../Components/Label.svelte';
  import Modal from '../Components/Modal.svelte';
  import ConfirmDialog from '../Components/ConfirmDialog.svelte';
  import Select from '../Components/Select.svelte';
  import Pagination from '../Components/Pagination.svelte';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import type { Grade, GradeForm, Student, Subject, Class, AcademicYear, PaginationMeta, ClassSubjectSummary } from '../types';
  import { createEmptyGradeForm, gradeToForm } from '../types';
  import { Pencil, Trash2, FileSpreadsheet, LockKeyhole, Plus } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let {
    permissions,
    grades = [],
    students = [],
    subjects = [],
    classes = [],
    years = [],
    meta,
    summary = null,
    classId = '',
    subjectId = '',
    confirmationRequired = false,
  }: {
    permissions: { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean };
    grades?: Grade[];
    students?: Student[];
    subjects?: Subject[];
    classes?: Class[];
    years?: AcademicYear[];
    meta?: PaginationMeta;
    summary?: ClassSubjectSummary | null;
    classId?: string;
    subjectId?: string;
    confirmationRequired?: boolean;
  } = $props();

  let isOpen = $state(false);
  let isDeleteOpen = $state(false);
  let form: GradeForm = $state(createEmptyGradeForm());
  let selected: Grade | null = $state(null);

  let filterClassId = $state(classId);
  let filterSubjectId = $state(subjectId);

  function openCreate(): void {
    form = { ...createEmptyGradeForm(), class_id: filterClassId, subject_id: filterSubjectId };
    selected = null;
    isOpen = true;
  }
  function openEdit(item: Grade): void { selected = item; form = gradeToForm(item); isOpen = true; }
  function confirmDelete(item: Grade): void { selected = item; isDeleteOpen = true; }

  async function submit(): Promise<void> {
    form.date = selected ? form.date : Date.now();
    const result = selected
      ? await api(() => axios.put(`/grades/${selected!.id}`, form))
      : await api(() => axios.post('/grades', form));
    if (result.success) { isOpen = false; router.visit('/grades', { preserveScroll: true }); }
  }
  async function remove(): Promise<void> {
    if (!selected) return;
    const result = await api(() => axios.delete(`/grades/${selected!.id}`));
    if (result.success) { isDeleteOpen = false; router.visit('/grades', { preserveScroll: true }); }
  }

  function showRekap(): void {
    if (!filterClassId || !filterSubjectId) return;
    router.visit(`/grades?class_id=${filterClassId}&subject_id=${filterSubjectId}&page=1`);
  }

  const summaryColumns = $derived.by(() => {
    const s = summary;
    if (!s) return [] as { key: string; label: string; align?: 'left' | 'center' | 'right' }[];
    return [
      { key: 'student_name', label: 'Siswa' },
      ...s.components.map(c => ({ key: c.type, label: c.name, align: 'right' as const })),
      { key: 'final_score', label: 'Nilai Akhir', align: 'right' as const },
      { key: 'kkm', label: 'KKM', align: 'center' as const },
      { key: 'predikat', label: 'Predikat', align: 'center' as const },
      { key: 'status', label: 'Status', align: 'center' as const },
    ];
  });

  const summaryRows = $derived.by(() => {
    const s = summary;
    if (!s) return [] as Record<string, unknown>[];
    return s.rows.map(row => {
      const display: Record<string, unknown> = {
        student_id: row.student_id,
        student_name: row.student_name,
        nis: row.nis,
        final_score: row.final_score ?? '—',
        kkm: row.kkm,
        predikat: row.predikat ?? '—',
        status: row.is_passed === null ? '—' : row.is_passed ? 'Tuntas' : 'Belum Tuntas',
      };
      for (const component of s.components) display[component.type] = row.scores[component.type] ?? '—';
      return display;
    });
  });

  const columns = [
    { key: 'student_id', label: 'Siswa' },
    { key: 'subject_id', label: 'Mapel' },
    { key: 'class_id', label: 'Kelas' },
    { key: 'type', label: 'Jenis' },
    { key: 'score', label: 'Nilai' },
  ];
</script>

{#snippet rowActions(item: Grade)}
  {#if permissions.canEdit}<Button variant="ghost" size="icon" onclick={() => openEdit(item)}><Pencil class="w-4 h-4" /></Button>{/if}
  {#if permissions.canDelete}<Button variant="ghost" size="icon" onclick={() => confirmDelete(item)}><Trash2 class="w-4 h-4 text-destructive" /></Button>{/if}
{/snippet}

<Sidebar group="grades" />
<PageShell>
  <PageHeader eyebrow="Penilaian" title="Nilai." description="Input nilai tugas, ulangan, UTS, dan UAS sesuai kelas serta mapel yang diampu.">
    {#snippet actions()}
      {#if permissions.canCreate && !confirmationRequired}<Button onclick={openCreate} size="lg"><Plus class="w-4 h-4" /> Tambah Nilai</Button>{/if}
    {/snippet}
  </PageHeader>

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
            <option value="">Semua kelas</option>
            {#each classes as c}<option value={c.id}>{c.name}</option>{/each}
          </Select>
        </div>
        <div class="flex flex-col gap-1 flex-1 w-full">
          <Label for="filter-subject" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1">Mapel</Label>
          <Select id="filter-subject" bind:value={filterSubjectId} placeholder="Pilih mapel">
            <option value="">Semua mapel</option>
            {#each subjects as s}<option value={s.id}>{s.name}</option>{/each}
          </Select>
        </div>
        <Button onclick={showRekap}><FileSpreadsheet class="w-4 h-4 mr-1" /> Lihat Rekap</Button>
      </div>
    </div>

    {#if summary}
      <div class="mb-10" in:fly={{ y: 20, duration: 700, delay: 150 }}>
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><FileSpreadsheet class="h-4.5 w-4.5 text-primary" /></span>
            <h2 class="font-heading font-semibold tracking-[-0.02em]">Rekap Nilai — {summary.subjectName} ({summary.className})</h2>
          </div>
          <p class="text-xs text-muted-foreground font-mono-accent">KKM {summary.kkm}</p>
        </div>
        <DataTable columns={summaryColumns} rows={summaryRows} keyField="student_id" emptyMessage="Belum ada nilai untuk kelas dan mapel ini." />
      </div>
    {/if}

    <DataTable columns={columns} rows={grades} rowAction={rowActions} />
    {#if meta}<Pagination {meta} />{/if}
  {/if}

<Modal bind:open={isOpen} title={selected ? 'Edit Nilai' : 'Tambah Nilai'} description="Tambah atau ubah nilai siswa. Pilih siswa, mapel, kelas, dan jenis penilaian.">
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <div class="flex flex-col gap-0"><Label for="student" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Siswa</Label>
      <Select id="student" bind:value={form.student_id} placeholder="Pilih siswa">
        {#each students as s}<option value={s.id}>{s.name}</option>{/each}
      </Select>
    </div>
    <div class="flex flex-col gap-0"><Label for="subject" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Mapel</Label>
      <Select id="subject" bind:value={form.subject_id} placeholder="Pilih mapel">
        {#each subjects as s}<option value={s.id}>{s.name}</option>{/each}
      </Select>
    </div>
    <div class="flex flex-col gap-0"><Label for="class" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Kelas</Label>
      <Select id="class" bind:value={form.class_id} placeholder="Pilih kelas">
        {#each classes as c}<option value={c.id}>{c.name}</option>{/each}
      </Select>
    </div>
    <div class="flex flex-col gap-0"><Label for="year" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Tahun Ajaran</Label>
      <Select id="year" bind:value={form.academic_year_id} placeholder="Pilih tahun ajaran">
        {#each years as y}<option value={y.id}>{y.name}</option>{/each}
      </Select>
    </div>
    <div class="flex flex-col gap-0"><Label for="type" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Jenis</Label>
      <Select id="type" bind:value={form.type} placeholder="Pilih jenis penilaian">
        <option value="task">Tugas</option>
        <option value="daily_quiz">Ulangan Harian</option>
        <option value="midterm">UTS</option>
        <option value="final">UAS</option>
      </Select>
    </div>
    <div class="flex flex-col gap-0"><Label for="score" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Nilai</Label><Input id="score" type="number" bind:value={form.score} required /></div>
    <div class="flex justify-end gap-2 pt-4 border-t border-border mt-2">
      <Button variant="outline" onclick={() => isOpen = false}>Batal</Button>
      <Button type="submit">{selected ? 'Perbarui' : 'Buat'}</Button>
    </div>
  </form>
</Modal>

<ConfirmDialog bind:open={isDeleteOpen} title="Hapus Nilai" onConfirm={remove} destructive />
</PageShell>
