"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { apagarTelasGuardadas } from "@/lib/offline/paginas";

export function SairButton() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="secondary"
      size="md"
      className="w-full touch"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        await apagarTelasGuardadas();
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
        window.location.href = "/login";
      }}
    >
      Sair da conta
    </Button>
  );
}
