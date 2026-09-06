# Building the thesis PDF

These commands require a TeX Live or MacTeX installation with `latexmk` and `pdflatex` available on `PATH`.

Run the commands from the project root.

## Clean thesis

```bash
cd thesis
mkdir -p build
latexmk -pdf -interaction=nonstopmode -halt-on-error -outdir=build main.tex
```

The generated PDF will be written to:

```text
thesis/build/main.pdf
```

## Diff thesis

Use this build when reviewing thesis edits with mentor-style visual changes. Text wrapped
in `\DiffReplace{old text}{new text}` shows the old text with black letters on a red
background and the new text with black letters on a green background. Text wrapped in
`\DiffAdd{new text}` appears only with the green background. The normal `main.pdf` build
prints only the latest text.

```bash
cd thesis
mkdir -p build
latexmk -pdf -interaction=nonstopmode -halt-on-error -outdir=build main-diff.tex
```

The generated PDF will be written to:

```text
thesis/build/main-diff.pdf
```

Prefer the smallest useful diff. For one-word or short phrase changes, use
`\DiffReplaceInline{old}{new}` inside the sentence instead of replacing the whole
paragraph. For added or removed sentences, use `\DiffAdd{...}` or `\DiffDelete{...}`.
Use full `\DiffReplace{old paragraph}{new paragraph}` only when most of the paragraph
was rewritten.

Use `\DiffComment{mentor comment}` immediately before the related diff when the diff
PDF should show which mentor comment caused the change. The comment bubble is rendered
only in `main-diff.pdf`; the clean `main.pdf` omits it completely.

## Cover-only preview

This command compiles and verifies only the two cover pages:

```bash
cd thesis
mkdir -p build
pdflatex -interaction=nonstopmode -halt-on-error \
  -jobname=cover-preview \
  -output-directory=build \
  '\includeonly{cover1,cover2}\input{main.tex}'
```

The generated cover PDF will be written to:

```text
thesis/build/cover-preview.pdf
```

## Clean generated files

```bash
cd thesis
latexmk -C -outdir=build main.tex
latexmk -C -outdir=build main-diff.tex
rm -rf build
```
