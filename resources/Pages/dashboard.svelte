<script lang="ts">
  import { fly } from 'svelte/transition';
  import { page as inertiaPage, inertia } from '@inertiajs/svelte';
  import Sidebar from '../Components/Sidebar.svelte';
  import StatCard from '../Components/StatCard.svelte';
  import BentoCard from '../Components/BentoCard.svelte';
  import { ArrowRight } from '@lucide/svelte';
  import type { User, DashboardStats } from '../types';

  interface Props {
    stats?: DashboardStats;
    years?: { id: string; name: string }[];
    activeYear?: { id: string; name: string } | null;
    classes?: { id: string; name: string }[];
    subjects?: { id: string; name: string }[];
  }

  let {
    stats,
    years = [],
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
      <StatCard label="Siswa" value={stats?.totalStudents ?? 0} />
      <StatCard label="Guru" value={stats?.totalTeachers ?? 0} />
      <StatCard label="Kelas" value={stats?.totalClasses ?? 0} />
      <StatCard label="Mapel" value={stats?.totalSubjects ?? 0} />
    </div>

    <div class="mb-4 mt-10">
      <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Ruang kerja</p>
      <h2 class="mt-1.5 text-xl font-semibold tracking-[-0.025em] text-foreground">Akses utama</h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[minmax(170px,auto)]">
      {#if hasPermission('classes.view') && hasPermission('students.view')}
        <BentoCard title="Kelas & Siswa" description="Kelola kelas lalu buka daftar siswa per kelas.">
          <a href="/classes" use:inertia class="mt-auto inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
            Kelola kelas & siswa <ArrowRight class="w-4 h-4" />
          </a>
        </BentoCard>
      {/if}

      {#if hasPermission('teachers.view')}
        <BentoCard title="Guru" description="Tugaskan mapel dan lihat konfirmasi.">
          <a href="/teachers" use:inertia class="mt-auto inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
            Kelola guru <ArrowRight class="w-4 h-4" />
          </a>
        </BentoCard>
      {/if}
      {#if currentUser?.roles?.includes('admin')}
        <BentoCard title="Penugasan Guru" description="Atur kelas yang diampu dan wali kelas.">
          <a href="/teacher-assignments" use:inertia class="mt-auto inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
            Atur penugasan <ArrowRight class="w-4 h-4" />
          </a>
        </BentoCard>
      {/if}

      {#if hasPermission('schedules.view')}
        <BentoCard title="Jadwal Hari Ini" description="Lihat kelas yang sedang berlangsung.">
          <a href="/teacher/schedule" use:inertia class="mt-auto inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
            Lihat jadwal <ArrowRight class="w-4 h-4" />
          </a>
        </BentoCard>
      {/if}

      {#if hasPermission('journals.view')}
        <BentoCard title="Jurnal" description="Catatan digital setiap sesi mengajar.">
          <a href="/journals" use:inertia class="mt-auto inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
            Buka jurnal <ArrowRight class="w-4 h-4" />
          </a>
        </BentoCard>
      {/if}

      {#if hasPermission('grades.view')}
        <BentoCard title="Nilai" description="Catat dan tinjau nilai siswa.">
          <a href="/grades" use:inertia class="mt-auto inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
            Kelola nilai <ArrowRight class="w-4 h-4" />
          </a>
        </BentoCard>
      {/if}

      {#if hasPermission('school_locations.view')}
        <BentoCard title="Lokasi Sekolah" description="Atur lokasi aktif untuk verifikasi.">
          <a href="/school-locations" use:inertia class="mt-auto inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
            Kelola lokasi <ArrowRight class="w-4 h-4" />
          </a>
        </BentoCard>
      {/if}
    </div>
    </section>
  </div>
</div>
