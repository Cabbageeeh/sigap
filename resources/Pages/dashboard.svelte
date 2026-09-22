<script lang="ts">
  import { fly } from 'svelte/transition';
  import type { Component } from 'svelte';
  import { page as inertiaPage } from '@inertiajs/svelte';
  import Sidebar from '../Components/Sidebar.svelte';
  import StatCard from '../Components/StatCard.svelte';
  import BentoCard from '../Components/BentoCard.svelte';
  import AttendanceTrendChart from '../Components/charts/AttendanceTrendChart.svelte';
  import AttendanceDonut from '../Components/charts/AttendanceDonut.svelte';
  import ClassSizeBars from '../Components/charts/ClassSizeBars.svelte';
  import ConfirmationWeekChart from '../Components/charts/ConfirmationWeekChart.svelte';
  import { CalendarClock, GraduationCap, MapPin, School, BookOpen, UserCog, UserRound } from '@lucide/svelte';
  import type { User, DashboardStats, DashboardCharts } from '../types';

  interface Props {
    stats?: DashboardStats;
    years?: { id: string; name: string }[];
    activeYear?: { id: string; name: string } | null;
    charts?: DashboardCharts;
    classes?: { id: string; name: string }[];
    subjects?: { id: string; name: string }[];
  }

  let {
    stats,
    years = [],
    charts,
    activeYear,
    classes = [],
    subjects = [],
  }: Props = $props();

  const currentUser = $derived(inertiaPage.props.user as User | undefined);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat pagi' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  const today = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  function hasPermission(slug: string): boolean {
    if (!currentUser) return false;
    if (currentUser.roles?.includes('admin')) return true;
    return currentUser.permissions?.includes(slug) ?? false;
  }

  type AksesItem = {
    title: string;
    description: string;
    href: string;
    cta: string;
    icon: Component;
    tone: 'primary' | 'info' | 'warning' | 'success';
    meta: string;
    show: boolean;
  };

  const yearLabel = activeYear?.name ?? 'belum diatur';

  const aksesUtama = $derived<AksesItem[]>([
    {
      title: 'Kelas & Siswa',
      description: 'Kelola rombongan belajar lalu buka daftar siswa per kelas.',
      href: '/classes', cta: 'Kelola kelas & siswa', icon: School, tone: 'primary',
      meta: `${stats?.totalClasses ?? classes.length} kelas · ${stats?.totalStudents ?? 0} siswa`,
      show: hasPermission('classes.view') && hasPermission('students.view'),
    },
    {
      title: 'Data Guru',
      description: 'Tautkan akun ke guru, tugaskan mapel, pantau konfirmasi harian.',
      href: '/teachers', cta: 'Kelola guru', icon: UserRound, tone: 'info',
      meta: `${stats?.totalTeachers ?? 0} guru terdaftar`,
      show: hasPermission('teachers.view'),
    },
    {
      title: 'Penugasan Guru',
      description: 'Atur kelas yang diampu dan siapa wali kelasnya.',
      href: '/teacher-assignments', cta: 'Atur penugasan', icon: UserCog, tone: 'success',
      meta: `periode ${yearLabel}`,
      show: !!currentUser?.roles?.includes('admin'),
    },
    {
      title: 'Jadwal Hari Ini',
      description: 'Lihat sesi yang sedang dan akan berlangsung hari ini.',
      href: '/teacher/schedule', cta: 'Lihat jadwal', icon: CalendarClock, tone: 'warning',
      meta: today,
      show: hasPermission('schedules.view'),
    },
    {
      title: 'Jurnal Mengajar',
      description: 'Catatan setiap sesi mengajar sekaligus menjadi presensi siswa.',
      href: '/journals', cta: 'Buka jurnal', icon: BookOpen, tone: 'primary',
      meta: `tahun ajaran ${yearLabel}`,
      show: hasPermission('journals.view'),
    },
    {
      title: 'Nilai Siswa',
      description: 'Catat nilai per komponen, tinjau rapor, lalu publikasikan.',
      href: '/grades', cta: 'Kelola nilai', icon: GraduationCap, tone: 'info',
      meta: `tahun ajaran ${yearLabel}`,
      show: hasPermission('grades.view'),
    },
    {
      title: 'Profil Sekolah',
      description: 'Identitas sekolah, titik koordinat, dan radius geofencing absensi.',
      href: '/school-locations', cta: 'Kelola profil', icon: MapPin, tone: 'success',
      meta: activeYear ? `aktif: ${activeYear.name}` : 'tahun ajaran belum diatur',
      show: hasPermission('school_locations.view'),
    },
  ]);
</script>

<Sidebar group="dashboard" />

<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased selection:bg-primary/20 selection:text-foreground lg:pl-64">
  <div class="mx-auto max-w-[1500px] px-5 pb-16 pt-20 sm:px-8 lg:px-8 lg:pt-8">
    <section class="mb-8" in:fly={{ y: 16, duration: 550 }}>
      <div class="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p class="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{today} · {greeting}</p>
          <h1 class="font-heading text-[clamp(2rem,5vw,3.35rem)] font-semibold leading-[1] tracking-[-0.045em] text-foreground">
            Selamat datang, {currentUser?.name?.split(' ')[0] || 'Pengguna'}.
          </h1>
          <p class="mt-3 max-w-[58ch] text-sm leading-6 text-muted-foreground">
            {activeYear ? 'Ringkasan data sekolah dan akses kerja utama tersedia di bawah.' : 'Atur tahun ajaran aktif dan profil sekolah untuk mulai menggunakan SIGAP.'}
          </p>
        </div>
        {#if activeYear}
          <div class="self-start rounded-xl border border-border bg-card px-3.5 py-2.5 sm:self-auto">
            <p class="text-[9px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Tahun ajaran aktif</p>
            <p class="mt-0.5 text-sm font-semibold text-foreground">{activeYear.name}</p>
          </div>
        {/if}
      </div>
    </section>

    <section>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4" in:fly={{ y: 20, duration: 800, delay: 150 }}>
      <StatCard label="Siswa" value={stats?.totalStudents ?? 0} icon={GraduationCap} tone="primary" />
      <StatCard label="Guru" value={stats?.totalTeachers ?? 0} icon={UserRound} tone="info" />
      <StatCard label="Kelas" value={stats?.totalClasses ?? 0} icon={School} tone="warning" />
      <StatCard label="Mapel" value={stats?.totalSubjects ?? 0} icon={BookOpen} tone="success" />
    </div>

    {#if charts}
      <div class="mb-4 mt-10">
        <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Analitik</p>
        <h2 class="mt-1.5 text-xl font-semibold tracking-[-0.025em] text-foreground">Kehadiran & kapasitas</h2>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <BentoCard title="Tren Kehadiran Siswa" description="Catatan hadir 14 hari terakhir." class="lg:col-span-2">
          <AttendanceTrendChart data={charts.attendanceTrend} />
        </BentoCard>
        <BentoCard title="Status Kehadiran" description="Tahun ajaran aktif.">
          <AttendanceDonut data={charts.statusBreakdown} />
        </BentoCard>
        <BentoCard title="Konfirmasi Guru" description="Minggu ini vs jadwal." class="lg:col-span-2">
          <ConfirmationWeekChart data={charts.confirmationWeek} />
        </BentoCard>
        <BentoCard title="Siswa per Kelas" description="Tahun ajaran aktif.">
          <ClassSizeBars data={charts.classSizes} />
        </BentoCard>
      </div>
    {/if}

    <div class="mb-5 mt-10 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Ruang kerja</p>
        <h2 class="mt-1.5 text-xl font-semibold tracking-[-0.025em] text-foreground">Akses utama</h2>
      </div>
      <p class="text-xs text-muted-foreground">Pintasan yang tampil mengikuti hak akses akun Anda.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[minmax(206px,auto)]">
      {#each aksesUtama.filter(item => item.show) as item (item.title)}
        <BentoCard
          title={item.title}
          description={item.description}
          href={item.href}
          cta={item.cta}
          icon={item.icon}
          tone={item.tone}
          meta={item.meta}
        />
      {/each}
    </div>
    </section>
  </div>
</div>
