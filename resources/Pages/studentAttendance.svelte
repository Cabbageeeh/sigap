<script lang="ts">
  import Sidebar from '../Components/Sidebar.svelte';
  import DataTable from '../Components/DataTable.svelte';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import type { StudentAttendance } from '../types';

  let { records = [] }: { records?: StudentAttendance[] } = $props();

  const columns = [
    { key: 'student_id', label: 'Siswa' },
    { key: 'journal_id', label: 'Jurnal' },
    { key: 'status', label: 'Status' },
    { key: 'note', label: 'Catatan' },
  ];
</script>

<Sidebar group="attendance" />
<PageShell>
  <PageHeader eyebrow="Kehadiran Siswa" title="Kehadiran." description="Rekap kehadiran siswa per jadwal dan jurnal mengajar." />
  <DataTable {columns} rows={records} />
</PageShell>
