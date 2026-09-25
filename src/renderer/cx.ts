// Join the class names that apply, skipping false, null, undefined and empty ones.
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}
