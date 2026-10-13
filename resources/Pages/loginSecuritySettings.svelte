<script lang="ts">
  import axios from 'axios';
  import { router } from '@inertiajs/svelte';
  import { api } from '$lib/api';
  import Sidebar from '../Components/Sidebar.svelte';
  import Button from '../Components/Button.svelte';
  import Input from '../Components/Input.svelte';
  import Label from '../Components/Label.svelte';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import { LockKeyhole, Loader2 } from '@lucide/svelte';

  let { loginLockoutMinutes = 1 }: { loginLockoutMinutes?: number } = $props();
  let minutes = $state(1);
  let isSaving = $state(false);

  $effect(() => { minutes = loginLockoutMinutes; });

  async function saveSettings(): Promise<void> {
    isSaving = true;
    try {
      const result = await api(() => axios.put('/login-security', {
        login_lockout_minutes: Number(minutes),
      }));
      if (result.success) router.visit('/login-security', { preserveScroll: true });
    } finally {
      isSaving = false;
    }
  }
</script>

<svelte:head><title>Keamanan Login — SIGAP</title></svelte:head>
<Sidebar group="login-security" />
<PageShell>
  <PageHeader
    eyebrow="Manajemen"
    title="Keamanan Login."
    description="Atur berapa lama pengguna menunggu setelah terlalu banyak percobaan login yang gagal."
  />

  <section class="max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none sm:p-8">
    <div class="mb-6 flex items-center gap-3">
      <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><LockKeyhole class="h-5 w-5" /></span>
      <div>
        <h2 class="font-heading text-lg font-semibold">Jeda setelah gagal login</h2>
        <p class="text-sm text-muted-foreground">Berlaku untuk seluruh akun sekolah.</p>
      </div>
    </div>

    <form class="space-y-5" onsubmit={(event) => { event.preventDefault(); void saveSettings(); }}>
      <div class="max-w-sm space-y-2">
        <Label for="lockout-minutes">Lama waktu tunggu (menit)</Label>
        <Input id="lockout-minutes" type="number" min="1" max="15" step="1" bind:value={minutes} disabled={isSaving} required />
        <p class="text-xs text-muted-foreground">Pilih 1 sampai 15 menit. Pengaturan awal SIGAP adalah 1 menit.</p>
      </div>

      <div class="rounded-xl border border-border bg-secondary/30 p-4 text-sm leading-relaxed text-muted-foreground">
        Setelah 5 kali percobaan gagal, akun dan alamat IP yang terkait akan dibatasi sementara selama durasi ini. Batas tambahan 10 permintaan login per menit per alamat IP tetap aktif.
      </div>

      <div class="flex justify-end border-t border-border pt-4">
        <Button type="submit" disabled={isSaving || Number(minutes) === loginLockoutMinutes}>
          {#if isSaving}<Loader2 class="h-4 w-4 animate-spin" />{/if}
          Simpan pengaturan
        </Button>
      </div>
    </form>
  </section>
</PageShell>
