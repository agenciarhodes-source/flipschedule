"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="p-6">
      <h1 className="mb-4 text-2xl">Não foi possível carregar esta página.</h1>
      <Button onClick={reset}>Tentar novamente</Button>
    </main>
  );
}
