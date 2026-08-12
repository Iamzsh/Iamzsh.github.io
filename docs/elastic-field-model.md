# Interactive Elastic Sheet

The homepage grid is a reduced linear-elastic calculation, not a geometric warp. The reference sheet is a rectangle `Omega = [0, Lx] x [0, Ly]` whose outer boundary is fixed.

## Kinematics and energy

The model uses small-strain plane-stress elasticity with `mu = 1`, `nu = 0.35`, and

```text
lambda = 2 mu nu / (1 - nu).
```

For a displacement field `u`, the strain is evaluated analytically as

```text
epsilon = 1/2 (grad u + grad u^T),
W = mu epsilon:epsilon + lambda/2 (tr epsilon)^2.
```

Both displacement components are expanded in the fixed-boundary sine basis

```text
phi_mn(x, y) = sin(m pi x / Lx) sin(n pi y / Ly),
u_x = sum q_mn^(x) phi_mn,   u_y = sum q_mn^(y) phi_mn.
```

Every basis function vanishes on the four outer edges, so `u = 0` on the entire boundary exactly. The homepage uses an `8 x 8` scalar basis, or 128 displacement degrees of freedom.

## Local drag constraint

Mouse-down defines a smooth, normalized, truncated Gaussian handle `w_a` centered at the grab location. A drag vector `D` constrains the handle-average displacement,

```text
integral_Omega w_a(x) u(x) dA = D.
```

The reduced stiffness is assembled directly from

```text
K_IJ = integral_Omega [2 mu epsilon(Phi_I):epsilon(Phi_J)
       + lambda div(Phi_I) div(Phi_J)] dA.
```

For each new anchor, the code builds the two-row constraint matrix `B` using 48-point Gauss-Legendre integration of the normalized Gaussian. The field is the unique discrete minimum of elastic energy subject to the constraint:

```text
q = K^-1 B^T (B K^-1 B^T)^-1 D.
```

`K` is assembled and Cholesky-factorized only when the canvas size changes. On pointer-down, two back-solves construct the two unit response fields. While dragging, the displayed result is only their linear combination; no new matrix system is solved per animation frame.

## Rendering and validity

The grid is drawn from the resulting spectral displacement field. Strain and principal strains are evaluated from the analytic derivatives of the same basis, not from screen-space line spacing. A low-opacity tensile/compressive tint is rendered beneath the grid.

The drag is capped by the largest principal strain sampled from a `33 x 25` analytic response field. The default cap is `7.5%`, keeping the display inside a visually useful small-strain regime. The return-to-rest motion is a UI interpolation only; every intermediate displayed state is still the constrained static linear-elastic solution for its interpolated handle displacement.

## Numerical checks

`ElasticSheet.runValidation()` tests the following for representative central, off-center, and near-boundary handles:

1. Boundary displacement is zero to floating-point precision.
2. The two averaged handle constraints satisfy `B q = D` to floating-point precision.
3. The stiffness matrix is exactly symmetric in the assembled representation and accepts a positive-pivot Cholesky factorization.
4. Strain is computed as `sym grad u`, so compatibility is built into the spectral displacement representation.
5. Feasible null-constraint perturbations increase the discrete elastic energy and are `K`-orthogonal to the minimizer.
6. `5 x 5`, `6 x 6`, and `8 x 8` bases are compared on common sample points against a `10 x 10` reference.
7. The capped response is sampled for `det(I + grad u)` to catch folds or pathological near-boundary behavior.

## Validation results

The following values were obtained by running `ElasticSheet.runValidation()` for four representative handles: central, two off-center, and one near a fixed edge. Drag directions were capped at the same `7.5%` principal-strain limit used by the interface.

| Check | Result |
| --- | ---: |
| Maximum boundary displacement | `9.18e-18` |
| Maximum handle-constraint residual | `1.04e-17` |
| Maximum stiffness asymmetry | `0` |
| Smallest Cholesky pivot | `9.01` |
| Largest K-orthogonality residual | `9.52e-16` |
| Smallest energy increase of a feasible perturbation | `0.130` |
| Minimum sampled `det(I + grad u)` | `0.931` |

The relative displacement differences to the `10 x 10` reference were:

| Basis | Mean | Maximum |
| --- | ---: | ---: |
| `5 x 5` | `15.11%` | `38.05%` |
| `6 x 6` | `7.82%` | `16.18%` |
| `8 x 8` (homepage) | `1.36%` | `2.91%` |

The default resolution was therefore kept at `8 x 8`: it is visually smooth near the local handle and close to the higher-order reference without making animation work noticeable. A local timing check on a normal desktop runtime gave about `4.5 ms` to construct and factorize the `128 x 128` system (only after resize), `0.15 ms` to prepare a new handle, and about `0.23 ms` for the displacement evaluations used by one grid redraw. Drag frames do not factorize or solve `K`; they only combine the two cached unit response fields and evaluate the spectral series.

Repeating the same checks for the square-like mobile canvas gave boundary and constraint residuals below `1.3e-17`, a minimum sampled `det(I + grad u)` of `0.931`, and an `8 x 8` mean/reference difference of `1.18%` (maximum `2.65%`).
