import { useSignal } from "@preact/signals";

export default function Counter() {
  const sig = useSignal(0);
  return (
    <div class="island">
      <p>
        <output>{sig.value}</output>
      </p>
      <button
        onClick={() => sig.value += 1}
      >
        update {sig}
      </button>
    </div>
  );
}
