<script lang="ts">
  import { inertia, page } from '@inertiajs/svelte';
  import { ArrowRight } from '@lucide/svelte';

  interface User {
    id: string;
    name: string | null;
    username: string;
  }

  const user = page.props.user as User | undefined;
</script>

<section class="px-4 pb-8 sm:px-6 sm:pb-10 lg:px-8">
  <div class="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-[#dfd8d3] bg-[#efede9] px-5 py-14 sm:px-10 sm:py-16 lg:px-14 dark:border-[#4c4128] dark:bg-[#211f18]">
    <div class="relative z-10 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
      <div class="max-w-3xl">
        <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#b9472f] dark:text-[#ef8b73]">SIGAP untuk sekolah Anda</p>
        <h2 class="mt-4 text-balance text-[clamp(2.1rem,5vw,4.3rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[#292d2f] dark:text-[#f5efe2]">Administrasi lebih sedikit. Konteks lebih lengkap.</h2>
        <p class="mt-5 max-w-2xl text-base leading-7 text-[#716a60] dark:text-[#a39b8f]">Masuk untuk melanjutkan ke workspace sekolah Anda. Jika belum memiliki akses, hubungi administrator sekolah untuk mendapatkan akun.</p>
      </div>
      <a
        href={user ? '/dashboard' : '/login'}
        use:inertia
        class="group inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-[#202426] px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#34393b] dark:bg-[#ef8b73] dark:text-[#241d1b] dark:hover:bg-[#f2a18d]"
      >
        {user ? 'Buka dashboard' : 'Masuk sekarang'}
        <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </a>
    </div>
  </div>
</section>
