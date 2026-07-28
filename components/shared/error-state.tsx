import { Button } from "@/components/ui/button";

export function ErrorState({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return <div role="alert" className="flex min-h-56 flex-col items-center justify-center gap-4 text-center"><h1 className="font-display text-3xl">Não foi possível carregar esta página.</h1><p className="text-sm text-ink-muted">Tente novamente em alguns instantes.</p><Button onClick={onRetry}>Tentar novamente</Button></div>;
}
