<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fly } from 'svelte/transition';
  import { cn } from '$lib/utils.js';

  let {
    eyebrow,
    title,
    description,
    class: className,
    actions,
  }: {
    eyebrow: string;
    title: string;
    description?: string;
    class?: string;
    actions?: Snippet;
  } = $props();
</script>

<div class={cn("flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8", className)} in:fly={{ y: 20, duration: 800 }}>
  <div>
    <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-primary mb-3">{eyebrow}</p>
    <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground">
      {title}
    </h1>
    {#if description}
      <p class="mt-4 text-sm text-muted-foreground leading-relaxed max-w-[56ch]">
        {description}
      </p>
    {/if}
  </div>
  {#if actions}
    <div class="flex flex-wrap items-center gap-2 shrink-0">
      {@render actions()}
    </div>
  {/if}
</div>
