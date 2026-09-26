export type SelectedRun = { start: number; end: number };

export function getSelectedRuns(selected: readonly boolean[]): SelectedRun[] {
  const runs: SelectedRun[] = [];
  let start = -1;
  selected.forEach((isSelected, index) => {
    if (isSelected && start === -1) start = index;
    if (start !== -1 && (!isSelected || index === selected.length - 1)) {
      runs.push({ start, end: isSelected && index === selected.length - 1 ? index : index - 1 });
      start = -1;
    }
  });
  return runs;
}

export function toggleSegmentValue<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((candidate) => candidate !== value) : [...values, value];
}
