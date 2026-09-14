<script lang="ts">
  import type { ConfirmationWeekPoint } from '../../types';

  let { data }: { data: ConfirmationWeekPoint[] } = $props();

  const W = 640;
  const H = 180;
  const PAD = { top: 14, right: 8, bottom: 24, left: 28 };

  const max = $derived(Math.max(1, ...data.map((d) => Math.max(d.confirmed, d.scheduled))));
  const slot = $derived((W - PAD.left - PAD.right) / data.length);
  const barW = $derived(Math.min(22, slot / 2 - 4));
  const y = (v: number) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom);
  const baseY = $derived(y(0));
</script>

<svg viewBox="0 0 {W} {H}" class="w-full" role="img" aria-label="Konfirmasi guru minggu ini">
  {#each [0, 0.5, 1] as t}
    {@const v = Math.round(max * t)}
    <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} class="stroke-border" stroke-dasharray="3 4" stroke-width="1" />
    <text x={PAD.left - 8} y={y(v) + 3} text-anchor="end" class="fill-muted-foreground" font-size="9">{v}</text>
  {/each}

  {#each data as d, i}
    {@const cx = PAD.left + slot * i + slot / 2}
    <rect x={cx - barW - 2} y={y(d.scheduled)} width={barW} height={baseY - y(d.scheduled)} rx="3" class="fill-muted" />
    <rect x={cx + 2} y={y(d.confirmed)} width={barW} height={baseY - y(d.confirmed)} rx="3" class="fill-primary" />
    <text x={cx} y={H - 6} text-anchor="middle" class="fill-muted-foreground" font-size="10">{d.day}</text>
  {/each}
</svg>

<div class="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
  <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-sm bg-primary"></span>Terkonfirmasi</span>
  <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-sm bg-muted"></span>Terjadwal</span>
</div>
