<script lang="ts">
  import axios from 'axios';
  import { api } from '$lib/api';
  import Sidebar from '../../Components/Sidebar.svelte';
  import DataTable from '../../Components/DataTable.svelte';
  import StatCard from '../../Components/StatCard.svelte';
  import { fly } from 'svelte/transition';
  import type { OutsideConfirmationView, SchoolLocation } from '../../types';

  interface ReportsData {
    activeLocation: SchoolLocation | null;
    total: number;
    outside: OutsideConfirmationView[];
  }

  let { canView = false }: { canView?: boolean } = $props();

  let data = $state<ReportsData | null>(null);

  $effect(() => {
    api(() => axios.get('/headmaster/reports/outside-confirmations'), { showSuccessToast: false }).then(result => {
      if (result.success && result.data) data = result.data as ReportsData;
    });
  });

  const displayRows = $derived((data?.outside ?? []).map(c => ({
    id: c.schedule_id + c.confirmed_at,
    guru: c.teacher_name,
    kelas: c.class_name,
    mapel: c.subject_name,
    jarak: `${c.distance_meters} m`,
    waktu: new Date(c.confirmed_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
    status: 'Di Luar Radius',
  })));

  const columns = [
    { key: 'guru', label: 'Guru' },
    { key: 'kelas', label: 'Kelas' },
    { key: 'mapel', label: 'Mapel' },
    { key: 'jarak', label: 'Jarak', align: 'right' as const },
    { key: 'waktu', label: 'Konfirmasi' },
    { key: 'status', label: 'Status', align: 'center' as const },
  ];
</script>

<Sidebar group="headmaster-reports" />

<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased selection:bg-primary/20 selection:text-foreground pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div in:fly={{ y: 20, duration: 700 }}>
    <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Laporan Pengawasan</p>
    <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground mb-8">Konfirmasi di Luar Radius</h1>
  </div>

  <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8" in:fly={{ y: 20, duration: 700, delay: 100 }}>
    <StatCard label="Total Konfirmasi" value={data?.total ?? 0} />
    <StatCard label="Di Luar Radius" value={data?.outside.length ?? 0} change={{ value: 'Perlu perhatian', positive: false }} />
    <StatCard label="Lokasi Aktif" value={data?.activeLocation?.name ?? '—'} />
  </div>

  <div in:fly={{ y: 20, duration: 700, delay: 150 }}>
    <DataTable {columns} rows={displayRows} emptyMessage="Tidak ada konfirmasi di luar radius." />
  </div>
</div>
