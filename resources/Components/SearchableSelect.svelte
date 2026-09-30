<script lang="ts">
  import * as combobox from "@zag-js/combobox";
  import { useMachine, normalizeProps, portal } from "@zag-js/svelte";
  import { cn } from "$lib/utils.js";
  import { Check, ChevronDown, X } from '@lucide/svelte';

  export interface SearchableSelectOption {
    value: string | number;
    label: string;
  }

  let {
    value = $bindable<string | number | null>(null),
    options,
    placeholder,
    disabled = false,
    id,
    class: className,
    onchange,
  }: {
    value?: string | number | null;
    options: SearchableSelectOption[];
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    class?: string;
    onchange?: (value: string | number | null) => void;
  } = $props();

  let query = $state('');

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;
    const selected = options.find(o => o.value === value);
    if (selected && !matches.includes(selected)) return [selected, ...matches];
    return matches;
  });

  const service = useMachine(combobox.machine, {
    id: crypto.randomUUID(),
    get collection() {
      return combobox.collection({
        items: filtered,
        itemToValue: (item) => String(item.value),
        itemToString: (item) => item.label,
      });
    },
    get value() { return value === null || value === undefined ? [] : [String(value)]; },
    get disabled() { return disabled; },
    get placeholder() { return placeholder; },
    get ids() { return id ? { input: id } : undefined; },
    openOnClick: true,
    inputBehavior: 'autohighlight',
    selectionBehavior: 'replace',
    positioning: { placement: 'bottom-start', sameWidth: true },
    onValueChange(details) {
      value = details.items[0]?.value ?? null;
      query = '';
      onchange?.(value);
    },
    onInputValueChange(details) {
      if (details.reason === 'input-change') query = details.inputValue;
    },
    onOpenChange(details) {
      if (details.open) query = '';
    },
  });

  const api = $derived(combobox.connect(service, normalizeProps));
</script>

<div {...api.getRootProps()} data-slot="searchable-select" class="relative">
  <div {...api.getControlProps()} class="relative">
    <input
      {...api.getInputProps()}
      class={cn(
        "border-input bg-card dark:bg-input/30 font-body flex h-10 w-full min-w-0 rounded-xl border px-3.5 pr-16 py-1 text-sm transition-[color,box-shadow] outline-none focus-visible:bg-card disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        "placeholder:text-muted-foreground",
        className
      )}
    />
    <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
      {#if api.hasSelectedItems && !disabled}
        <button {...api.getClearTriggerProps()} class="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors" aria-label="Hapus pilihan">
          <X class="w-3.5 h-3.5" />
        </button>
      {/if}
      <button {...api.getTriggerProps()} class="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors" aria-label="Buka daftar">
        <ChevronDown class="w-4 h-4 transition-transform {api.open ? 'rotate-180' : ''}" />
      </button>
    </div>
  </div>

  <div use:portal>
    <div {...api.getPositionerProps()}>
      <ul {...api.getContentProps()} class="z-[60] max-h-60 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-[0_12px_40px_rgba(0,0,0,0.14)] outline-none">
        {#each filtered as item (item.value)}
          <li
            {...api.getItemProps({ item })}
            class="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer text-foreground data-[highlighted]:bg-secondary data-[state=checked]:font-medium"
          >
            <span {...api.getItemTextProps({ item })} class="truncate">{item.label}</span>
            <span {...api.getItemIndicatorProps({ item })} class="shrink-0 text-primary"><Check class="w-4 h-4" /></span>
          </li>
        {:else}
          <li class="px-3 py-2 text-sm text-muted-foreground">Tidak ada hasil</li>
        {/each}
      </ul>
    </div>
  </div>
</div>
