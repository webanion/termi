// The app's line icons, one component each, with the paths index.html and app.ts used to hold.

interface IconProps {
  className?: string;
}

export const PlayIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M7 4v16l13 -8l-13 -8" />
  </svg>
);

export const StopIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M5 7a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2l0 -10" />
  </svg>
);

export const EditIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" />
    <path d="M13.5 6.5l4 4" />
  </svg>
);

export const BoltIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11" />
  </svg>
);

export const CloseIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M18 6l-12 12" />
    <path d="M6 6l12 12" />
  </svg>
);

export const PlusIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 5l0 14" />
    <path d="M5 12l14 0" />
  </svg>
);

export const SidebarIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12" />
    <path d="M9 4l0 16" />
  </svg>
);

// A window split in two, with a plus in the new half.
export const SplitIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12" />
    <path d="M12 4l0 16" />
    <path d="M14.5 12l3 0" />
    <path d="M16 10.5l0 3" />
  </svg>
);

// An arrow that turns back, for reopening a closed terminal.
export const ReopenIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M9 14l-4 -4l4 -4" />
    <path d="M5 10h11a4 4 0 1 1 0 8h-1" />
  </svg>
);

export const FolderIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" />
  </svg>
);

export const CpuIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M5 6a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1l0 -12" />
    <path d="M9 9h6v6h-6l0 -6" />
    <path d="M3 10h2" />
    <path d="M3 14h2" />
    <path d="M10 3v2" />
    <path d="M14 3v2" />
    <path d="M21 10h-2" />
    <path d="M21 14h-2" />
    <path d="M14 21v-2" />
    <path d="M10 21v-2" />
  </svg>
);

export const MemoryIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M4 7h16a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-8a1 1 0 0 1 1 -1" />
    <path d="M7 10h3v4h-3z" />
    <path d="M14 10h3v4h-3z" />
    <path d="M7 17v3" />
    <path d="M12 17v3" />
    <path d="M17 17v3" />
  </svg>
);

export const DownIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 5l0 14" />
    <path d="M18 13l-6 6" />
    <path d="M6 13l6 6" />
  </svg>
);

export const UpIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 5l0 14" />
    <path d="M18 11l-6 -6" />
    <path d="M6 11l6 -6" />
  </svg>
);

export const SettingsIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065" />
    <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
  </svg>
);

export const ResetIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M9 14l-4 -4l4 -4" />
    <path d="M5 10h11a4 4 0 1 1 0 8h-1" />
  </svg>
);

export const MinusIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M5 12l14 0" />
  </svg>
);
