<script lang="ts">
  import type { AttendanceTrendPoint } from '../../types';

  let { data }: { data: AttendanceTrendPoint[] } = $props();

  const W = 640;
  const H = 200;
  const PAD = { top: 16, right: 8, bottom: 24, left: 32 };

  const totals = $derived(data.map((d) => d.present + d.sick + d.leave + d.absent));
  const maxTotal = $derived(Math.max(1, ...totals));

  const x = (i: number) => PAD.left + (i / Math.max(1, data.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - v / maxTotal) * (H - PAD.top - PAD.bottom);

  const linePath = $derived(
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.present).toFixed(1)}`).join(' '),
  );
  const areaPath = $derived(
    linePath
      ? `${linePath} L${x(data.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`
      : '',
  );

  const ticks = $derived([0, 0.5, 1].map((t) => ({ v: Math.round(maxTotal * t), y: y(maxTotal * t) })));

  const labelEvery = $derived(Math.ceil(data.length / 7));
  const formatDay = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  let hover = $state<number | null>(null);
</script>

<div class="relative">
  <svg viewBox="0 0 {W} {H}" class="w-full" role="img" aria-label="Tren kehadiran 14 hari">
    <defs>
      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.28" />
        <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0.02" />
      </linearGradient>
    </defs>

    {#each ticks as t}
      <line x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} class="stroke-border" stroke-dasharray="3 4" stroke-width="1" />
      <text x={PAD.left - 8} y={t.y + 3} text-anchor="end" class="fill-muted-foreground" font-size="9">{t.v}</text>
    {/each}

    {#if areaPath}
      <path d={areaPath} fill="url(#trendFill)" />
      <path d={linePath} fill="none" class="stroke-primary" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
    {/if}

    {#each data as d, i}
      {#if i % labelEvery === 0 || i === data.length - 1}
        <text x={x(i)} y={H - 6} text-anchor="middle" class="fill-muted-foreground" font-size="9">{formatDay(d.date)}</text>
      {/if}
      <rect
        x={x(i) - (W - PAD.left - PAD.right) / data.length / 2}
        y={PAD.top}
        width={(W - PAD.left - PAD.right) / data.length}
        height={H - PAD.top - PAD.bottom}
        fill="transparent"
        onmouseenter={() => (hover = i)}
        onmouseleave={() => (hover = null)}
      />
    {/each}

    {#if hover !== null && data[hover]}
      <circle cx={x(hover)} cy={y(data[hover].present)} r="4" class="fill-primary stroke-card" stroke-width="2" />
      <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} class="stroke-foreground/20" stroke-width="1" />
    {/if}
  </svg>

  {#if hover !== null && data[hover]}
    {@const d = data[hover]}
    <div
      class="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-[11px] shadow-md"
      style="left: {(x(hover) / W) * 100}%; top: 0;"
    >
      <p class="font-semibold text-foreground">{formatDay(d.date)}</p>
      <p class="text-muted-foreground">Hadir {d.present} · Sakit {d.sick} · Izin {d.leave} · Alpha {d.absent}</p>
    </div>
  {/if}
</div>
