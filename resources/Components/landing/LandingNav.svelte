<script lang="ts">
  import { inertia, page } from '@inertiajs/svelte';
  import { ArrowRight, Menu, X } from '@lucide/svelte';
  import DarkModeToggle from '../DarkModeToggle.svelte';
  import SigapIcon from '../SigapIcon.svelte';

  interface User {
    id: string;
    name: string | null;
    username: string;
  }

  const user = page.props.user as User | undefined;
  let mobileMenuOpen = $state(false);

  const links = [
    { href: '#platform', label: 'Platform' },
    { href: '#fitur', label: 'Fitur' },
    { href: '#peran', label: 'Untuk siapa' },
    { href: '#cara-kerja', label: 'Cara kerja' },
  ];
</script>

<header class="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
  <nav
    class="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-2xl border border-black/[0.06] bg-white/90 px-4 shadow-[0_8px_30px_rgba(18,46,31,0.06)] backdrop-blur-xl sm:px-5 dark:border-white/[0.08] dark:bg-[#171915]/90 dark:shadow-none"
    aria-label="Navigasi utama"
  >
    <a href="/" use:inertia class="flex items-center gap-3" aria-label="SIGAP Beranda">
      <SigapIcon size={30} />
    </a>

    <div class="hidden items-center gap-7 text-[13px] font-semibold text-[#69645a] lg:flex dark:text-[#a3a6a4]">
      {#each links as item}
        <a href={item.href} class="transition-colors hover:text-[#b9472f] dark:hover:text-[#f29a84]">{item.label}</a>
      {/each}
    </div>

    <div class="flex items-center gap-2">
      <DarkModeToggle />
      <div class="hidden items-center gap-2 sm:flex">
        {#if user}
          <a
            href="/dashboard"
            use:inertia
            class="inline-flex h-10 items-center gap-2 rounded-xl bg-[#202426] px-4 text-sm font-semibold text-white transition hover:bg-[#34393b] dark:bg-[#b9472f] dark:hover:bg-[#963822]"
          >
            Dashboard
            <ArrowRight class="h-4 w-4" />
          </a>
        {:else}
          <a
            href="/login"
            use:inertia
            class="inline-flex h-10 items-center rounded-xl px-3.5 text-sm font-semibold text-[#3d3a33] transition hover:bg-[#efeee9] dark:text-[#e5ded0] dark:hover:bg-white/[0.06]"
          >
            Masuk
          </a>
          <a
            href="/login"
            use:inertia
            class="inline-flex h-10 items-center gap-2 rounded-xl bg-[#202426] px-4 text-sm font-semibold text-white transition hover:bg-[#34393b] dark:bg-[#b9472f] dark:hover:bg-[#963822]"
          >
            Mulai gunakan
            <ArrowRight class="h-4 w-4" />
          </a>
        {/if}
      </div>

      <button
        type="button"
        class="grid h-10 w-10 place-items-center rounded-xl text-[#4f4b42] transition hover:bg-[#efeee9] lg:hidden dark:text-[#d8d0c1] dark:hover:bg-white/[0.06]"
        aria-label="Buka menu"
        aria-expanded={mobileMenuOpen}
        onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
      >
        {#if mobileMenuOpen}
          <X class="h-5 w-5" />
        {:else}
          <Menu class="h-5 w-5" />
        {/if}
      </button>
    </div>
  </nav>

  {#if mobileMenuOpen}
    <div class="mx-auto mt-2 max-w-7xl rounded-2xl border border-black/[0.06] bg-white p-3 shadow-xl lg:hidden dark:border-white/[0.08] dark:bg-[#171915]">
      <div class="grid gap-1 text-sm font-semibold text-[#565149] dark:text-[#d4ccbe]">
        {#each links as item}
          <a
            href={item.href}
            class="rounded-xl px-3 py-2.5 hover:bg-[#f1f0eb] dark:hover:bg-white/[0.05]"
            onclick={() => (mobileMenuOpen = false)}
          >{item.label}</a>
        {/each}
        <div class="mt-2 border-t border-[#e7ede9] pt-3 dark:border-white/[0.08]">
          <a
            href={user ? '/dashboard' : '/login'}
            use:inertia
            class="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#202426] px-4 text-sm font-semibold text-white dark:bg-[#b9472f]"
          >
            {user ? 'Buka dashboard' : 'Masuk ke SIGAP'}
            <ArrowRight class="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  {/if}
</header>
