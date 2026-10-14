/** The Mark Six Hub mark: the three ball colours in a gold ring. Decorative: the site name always sits next to it. Flat fills only: the header renders it twice (phone and desktop) and gradient ids would collide. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 64 64" className={className}>
      <circle cx="32" cy="32" r="29.5" fill="#0a0e1a" stroke="#d4af37" strokeWidth="3" />
      <circle cx="23" cy="25" r="11" fill="#c8102e" />
      <circle cx="41" cy="25" r="11" fill="#1f4fd8" />
      <circle cx="32" cy="41" r="11" fill="#12804a" />
      <g fill="#fff" fillOpacity=".55"><circle cx="19.5" cy="21.5" r="2.6" /><circle cx="37.5" cy="21.5" r="2.6" /><circle cx="28.5" cy="37.5" r="2.6" /></g>
    </svg>
  );
}
