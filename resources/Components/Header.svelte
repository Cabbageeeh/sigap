<script lang="ts">
  import { page, router, inertia } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import DarkModeToggle from './DarkModeToggle.svelte';
  import SigapIcon from './SigapIcon.svelte';
  import * as menu from "@zag-js/menu";
  import * as dialog from "@zag-js/dialog";
  import { useMachine, normalizeProps, portal } from "@zag-js/svelte";
  import { Menu, LogOut, ArrowUpRight } from '@lucide/svelte';
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
    show: boolean;
  }

  let { group }: { group: string } = $props();

  let user = $derived(page.props.user as User | undefined);
  let isMenuOpen = $state(false);

  const menuService = useMachine(menu.machine, { id: "header-menu" });
  const menuApi = $derived(menu.connect(menuService, normalizeProps));

  const sheetService = useMachine(dialog.machine, {
    id: "mobile-sheet",
    get open() { return isMenuOpen; },
    onOpenChange(details) { isMenuOpen = details.open; },
  });
  const sheetApi = $derived(dialog.connect(sheetService, normalizeProps));

  function hasPermission(slug: string): boolean {
    if (!user) return false;
    if (user.roles?.includes('admin')) return true;
    return user.permissions?.includes(slug) ?? false;
  }

  let menuLinks = $derived([
    { href: '/dashboard', label: 'Dashboard', group: 'dashboard', show: true },
    { href: '/teacher/schedule', label: 'Jadwal', group: 'teacher', show: hasPermission('schedules.view') },
    { href: '/journals', label: 'Jurnal', group: 'journals', show: hasPermission('journals.view') },
    { href: '/grades', label: 'Nilai', group: 'grades', show: hasPermission('grades.view') },
    { href: '/parent/dashboard', label: 'Anak Saya', group: 'parent', show: hasPermission('students.view') && user?.roles?.includes('parent') },
    { href: '/headmaster/dashboard', label: 'Laporan', group: 'headmaster', show: hasPermission('headmaster.view') },
    { href: '/academic-years', label: 'Tahun Ajaran', group: 'academic-years', show: hasPermission('academic_years.view') },
    { href: '/classes', label: 'Kelas & Siswa', group: 'classes', show: hasPermission('classes.view') },
    { href: '/subjects', label: 'Mapel', group: 'subjects', show: hasPermission('subjects.view') },
    { href: '/teachers', label: 'Guru', group: 'teachers', show: hasPermission('teachers.view') },
    { href: '/parents', label: 'Orang Tua', group: 'parents', show: hasPermission('parents.view') },
    { href: '/schedules', label: 'Jadwal', group: 'schedules', show: hasPermission('schedules.view') },
    { href: '/school-locations', label: 'Lokasi', group: 'school-locations', show: hasPermission('school_locations.view') },
    { href: '/users', label: 'Pengguna', group: 'users', show: hasPermission('users.view') },
    { href: '/roles', label: 'Peran', group: 'roles', show: hasPermission('roles.view') },
    { href: '/profile', label: 'Profil', group: 'profile', show: !!user },
  ] as MenuLink[]);

  let visibleMenuLinks = $derived(menuLinks.filter((item) => item.show));

  async function handleLogout(): Promise<void> {
    const result = await api(() => axios.post('/logout'));
    if (result.success) router.visit('/login');
  }
</script>

<header class="fixed inset-x-0 top-0 z-50 bg-card/95 border-b border-border backdrop-blur-xl">
  <nav class="h-16 px-6 sm:px-10 lg:px-16 flex items-center justify-between">

    <div class="flex items-center gap-8">
      <a href="/" use:inertia class="group">
        <SigapIcon class="transition-opacity duration-300 group-hover:opacity-80" />
      </a>

      <div class="hidden md:flex items-center gap-1">
        {#each visibleMenuLinks as item, i}
          <a
            use:inertia
            href={item.href}
            class="relative px-4 py-2 text-sm font-heading transition-colors duration-200
              {item.group === group
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'}"
          >
            {item.label}
            {#if item.group === group}
              <span class="absolute bottom-0 left-4 right-4 h-px bg-primary"></span>
            {/if}
          </a>
          {#if i < visibleMenuLinks.length - 1}
            <span class="w-px h-3 bg-border"></span>
          {/if}
        {/each}
      </div>
    </div>

    <div class="flex items-center gap-3">
      <span class="md:hidden font-heading text-xs uppercase tracking-[0.2em] text-primary">{group}</span>

      <div class="h-4 w-px bg-border hidden sm:block"></div>

      <DarkModeToggle />

      <!-- Desktop: Dropdown menu -->
      <div class="hidden md:flex items-center gap-3">
        {#if user && user.id}
          <button {...menuApi.getTriggerProps()} aria-label="Account menu">
            <div class="relative flex w-9 h-9 shrink-0 overflow-hidden rounded-full bg-muted border border-border items-center justify-center cursor-pointer hover:border-primary/40 transition-colors">
              <span class="text-xs font-heading font-medium text-foreground">{user.name.slice(0, 2).toUpperCase()}</span>
            </div>
          </button>
          <div use:portal {...menuApi.getPositionerProps()}>
            <div {...menuApi.getContentProps()} class="bg-card text-foreground z-50 min-w-[12rem] rounded-2xl border border-border p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.14)] outline-none font-body">
              <div class="px-3 py-2.5">
                <p class="text-sm font-heading font-semibold tracking-tight">{user.name}</p>
                <p class="text-xs text-muted-foreground mt-0.5">@{user.username}</p>
              </div>
              <div class="h-px bg-border my-1"></div>
              <div {...menuApi.getItemProps({ value: "logout" })} onclick={handleLogout} class="data-[highlighted]:bg-muted relative flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors duration-150 outline-hidden select-none text-muted-foreground hover:text-foreground">
                <LogOut class="h-4 w-4" />
                <span>Keluar</span>
              </div>
            </div>
          </div>
        {:else}
          <a href="/login" use:inertia class="inline-flex items-center gap-1.5 px-5 h-9 rounded-xl bg-foreground text-background text-sm font-heading font-semibold hover:bg-foreground/90 transition-colors dark:bg-primary dark:text-primary-foreground">
            Masuk
            <ArrowUpRight class="w-3.5 h-3.5" />
          </a>
        {/if}
      </div>

      <!-- Mobile: Sheet (side panel) -->
      <div class="md:hidden">
        <button {...sheetApi.getTriggerProps()} aria-label="Open menu">
          <div class="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <Menu class="h-5 w-5" />
          </div>
        </button>
        {#if sheetApi.open}
          <div use:portal>
            <div {...sheetApi.getBackdropProps()} class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"></div>
            <div {...sheetApi.getPositionerProps()}>
              <div {...sheetApi.getContentProps()} class="bg-card fixed inset-y-0 left-0 z-50 h-full w-[80%] max-w-sm border-r border-border p-6 shadow-xl transition ease-in-out duration-300 font-body">
                <div class="flex items-center justify-between">
                  <a href="/" use:inertia onclick={() => isMenuOpen = false} class="group">
                    <SigapIcon class="group-hover:opacity-80" />
                  </a>
                  <button {...sheetApi.getCloseTriggerProps()} aria-label="Close menu" class="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>

                <div class="flex flex-col h-full pt-10">
                  <nav class="flex flex-col gap-1">
                    {#each visibleMenuLinks as item}
                      <a
                        href={item.href}
                        use:inertia
                        onclick={() => isMenuOpen = false}
                        class="flex items-center justify-between px-3 py-3 rounded-xl transition-colors duration-200
                          {item.group === group
                            ? 'bg-muted text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}"
                      >
                        <span class="text-base font-heading">{item.label}</span>
                        {#if item.group === group}
                          <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        {/if}
                      </a>
                    {/each}
                  </nav>

                  <div class="mt-auto pt-6 border-t border-border">
                    {#if user}
                      <div class="flex items-center gap-3 mb-5 px-1">
                        <div class="relative flex w-9 h-9 shrink-0 overflow-hidden rounded-full bg-muted border border-border items-center justify-center">
                          <span class="text-xs font-heading font-medium text-foreground">{user.name.slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div class="min-w-0">
                          <p class="text-sm font-heading font-semibold tracking-tight truncate">{user.name}</p>
                          <p class="text-xs text-muted-foreground truncate">@{user.username}</p>
                        </div>
                      </div>
                      <button onclick={handleLogout} class="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors cursor-pointer">
                        <LogOut class="h-4 w-4" />
                        Keluar
                      </button>
                    {:else}
                      <a href="/login" use:inertia onclick={() => isMenuOpen = false} class="inline-flex items-center justify-center gap-1.5 h-10 rounded-xl bg-foreground px-4 text-background text-sm font-heading font-semibold hover:bg-foreground/90 transition-colors dark:bg-primary dark:text-primary-foreground">
                        Masuk
                        <ArrowUpRight class="w-3.5 h-3.5" />
                      </a>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>

  </nav>
</header>
