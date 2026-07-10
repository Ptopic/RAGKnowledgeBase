# Thesis Cover Design

## Goal

Replace the single seminar-paper cover in `thesis/cover.tex` with two editable LaTeX cover pages matching pages 1 and 2 of the official diploma-thesis cover example.

## Scope

- Change only `thesis/cover.tex` during implementation.
- Preserve the existing `titlepage` integration in `thesis/izvjestaj.tex`.
- Do not embed or rasterize the example PDF.

## Outer Cover Content

The first cover page will contain these centered text blocks, in order:

1. `SVEUČILIŠTE U SPLITU`
2. `SVEUČILIŠNI ODJEL ZA STRUČNE STUDIJE`
3. `Stručni diplomski studij Primijenjeno računarstvo`
4. `Petar Topić`
5. `D I P L O M S K I R A D`
6. `Aplikacija za studentsku praksu`
7. `Split, srpanj 2026.`

The outer cover will not contain subject, candidate, work-title, or mentor labels.

## Inner Cover Content

The second cover page will retain the labeled details from the existing cover while changing the document type from seminar paper to diploma thesis:

1. `SVEUČILIŠTE U SPLITU`
2. `SVEUČILIŠNI ODJEL ZA STRUČNE STUDIJE`
3. `Stručni diplomski studij Primijenjeno računarstvo`
4. `Predmet: Agilno vođenje projekata`
5. `D I P L O M S K I R A D`
6. `Kandidat: Petar Topić`
7. `Naslov rada: Aplikacija za studentsku praksu`
8. `Mentor: Ivica Ružić, mr. sc.`
9. `Split, srpanj 2026.`

## Layout

Use two consecutive `titlepage` environments containing editable LaTeX text and vertical spacing.

The outer cover will match official example page 1:

- institution and study program grouped at the top;
- author centered above the document type;
- document type letter-spaced and bold;
- thesis title centered below the document type;
- city and date centered at the bottom via `\vfill`.

The inner cover will match official example page 2:

- institution and study program grouped at the top;
- subject displayed as a left-aligned labeled field;
- document type centered, letter-spaced, and bold;
- candidate, work title, and mentor displayed as a left-aligned labeled block;
- city and date centered at the bottom via `\vfill`.

The existing thesis font and page geometry remain controlled by `thesis/izvjestaj.tex`.

## Verification

Compile `thesis/izvjestaj.tex`, confirm the build completes without LaTeX errors, render the first two PDF pages, and visually compare them with pages 1 and 2 of `thesis_cover_example/predložak_2025_2026_diplomski.pdf`.
