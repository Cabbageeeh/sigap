<script lang="ts">
  import { inertia } from '@inertiajs/svelte';
  import Sidebar from '../../Components/Sidebar.svelte';
  import DataTable from '../../Components/DataTable.svelte';
  import { fly } from 'svelte/transition';
  import { ArrowLeft } from '@lucide/svelte';
  import type { HeadmasterGradeDetailView } from '../../types';

  let { className = '', grade = '', rows = [] }: {
    className?: string;
    grade?: string | number;
    rows?: HeadmasterGradeDetailView[];
  } = $props();

  function typeLabel(type: string): string {
    switch (type) {
      case 'task': return 'Tugas';
      case 'daily_quiz': return 'Kuis Harian';
      case 'midterm': return 'UTS';
      case 'final': return 'UAS';
      default: return type;
    }
  }

  const displayRows = $derived(rows.map(row => ({
    id: row.id,
    siswa: `${row.student_name} (${row.nis})`,
    mapel: row.subject_name,
    jenis: typeLabel(row.type),
    nilai: row.score,
    tanggal: new Date(row.date).toLocaleDateString('id-ID', { dateStyle: 'medium' }),
  })));

  const columns = [
    { key: 'siswa', label: 'Siswa' },
    { key: 'mapel', label: 'Mata Pelajaran' },
    { key: 'jenis', label: 'Jenis Penilaian' },
    { key: 'nilai', label: 'Nilai', align: 'right' as const },
    { key: 'tanggal', label: 'Tanggal', align: 'right' as const },
  ];
</script>

<Sidebar group="headmaster" />

<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div class="mb-8" in:fly={{ y: 20, duration: 700 }}>
    <a href="/headmaster/dashboard" use:inertia class="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors mb-6">
      <ArrowLeft class="w-4 h-4" /> Kembali ke pengawasan
    </a>
    <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Detail Penilaian</p>
    <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground">
      Nilai Kelas {className}{grade ? ` · Tingkat ${grade}` : ''}
    </h1>
    <p class="mt-4 text-base text-muted-foreground leading-relaxed max-w-[60ch]">
      Daftar nilai per siswa dan mata pelajaran. Halaman ini bersifat read-only untuk kebutuhan pengawasan.
    </p>
  </div>

  <div in:fly={{ y: 20, duration: 700, delay: 100 }}>
    <DataTable {columns} rows={displayRows} emptyMessage="Belum ada nilai untuk kelas ini." />
  </div>
</div>
