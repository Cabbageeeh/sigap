<script lang="ts">
  const modules = [
    'Absensi guru',
    'Jurnal mengajar',
    'Nilai & rapor',
    'Jadwal pelajaran',
    'Portal orang tua',
    'QR & geolokasi',
  ];
</script>

<section class="border-y border-[#e3e2dd] bg-white py-6 dark:border-white/[0.07] dark:bg-[#0d1510]">
  <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-4 px-6 lg:justify-between">
    <span class="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9a9388]">Terhubung dalam SIGAP</span>
    {#each modules as module}
      <span class="text-xs font-bold text-[#625d54] dark:text-[#aaa295]">{module}</span>
    {/each}
  </div>
</section>
