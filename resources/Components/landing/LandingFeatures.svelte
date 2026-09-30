<section id="fitur" class="px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
  <div class="mx-auto max-w-7xl">
    <div class="max-w-3xl">
      <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#b9472f]">Fitur utama</p>
      <h2 class="mt-4 text-balance text-[clamp(2rem,5vw,3.8rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-[#292d2f] dark:text-[#efeee9]">Dibangun mengikuti ritme sekolah sehari-hari.</h2>
      <p class="mt-5 max-w-2xl text-base leading-7 text-[#746e64] dark:text-[#a39b8e]">Bukan kumpulan fitur yang berdiri sendiri. Data dari jadwal, guru, kelas, kehadiran, dan nilai saling mengisi sehingga pekerjaan administrasi tidak berulang.</p>
    </div>

    <div class="mt-12 grid gap-4 lg:grid-cols-12">
      <article class="feature-card lg:col-span-7 lg:min-h-[430px]">
        <div class="flex h-full flex-col">
          <div class="max-w-xl">
            <p class="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#b9472f] dark:text-[#ef8b73]">Absensi &amp; verifikasi</p>
            <h3 class="text-2xl font-bold tracking-[-0.03em] text-[#2b2f31] sm:text-3xl dark:text-[#eee7da]">Absensi guru yang memahami lokasi dan jadwal.</h3>
            <p class="mt-3 text-sm leading-6 text-[#777b7a] dark:text-[#9da09e]">Konfirmasi kehadiran dapat dikaitkan dengan lokasi sekolah, radius, dan sesi mengajar. Data anomali tetap terlihat untuk ditinjau, bukan hilang di balik rekap.</p>
          </div>
          <div class="mt-auto pt-8">
            <div class="rounded-2xl border border-[#e6dfd2] bg-[#f8f4eb] p-4 dark:border-white/[0.07] dark:bg-white/[0.035]">
              <div class="grid gap-2 sm:grid-cols-3">
                {#each [
                  { label: 'Lokasi', value: 'Main Campus' },
                  { label: 'Radius', value: '200 meter' },
                  { label: 'Status', value: 'Terverifikasi' },
                ] as item}
                  <div class="rounded-xl bg-white px-3 py-3 dark:bg-[#22231e]">
                    <p class="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9d968b]">{item.label}</p>
                    <p class="mt-1 text-xs font-extrabold text-[#454038] dark:text-[#e0d8ca]">{item.value}</p>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </div>
      </article>

      <article class="feature-card lg:col-span-5">
        <p class="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#b9472f] dark:text-[#ef8b73]">Jurnal</p>
        <h3 class="mt-3 text-xl font-bold tracking-[-0.025em] text-[#2b2f31] dark:text-[#eee7da]">Jurnal mengajar tanpa input berulang.</h3>
        <p class="mt-3 text-sm leading-6 text-[#777b7a] dark:text-[#9da09e]">Jadwal membantu memberi konteks kelas dan mata pelajaran, sehingga jurnal tersusun lebih konsisten dan mudah direkap.</p>
        <div class="mt-7 space-y-2">
          {#each ['Kelas X-A · Matematika', 'Materi: Sistem Persamaan Linear', 'Kehadiran siswa: 31/32'] as text, i}
            <div class="flex items-center gap-3 rounded-xl border border-[#e3e2dd] bg-[#fff] px-3 py-2.5 text-[11px] font-semibold text-[#6f685f] dark:border-white/[0.06] dark:bg-white/[0.025] dark:text-[#a79f92]">
              <span class="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[#eee5e2] text-[9px] font-extrabold text-[#b9472f] dark:bg-[#2d1d21]">{i + 1}</span>{text}
            </div>
          {/each}
        </div>
      </article>

      <article class="feature-card lg:col-span-4">
        <p class="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#b9472f] dark:text-[#ef8b73]">Akademik</p>
        <h3 class="mt-3 text-xl font-bold tracking-[-0.025em] text-[#2b2f31] dark:text-[#eee7da]">Nilai, audit, dan rapor.</h3>
        <p class="mt-3 text-sm leading-6 text-[#777b7a] dark:text-[#9da09e]">Kelola komponen nilai, lihat perubahan, lalu susun informasi akademik dari sumber data yang sama.</p>
      </article>

      <article class="feature-card lg:col-span-4">
        <p class="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#b9472f] dark:text-[#ef8b73]">Jadwal</p>
        <h3 class="mt-3 text-xl font-bold tracking-[-0.025em] text-[#2b2f31] dark:text-[#eee7da]">Jadwal sebagai fondasi alur kerja.</h3>
        <p class="mt-3 text-sm leading-6 text-[#777b7a] dark:text-[#9da09e]">Kelas, guru, mata pelajaran, dan sesi mengajar terhubung agar konteks tidak perlu diketik ulang di tiap modul.</p>
      </article>

      <article class="feature-card lg:col-span-4">
        <p class="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#b9472f] dark:text-[#ef8b73]">Orang tua</p>
        <h3 class="mt-3 text-xl font-bold tracking-[-0.025em] text-[#2b2f31] dark:text-[#eee7da]">Portal orang tua yang relevan.</h3>
        <p class="mt-3 text-sm leading-6 text-[#777b7a] dark:text-[#9da09e]">Orang tua melihat data anak yang memang mereka perlukan tanpa masuk ke area administrasi sekolah.</p>
      </article>
    </div>
  </div>
</section>

<style>
  .feature-card {
    border: 1px solid #e6dfd2;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.82);
    padding: 1.5rem;
    box-shadow: 0 8px 30px rgba(66, 52, 26, 0.035);
    transition: border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
  }

  .feature-card:hover {
    transform: translateY(-2px);
    border-color: #d6c6a4;
    box-shadow: 0 16px 40px rgba(66, 52, 26, 0.06);
  }

  :global(.dark) .feature-card {
    border-color: rgba(255, 255, 255, 0.075);
    background: rgba(17, 27, 21, 0.88);
    box-shadow: none;
  }

  :global(.dark) .feature-card:hover {
    border-color: rgba(101, 217, 145, 0.23);
    box-shadow: none;
  }

  @media (min-width: 640px) {
    .feature-card {
      padding: 1.75rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .feature-card {
      transition: none !important;
    }
  }
</style>
