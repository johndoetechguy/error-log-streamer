export const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <span>© {year} Synthetic Error Streamer. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <span>Built for streaming observability demos</span>
          <a
            href="https://github.com/johndoetechguy/revenue-skyrocket"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:underline"
          >
            View repository
          </a>
        </div>
      </div>
    </footer>
  );
};

