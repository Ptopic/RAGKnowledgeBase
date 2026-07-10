# Building the thesis PDF

These commands require a TeX Live or MacTeX installation with `latexmk` and `pdflatex` available on `PATH`.

Run the commands from the project root.

## Full thesis

```bash
cd thesis
mkdir -p build
latexmk -pdf -interaction=nonstopmode -halt-on-error -outdir=build izvjestaj.tex
```

The generated PDF will be written to:

```text
thesis/build/izvjestaj.pdf
```

The full build currently requires two pre-existing source issues to be resolved:

- add the referenced files under `thesis/assets/`, beginning with `assets/image1.png`;
- add `\end{document}` to the end of `izvjestaj.tex`.

## Cover-only preview

This is the command used to compile and verify only the two cover pages while skipping the missing thesis assets:

```bash
cd thesis
mkdir -p build
pdflatex -interaction=nonstopmode -halt-on-error \
  -jobname=cover-preview \
  -output-directory=build \
  '\includeonly{cover}\input{izvjestaj.tex}\end{document}'
```

The generated cover PDF will be written to:

```text
thesis/build/cover-preview.pdf
```

The final `\end{document}` in the command is temporary and compensates for the missing terminator in `izvjestaj.tex`.

## Clean generated files

```bash
cd thesis
latexmk -C -outdir=build izvjestaj.tex
rm -rf build
```
