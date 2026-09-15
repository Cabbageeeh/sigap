<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as dialog from '@zag-js/dialog';
  import { useMachine, normalizeProps, portal } from '@zag-js/svelte';
  import { cn } from '$lib/utils.js';

  let {
    open = $bindable(false),
    title,
    description,
    class: className,
    children,
    footer,
  }: {
    open?: boolean;
    title?: string;
    description?: string;
    class?: string;
    children?: Snippet;
    footer?: Snippet;
  } = $props();

  const service = useMachine(dialog.machine, {
    id: crypto.randomUUID(),
    get open() { return open; },
    onOpenChange(details) { open = details.open; },
  });
  const api = $derived(dialog.connect(service, normalizeProps));
</script>

{#if open}
  <div use:portal>
    <div {...api.getBackdropProps()} class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity"></div>
    <div {...api.getPositionerProps()} class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        {...api.getContentProps()}
        class={cn(
          "flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-[0_24px_80px_rgba(0,0,0,0.18)] outline-none",
          className
        )}
      >
        {#if title}
          <div class="shrink-0 border-b border-border px-6 py-5">
            <h2 {...api.getTitleProps()} class="font-heading text-xl font-semibold tracking-[-0.02em]">{title}</h2>
            {#if description}
              <p {...api.getDescriptionProps()} class="mt-1.5 text-sm text-muted-foreground font-body leading-relaxed">{description}</p>
            {/if}
          </div>
        {/if}
        <div class="overflow-y-auto px-6 py-6">{@render children?.()}</div>
        {#if footer}
          <div class="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">{@render footer?.()}</div>
        {/if}
      </div>
    </div>
  </div>
{/if}
