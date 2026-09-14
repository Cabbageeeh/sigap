<script lang="ts">
  import type { ClassSizePoint } from '../../types';

  let { data }: { data: ClassSizePoint[] } = $props();

  const max = $derived(Math.max(1, ...data.map((d) => d.count)));
</script>

{#if data.length === 0}
  <p class="text-sm text-muted-foreground">Belum ada kelas pada tahun ajaran aktif.</p>
{:else}
  <ul class="space-y-2">
    {#each data as d}
      <li>
        <div class="mb-1 flex items-baseline justify-between gap-2">
          <span class="truncate text-xs font-medium text-foreground">{d.name}</span>
          <span class="shrink-0 font-mono-accent text-xs font-medium text-muted-foreground">{d.count}</span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-muted/60">
          <div
            class="h-full rounded-full bg-primary/85 transition-[width] duration-500"
            style="width: {(d.count / max) * 100}%"
          ></div>
        </div>
      </li>
    {/each}
  </ul>
{/if}
