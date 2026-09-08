<script lang="ts">
  import { inertia } from '@inertiajs/svelte';
  import Sidebar from '../../Components/Sidebar.svelte';
  import DataTable from '../../Components/DataTable.svelte';
  import StatCard from '../../Components/StatCard.svelte';
  import { fly } from 'svelte/transition';
  import { ArrowLeft } from '@lucide/svelte';
  import type { HeadmasterTeacherAttendanceHistoryView, HeadmasterTeacherAttendanceView } from '../../types';

  let { summary, rows = [] }: {
    summary: HeadmasterTeacherAttendanceView;
    rows?: HeadmasterTeacherAttendanceHistoryView[];
  } = $props();

  const displayRows = $derived(rows.map(row => ({
    id: String(row.date),
    tanggal: new Date(row.date).toLocaleDateString('id-ID', { dateStyle: 'medium' }),
    kelas: row.class_names,
    mapel: row.subject_names,
    sesi: row.scheduled_sessions,
    status: row.confirmed ? 'Hadir' : 'Tidak konfirmasi',
    konfirmasi: row.confirmed_at
      ? new Date(row.confirmed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      : '—',
    lokasi: row.is_inside_school === null ? '—' : row.is_inside_school === 1 ? 'Dalam radius' : 'Di luar radius',
    jarak: row.distance_meters === null ? '—' : `${Math.round(row.distance_meters)} m`,
  })));

  const columns = [
    { key: 'tanggal', label: 'Tanggal' },
    { key: 'kelas', label: 'Kelas' },
    { key: 'mapel', label: 'Mata Pelajaran' },
    { key: 'sesi', label: 'Sesi', align: 'right' as const },
    { key: 'status', label: 'Status', align: 'center' as const },
    { key: 'konfirmasi', label: 'Waktu', align: 'right' as const },
    { key: 'lokasi', label: 'Lokasi', align: 'center' as const },
    { key: 'jarak', label: 'Jarak', align: 'right' as const },
  ];
</script>

<Sidebar group="headmaster" />

<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div class="mb-8" in:fly={{ y: 20, duration: 700 }}>
    <a href="/headmaster/dashboard" use:inertia class="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors mb-6">
      <ArrowLeft class="w-4 h-4" /> Kembali ke pengawasan
    </a>
    <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Detail Kehadiran Guru</p>
    <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground">
      {summary.teacher_name}
    </h1>
    <p class="mt-4 text-base text-muted-foreground leading-relaxed max-w-[60ch]">
      Riwayat konfirmasi QR dan hari mengajar dalam 30 hari terakhir. Halaman ini bersifat read-only.
    </p>
  </div>

  <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8" in:fly={{ y: 20, duration: 700, delay: 100 }}>
    <StatCard label="Hari Hadir" value={`${summary.confirmed_days}/${summary.expected_days}`} />
    <StatCard label="Tingkat Kehadiran" value={summary.attendance_rate === null ? '—' : `${summary.attendance_rate}%`} />
    <StatCard label="Periode" value="30 Hari" />
  </div>

  <div in:fly={{ y: 20, duration: 700, delay: 150 }}>
    <DataTable {columns} rows={displayRows} emptyMessage="Belum ada riwayat jadwal guru." />
  </div>
</div>
