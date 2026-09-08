<script lang="ts">
  import { cn } from '$lib/utils.js';

  let {
    label,
    value,
    change,
    class: className,
  }: {
    label: string;
    value: string | number;
    change?: { value: string; positive?: boolean };
    class?: string;
  } = $props();
</script>

<div
  data-slot="stat-card"
  class={cn(
    "bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-[0_8px_28px_rgba(32,36,38,0.025)] dark:shadow-none",
    className
  )}
>
  <div class="flex min-h-20 flex-col justify-between gap-4">
    <span class="font-heading text-[10px] uppercase tracking-[0.13em] font-semibold text-muted-foreground">{label}</span>
    <div class="flex items-end justify-between gap-3">
    <span class="font-heading text-2xl font-bold tracking-[-0.035em] text-foreground">{value}</span>
    {#if change}
      <span class={cn(
        "text-xs font-mono-accent font-medium",
        change.positive ? "text-primary" : "text-destructive"
      )}>
        {change.value}
      </span>
    {/if}
    </div>
  </div>
</div>
