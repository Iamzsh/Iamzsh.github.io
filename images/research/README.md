# Research-page figures

These assets use original research images and diagrams. Scientific image content,
colours and labels are preserved; panel selection and arrangement are documented
below. White backgrounds are retained for legibility in either site theme.

The current Research page uses `odd-elasticity-response.png` and
`embryo-development-0-20min.png` for the first two research directions. The earlier
odd-mode, elastic-ring model and cyst illustrations remain available for future use.

## `embryo-development-0-20min.png`

- Source: the 0 min and 20 min dorsal-view frames of Figure 1B in the author's
  original high-resolution `Figure1.pdf` for D. S. Alber, S. Zhao et al.,
  *A model for boundary-driven tissue morphogenesis*.
- Paper: <https://doi.org/10.1073/pnas.2505160122>.
- Processing: original PDF crops `(21, 55)-(69, 122.5)` for 0 min and
  `(220, 55)-(269.5, 122.5)` for 20 min, in points from the bottom-left. Rendered
  at 900 dpi and arranged side by side without resampling, producing a
  1318 x 884 pixel image. Original time labels and the 20 min frame's scale bar
  are retained. No changes were made to fluorescence colours or contrast.
- Interpretation: real live-embryo microscopy showing the hindgut primordium at
  0 min and its keyhole shape at 20 min. Cyan marks nuclei; red is a hindgut-specific
  nuclear reporter. The original figure caption gives the scale bar as 100 um.

## `odd-elasticity-response.png`

- Source: the author's standalone vector file `fig1.pdf` for Figure 1 of
  S. Zhao and P. A. Haas, *Nonlinear isotropic odd elasticity*.
- Paper and original caption: <https://arxiv.org/html/2605.02476v1>.
- Processing: rendered the entire single-page figure at 1500 x 748 pixels;
  no crop, redrawing, or changes to labels.
- Interpretation: the passive square has rectangular branches; the odd square
  rotates, and the pictured parallelogram branches require the matching condition
  `mu A + kappa K = 0`. They are not generic odd-material branches.

## `boundary-driven-morphogenesis.png`

- Source: panel F of the author's standalone `Figure2_revised.pdf` for
  D. S. Alber, S. Zhao et al., *A model for boundary-driven tissue morphogenesis*.
- Paper: <https://doi.org/10.1073/pnas.2505160122>.
- Processing: extracted panel F from PDF media coordinates `(280, 0)-(504, 213)`,
  clipping out a neighbouring annotation in the blank upper margin; rendered at
  1500 x 1427 pixels. The diagrams, arrows and labels within panel F are unchanged.
- Interpretation: displacement away from the ellipsoid's pole, together with
  reduced enclosed area, selects triangular ring shapes with consistent
  orientation. These are model predictions, not microscopy images.

## `cyst-indentation.png`

- Source: the existing repository asset `_publications/Poking cyst.pdf`.
- Work: S. Zhao and P. A. Haas, *Mechanics of poking a cyst*, Physical Review
  Letters **134**, 228402 (2025).
- Paper: <https://doi.org/10.1103/PhysRevLett.134.228402>
- Processing: rendered the entire single-page vector illustration at 1500 pixels
  wide; no crop or redrawing.
- Suggested caption: Indenting an epithelial cyst: geometry and material response
  together shape the relation between force and indentation depth.
- Interpretation: the force-depth curves show schematic scaling regimes, not raw
  experimental measurements.

## `curved-surface-buckling.png`

- Source: the existing repository asset `_publications/Euler buckling.pdf`.
- Work: S. Zhao and P. A. Haas, *Euler buckling on curved surfaces*, Physical
  Review Letters **135**, 247201 (2025).
- Paper: <https://doi.org/10.1103/63py-ph5s>
- Processing: rendered the entire single-page vector illustration at 1500 pixels
  wide; no crop or redrawing.
- Suggested caption: Buckling on a plane and on a curved surface. Curvature can
  already bend a relaxed filament before compression is applied.
- Interpretation: a schematic comparison of the mechanical problems.

## `odd-elasticity.png`

- Source: Figure 2 of S. Zhao and P. A. Haas, *Nonlinear isotropic odd elasticity*,
  arXiv:2605.02476v1.
- Paper: <https://arxiv.org/abs/2605.02476v1>
- Original PDF: <https://arxiv.org/pdf/2605.02476v1>
- HTML figure and caption (Figure 2): <https://arxiv.org/html/2605.02476v1>
- Licence stated by the arXiv HTML: CC BY 4.0.
- Processing: rendered the original figure from PDF page 3, crop rectangle
  `(331, 46, 550, 207)` in PDF points, at approximately 1500 pixels wide.
  The surrounding article text and printed caption are excluded.
- Suggested caption: Possible nonuniform deformation modes of a strongly odd
  elastic square under uniform dead loading.
- Interpretation: the figure shows the square branch and possible infinitesimal
  modes at its bifurcation; it does not show measured data or computed finite
  post-bifurcation branches. The condition in the source is `A K > kappa mu`.

## `elastic-waveguiding.jpg`

- Source: byte-for-byte copy of the existing repository asset
  `_publications/Polar solid.jpg`.
- Work: S. Zhao, J. Chen, Z. Chang and G. Huang, *Microstructure realization of
  a lattice-based polar solid for arbitrary elastic waveguiding*, Journal of the
  Mechanics and Physics of Solids **173**, 105226 (2023).
- Paper: <https://doi.org/10.1016/j.jmps.2023.105226>
- Processing: none.
- Suggested caption: A structured elastic lattice guides waves along a curved
  path; the corresponding unstructured material scatters them into the bulk.
- Interpretation: a comparison of wave fields with and without the designed
  lattice, reproduced from the repository's research illustration.
