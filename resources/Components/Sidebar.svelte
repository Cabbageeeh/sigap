<script lang="ts" module>
  // Sidebar remounts on every Inertia navigation (it lives inside each page), so scroll is kept here.
  let sidebarScrollTop = 0;
</script>

<script lang="ts">
  import { page, router, inertia } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import { cn } from '$lib/utils';
  import DarkModeToggle from './DarkModeToggle.svelte';
  import SigapIcon from './SigapIcon.svelte';
  import * as dialog from "@zag-js/dialog";
  import { useMachine, normalizeProps, portal } from "@zag-js/svelte";
  import {
    Menu, LogOut, LayoutDashboard, CalendarCheck, BookOpen, GraduationCap,
    Users, ChartColumn, Calendar, School, BookMarked, UserCheck, UserCog,
    CalendarClock, MapPin, Shield, User, History, Bell, Megaphone, QrCode, CalendarOff,
  } from '@lucide/svelte';
  import type { NotificationView } from '../types';

  interface User {
    id: string;
    name: string;
    username: string;
    roles: string[];
    permissions: string[];
  }

  interface MenuLink {
    href: string;
    label: string;
    group: string;
    icon: typeof LayoutDashboard;
    show: boolean;
  }

  interface MenuSection {
    label: string | null;
    links: MenuLink[];
  }

  let { group }: { group: string } = $props();

  let user = $derived(page.props.user as User | undefined);
  let isMenuOpen = $state(false);

  let desktopNav = $state<HTMLElement | null>(null);

  $effect(() => {
    const nav = desktopNav;
    if (!nav) return;
    nav.scrollTop = sidebarScrollTop;
    const rememberScroll = () => {
      if (nav.isConnected) sidebarScrollTop = nav.scrollTop;
    };
    nav.addEventListener('scroll', rememberScroll, { passive: true });
    return () => nav.removeEventListener('scroll', rememberScroll);
  });

  let notifications = $state<NotificationView[]>([]);
  let unreadCount = $state(0);
  let isNotificationsOpen = $state(false);

  $effect(() => {
    api(() => axios.get('/notifications/data'), { showSuccessToast: false }).then(result => {
      if (result.success && result.data) {
        const data = result.data as { unread: number; notifications: NotificationView[] };
        unreadCount = data.unread;
        notifications = data.notifications;
      }
    });
  });

  async function markAllRead(): Promise<void> {
    await api(() => axios.post('/notifications/read'), { showSuccessToast: false });
    unreadCount = 0;
    notifications = notifications.map(n => ({ ...n, read_at: Date.now() }));
  }

  const sheetService = useMachine(dialog.machine, {
    id: "mobile-sidebar",
    get open() { return isMenuOpen; },
    onOpenChange(details) { isMenuOpen = details.open; },
  });
  const sheetApi = $derived(dialog.connect(sheetService, normalizeProps));

  function hasRole(slug: string): boolean {
    return user?.roles?.includes(slug) ?? false;
  }

  function hasPermission(slug: string): boolean {
    if (!user) return false;
    if (hasRole('admin')) return true;
    return user.permissions?.includes(slug) ?? false;
  }

  let isAdmin = $derived(hasRole('admin'));
  let isTeacher = $derived(hasRole('teacher'));
  let isParent = $derived(hasRole('parent'));
  let isHeadmaster = $derived(hasRole('headmaster'));

  let dashboardLink = $derived(
    isParent
      ? { href: '/parent/dashboard', label: 'Dashboard', group: 'parent', icon: LayoutDashboard, show: true }
      : isHeadmaster
        ? { href: '/headmaster/dashboard', label: 'Dashboard', group: 'headmaster', icon: LayoutDashboard, show: true }
        : isTeacher
          ? { href: '/teacher/schedule', label: 'Dashboard', group: 'teacher', icon: LayoutDashboard, show: true }
          : { href: '/dashboard', label: 'Dashboard', group: 'dashboard', icon: LayoutDashboard, show: true },
  );

  let menuSections = $derived([
    { label: null, links: [dashboardLink] },
    {
      label: 'Data Master',
      links: [
        { href: '/school-locations', label: 'Profil Sekolah', group: 'school-locations', icon: MapPin, show: isAdmin || isHeadmaster },
        { href: '/school-calendar', label: 'Kalender Sekolah', group: 'school-calendar', icon: CalendarOff, show: isAdmin || isHeadmaster },
        { href: '/academic-years', label: 'Periode Akademik', group: 'academic-years', icon: Calendar, show: isAdmin || isHeadmaster },
        { href: '/subjects', label: 'Mata Pelajaran', group: 'subjects', icon: BookMarked, show: isAdmin || isHeadmaster },
        { href: '/classes', label: 'Kelas & Siswa', group: 'classes', icon: School, show: isAdmin || isHeadmaster },
        { href: '/teachers', label: 'Data Guru', group: 'teachers', icon: UserCog, show: isAdmin || isHeadmaster },
        { href: '/parents', label: 'Data Orang Tua', group: 'parents', icon: Users, show: isAdmin || isHeadmaster },
      ],
    },
    {
      label: 'Akademik',
      links: [
        {
          href: isTeacher ? '/teacher/schedule' : '/schedules',
          label: isTeacher ? 'Jadwal Mengajar' : 'Jadwal Pelajaran',
          group: isTeacher ? 'teacher' : 'schedules',
          icon: CalendarClock,
          show: !isParent && !isTeacher && hasPermission('schedules.view'),
        },
        { href: '/teacher-assignments', label: 'Kontrak Mengajar', group: 'teacher-assignments', icon: UserCog, show: isAdmin },
        { href: '/journals', label: 'Jurnal Mengajar', group: 'journals', icon: BookOpen, show: !isParent && !isAdmin && hasPermission('journals.view') },
        { href: '/attendance', label: 'Absensi Siswa', group: 'attendance', icon: CalendarCheck, show: !isParent && !isAdmin && hasPermission('attendance.view') },
      ],
    },
    {
      label: 'Penilaian',
      links: [
        { href: '/grades', label: 'Nilai Siswa', group: 'grades', icon: GraduationCap, show: !isParent && !isAdmin && hasPermission('grades.view') },
        { href: '/grade-audit', label: 'Audit Nilai', group: 'grade-audit', icon: History, show: !isParent && !isAdmin && hasPermission('grades.audit') },
      ],
    },
    {
      label: 'Kehadiran',
      links: [
        {
          href: isTeacher ? '/teacher/confirm' : '/teacher/confirmations',
          label: isTeacher ? 'Konfirmasi Kehadiran' : 'Monitoring Konfirmasi',
          group: isTeacher ? 'teacher-confirm' : 'teacher-confirmations',
          icon: UserCheck,
          show: isTeacher ? hasPermission('confirmations.create') : hasPermission('confirmations.view'),
        },
        { href: '/qr-settings', label: 'Pengaturan QR Absen', group: 'qr-settings', icon: QrCode, show: isAdmin },
      ],
    },
    {
      label: 'Laporan & Informasi',
      links: [
        { href: '/headmaster/dashboard', label: 'Pengawasan Sekolah', group: 'headmaster', icon: ChartColumn, show: isHeadmaster },
        { href: '/headmaster/reports', label: 'Laporan Kehadiran Guru', group: 'headmaster-reports', icon: ChartColumn, show: isHeadmaster },
        { href: '/announcements', label: 'Pengumuman', group: 'announcements', icon: Megaphone, show: isAdmin },
      ],
    },
    {
      label: 'Manajemen',
      links: [
        { href: '/users', label: 'Pengguna', group: 'users', icon: Users, show: isAdmin },
        { href: '/roles', label: 'Peran & Hak Akses', group: 'roles', icon: Shield, show: isAdmin },
      ],
    },
    {
      label: 'Akun',
      links: [
        { href: '/profile', label: 'Profil Saya', group: 'profile', icon: User, show: !!user },
      ],
    },
  ] as MenuSection[]);

  let visibleMenuSections = $derived(
    menuSections
      .map(section => ({
        ...section,
        links: section.links.filter(item => item.show),
      }))
      .filter(section => section.links.length > 0),
  );

  function isActive(item: MenuLink): boolean {
    return item.group === group;
  }

  function navLinkClasses(item: MenuLink): string {
    return cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      isActive(item)
        ? 'bg-primary/[0.09] text-primary font-semibold dark:bg-primary/[0.12]'
        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70',
    );
  }

  async function handleLogout(): Promise<void> {
    const result = await api(() => axios.post('/logout'));
    if (result.success) router.visit('/login');
  }
</script>

{#snippet notificationBell(direction = 'bottom-full')}
  <div class="relative">
    <button
      onclick={() => isNotificationsOpen = !isNotificationsOpen}
      aria-label="Notifikasi"
      class="relative inline-flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors cursor-pointer"
    >
      <Bell class="h-4 w-4" />
      {#if unreadCount > 0}
        <span class="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center">{unreadCount}</span>
      {/if}
    </button>
    {#if isNotificationsOpen}
      <div class="absolute {direction === 'top-full' ? 'top-full mt-2' : 'bottom-full mb-2'} right-0 w-80 max-h-96 overflow-y-auto bg-card border border-border rounded-2xl shadow-[0_18px_60px_rgba(0,0,0,0.14)] z-50">
        <div class="flex items-center justify-between px-4 py-2.5 border-b border-border sticky top-0 bg-card">
          <p class="font-heading text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Notifikasi</p>
          {#if unreadCount > 0}
            <button onclick={markAllRead} class="text-xs text-primary hover:text-primary/80 cursor-pointer">Tandai dibaca</button>
          {/if}
        </div>
        {#if notifications.length === 0}
          <p class="px-4 py-6 text-center text-sm text-muted-foreground">Tidak ada notifikasi.</p>
        {:else}
          {#each notifications as n (n.id)}
            <div class="px-4 py-3 border-b border-border/60 last:border-b-0">
              <div class="flex items-center gap-2">
                {#if n.read_at === null}<span class="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>{/if}
                <p class="text-sm font-medium text-foreground">{n.title}</p>
              </div>
              {#if n.body}<p class="text-xs text-muted-foreground mt-0.5">{n.body}</p>{/if}
              <p class="text-[10px] text-muted-foreground/70 mt-1">{new Date(n.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            </div>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
{/snippet}

{#snippet navigation(closeOnClick = false)}
  {#each visibleMenuSections as section (section.label ?? 'dashboard')}
    <div class={section.label ? 'mt-5' : ''}>
      {#if section.label}
        <p class="px-3 mb-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/65">{section.label}</p>
      {/if}
      <div class="flex flex-col gap-0.5">
        {#each section.links as item (item.href)}
          <a
            href={item.href}
            use:inertia
            onclick={closeOnClick ? () => isMenuOpen = false : undefined}
            aria-current={isActive(item) ? 'page' : undefined}
            title={item.label}
            class={navLinkClasses(item)}
          >
            <item.icon class="w-4 h-4 shrink-0" />
            <span class="truncate">{item.label}</span>
            {#if isActive(item)}
              <span class="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
            {/if}
          </a>
        {/each}
      </div>
    </div>
  {/each}
{/snippet}

<!-- ───────────── MOBILE TOP BAR ───────────── -->
<div class="lg:hidden fixed inset-x-0 top-0 z-40 h-16 bg-card/95 border-b border-border flex items-center justify-between px-4 backdrop-blur-xl">
  <button {...sheetApi.getTriggerProps()} onclick={() => isMenuOpen = !isMenuOpen} aria-label="Buka menu" class="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
    <Menu class="h-5 w-5" />
  </button>
  <a href="/" use:inertia class="flex items-center gap-2">
    <SigapIcon size={28} />
  </a>
  <div class="flex items-center gap-2">
    {@render notificationBell('top-full')}
    <DarkModeToggle />
  </div>
</div>

<!-- ───────────── MOBILE DRAWER ───────────── -->
{#if sheetApi.open}
  <div use:portal>
    <div {...sheetApi.getBackdropProps()} onclick={() => isMenuOpen = false} class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"></div>
    <div {...sheetApi.getPositionerProps()}>
      <div {...sheetApi.getContentProps()} class="bg-card fixed inset-y-0 left-0 z-50 h-full w-[84%] max-w-[300px] border-r border-border flex flex-col transition ease-in-out duration-300 font-body">
        <div class="flex items-center justify-between px-5 h-[4.5rem] border-b border-border shrink-0">
          <a href="/" use:inertia onclick={() => isMenuOpen = false} class="flex items-center gap-2">
            <SigapIcon size={30} showText={false} />
            <div class="min-w-0">
              <p class="font-heading font-semibold tracking-tight text-lg">SIGAP</p>
              <p class="text-[9px] uppercase tracking-[0.12em] text-muted-foreground truncate">Sistem Informasi Guru, Absensi, dan Prestasi</p>
            </div>
          </a>
          <button {...sheetApi.getCloseTriggerProps()} onclick={() => isMenuOpen = false} aria-label="Tutup menu" class="text-muted-foreground hover:text-foreground transition-colors p-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <nav class="flex-1 overflow-y-auto px-3 py-4">
          {@render navigation(true)}
        </nav>
        <div class="shrink-0 border-t border-border p-4">
          {#if user}
            <a href="/profile" use:inertia onclick={() => isMenuOpen = false} class="flex items-center gap-3 mb-3 rounded-xl p-2 -m-2 hover:bg-secondary/70 transition-colors">
              <div class="flex w-9 h-9 shrink-0 rounded-full bg-muted border border-border items-center justify-center">
                <span class="text-xs font-heading font-medium text-foreground">{user.name.slice(0, 2).toUpperCase()}</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-heading font-semibold tracking-tight truncate">{user.name}</p>
                <p class="text-xs text-muted-foreground truncate">@{user.username}</p>
              </div>
            </a>
            <button onclick={handleLogout} class="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-border bg-card text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors cursor-pointer">
              <LogOut class="h-4 w-4" />
              Keluar
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ───────────── DESKTOP SIDEBAR ───────────── -->
<aside data-slot="sidebar" class="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 bg-card border-r border-border flex-col">
  <div class="h-[4.5rem] shrink-0 flex items-center gap-3 px-5 border-b border-border">
    <SigapIcon size={30} showText={false} />
    <div class="min-w-0">
      <p class="font-heading font-semibold tracking-tight text-lg">SIGAP</p>
      <p class="text-[9px] uppercase tracking-[0.12em] text-muted-foreground truncate">Sistem Informasi Guru, Absensi, dan Prestasi</p>
    </div>
  </div>

  <nav bind:this={desktopNav} class="flex-1 overflow-y-auto px-3 py-4">
    {@render navigation()}
  </nav>

  <div class="shrink-0 border-t border-border p-4">
    <a href="/profile" use:inertia class="flex items-center gap-3 mb-3 rounded-xl p-2 -m-2 hover:bg-secondary/70 transition-colors">
      <div class="flex w-9 h-9 shrink-0 rounded-full bg-muted border border-border items-center justify-center">
        <span class="text-xs font-heading font-medium text-foreground">{user?.name.slice(0, 2).toUpperCase() ?? ''}</span>
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-heading font-semibold tracking-tight truncate">{user?.name ?? ''}</p>
        <p class="text-xs text-muted-foreground truncate">@{user?.username ?? ''}</p>
      </div>
    </a>
    <div class="flex items-center gap-2">
      {@render notificationBell()}
      <button onclick={handleLogout} class="flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-xl border border-border bg-card text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors cursor-pointer">
        <LogOut class="h-3.5 w-3.5" />
        Keluar
      </button>
      <DarkModeToggle />
    </div>
  </div>
</aside>
