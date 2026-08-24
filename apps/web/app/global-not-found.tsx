import './globals.css';

export const metadata = {
  title: '404 — Flash Kit',
  description: 'The requested Flash Kit route does not exist.',
};

export default function GlobalNotFound() {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            404 / PATH NOT FOUND
          </p>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight sm:text-6xl">
            This route is outside the rail.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
            这条路径不在发布轨道上。
          </p>
          <a
            className="mt-9 w-fit rounded-md border border-primary px-5 py-3 text-sm font-semibold text-primary outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            href="/"
          >
            Return to launch · 返回发布页
          </a>
        </main>
      </body>
    </html>
  );
}
