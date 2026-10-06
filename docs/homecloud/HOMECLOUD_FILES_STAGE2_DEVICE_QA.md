# HOMECLOUD FILES — STAGE 2 DEVICE QA CHECKLIST

> **NO EXECUTION HAS TAKEN PLACE ON THIS CHECKLIST.**
>
> This agent had no physical device and no emulator. Every row below is
> `UNPROVEN_DEVICE`. Nothing here is a claim; it is the exact procedure a human must run,
> written so the result cannot be mistaken for a re-run of the automated evidence.
>
> The automated suites that DO exist are listed in the execution log, and they are not a
> substitute: they cannot prove native rendering, native playback, safe-area geometry on a
> real notch, or that a finger and a list actually cooperate.

## HOW TO USE IT

- Build the app with the **dev client** (`npx expo run:android` / `run:ios`). The inline
  PDF renderer is a NATIVE module, so Expo Go will not render a PDF; it will fall back to
  the system hand-off. That fallback is expected behaviour, not a defect.
- Test on a real phone on a real household, with a second device handy for the
  household-isolation rows.
- For the "slow network" rows, throttle the connection; do not substitute a guess.
- Record the result per row: `PASS_DEVICE`, `FAIL_DEVICE` or `UNPROVEN_DEVICE`.
- A row may only be `PASS_DEVICE` with an observation, not an inference. "It looked fine"
  is `UNPROVEN_DEVICE`.

---

## FAVORITES

| # | Check | Result |
|---|---|---|
| F1 | Long-press any File; the action sheet opens | UNPROVEN_DEVICE |
| F2 | Scroll the sheet: **every** action is reachable, Favorito included, on a small phone | UNPROVEN_DEVICE |
| F3 | Same on a NOTCHED device with a raised system font size (this is where it failed) | UNPROVEN_DEVICE |
| F4 | Tap Favorito; the heart marker appears without any further gesture | UNPROVEN_DEVICE |
| F5 | Tap Favorito again; the marker disappears | UNPROVEN_DEVICE |
| F6 | Open the filter menu, choose Favoritos; only your own favorites are listed | UNPROVEN_DEVICE |
| F7 | On a SLOW connection, the Favorite row alone shows a spinner; the rest of the menu stays usable | UNPROVEN_DEVICE |
| F8 | Break the connection, tap Favorito: the list, the loaded window and the folder are all unchanged, and the refusal is stated INSIDE the sheet | UNPROVEN_DEVICE |
| F9 | With Favoritos ON, unfavorite the last visible favorite: the row leaves the list and no crash occurs | UNPROVEN_DEVICE |

## SELECTION

| # | Check | Result |
|---|---|---|
| S1 | Header `...` → `Seleccionar`: selection mode starts | UNPROVEN_DEVICE |
| S2 | Tap a File: it toggles; tap again: it untoggles | UNPROVEN_DEVICE |
| S3 | **Hold an unselected File and drag**: it and every crossed File become selected (ADD) | UNPROVEN_DEVICE |
| S4 | **Hold a SELECTED File and drag**: it and every crossed File become deselected (REMOVE) | UNPROVEN_DEVICE |
| S5 | Sweep back over a File you already crossed: its state does NOT flip | UNPROVEN_DEVICE |
| S6 | Sweep across BOTH columns | UNPROVEN_DEVICE |
| S7 | Swipe quickly WITHOUT holding: the list SCROLLS and nothing is selected | UNPROVEN_DEVICE |
| S8 | Hold near the top edge and keep holding: the list scrolls upward and selection follows | UNPROVEN_DEVICE |
| S9 | Hold near the bottom edge and keep holding: the list scrolls downward and selection follows | UNPROVEN_DEVICE |
| S10 | Release the finger: the list stops scrolling on its own immediately | UNPROVEN_DEVICE |
| S11 | Drag a finger over a FOLDER row: the folder is never selected | UNPROVEN_DEVICE |
| S12 | Cancel selection: the count, the markers and the gesture all end | UNPROVEN_DEVICE |
| S13 | Outside selection, long press a File: the contextual actions open, nothing is selected | UNPROVEN_DEVICE |
| S14 | Outside selection, tap a File: the Viewer opens | UNPROVEN_DEVICE |
| S15 | With a screen reader: each File announces selected/not selected and offers select/deselect | UNPROVEN_DEVICE |
| S16 | Enter a folder, change the query, change the order: no selection ever survives the context change | UNPROVEN_DEVICE |

## REFRESH

| # | Check | Result |
|---|---|---|
| R1 | There is **no visible `Actualizar`** anywhere in Files, including the header overflow | UNPROVEN_DEVICE |
| R2 | Pull down on a populated list: it refreshes and the loaded window is preserved | UNPROVEN_DEVICE |
| R3 | Pull down inside an EMPTY folder: it refreshes (this used to be impossible) | UNPROVEN_DEVICE |
| R4 | Pull down on an EMPTY Favoritos result: it refreshes | UNPROVEN_DEVICE |
| R5 | With a screen reader, the list exposes an "Actualizar archivos" action that works | UNPROVEN_DEVICE |
| R6 | Background the app and return: the list is already fresh | UNPROVEN_DEVICE |
| R7 | Complete an upload from another device; return: the new File is there | UNPROVEN_DEVICE |

## PAGINATION

| # | Check | Result |
|---|---|---|
| P1 | Scroll normally through ~250 Files: the list never stops on a button | UNPROVEN_DEVICE |
| P2 | The next page is already loading BEFORE you hit the hard bottom | UNPROVEN_DEVICE |
| P3 | Fling hard: at most a small spinner appears while it catches up | UNPROVEN_DEVICE |
| P4 | There is no `Mostrar más archivos` anywhere | UNPROVEN_DEVICE |
| P5 | Break the network and scroll to the end: a compact `Reintentar` appears and NO retry storm follows | UNPROVEN_DEVICE |
| P6 | Tap `Reintentar`: the page arrives; the affordance disappears | UNPROVEN_DEVICE |
| P7 | With Favoritos ON and 300 favorites, paging still works and never mixes non-favorites | UNPROVEN_DEVICE |
| P8 | Inside a nested folder with many Files, paging works there too | UNPROVEN_DEVICE |

## VIEWER

| # | Check | Result |
|---|---|---|
| V1 | JPG opens inline, sharp, correctly oriented | UNPROVEN_DEVICE |
| V2 | PNG opens inline | UNPROVEN_DEVICE |
| V3 | MOV plays inline with the HomePlus header and native controls | UNPROVEN_DEVICE |
| V4 | MP4 plays inline | UNPROVEN_DEVICE |
| V5 | Common audio (MP3/M4A) plays on the HomePlus audio surface | UNPROVEN_DEVICE |
| V6 | A MULTI-PAGE PDF opens INLINE, scrolls page by page | UNPROVEN_DEVICE |
| V7 | A PDF zooms (pinch and/or double tap) | UNPROVEN_DEVICE |
| V8 | A LARGER PDF (say 10–30 MB) opens inline without the app dying | UNPROVEN_DEVICE |
| V9 | A PASSWORD-PROTECTED PDF: an honest specific message plus the hand-off; never a blank screen | UNPROVEN_DEVICE |
| V10 | TXT: long-press the text, select and copy it | UNPROVEN_DEVICE |
| V11 | Markdown: selectable and copyable | UNPROVEN_DEVICE |
| V12 | CSV: selectable and copyable | UNPROVEN_DEVICE |
| V13 | DOCX falls back to the system hand-off, with no fake inline preview | UNPROVEN_DEVICE |
| V14 | XLSX falls back the same way | UNPROVEN_DEVICE |
| V15 | PPTX falls back the same way | UNPROVEN_DEVICE |
| V16 | An unsupported binary: an honest reason plus the hand-off | UNPROVEN_DEVICE |
| V17 | A MOV that cannot decode: an explicit "Abrir o compartir con…" and NO automatic jump to another app | UNPROVEN_DEVICE |
| V18 | Android hardware BACK closes the Viewer and leaves the browser exactly as it was | UNPROVEN_DEVICE |
| V19 | On a NOTCHED device the Viewer's header is not under the status bar and the close button is reachable | UNPROVEN_DEVICE |
| V20 | Closing the Viewer returns to the same folder, query, order and scroll position | UNPROVEN_DEVICE |
| V21 | With the app on airplane mode and a cached File open: the failure is specific, never blank, never a stack trace | UNPROVEN_DEVICE |

## HOUSEHOLD ISOLATION (needs two devices in two households)

| # | Check | Result |
|---|---|---|
| H1 | Household A cannot open a File from household B by any route in the Viewer | UNPROVEN_DEVICE |
| H2 | Household A's Favorites never appear in household B's Favoritos list | UNPROVEN_DEVICE |
| H3 | A PDF is never rendered from a remote host: airplane mode still previews a staged File | UNPROVEN_DEVICE |
| H4 | Renaming a File on device 1 is reflected on device 2 after a refresh | UNPROVEN_DEVICE |

## WHAT THIS CHECKLIST CANNOT REPLACE

- The suites in `docs/homecloud/HOMECLOUD_FILES_STAGE2_EXECUTION_LOG.md` prove the model,
  the wiring, the guards and the mounted-component branches. They cannot prove that a
  native renderer decoded a real document, that a codec played a real file, that a notch
  leaves the close button reachable, or that a native scroll recognizer yields to an
  armed drag-selection gesture on a real touch stack.
- Those four are exactly the rows above. Until a human fills them in, Stage 2 is
  `IMPLEMENTATION + SOURCE/RUNTIME CLOSED — DEVICE ACCEPTANCE PENDING`.
