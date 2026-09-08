<script lang="ts">
  import Sidebar from '../../Components/Sidebar.svelte';
  import DataTable from '../../Components/DataTable.svelte';
  import { fly } from 'svelte/transition';
  import type { StudentAttendance } from '../../types';

  let { studentName = '', records = [] }: { studentName?: string; records?: StudentAttendance[] } = $props();

  const columns = [
    { key: 'created_at', label: 'Tanggal' },
    { key: 'status', label: 'Status' },
    { key: 'note', label: 'Catatan' },
  ];
</script>

<Sidebar group="parent" />

<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased selection:bg-primary/20 selection:text-foreground pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div in:fly={{ y: 20, duration: 700 }}>
    <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Riwayat Kehadiran</p>
    <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground mb-8">{studentName ? `Kehadiran ${studentName}` : 'Kehadiran Anak'}</h1>
  </div>

  <div in:fly={{ y: 20, duration: 700, delay: 100 }}>
    <DataTable {columns} rows={records} emptyMessage="Belum ada riwayat kehadiran." />
  </div>
</div>
