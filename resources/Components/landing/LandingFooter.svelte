<script lang="ts">
  import SigapIcon from '../SigapIcon.svelte';

  const year = new Date().getFullYear();
</script>

<footer class="px-4 pb-6 pt-8 sm:px-6 lg:px-8">
  <div class="mx-auto flex max-w-7xl flex-col gap-7 border-t border-[#e6dfd2] py-8 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.08]">
    <div class="flex items-center gap-4">
      <SigapIcon size={28} />
      <span class="hidden h-5 w-px bg-[#e2dacd] sm:block dark:bg-white/[0.1]"></span>
      <p class="max-w-md text-xs leading-5 text-[#7c807e] dark:text-[#918a7f]">Sistem Informasi Guru, Absensi, dan Prestasi.</p>
    </div>
    <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold text-[#8e877d] dark:text-[#898277]">
      <span>© {year} SIGAP</span>
      <span>MIT License</span>
      <a href="https://github.com/MasRama/nara" target="_blank" rel="noopener noreferrer" class="transition hover:text-[#b9472f]">Built with Nara</a>
    </div>
  </div>
</footer>
