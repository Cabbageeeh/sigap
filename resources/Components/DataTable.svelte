<script lang="ts" module>
  export interface DataTableCell {
    columnKey: string;
    label: string;
    row: Record<string, unknown>;
    value: unknown;
  }
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';

  type Column = {
    key: keyof T | string;
    label: string;
    class?: string;
    align?: 'left' | 'center' | 'right';
  };

  let {
    columns,
    rows,
    keyField = 'id' as keyof T,
    class: className,
    emptyMessage = 'Tidak ada data',
    rowAction,
    cell,
  }: {
    columns: Column[];
    rows: T[];
    keyField?: keyof T;
    class?: string;
    emptyMessage?: string;
    rowAction?: Snippet<[T]>;
    cell?: Snippet<[DataTableCell]>;
  } = $props();

  function cellValue(row: T, key: string | keyof T): unknown {
    return row[key as keyof T];
  }

  function alignClass(align?: 'left' | 'center' | 'right'): string {
    switch (align) {
      case 'right': return 'text-right';
      case 'center': return 'text-center';
      default: return 'text-left';
    }
  }
</script>

<div data-slot="data-table" class={cn("relative overflow-x-auto rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none", className)}>
  <table class="w-full text-sm">
    <thead class="bg-secondary/50 border-b border-border">
      <tr>
        {#each columns as col}
          <th class={cn("px-4 py-3.5 text-left font-heading text-[10px] uppercase tracking-[0.13em] font-semibold text-muted-foreground", alignClass(col.align), col.class)}>
            {col.label}
          </th>
        {/each}
        {#if rowAction}
          <th class="px-4 py-3.5 text-right font-heading text-[10px] uppercase tracking-[0.13em] font-semibold text-muted-foreground">Aksi</th>
        {/if}
      </tr>
    </thead>
    <tbody class="divide-y divide-border">
      {#if rows.length === 0}
        <tr>
          <td colspan={columns.length + (rowAction ? 1 : 0)} class="px-4 py-12 text-center">
            <p class="text-sm font-medium text-foreground">{emptyMessage}</p>
            <p class="mt-1 text-xs text-muted-foreground">Data akan tampil di sini setelah ditambahkan.</p>
          </td>
        </tr>
      {:else}
        {#each rows as row (row[keyField])}
          <tr class="hover:bg-secondary/40 transition-colors odd:bg-secondary/[0.12]">
            {#each columns as col}
              <td class={cn("px-4 py-3.5 text-foreground font-body whitespace-nowrap", alignClass(col.align), col.class)}>
                {#if cell}
                  {@render cell({ columnKey: String(col.key), label: col.label, row: row as Record<string, unknown>, value: cellValue(row, col.key) })}
                {:else}
                  {String(cellValue(row, col.key) ?? '-')}
                {/if}
              </td>
            {/each}
            {#if rowAction}
              <td class="px-4 py-3 text-right">
                {@render rowAction(row)}
              </td>
            {/if}
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>
