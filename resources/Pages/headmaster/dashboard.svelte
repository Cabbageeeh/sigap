<script lang="ts">
  import axios from 'axios';
  import { api } from '$lib/api';
  import Sidebar from '../../Components/Sidebar.svelte';
  import StatCard from '../../Components/StatCard.svelte';
  import BentoCard from '../../Components/BentoCard.svelte';
  import DataTable from '../../Components/DataTable.svelte';
  import { inertia } from '@inertiajs/svelte';
  import { fly } from 'svelte/transition';
  import { ArrowRight, BookOpen, CalendarClock, ClipboardCheck, Clock, GraduationCap, MapPin, School, ShieldCheck, UserCheck, UserRound } from '@lucide/svelte';
  import type {
    DashboardStats,
    SessionStatusView,
    MissedConfirmationView,
    JournalCompletenessView,
    GradeProgressView,
    AnnouncementView,
    HeadmasterClassOverviewView,
    HeadmasterTeacherAttendanceView,
  } from '../../types';

  interface DashboardData {
    stats: DashboardStats;
    classOverview: HeadmasterClassOverviewView[];
    teacherAttendance: HeadmasterTeacherAttendanceView[];
    today: SessionStatusView[];
    confirmedToday: number;
    missed: MissedConfirmationView[];
    journals: JournalCompletenessView[];
    progress: GradeProgressView[];
  }

  let { canView = false }: { canView?: boolean } = $props();

  let data = $state<DashboardData | null>(null);
  let announcements = $state<AnnouncementView[]>([]);

  $effect(() => {
    api(() => axios.get('/headmaster/dashboard/data'), { showSuccessToast: false }).then(result => {
      if (result.success && result.data) data = result.data as DashboardData;
    });
    api(() => axios.get('/announcements/latest'), { showSuccessToast: false }).then(result => {
      if (result.success && result.data) announcements = result.data as AnnouncementView[];
    });
  });

  const missedRows = $derived((data?.missed ?? []).map(gap => ({
    id: gap.teacher_user_id + gap.date,
    guru: gap.teacher_name,
    tanggal: new Date(gap.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }),
    sesi: `${gap.scheduled_sessions} sesi`,
    kelas: gap.class_names,
    mapel: gap.subject_names,
    status: 'Belum Konfirmasi',
  })));

  const missedTeacherCount = $derived(new Set((data?.missed ?? []).map(gap => gap.teacher_user_id)).size);

  const progressRows = $derived((data?.progress ?? []).map(p => ({
    id: p.class_name + p.subject_name,
    kelas: p.class_name,
    mapel: p.subject_name,
    guru: p.teacher_name || '—',
    dinilai: `${p.graded_students}/${p.total_students}`,
    progres: p.total_students > 0 ? `${Math.round((p.graded_students / p.total_students) * 100)}%` : '0%',
  })));

  const journalRows = $derived((data?.journals ?? []).map(j => ({
    id: j.teacher_name,
    guru: j.teacher_name,
    sesi: j.expected,
    jurnal: j.filled,
    kelengkapan: j.expected > 0 ? `${Math.round((j.filled / j.expected) * 100)}%` : '0%',
  })));

  const classRows = $derived((data?.classOverview ?? []).map(item => ({
    id: item.class_id,
    kelas: item.class_name,
    siswa: item.total_students,
    dinilai: `${item.graded_students}/${item.total_students}`,
    rataRata: item.average_score === null ? '—' : item.average_score.toFixed(2),
    kehadiran: item.attendance_rate === null ? '—' : `${item.attendance_rate}%`,
    status: item.needs_attention ? 'Perlu perhatian' : 'Normal',
  })));

  const teacherAttendanceRows = $derived((data?.teacherAttendance ?? []).map(item => ({
    id: item.teacher_user_id,
    guru: item.teacher_name,
    hadir: `${item.confirmed_days}/${item.expected_days}`,
    tingkat: item.attendance_rate === null ? '—' : `${item.attendance_rate}%`,
    status: item.attendance_rate !== null && item.attendance_rate < 90 ? 'Perlu perhatian' : 'Normal',
  })));


  const missedColumns = [
    { key: 'guru', label: 'Guru' },
    { key: 'tanggal', label: 'Tanggal', align: 'right' as const },
    { key: 'sesi', label: 'Sesi Terlewat', align: 'right' as const },
    { key: 'kelas', label: 'Kelas' },
    { key: 'mapel', label: 'Mapel' },
    { key: 'status', label: 'Status', align: 'center' as const },
  ];

  const progressColumns = [
    { key: 'kelas', label: 'Kelas' },
    { key: 'mapel', label: 'Mapel' },
    { key: 'guru', label: 'Guru' },
    { key: 'dinilai', label: 'Dinilai', align: 'right' as const },
    { key: 'progres', label: 'Progres', align: 'right' as const },
  ];

  const journalColumns = [
    { key: 'guru', label: 'Guru' },
    { key: 'sesi', label: 'Sesi', align: 'right' as const },
    { key: 'jurnal', label: 'Jurnal', align: 'right' as const },
    { key: 'kelengkapan', label: 'Kelengkapan', align: 'right' as const },
  ];

  const classColumns = [
    { key: 'kelas', label: 'Kelas' },
    { key: 'siswa', label: 'Siswa', align: 'right' as const },
    { key: 'dinilai', label: 'Dinilai', align: 'right' as const },
    { key: 'rataRata', label: 'Rata-rata Nilai', align: 'right' as const },
    { key: 'kehadiran', label: 'Kehadiran', align: 'right' as const },
    { key: 'status', label: 'Status', align: 'center' as const },
  ];

  const teacherAttendanceColumns = [
    { key: 'guru', label: 'Guru' },
    { key: 'hadir', label: 'Hari Hadir', align: 'right' as const },
    { key: 'tingkat', label: 'Tingkat Kehadiran', align: 'right' as const },
    { key: 'status', label: 'Status', align: 'center' as const },
  ];
</script>

{#snippet classRowAction(item: { id: string })}
  <a href={`/headmaster/classes/${item.id}/grades`} use:inertia class="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80">
    Detail nilai <ArrowRight class="w-3.5 h-3.5" />
  </a>
{/snippet}

{#snippet teacherAttendanceRowAction(item: { id: string })}
  <a href={`/headmaster/teachers/${item.id}/attendance`} use:inertia class="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80">
    Riwayat <ArrowRight class="w-3.5 h-3.5" />
  </a>
{/snippet}


<Sidebar group="headmaster" />

<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased selection:bg-primary/20 selection:text-foreground pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div in:fly={{ y: 20, duration: 700 }}>
    <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Dasbor Kepala Sekolah</p>
    <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground mb-8">Pengawasan Sekolah</h1>
  </div>

  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4" in:fly={{ y: 20, duration: 700, delay: 100 }}>
    <StatCard label="Siswa" value={data?.stats.totalStudents ?? 0} icon={GraduationCap} tone="primary" />
    <StatCard label="Guru" value={data?.stats.totalTeachers ?? 0} icon={UserRound} tone="info" />
    <StatCard label="Kelas" value={data?.stats.totalClasses ?? 0} icon={School} tone="warning" />
    <StatCard label="Mapel" value={data?.stats.totalSubjects ?? 0} icon={BookOpen} tone="success" />
  </div>

  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10" in:fly={{ y: 20, duration: 700, delay: 150 }}>
    <StatCard label="Jadwal Hari Ini" value={data?.today.length ?? 0} icon={CalendarClock} tone="info" />
    <StatCard label="Konfirmasi" value={data?.confirmedToday ?? 0} icon={UserCheck} tone="success" />
    <StatCard label="Belum Konfirmasi" value={(data?.today.length ?? 0) - (data?.confirmedToday ?? 0)} icon={Clock} tone="warning" />
    <StatCard label="Jurnal Hari Ini" value={data?.stats.todayJournals ?? 0} icon={ClipboardCheck} tone="primary" />
  </div>

  <div class="mb-5" in:fly={{ y: 20, duration: 700, delay: 200 }}>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Ruang kerja</p>
        <h2 class="mt-1.5 text-xl font-semibold tracking-[-0.025em] text-foreground">Pintasan pengawasan</h2>
      </div>
      <p class="text-xs text-muted-foreground">Semua halaman hanya membaca — tidak ada data yang berubah dari sini.</p>
    </div>
  </div>

  <div class="mb-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(206px,auto)]" in:fly={{ y: 20, duration: 700, delay: 225 }}>
    <BentoCard
      title="Monitoring Konfirmasi"
      description="Riwayat scan QR guru beserta jarak dan status lokasi."
      href="/teacher/confirmations" cta="Buka log konfirmasi" icon={UserCheck} tone="warning"
      meta={`${missedTeacherCount} guru belum scan QR (7 hari)`}
    />
    <BentoCard
      title="Laporan Luar Radius"
      description="Hanya konfirmasi yang tercatat di luar radius sekolah."
      href="/headmaster/reports" cta="Lihat laporan" icon={MapPin} tone="primary"
      meta={`${data?.stats.totalTeachers ?? 0} guru dipantau posisinya`}
    />
    <BentoCard
      title="Audit Nilai"
      description="Siapa mengubah nilai, kapan, dan berapa angka sebelumnya."
      href="/grade-audit" cta="Periksa audit" icon={ShieldCheck} tone="info"
      meta="riwayat perubahan nilai"
    />
    <BentoCard
      title="Absensi Siswa"
      description="Kehadiran per kelas dan rentang tanggal, lahir dari jurnal mengajar."
      href="/attendance" cta="Buka rekap absensi" icon={ClipboardCheck} tone="success"
      meta={`${data?.stats.totalStudents ?? 0} siswa aktif`}
    />
  </div>

  <div class="mb-10" in:fly={{ y: 20, duration: 700, delay: 250 }}>
    <div class="flex items-baseline justify-between mb-3">
      <div>
        <h2 class="font-heading font-semibold tracking-[-0.02em]">Rata-rata Nilai per Kelas</h2>
        <p class="text-xs text-muted-foreground font-mono-accent mt-1">Ringkasan kelas aktif; status perhatian berdasarkan nilai, kehadiran, dan kelengkapan penilaian.</p>
      </div>
    </div>
    <DataTable columns={classColumns} rows={classRows} rowAction={classRowAction} emptyMessage="Belum ada data kelas aktif." />
  </div>

  <div class="mb-10" in:fly={{ y: 20, duration: 700, delay: 225 }}>
    <div class="flex items-baseline justify-between mb-3">
      <div>
        <h2 class="font-heading font-semibold tracking-[-0.02em]">Kehadiran Guru (30 Hari)</h2>
        <p class="text-xs text-muted-foreground font-mono-accent mt-1">Konfirmasi QR dibandingkan hari mengajar yang dijadwalkan.</p>
      </div>
    </div>
    <DataTable columns={teacherAttendanceColumns} rows={teacherAttendanceRows} rowAction={teacherAttendanceRowAction} emptyMessage="Belum ada data kehadiran guru." />
  </div>

  <div class="mb-10" in:fly={{ y: 20, duration: 700, delay: 200 }}>
    <div class="flex items-baseline justify-between mb-3">
      <h2 class="font-heading font-semibold tracking-[-0.02em]">Guru Tanpa Konfirmasi (7 Hari Terakhir)</h2>
      <p class="text-xs text-muted-foreground font-mono-accent">Satu scan QR per hari — baris muncul bila guru tidak men-scan pada hari ia terjadwal</p>
    </div>
    <DataTable columns={missedColumns} rows={missedRows} emptyMessage="Semua guru sudah men-scan QR pada hari masing-masing." />
  </div>

  <div class="mb-10" in:fly={{ y: 20, duration: 700, delay: 250 }}>
    <div class="flex items-baseline justify-between mb-3">
      <h2 class="font-heading font-semibold tracking-[-0.02em]">Progres Pengisian Nilai</h2>
      <p class="text-xs text-muted-foreground font-mono-accent">Siswa dinilai per kelas dan mapel</p>
    </div>
    <DataTable columns={progressColumns} rows={progressRows} emptyMessage="Belum ada kelas dan mapel aktif." />
  </div>

  <div class="mb-10" in:fly={{ y: 20, duration: 700, delay: 300 }}>
    <div class="flex items-baseline justify-between mb-3">
      <h2 class="font-heading font-semibold tracking-[-0.02em]">Kelengkapan Jurnal Bulan Ini</h2>
      <p class="text-xs text-muted-foreground font-mono-accent">Jurnal terisi vs sesi yang seharusnya terjadi</p>
    </div>
    <DataTable columns={journalColumns} rows={journalRows} emptyMessage="Belum ada data jurnal bulan ini." />
  </div>

  {#if announcements.length > 0}
    <div class="mt-10" in:fly={{ y: 20, duration: 700, delay: 400 }}>
      <h2 class="font-heading font-semibold tracking-[-0.02em] mb-3">Pengumuman</h2>
      <div class="flex flex-col gap-3">
        {#each announcements as announcement (announcement.id)}
          <article class="bg-card border border-border rounded-2xl px-5 py-4">
            <div class="flex items-baseline justify-between gap-4">
              <h3 class="font-heading text-sm font-semibold text-foreground">{announcement.title}</h3>
              <span class="text-[10px] text-muted-foreground font-mono-accent shrink-0">{new Date(announcement.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
            </div>
            <p class="text-sm text-muted-foreground mt-1.5 whitespace-pre-line">{announcement.body}</p>
            <p class="text-[10px] text-muted-foreground/70 mt-2">— {announcement.author_name}</p>
          </article>
        {/each}
      </div>
    </div>
  {/if}
</div>
