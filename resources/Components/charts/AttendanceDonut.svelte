<script lang="ts">
  import type { AttendanceStatusSlice } from '../../types';

  let { data }: { data: AttendanceStatusSlice[] } = $props();

  const META: Record<AttendanceStatusSlice['status'], { label: string; color: string }> = {
    present: { label: 'Hadir', color: 'var(--color-primary)' },
    sick: { label: 'Sakit', color: 'var(--color-chart-2, #d97706)' },
    leave: { label: 'Izin', color: 'var(--color-chart-3, #64748b)' },
    absent: { label: 'Alpha', color: 'var(--color-destructive)' },
  };

  const total = $derived(data.reduce((s, d) => s + d.count, 0));

  const R = 52;
  const C = 2 * Math.PI * R;

  interface Arc { status: AttendanceStatusSlice['status']; count: number; offset: number; length: number }
  const arcs = $derived.by((): Arc[] => {
    if (total === 0) return [];
    let acc = 0;
    return data
      .filter((d) => d.count > 0)
      .map((d) => {
        const length = (d.count / total) * C;
        const arc = { status: d.status, count: d.count, offset: acc, length };
        acc += length;
        return arc;
      });
  });

  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
</script>

<div class="flex items-center gap-5">
  <svg viewBox="0 0 140 140" class="h-32 w-32 shrink-0 -rotate-90" role="img" aria-label="Distribusi status kehadiran">
    {#if total === 0}
      <circle cx="70" cy="70" r={R} fill="none" class="stroke-muted" stroke-width="14" stroke-dasharray="4 6" />
    {:else}
      <circle cx="70" cy="70" r={R} fill="none" class="stroke-border" stroke-width="14" />
      {#each arcs as arc}
        <circle
          cx="70" cy="70" r={R} fill="none"
          stroke={META[arc.status].color}
          stroke-width="14"
          stroke-dasharray="{arc.length} {C - arc.length}"
          stroke-dashoffset={-arc.offset}
          stroke-linecap="butt"
        />
      {/each}
    {/if}
    <text x="70" y="66" text-anchor="middle" class="fill-foreground rotate-90" transform="rotate(90 70 70)" font-size="20" font-weight="700">{total}</text>
    <text x="70" y="84" text-anchor="middle" class="fill-muted-foreground" transform="rotate(90 70 70)" font-size="9">catatan</text>
  </svg>

  <ul class="min-w-0 flex-1 space-y-2">
    {#each data as d}
      <li class="flex items-center gap-2.5 text-sm">
        <span class="h-2.5 w-2.5 shrink-0 rounded-full" style="background: {META[d.status].color}"></span>
        <span class="text-muted-foreground">{META[d.status].label}</span>
        <span class="ml-auto font-mono-accent text-xs font-medium text-foreground">{d.count} · {pct(d.count)}%</span>
      </li>
    {/each}
  </ul>
</div>
