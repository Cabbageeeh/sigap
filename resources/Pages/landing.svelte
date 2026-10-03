<script lang="ts">
  import LandingNav from '../Components/landing/LandingNav.svelte';
  import LandingHero from '../Components/landing/LandingHero.svelte';
  import LandingModules from '../Components/landing/LandingModules.svelte';
  import LandingFeatures from '../Components/landing/LandingFeatures.svelte';
  import LandingRoles from '../Components/landing/LandingRoles.svelte';
  import LandingWorkflow from '../Components/landing/LandingWorkflow.svelte';
  import LandingTrust from '../Components/landing/LandingTrust.svelte';
  import LandingCta from '../Components/landing/LandingCta.svelte';
  import LandingFooter from '../Components/landing/LandingFooter.svelte';
</script>

<svelte:head>
  <title>SIGAP — Sistem Informasi Guru, Absensi, dan Prestasi</title>
  <meta
    name="description"
    content="SIGAP membantu sekolah mengelola absensi guru, jurnal, nilai, jadwal, rapor, dan portal orang tua. Impor template e-Rapor dan siapkan ekspor nilai sesuai format sekolah."
  />
</svelte:head>

<div class="landing-shell min-h-[100dvh] overflow-x-hidden bg-[#f6f5f1] text-[#202426] transition-colors dark:bg-[#10110f] dark:text-[#f2f1ec]">
  <LandingNav />

  <main>
    <LandingHero />
    <LandingModules />
    <LandingFeatures />
    <LandingRoles />
    <LandingWorkflow />
    <LandingTrust />
    <LandingCta />
  </main>

  <LandingFooter />
</div>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }

  .landing-shell {
    font-family: 'Public Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  @media (prefers-reduced-motion: reduce) {
    :global(html) {
      scroll-behavior: auto;
    }

    /* Anchors now live in the section components, so this stays global. */
    :global(.landing-shell a) {
      transition: none !important;
    }
  }
</style>
