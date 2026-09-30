<script lang="ts">
  const steps = [
    {
      number: '01',
      title: 'Siapkan struktur sekolah',
      description: 'Atur tahun ajaran, kelas, mata pelajaran, jadwal, guru, dan lokasi sekolah dalam satu tempat.',
    },
    {
      number: '02',
      title: 'Guru bekerja dari alur yang sama',
      description: 'Kehadiran, konfirmasi lokasi, jurnal mengajar, dan input nilai mengikuti jadwal yang sudah tersusun.',
    },
    {
      number: '03',
      title: 'Data langsung terkonsolidasi',
      description: 'Admin dan kepala sekolah melihat progres, anomali, dan rekap tanpa menggabungkan banyak file terpisah.',
    },
    {
      number: '04',
      title: 'Orang tua mendapat informasi relevan',
      description: 'Data akademik dan kehadiran anak tersedia dari sumber yang sama, dengan akses sesuai peran.',
    },
  ];
</script>

<section id="cara-kerja" class="px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
  <div class="mx-auto max-w-7xl">
    <div class="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
      <div class="lg:sticky lg:top-28 lg:self-start">
        <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#b9472f]">Cara kerja</p>
        <h2 class="mt-4 text-balance text-[clamp(2rem,4.5vw,3.7rem)] font-semibold leading-[1.03] tracking-[-0.045em] text-[#292d2f] dark:text-[#efeee9]">Dari setup sampai dipakai sehari-hari, alurnya tetap jelas.</h2>
        <p class="mt-5 max-w-xl text-base leading-7 text-[#756e64] dark:text-[#a39b8e]">SIGAP tidak mengandalkan satu fitur “ajaib”. Nilainya muncul ketika data dasar sekolah tertata lalu digunakan bersama di seluruh aktivitas.</p>
      </div>

      <div class="divide-y divide-[#e6dfd2] border-y border-[#e6dfd2] dark:divide-white/[0.08] dark:border-white/[0.08]">
        {#each steps as step}
          <article class="grid gap-4 py-7 sm:grid-cols-[64px_1fr] sm:py-9">
            <span class="text-sm font-black tracking-[-0.02em] text-[#b9472f]">{step.number}</span>
            <div>
              <h3 class="text-xl font-bold tracking-[-0.025em] text-[#3a3d3e] dark:text-[#e0ebe3]">{step.title}</h3>
              <p class="mt-2 max-w-2xl text-sm leading-6 text-[#787168] dark:text-[#9f978b]">{step.description}</p>
            </div>
          </article>
        {/each}
      </div>
    </div>
  </div>
</section>
