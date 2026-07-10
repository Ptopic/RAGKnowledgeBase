# Thesis Cover Design

## Goal

Replace the seminar-paper cover in `thesis/cover.tex` with an editable LaTeX recreation of page 1 from the official diploma-thesis cover example.

## Scope

- Change only `thesis/cover.tex` during implementation.
- Preserve the existing `titlepage` integration in `thesis/izvjestaj.tex`.
- Do not embed or rasterize the example PDF.

## Content

The cover will contain these centered text blocks, in order:

1. `SVEUČILIŠTE U SPLITU`
2. `SVEUČILIŠNI ODJEL ZA STRUČNE STUDIJE`
3. `Stručni diplomski studij Primijenjeno računarstvo`
4. `Petar Topić`
5. `D I P L O M S K I R A D`
6. `Aplikacija za studentsku praksu`
7. `Split, srpanj 2026.`

The seminar-specific subject, candidate label, work-title label, and mentor table will be removed.

## Layout

Use editable LaTeX text and vertical spacing to match the official example page 1:

- institution and study program grouped at the top;
- author centered above the document type;
- document type letter-spaced and bold;
- thesis title centered below the document type;
- city and date centered at the bottom via `\vfill`.

The existing thesis font and page geometry remain controlled by `thesis/izvjestaj.tex`.

## Verification

Compile `thesis/izvjestaj.tex`, confirm the build completes without LaTeX errors, render the first PDF page, and visually compare it with page 1 of `thesis_cover_example/predložak_2025_2026_diplomski.pdf`.
