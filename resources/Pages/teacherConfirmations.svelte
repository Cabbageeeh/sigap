<script lang="ts">
  import Sidebar from '../Components/Sidebar.svelte';
  import DataTable from '../Components/DataTable.svelte';
  import type { TeacherConfirmationLogView } from '../types';
  import { fly } from 'svelte/transition';

  let { records = [] }: { records?: TeacherConfirmationLogView[] } = $props();

  const displayRows = $derived(records.map(r => ({
    id: r.id,
    guru: r.teacher_name,
    tanggal: new Date(r.confirmation_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }),
    waktu: new Date(r.confirmed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  })));

  const columns = [
    { key: 'guru', label: 'Guru' },
    { key: 'tanggal', label: 'Tanggal' },
    { key: 'waktu', label: 'Waktu Konfirmasi' },
  ];
</script>

<Sidebar group="teacher-confirmations" />
<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div class="mb-12" in:fly={{ y: 20, duration: 800 }}>
    <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Konfirmasi Guru</p>
    <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground">
      Log Kehadiran Guru.
    </h1>
    <p class="mt-4 text-base text-muted-foreground leading-relaxed max-w-[52ch]">
      Riwayat konfirmasi kehadiran guru berdasarkan scan QR absen harian.
    </p>
  </div>
  <DataTable {columns} rows={displayRows} emptyMessage="Belum ada konfirmasi kehadiran." />
</div>
