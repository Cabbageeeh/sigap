<script lang="ts">
  import { router } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import { Toast } from '$lib/toast';

  interface AccessAuditLog {
    id: string;
    new_value: string | null;
    changed_by_name: string;
    changed_at: number;
  }

  let {
    canManage = false,
    enabled = true,
    auditLogs = [],
  }: {
    canManage?: boolean;
    enabled?: boolean;
    auditLogs?: AccessAuditLog[];
  } = $props();

  let accessEnabled = $state(false);
  let saving = $state(false);

  $effect(() => {
    accessEnabled = enabled;
  });

  async function saveAccess(event: Event): Promise<void> {
    const nextValue = (event.currentTarget as HTMLInputElement).checked;
    const previousValue = accessEnabled;
    accessEnabled = nextValue;
    saving = true;
    const result = await api<{ enabled: boolean }>(() => axios.put('/grades/erapor/teacher-mapping-access', { enabled: nextValue }), { showSuccessToast: false });
    saving = false;
    if (!result.success) {
      accessEnabled = previousValue;
      return;
    }
    Toast(nextValue ? 'Guru kini dapat mengatur pemetaan e-Rapor pada kelas yang diampu' : 'Perubahan pemetaan oleh guru dinonaktifkan', 'success');
    router.reload({ preserveScroll: true });
  }
</script>

{#if canManage}
  <section class="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-heading font-semibold">Akses pemetaan e-Rapor untuk guru</h2>
        <p class="mt-1 max-w-3xl text-sm text-muted-foreground">Jika aktif, guru dapat mengatur pemetaan khusus pada kelas dan mapel yang diampu. Guru tidak dapat mengubah pemetaan default sekolah.</p>
      </div>
      <label for="erapor-teacher-mapping-access" class="flex shrink-0 cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground">
        <input id="erapor-teacher-mapping-access" type="checkbox" checked={accessEnabled} onchange={saveAccess} disabled={saving} class="h-4 w-4 rounded border-border accent-primary" />
        {#if saving}Menyimpan…{:else if accessEnabled}Diizinkan{:else}Dinonaktifkan{/if}
      </label>
    </div>
    {#if auditLogs.length > 0}
      {@const latest = auditLogs[0]}
      <p class="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">Terakhir diubah oleh {latest.changed_by_name} · {new Date(latest.changed_at).toLocaleString('id-ID')} ({latest.new_value === 'enabled' ? 'akses diaktifkan' : 'akses dinonaktifkan'})</p>
    {/if}
  </section>
{/if}
