/**
 * Pure responsive/accessibility rules shared by the Simple presentation.
 * Keeping them independent from React Native makes viewport behaviour
 * deterministic and directly testable.
 */
export function getSimpleActionGridColumns(width: number, fontScale: number): 1 | 2 {
  // A 2-column card becomes too narrow on compact devices or when system text
  // is enlarged. Prefer readable labels over a denser grid in those cases.
  return width < 360 || fontScale >= 1.2 ? 1 : 2;
}

export function getSimpleHorizontalPadding(width: number): number {
  if (width < 360) return 12;
  if (width >= 600) return 20;
  return 16;
}

export function buildSimpleAccessibilityLabel(title: string, subtitle?: string, badge?: string): string {
  return [title, subtitle, badge].filter(Boolean).join('. ');
}
