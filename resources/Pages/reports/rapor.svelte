<script lang="ts">
  import Sidebar from '../../Components/Sidebar.svelte';
  import Button from '../../Components/Button.svelte';
  import { inertia } from '@inertiajs/svelte';
  import { Printer, Lock, ArrowLeft, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import type { SubjectGradeSummary } from '../../types';

  type NavTarget = { id: string; name: string; nis: string } | null;

  let {
    student = { name: '', nis: '' },
    className = '',
    yearName = '',
    isParent = false,
    gradesPublished = false,
    summaries = [],
    attendanceCounts = { present: 0, sick: 0, leave: 0, absent: 0 },
    backHref = '/dashboard',
    backLabel = 'Kembali',
    previousStudent = null,
    nextStudent = null,
    studentPosition = 0,
    studentTotal = 0,
  }: {
    student?: { name: string; nis: string };
    className?: string;
    yearName?: string;
    isParent?: boolean;
    gradesPublished?: boolean;
    summaries?: SubjectGradeSummary[];
    attendanceCounts?: { present: number; sick: number; leave: number; absent: number };
    backHref?: string;
    backLabel?: string;
    previousStudent?: NavTarget;
    nextStudent?: NavTarget;
    studentPosition?: number;
    studentTotal?: number;
  } = $props();

  const totalAttendance = $derived(attendanceCounts.present + attendanceCounts.sick + attendanceCounts.leave + attendanceCounts.absent);

  function typeLabel(type: string): string {
    switch (type) {
      case 'task': return 'Tugas';
      case 'daily_quiz': return 'Kuis Harian';
      case 'midterm': return 'UTS';
      case 'final': return 'UAS';
      default: return type;
    }
  }
</script>

<svelte:head>
  <title>Rapor — {student.name}</title>
</svelte:head>

<Sidebar group="grades" />

<div class="print-body min-h-[100dvh] bg-background text-foreground font-body antialiased pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div class="no-print flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
    <div>
      <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Rapor Siswa</p>
      <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground">Rapor</h1>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <a href={backHref} use:inertia class="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft class="h-4 w-4" /> {backLabel}
      </a>
      {#if previousStudent}
        <a href={`/reports/rapor/${previousStudent.id}`} use:inertia title={previousStudent.name}
          class="inline-flex max-w-[190px] items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ChevronLeft class="h-4 w-4 shrink-0" /> <span class="truncate">{previousStudent.name}</span>
        </a>
      {/if}
      {#if studentTotal > 1}
        <span class="px-1 text-xs font-mono-accent text-muted-foreground">{studentPosition} / {studentTotal}</span>
      {/if}
      {#if nextStudent}
        <a href={`/reports/rapor/${nextStudent.id}`} use:inertia title={nextStudent.name}
          class="inline-flex max-w-[190px] items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <span class="truncate">{nextStudent.name}</span> <ChevronRight class="h-4 w-4 shrink-0" />
        </a>
      {/if}
      <Button onclick={() => window.print()}><Printer class="w-4 h-4 mr-1" /> Cetak Rapor</Button>
    </div>
  </div>

  {#if isParent && !gradesPublished}
    <div class="bg-card border border-border rounded-2xl px-6 py-12 text-center">
      <Lock class="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
      <p class="text-sm text-muted-foreground">Nilai belum dipublikasikan oleh sekolah. Silakan cek kembali nanti.</p>
    </div>
  {:else}
    <div class="print-sheet bg-card border border-border rounded-2xl overflow-hidden max-w-[820px] mx-auto">
      <header class="px-8 py-6 border-b border-border text-center">
        <h2 class="font-heading font-semibold text-xl tracking-tight">LAPORAN HASIL BELAJAR SISWA</h2>
        <p class="text-sm text-muted-foreground mt-1">Tahun Ajaran {yearName}</p>
      </header>

      <section class="px-8 py-5 border-b border-border grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <div class="flex justify-between"><span class="text-muted-foreground">Nama</span><span class="font-medium">{student.name}</span></div>
        <div class="flex justify-between"><span class="text-muted-foreground">NIS</span><span class="font-medium">{student.nis}</span></div>
        <div class="flex justify-between"><span class="text-muted-foreground">Kelas</span><span class="font-medium">{className}</span></div>
        <div class="flex justify-between"><span class="text-muted-foreground">Tahun Ajaran</span><span class="font-medium">{yearName}</span></div>
      </section>

      <section class="px-8 py-6">
        <h3 class="font-heading font-semibold text-sm uppercase tracking-[0.15em] text-muted-foreground mb-3">Hasil Belajar</h3>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="px-3 py-2 text-left font-mono-accent text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Mapel</th>
              {#if summaries.length > 0}
                {#each Object.keys(summaries[0].scores) as type}
                  <th class="px-3 py-2 text-right font-mono-accent text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{typeLabel(type)}</th>
                {/each}
              {/if}
              <th class="px-3 py-2 text-right font-mono-accent text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Nilai Akhir</th>
              <th class="px-3 py-2 text-center font-mono-accent text-[10px] uppercase tracking-[0.15em] text-muted-foreground">KKM</th>
              <th class="px-3 py-2 text-center font-mono-accent text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Predikat</th>
              <th class="px-3 py-2 text-center font-mono-accent text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {#if summaries.length === 0}
              <tr><td colspan={8} class="px-3 py-6 text-center text-muted-foreground">Belum ada nilai tercatat.</td></tr>
            {:else}
              {#each summaries as summary}
                <tr class="border-b border-border/60">
                  <td class="px-3 py-2 font-medium">{summary.subject_name}</td>
                  {#each Object.keys(summary.scores) as type}
                    <td class="px-3 py-2 text-right">{summary.scores[type] ?? '—'}</td>
                  {/each}
                  <td class="px-3 py-2 text-right font-semibold">{summary.final_score ?? '—'}</td>
                  <td class="px-3 py-2 text-center">{summary.kkm}</td>
                  <td class="px-3 py-2 text-center">{summary.predikat ?? '—'}</td>
                  <td class="px-3 py-2 text-center">{summary.is_passed === null ? '—' : summary.is_passed ? 'Tuntas' : 'Belum'}</td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </section>

      <section class="px-8 py-6 border-t border-border">
        <h3 class="font-heading font-semibold text-sm uppercase tracking-[0.15em] text-muted-foreground mb-3">Rekap Kehadiran</h3>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
          <div class="bg-secondary/40 rounded-md px-3 py-2 flex justify-between"><span class="text-muted-foreground">Total</span><span class="font-medium">{totalAttendance}</span></div>
          <div class="bg-secondary/40 rounded-md px-3 py-2 flex justify-between"><span class="text-muted-foreground">Hadir</span><span class="font-medium">{attendanceCounts.present}</span></div>
          <div class="bg-secondary/40 rounded-md px-3 py-2 flex justify-between"><span class="text-muted-foreground">Sakit</span><span class="font-medium">{attendanceCounts.sick}</span></div>
          <div class="bg-secondary/40 rounded-md px-3 py-2 flex justify-between"><span class="text-muted-foreground">Izin</span><span class="font-medium">{attendanceCounts.leave}</span></div>
          <div class="bg-secondary/40 rounded-md px-3 py-2 flex justify-between"><span class="text-muted-foreground">Alpa</span><span class="font-medium">{attendanceCounts.absent}</span></div>
        </div>
      </section>

      <footer class="px-8 py-8 grid grid-cols-2 gap-8 text-sm">
        <div>
          <p class="text-muted-foreground mb-12">Orang Tua/Wali</p>
          <p class="font-medium">( ______________________ )</p>
        </div>
        <div class="text-right">
          <p class="text-muted-foreground mb-12">{new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
          <p class="font-medium">Kepala Sekolah</p>
          <p class="font-medium mt-8">( ______________________ )</p>
        </div>
      </footer>
    </div>
  {/if}
</div>

<style>
  @media print {
    aside, .no-print {
      display: none !important;
    }
    body {
      background: white !important;
    }
    .print-sheet {
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      max-width: none !important;
    }
    .min-h-\[100dvh\] {
      padding: 0 !important;
    }
    .print-body {
      padding: 0 !important;
    }
  }
</style>
