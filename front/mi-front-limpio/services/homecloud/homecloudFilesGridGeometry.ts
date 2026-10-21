/**
 * HomeCloud Files — GRID GEOMETRY INVARIANT (Patch 1B).
 *
 * Root and folder grids MUST share identical static horizontal geometry for an
 * identical viewport width: same left inset, same right inset, same card width,
 * same column gap. The values derive ONLY from the viewport width and the
 * design tokens — never from folder direction, animation translate, header
 * state or selection state.
 *
 * The screen consumes THIS (one call site, one object) for both root and
 * folder, so a folder-specific margin cannot even be expressed. Motion may
 * transform the transition layer, but the static values below are the base
 * state every animation returns to.
 */

// Tokens mirrored from `constants/theme` (spacing[5] = 20, spacing[3] = 12).
// Local constants (not an import) keep this module framework-free and directly
// testable in node without the RN theme graph.
const GRID_PADDING_LEFT = 20;
const GRID_GUTTER_RIGHT = 48;
const GRID_COLUMN_GAP = 12;
const GRID_COLUMNS = 2;

export interface FilesGridGeometry {
  readonly paddingLeft: number;
  readonly paddingRight: number;
  readonly columnGap: number;
  readonly columns: number;
  readonly cellWidth: number;
}

/**
 * Static grid geometry for a viewport width. No folder, no animation, no
 * header/selection parameter exists — identical width in, identical geometry
 * out, by construction.
 */
export function filesGridGeometry(viewportWidth: number): FilesGridGeometry {
  const width = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : 0;
  const cellWidth = Math.max(0, (width - GRID_PADDING_LEFT - GRID_GUTTER_RIGHT - GRID_COLUMN_GAP) / GRID_COLUMNS);
  return {
    paddingLeft: GRID_PADDING_LEFT,
    paddingRight: GRID_GUTTER_RIGHT,
    columnGap: GRID_COLUMN_GAP,
    columns: GRID_COLUMNS,
    cellWidth,
  };
}
