<script lang="ts">
  import { router } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import { Toast } from '$lib/toast';
  import { ChevronDown, Loader2, Save, Settings2 } from '@lucide/svelte';
  import Button from './Button.svelte';

  interface GradeColumn {
    external_id: string;
    label: string;
    source_component_type: string | null;
  }
  interface GradeComponentOption { type: string; name: string; }
  interface MappingAuditLog {
    id: string;
    action: 'column_mapping' | 'default_mapping' | 'teacher_mapping_access';
    external_id: string | null;
    column_label: string | null;
    old_source_component_type: string | null;
    new_source_component_type: string | null;
    old_mapping_present: number | null;
    new_mapping_present: number | null;
    changed_by_name: string;
    changed_at: number;
    scope_label: string | null;
  }

  let {
    classId,
    subjectId,
    semester,
    semesterLabel,
    subjectName,
    columns = [],
    gradeComponents = [],
    canConfigureMappings = false,
    canSaveAsDefault = false,
    mappingAudit = [],
  }: {
    classId: string;
    subjectId: string;
    semester: number;
    semesterLabel: string;
    subjectName: string;
    columns?: GradeColumn[];
    gradeComponents?: GradeComponentOption[];
    canConfigureMappings?: boolean;
    canSaveAsDefault?: boolean;
    mappingAudit?: MappingAuditLog[];
  } = $props();

  let drafts = $state<Record<string, string>>({});
  let saving = $state(false);
  let isExpanded = $state(false);
  let saveAsDefault = $state(false);
  let defaultScope = $state<'year' | 'subject'>('year');
  const mappedColumnCount = $derived(columns.filter(column => column.source_component_type !== null).length);
  const manualColumnCount = $derived(columns.length - mappedColumnCount);

  $effect(() => {
    drafts = Object.fromEntries(columns.map(column => [column.external_id, column.source_component_type ?? '']));
    saveAsDefault = false;
    isExpanded = false;
  });

  function sourceName(type: string | null): string {
    return type ? gradeComponents.find(component => component.type === type)?.name ?? type : 'Isi langsung di halaman e-Rapor';
  }

  function selectionUrl(): string {
    const query = new URLSearchParams({ class_id: classId, subject_id: subjectId, semester: String(semester) });
    return `/grades/erapor?${query.toString()}`;
  }

  async function saveMappings(): Promise<void> {
    if (!canConfigureMappings || saving) return;
    const mappings = columns.map(column => ({
      external_id: column.external_id,
      source_component_type: drafts[column.external_id] || null,
    }));
    saving = true;
    const result = await api<{ mapped?: number; direct?: number }>(() => axios.post('/grades/erapor/mappings', {
      class_id: classId,
      subject_id: subjectId,
      semester,
      mappings,
    }), { showSuccessToast: false });
    if (!result.success) {
      saving = false;
      return;
    }

    if (saveAsDefault && canSaveAsDefault) {
      const defaultResult = await api<{ saved?: number }>(() => axios.post('/grades/erapor/default-mappings', {
        class_id: classId,
        subject_id: subjectId,
        semester,
        mappings,
        scope: defaultScope,
      }), { showSuccessToast: false, showErrorToast: false });
      if (!defaultResult.success) {
        saving = false;
        Toast(`Pemetaan template tersimpan, tetapi default gagal disimpan: ${defaultResult.message}`, 'error');
        router.visit(selectionUrl(), { preserveScroll: true });
        return;
      }
    }

    saving = false;
    Toast(saveAsDefault ? 'Pemetaan tersimpan untuk template ini dan sebagai default' : 'Pemetaan nilai e-Rapor tersimpan untuk template ini', 'success');
    router.visit(selectionUrl(), { preserveScroll: true });
  }
</script>

{#if canConfigureMappings}
  <section class="mb-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
    <div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-heading text-sm font-semibold">Pemetaan sumber nilai</h2>
        <p class="mt-1 text-xs text-muted-foreground">{mappedColumnCount} kolom otomatis · {manualColumnCount} diisi langsung di e-Rapor</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        aria-expanded={isExpanded}
        aria-controls="erapor-mapping-editor"
        onclick={() => { isExpanded = !isExpanded; }}
      >
        <Settings2 class="h-4 w-4" />
        {isExpanded ? 'Tutup pemetaan' : 'Atur pemetaan'}
        <ChevronDown class={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </Button>
    </div>
    {#if isExpanded}
      <div id="erapor-mapping-editor" class="border-t border-border p-5">
        <div class="mb-4">
          <h3 class="font-heading font-semibold">Sumber setiap kolom e-Rapor</h3>
          <p class="mt-1 max-w-3xl text-sm text-muted-foreground">
            {#if canSaveAsDefault}
              Admin dapat mengatur pemetaan untuk template ini dan, bila diperlukan, menjadikannya default.
            {:else}
              Anda dapat mengatur pemetaan khusus untuk kelas, mapel, dan semester yang Anda ampu. Pemetaan default sekolah tidak berubah.
            {/if}
            Nilai yang dipetakan cukup diisi satu kali; kolom tanpa sumber diisi langsung pada tabel e-Rapor. Pilihan jenis nilai dikelola pada menu Tahun Ajaran.
          </p>
          <p class="mt-2 max-w-3xl text-xs text-muted-foreground">Nilai langsung yang sudah ada akan disalin ke sumber baru jika sumber itu masih kosong. Jika mengganti sumber, nilai lama tetap tersimpan pada jenis sebelumnya dan perlu diperiksa.</p>
        </div>
    <div class="space-y-3">
      {#each columns as column (column.external_id)}
        <label class="grid gap-2 text-sm sm:grid-cols-[minmax(140px,1fr)_minmax(220px,2fr)] sm:items-center">
          <span class="font-medium text-foreground">{column.label}</span>
          <select value={drafts[column.external_id] ?? ''} onchange={(event) => { drafts = { ...drafts, [column.external_id]: event.currentTarget.value }; }} class="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="">Isi langsung di halaman e-Rapor</option>
            {#each gradeComponents as component (component.type)}<option value={component.type}>{component.name}</option>{/each}
          </select>
        </label>
      {/each}
    </div>
    <div class="mt-4 flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-end md:justify-between">
      <div class="flex-1">
        {#if canSaveAsDefault}
          <label for="erapor-default-enabled" class="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
            <input id="erapor-default-enabled" type="checkbox" bind:checked={saveAsDefault} class="h-4 w-4 rounded border-border accent-primary" /> Terapkan juga sebagai default
          </label>
          {#if saveAsDefault}
            <div class="mt-3 max-w-2xl">
              <label for="erapor-default-scope" class="text-sm font-medium text-foreground">Cakupan default</label>
              <select id="erapor-default-scope" bind:value={defaultScope} class="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground">
                <option value="year">Semua mapel · {semesterLabel} · tahun ajaran ini</option>
                <option value="subject">{subjectName} · semua kelas · {semesterLabel}</option>
              </select>
              <p class="mt-2 text-xs text-muted-foreground">Default digunakan oleh template lain jika belum memiliki pemetaan khusus.</p>
            </div>
          {:else}
            <p class="mt-2 text-xs text-muted-foreground">Pemetaan hanya disimpan untuk kelas, mapel, dan semester ini.</p>
          {/if}
        {:else}
          <p class="text-xs text-muted-foreground">Perubahan pemetaan guru tercatat pada riwayat.</p>
        {/if}
      </div>
      <Button onclick={saveMappings} disabled={saving}>
        {#if saving}<Loader2 class="mr-2 h-4 w-4 animate-spin" />{:else}<Save class="mr-2 h-4 w-4" />{/if} Simpan pemetaan
      </Button>
    </div>
    {#if mappingAudit.length > 0}
      <details class="mt-4 border-t border-border pt-3">
        <summary class="cursor-pointer text-sm font-medium text-foreground">Riwayat perubahan pemetaan ({mappingAudit.length})</summary>
        <div class="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {#each mappingAudit as entry (entry.id)}
            <div class="rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              <p class="font-medium text-foreground">{#if entry.scope_label}{entry.scope_label} · {/if}{entry.action === 'default_mapping' ? 'Default' : 'Template'} · {entry.column_label ?? entry.external_id}: {entry.old_mapping_present ? sourceName(entry.old_source_component_type) : entry.action === 'default_mapping' ? 'Belum ada default' : 'Mengikuti default'} → {sourceName(entry.new_source_component_type)}</p>
              <p>{entry.changed_by_name} · {new Date(entry.changed_at).toLocaleString('id-ID')}</p>
            </div>
          {/each}
        </div>
      </details>
    {/if}
      </div>
    {/if}
  </section>
{/if}
