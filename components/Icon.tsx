/** Inline stroke icons. Decorative by default (aria-hidden); label the button, not the icon. */
import type { SVGProps } from "react";

type Name =
  | "arrow-right"
  | "arrow-left"
  | "plus"
  | "close"
  | "edit"
  | "share"
  | "info"
  | "check"
  | "alert"
  | "star"
  | "chevron-down"
  | "menu"
  | "trash"
  | "link"
  | "external"
  | "wrench"
  | "shield"
  | "clock"
  | "scan";

const PATHS: Record<Name, React.ReactNode> = {
  "arrow-right": <path d="M3 8h10M9 4l4 4-4 4" />,
  "arrow-left": <path d="M13 8H3M7 4L3 8l4 4" />,
  plus: <path d="M8 3v10M3 8h10" />,
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  edit: <path d="M10.2 3.1l2.7 2.7L5.6 13.1H2.9v-2.7z" />,
  share: (
    <>
      <path d="M8 2.5v8M5 5.3L8 2.5l3 2.8" />
      <path d="M3.5 8.5v4a1 1 0 001 1h7a1 1 0 001-1v-4" />
    </>
  ),
  info: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7.2V11" />
      <circle cx="8" cy="5" r=".5" fill="currentColor" stroke="none" />
    </>
  ),
  check: <path d="M3 8.5l3 3 7-7.5" />,
  alert: (
    <>
      <path d="M8 2.2l6.2 11H1.8z" />
      <path d="M8 6.5v3" />
      <circle cx="8" cy="11.3" r=".5" fill="currentColor" stroke="none" />
    </>
  ),
  star: <path d="M8 1.8l1.9 4 4.3.5-3.2 3 .9 4.3L8 11.4l-3.9 2.2.9-4.3-3.2-3 4.3-.5z" fill="currentColor" stroke="none" />,
  "chevron-down": <path d="M4 6l4 4 4-4" />,
  menu: <path d="M2 4.5h12M2 8h12M2 11.5h12" />,
  trash: (
    <>
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5" />
      <path d="M4.5 4.5l.6 8.5h5.8l.6-8.5" />
    </>
  ),
  link: (
    <>
      <path d="M6.8 9.2a2.6 2.6 0 003.7 0l2-2a2.6 2.6 0 00-3.7-3.7l-.7.7" />
      <path d="M9.2 6.8a2.6 2.6 0 00-3.7 0l-2 2a2.6 2.6 0 003.7 3.7l.7-.7" />
    </>
  ),
  external: (
    <>
      <path d="M9.5 2.5h4v4M13.5 2.5L7.5 8.5" />
      <path d="M12 9.5v3a1 1 0 01-1 1H3.5a1 1 0 01-1-1V5a1 1 0 011-1h3" />
    </>
  ),
  wrench: <path d="M10.5 2.3a3.2 3.2 0 00-3.9 4.1L2.4 10.6a1.4 1.4 0 002 2l4.2-4.2a3.2 3.2 0 004.1-3.9l-2 2-1.8-.4-.4-1.8z" />,
  shield: <path d="M8 1.8l5 2v4c0 3-2.2 5.3-5 6.4C5.2 13.1 3 10.8 3 7.8v-4z" />,
  clock: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.8V8l2.2 1.4" />
    </>
  ),
  scan: (
    <>
      <path d="M2.5 5.5v-2a1 1 0 011-1h2M10.5 2.5h2a1 1 0 011 1v2M13.5 10.5v2a1 1 0 01-1 1h-2M5.5 13.5h-2a1 1 0 01-1-1v-2" />
      <path d="M4.5 8h7" />
    </>
  ),
};

export function Icon({ name, size = 16, className, ...rest }: { name: Name; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
