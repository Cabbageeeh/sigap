<script lang="ts">
  import { cn } from "$lib/utils.js";
  import schoolLogo from "../assets/smpn48-surabaya-logo.jpeg";

  interface Props {
    size?: number;
    class?: string;
  }

  let { size = 30, class: className }: Props = $props();
</script>

<span
  data-slot="school-logo"
  class={cn("inline-flex shrink-0 items-center justify-center", className)}
  style={`width: ${size}px; height: ${size}px`}
>
  <img src={schoolLogo} alt="Logo SMP Negeri 48 Surabaya" class="block h-full w-full object-contain" />
</span>
