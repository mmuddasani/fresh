import { useSignal } from "@preact/signals";

export default function Counter() {
  const sig = useSignal(0);
  return (
    <div class="island">
      <p id="output">{sig.value}</p>
      <button onClick={() => sig.value += 1}>
        update
      </button>
    </div>
  );
}