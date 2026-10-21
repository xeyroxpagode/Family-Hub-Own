export type ChecklistRowLayout = { y: number; height: number };

export const resolveChecklistDropIndex = (
  from: number,
  dragY: number,
  layouts: readonly (ChecklistRowLayout | undefined)[],
): number => {
  const origin = layouts[from];
  if (!origin || layouts.length < 2) return from;
  const draggedCenter = origin.y + origin.height / 2 + dragY;
  let target = from;
  let nearestDistance = Number.POSITIVE_INFINITY;
  layouts.forEach((layout, index) => {
    if (!layout) return;
    const center = layout.y + layout.height / 2;
    const distance = Math.abs(draggedCenter - center);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      target = index;
    }
  });
  return Math.max(0, Math.min(layouts.length - 1, target));
};

