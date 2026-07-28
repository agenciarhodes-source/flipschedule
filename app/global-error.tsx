"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body>
        <main><h1>Ocorreu um erro inesperado.</h1><button onClick={reset}>Tentar novamente</button></main>
      </body>
    </html>
  );
}
