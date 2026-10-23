import { useSyncExternalStore } from "react";

const nada = () => () => {};
/** true só no aparelho (depois de montar); false no servidor — evita diferença na hidratação. */
export function useMontado(): boolean {
  return useSyncExternalStore(nada, () => true, () => false);
}
