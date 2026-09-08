<script lang="ts">
  import Sidebar from '../Components/Sidebar.svelte';
  import DataTable from '../Components/DataTable.svelte';
  import Pagination from '../Components/Pagination.svelte';
  import { fly } from 'svelte/transition';
  import type { GradeAuditLogRow, PaginationMeta } from '../types';

  let { canView = false, logs = [], meta }: { canView?: boolean; logs?: GradeAuditLogRow[]; meta?: PaginationMeta } = $props();

  const displayRows = $derived(logs.map(log => ({
    id: log.id,
    waktu: new Date(log.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
    siswa: log.student_name,
    mapel: log.subject_name,
    kelas: log.class_name,
    jenis: typeLabel(log.type),
    aksi: actionLabel(log.action),
    nilai: scoreLabel(log.old_score, log.new_score),
    user: log.user_name,
  })));

  const columns = [
    { key: 'waktu', label: 'Waktu' },
    { key: 'siswa', label: 'Siswa' },
    { key: 'mapel', label: 'Mapel' },
    { key: 'kelas', label: 'Kelas' },
    { key: 'jenis', label: 'Jenis' },
    { key: 'aksi', label: 'Aksi', align: 'center' as const },
    { key: 'nilai', label: 'Nilai', align: 'right' as const },
    { key: 'user', label: 'Oleh' },
  ];

  function typeLabel(type: string): string {
    switch (type) {
      case 'task': return 'Tugas';
      case 'daily_quiz': return 'Kuis Harian';
      case 'midterm': return 'UTS';
      case 'final': return 'UAS';
      default: return type;
    }
  }

  function actionLabel(action: string): string {
    switch (action) {
      case 'create': return 'Dibuat';
      case 'update': return 'Diubah';
      case 'delete': return 'Dihapus';
      default: return action;
    }
  }

  function scoreLabel(oldScore: number | null, newScore: number | null): string {
    if (oldScore === null && newScore === null) return '—';
    if (oldScore === null) return `— → ${newScore}`;
    if (newScore === null) return `${oldScore} → —`;
    return `${oldScore} → ${newScore}`;
  }
</script>

<Sidebar group="grade-audit" />
<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12" in:fly={{ y: 20, duration: 800 }}>
    <div>
      <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Integritas Data</p>
      <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground">
        Audit Nilai.
      </h1>
      <p class="mt-4 text-base text-muted-foreground leading-relaxed max-w-[52ch]">
        Riwayat perubahan nilai: siapa yang mengubah, kapan, dan dari nilai berapa ke berapa.
      </p>
    </div>
  </div>

  {#if !canView}
    <div class="bg-card border border-border rounded-2xl px-6 py-12 text-center" in:fly={{ y: 20, duration: 700, delay: 100 }}>
      <p class="text-sm text-muted-foreground">Anda tidak memiliki akses ke riwayat audit nilai.</p>
    </div>
  {:else}
    <div in:fly={{ y: 20, duration: 700, delay: 100 }}>
      <DataTable {columns} rows={displayRows} emptyMessage="Belum ada perubahan nilai tercatat." />
      {#if meta}<Pagination {meta} />{/if}
    </div>
  {/if}
</div>
