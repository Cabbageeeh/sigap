<section id="peran" class="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
  <div class="mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-[#202426] px-5 py-12 text-white sm:px-8 sm:py-16 lg:px-12 lg:py-20 dark:bg-[#171a1c]">
    <div class="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
      <div class="max-w-lg">
        <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ef8b73]">Akses sesuai peran</p>
        <h2 class="mt-4 text-balance text-[clamp(2rem,4.5vw,3.6rem)] font-semibold leading-[1.03] tracking-[-0.045em]">Satu data sekolah, tampilan yang berbeda untuk setiap tanggung jawab.</h2>
        <p class="mt-5 text-sm leading-6 text-white/65 sm:text-base sm:leading-7">Guru tidak perlu melihat pengaturan admin. Orang tua tidak perlu melihat data sekolah lain. Kepala sekolah membutuhkan ringkasan yang berbeda dari operator. SIGAP memisahkan akses tanpa memisahkan sumber datanya.</p>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <article class="role-card">
          <div><p class="text-xs font-extrabold uppercase tracking-[0.12em] text-[#ef8b73]">Guru</p><h3 class="mt-1.5 text-lg font-bold">Datang, konfirmasi, mengajar.</h3></div>
          <p class="mt-4 text-sm leading-6 text-white/58">Lihat jadwal, konfirmasi kehadiran, isi jurnal, dan kelola nilai dari alur yang sama.</p>
        </article>
        <article class="role-card">
          <div><p class="text-xs font-extrabold uppercase tracking-[0.12em] text-[#ef8b73]">Admin</p><h3 class="mt-1.5 text-lg font-bold">Atur tanpa kehilangan kontrol.</h3></div>
          <p class="mt-4 text-sm leading-6 text-white/58">Kelola struktur sekolah, pengguna, role, jadwal, QR, lokasi, dan data master lainnya.</p>
        </article>
        <article class="role-card">
          <div><p class="text-xs font-extrabold uppercase tracking-[0.12em] text-[#ef8b73]">Kepala sekolah</p><h3 class="mt-1.5 text-lg font-bold">Lihat gambaran besar lebih cepat.</h3></div>
          <p class="mt-4 text-sm leading-6 text-white/58">Pantau kehadiran guru, progres nilai, kelengkapan jurnal, dan kondisi kelas secara read-only.</p>
        </article>
        <article class="role-card">
          <div><p class="text-xs font-extrabold uppercase tracking-[0.12em] text-[#ef8b73]">Orang tua</p><h3 class="mt-1.5 text-lg font-bold">Informasi anak, tanpa kebisingan.</h3></div>
          <p class="mt-4 text-sm leading-6 text-white/58">Akses ringkasan anak, kehadiran, dan nilai dari portal yang memang dibuat untuk orang tua.</p>
        </article>
      </div>
    </div>
  </div>
</section>

<style>
  .role-card {
    display: flex;
    min-height: 250px;
    flex-direction: column;
    border: 1px solid rgba(255, 255, 255, 0.11);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.055);
    padding: 1.4rem;
    backdrop-filter: blur(8px);
  }

  @media (min-width: 640px) {
    .role-card {
      padding: 1.6rem;
    }
  }
</style>
