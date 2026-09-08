<script lang="ts">
  import type { HTMLSelectAttributes } from "svelte/elements";
  import { cn } from "$lib/utils.js";
  import { ChevronDown } from '@lucide/svelte';

  let {
    ref = $bindable(null),
    value = $bindable(),
    class: className,
    placeholder,
    children,
    ...restProps
  }: HTMLSelectAttributes & {
    placeholder?: string;
    children?: import('svelte').Snippet;
  } = $props();
</script>

<div class="relative">
  <select
    bind:this={ref}
    data-slot="select"
    bind:value
    class={cn(
      "border-input bg-card dark:bg-input/30 font-body flex h-10 w-full min-w-0 appearance-none rounded-xl border px-3.5 pr-9 py-1 text-sm transition-[color,box-shadow] outline-none focus-visible:bg-card disabled:cursor-not-allowed disabled:opacity-50",
      "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
      "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
      !value && "text-muted-foreground",
      className
    )}
    {...restProps}
  >
    {#if placeholder}
      <option value="" disabled selected={!value}>{placeholder}</option>
    {/if}
    {@render children?.()}
  </select>
  <ChevronDown class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
</div>
