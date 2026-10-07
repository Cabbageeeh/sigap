<script lang="ts">
  import axios from 'axios';
  import { api } from '$lib/api';
  import Sidebar from '../Components/Sidebar.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import Button from '../Components/Button.svelte';
  import Modal from '../Components/Modal.svelte';
  import type { SchoolMessageReport } from '../types';

  interface AdminData {
    settings: { enabled: boolean; service_hours: string };
    reports: SchoolMessageReport[];
    restrictions: { user_id: string; name: string; reason: string }[];
  }
  let data = $state<AdminData | null>(null);
  let enabled = $state(true);
  let hours = $state('');
  let busy = $state(false);
  let restrictionOpen = $state(false);
  let target = $state('');
  let targetName = $state('');
  let reason = $state('');
  async function loadSettings() {
    const result = await api<AdminData>(() => axios.get('/communication/data'), { showSuccessToast: false });
    if (result.success && result.data) { data = result.data; enabled = data.settings.enabled; hours = data.settings.service_hours; }
  }
  $effect(() => { void loadSettings(); });
  async function saveSettings() {
    busy = true;
    try { await api(() => axios.put('/communication/settings', { enabled, service_hours: hours })); }
    finally { busy = false; }
  }
  async function restrictUser(userId: string, restricted: boolean) {
    busy = true;
    try {
      const result = await api(() => axios.put('/communication/restrictions', { user_id: userId, restricted, reason }));
      if (result.success) { restrictionOpen = false; reason = ''; await loadSettings(); }
    } finally { busy = false; }
  }
  async function reviewReport(id: string) {
    busy = true;
    try {
      const result = await api(() => axios.put(`/communication/reports/${id}/review`));
      if (result.success) await loadSettings();
    } finally { busy = false; }
  }
</script>

<svelte:head><title>Pengaturan Komunikasi — SIGAP</title></svelte:head>
<Sidebar group="communication" />
<PageShell>
  <p class="text-xs uppercase tracking-[.2em] text-primary">Komunikasi sekolah</p>
  <h1 class="mt-2 text-4xl font-semibold">Pengaturan Komunikasi.</h1>
  <p class="mt-3 mb-6 text-muted-foreground">Kelola layanan dan tindak lanjuti pesan yang dilaporkan. Percakapan pribadi lainnya tidak ditampilkan di sini.</p>
  <form class="mb-6 space-y-4 rounded-2xl border border-border bg-card p-6" onsubmit={(event) => { event.preventDefault(); void saveSettings(); }}>
    <h2 class="text-lg font-semibold">Layanan pesan orang tua dan guru</h2>
    <label class="flex items-center gap-3"><input type="checkbox" bind:checked={enabled} /> Aktifkan pengiriman pesan</label>
    <label class="block text-sm">Jam layanan guru<input bind:value={hours} required maxlength={200} class="mt-2 w-full rounded-xl border border-border bg-background p-3" /></label>
    <p class="text-sm text-muted-foreground">Jam layanan memberi informasi waktu balasan. Pesan tetap dapat dikirim kapan saja. Jika layanan dinonaktifkan, riwayat tetap dapat dibaca.</p>
    <Button type="submit" disabled={busy || !data}>Simpan pengaturan</Button>
  </form>
  <section class="mb-6 rounded-2xl border border-border bg-card p-6">
    <h2 class="mb-4 text-lg font-semibold">Laporan pesan</h2>
    <p class="mb-4 text-sm text-muted-foreground">Menampilkan paling banyak 100 laporan terbaru. Periksa isi dan alasan sebelum membatasi pengirim.</p>
    {#each data?.reports ?? [] as report (report.id)}
      <article class="mb-4 rounded-xl border border-border p-4">
        <div class="flex flex-wrap justify-between gap-2"><b>{report.sender_name}</b><span class="text-xs text-muted-foreground">{report.status === 'pending' ? 'Belum diperiksa' : 'Sudah diperiksa'} · {new Date(report.created_at).toLocaleString('id-ID')}</span></div>
        <p class="mt-2 text-sm text-muted-foreground">Pelapor: {report.reporter_name} · Siswa: {report.student_name}</p>
        <p class="mt-3 whitespace-pre-wrap break-words rounded-xl bg-secondary p-3 text-sm">{report.body}</p>
        <p class="mt-3 whitespace-pre-wrap break-words text-sm"><b>Alasan:</b> {report.reason}</p>
        <div class="mt-4 flex flex-wrap gap-2">
          {#if report.status === 'pending'}<Button variant="outline" size="sm" disabled={busy} onclick={() => reviewReport(report.id)}>Tandai sudah diperiksa</Button>{/if}
          <Button variant="outline" size="sm" disabled={busy} onclick={() => { target = report.sender_user_id; targetName = report.sender_name; reason = ''; restrictionOpen = true; }}>Batasi pengiriman pesan</Button>
        </div>
      </article>
    {:else}<p class="text-sm text-muted-foreground">Belum ada laporan pesan.</p>{/each}
  </section>
  <section class="rounded-2xl border border-border bg-card p-6">
    <h2 class="mb-4 text-lg font-semibold">Pengguna yang dibatasi</h2>
    {#each data?.restrictions ?? [] as restriction (restriction.user_id)}
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4"><div><b>{restriction.name}</b><p class="mt-1 text-sm text-muted-foreground">{restriction.reason}</p></div><Button variant="outline" size="sm" disabled={busy} onclick={() => restrictUser(restriction.user_id, false)}>Pulihkan akses</Button></div>
    {:else}<p class="text-sm text-muted-foreground">Tidak ada pengguna yang dibatasi.</p>{/each}
  </section>
</PageShell>
<Modal bind:open={restrictionOpen} title="Batasi pengiriman pesan">
  <form class="space-y-4" onsubmit={(event) => { event.preventDefault(); void restrictUser(target, true); }}>
    <p class="text-sm">{targetName} tetap dapat membaca riwayat, tetapi tidak dapat mengirim pesan sampai akses dipulihkan.</p>
    <label class="block text-sm">Alasan pembatasan<textarea bind:value={reason} required minlength={5} maxlength={500} rows={3} class="mt-2 w-full rounded-xl border border-border bg-background p-3"></textarea></label>
    <Button type="submit" disabled={busy}>Terapkan pembatasan</Button>
  </form>
</Modal>
