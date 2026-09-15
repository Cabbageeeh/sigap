<script lang="ts">
  import Sidebar from '../Components/Sidebar.svelte';
  import DataTable from '../Components/DataTable.svelte';
  import Pagination from '../Components/Pagination.svelte';
  import type { Parent, PaginationMeta } from '../types';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';

  type ParentRow = Parent & { user_name: string | null; user_username: string; student_count: number };
  let { parents = [], meta }: { permissions: { canView?: boolean }; parents?: ParentRow[]; meta?: PaginationMeta } = $props();

  const columns = [{ key: 'user_name', label: 'Pengguna' }, { key: 'student_count', label: 'Anak' }, { key: 'phone', label: 'Telepon' }, { key: 'address', label: 'Alamat' }];
</script>

<Sidebar group="parents" />
<PageShell>
  <PageHeader eyebrow="Data Orang Tua" title="Orang Tua." description="Ringkasan akun orang tua. Data orang tua dikelola langsung dari detail siswa." />
  <DataTable {columns} rows={parents} />
  {#if meta}<Pagination {meta} />{/if}
</PageShell>
