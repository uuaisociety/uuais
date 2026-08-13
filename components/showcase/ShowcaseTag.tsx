export default function ShowcaseTag({ tag }: { tag: string }) {
  return (
    <span
      className="mono-meta max-w-[16rem] truncate rounded border border-border bg-muted px-1.5 py-0.5 text-muted-foreground"
      title={tag}
    >
      #{tag}
    </span>
  );
}
