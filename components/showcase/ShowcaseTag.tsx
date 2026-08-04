export default function ShowcaseTag({ tag }: { tag: string }) {
  return (
    <span className="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] leading-4 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
      #{tag}
    </span>
  );
}
