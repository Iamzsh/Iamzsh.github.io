/*
 * A compact Rayleigh-Ritz model for a fixed-boundary isotropic elastic sheet.
 * It is intentionally dependency-free so the homepage can solve a small,
 * well-posed elasticity problem without shipping a general FEM package.
 */
(function (root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ElasticSheet = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const PI = Math.PI;

  const dot = (left, right) => {
    let value = 0;
    for (let index = 0; index < left.length; index += 1) value += left[index] * right[index];
    return value;
  };

  const multiplyMatrixVector = (matrix, size, vector) => {
    const result = new Float64Array(size);
    for (let row = 0; row < size; row += 1) {
      let value = 0;
      const offset = row * size;
      for (let column = 0; column < size; column += 1) value += matrix[offset + column] * vector[column];
      result[row] = value;
    }
    return result;
  };

  const principalStrains = (epsilonXX, epsilonYY, epsilonXY, output = [0, 0]) => {
    const mean = 0.5 * (epsilonXX + epsilonYY);
    const radius = Math.hypot(0.5 * (epsilonXX - epsilonYY), epsilonXY);
    output[0] = mean + radius;
    output[1] = mean - radius;
    return output;
  };

  // Exact integral of sin(a*pi*x) cos(b*pi*x) over x in [0, 1].
  const sineCosineIntegral = (a, b) => {
    const antiderivative = (frequency) => {
      if (frequency === 0) return 0;
      return (1 - Math.cos(frequency * PI)) / (frequency * PI);
    };
    return 0.5 * (antiderivative(a + b) + antiderivative(a - b));
  };

  const gaussLegendre = (order) => {
    const nodes = new Float64Array(order);
    const weights = new Float64Array(order);
    const midpoint = Math.floor((order + 1) / 2);

    for (let index = 0; index < midpoint; index += 1) {
      let root = Math.cos(PI * (index + 0.75) / (order + 0.5));
      let derivative = 0;

      for (let iteration = 0; iteration < 32; iteration += 1) {
        let previous = 1;
        let current = 1;

        for (let degree = 1; degree <= order; degree += 1) {
          const next = ((2 * degree - 1) * root * current - (degree - 1) * previous) / degree;
          previous = current;
          current = next;
        }

        derivative = order * (root * current - previous) / (root * root - 1);
        const nextRoot = root - current / derivative;
        if (Math.abs(nextRoot - root) < 1e-15) {
          root = nextRoot;
          break;
        }
        root = nextRoot;
      }

      let previous = 1;
      let current = 1;
      for (let degree = 1; degree <= order; degree += 1) {
        const next = ((2 * degree - 1) * root * current - (degree - 1) * previous) / degree;
        previous = current;
        current = next;
      }
      derivative = order * (root * current - previous) / (root * root - 1);
      const weight = 2 / ((1 - root * root) * derivative * derivative);
      nodes[index] = -root;
      nodes[order - 1 - index] = root;
      weights[index] = weight;
      weights[order - 1 - index] = weight;
    }

    return { nodes, weights };
  };

  const choleskyFactor = (matrix, size) => {
    const factor = new Float64Array(size * size);
    let minimumPivot = Infinity;

    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column <= row; column += 1) {
        let value = matrix[row * size + column];
        for (let inner = 0; inner < column; inner += 1) {
          value -= factor[row * size + inner] * factor[column * size + inner];
        }

        if (row === column) {
          if (!(value > 1e-12)) {
            throw new Error('The reduced elasticity stiffness matrix is not positive definite.');
          }
          factor[row * size + column] = Math.sqrt(value);
          minimumPivot = Math.min(minimumPivot, value);
        } else {
          factor[row * size + column] = value / factor[column * size + column];
        }
      }
    }

    return { factor, minimumPivot };
  };

  const solveCholesky = (factor, size, rightHandSide) => {
    const forward = new Float64Array(size);
    const solution = new Float64Array(size);

    for (let row = 0; row < size; row += 1) {
      let value = rightHandSide[row];
      const offset = row * size;
      for (let column = 0; column < row; column += 1) value -= factor[offset + column] * forward[column];
      forward[row] = value / factor[offset + row];
    }

    for (let row = size - 1; row >= 0; row -= 1) {
      let value = forward[row];
      for (let column = row + 1; column < size; column += 1) value -= factor[column * size + row] * solution[column];
      solution[row] = value / factor[row * size + row];
    }

    return solution;
  };

  class SpectralElasticSheet {
    constructor(options = {}) {
      this.order = options.order || 8;
      this.Lx = options.Lx || 1;
      this.Ly = options.Ly || 1;
      this.mu = options.mu === undefined ? 1 : options.mu;
      this.nu = options.nu === undefined ? 0.35 : options.nu;
      this.lambda = (2 * this.mu * this.nu) / (1 - this.nu);
      this.sigma = options.sigma || 0.085 * Math.min(this.Lx, this.Ly);
      this.quadrature = gaussLegendre(options.quadratureOrder || 48);

      this.modes = [];
      for (let m = 1; m <= this.order; m += 1) {
        for (let n = 1; n <= this.order; n += 1) this.modes.push({ m, n });
      }

      this.scalarModeCount = this.modes.length;
      this.dofCount = 2 * this.scalarModeCount;
      this.stiffness = this.buildStiffness();
      const factorization = choleskyFactor(this.stiffness, this.dofCount);
      this.factor = factorization.factor;
      this.minimumPivot = factorization.minimumPivot;
    }

    buildStiffness() {
      const size = this.dofCount;
      const stiffness = new Float64Array(size * size);
      const set = (row, column, value) => {
        stiffness[row * size + column] = value;
      };

      this.modes.forEach((mode, index) => {
        const integralXX = (mode.m * mode.m * PI * PI * this.Ly) / (4 * this.Lx);
        const integralYY = (mode.n * mode.n * PI * PI * this.Lx) / (4 * this.Ly);
        const xDof = 2 * index;
        const yDof = xDof + 1;

        set(xDof, xDof, (2 * this.mu + this.lambda) * integralXX + this.mu * integralYY);
        set(yDof, yDof, this.mu * integralXX + (2 * this.mu + this.lambda) * integralYY);
      });

      this.modes.forEach((modeA, indexA) => {
        this.modes.forEach((modeB, indexB) => {
          const integralYX =
            modeA.n * modeB.m * PI * PI *
            sineCosineIntegral(modeA.m, modeB.m) *
            sineCosineIntegral(modeB.n, modeA.n);
          const integralXY =
            modeA.m * modeB.n * PI * PI *
            sineCosineIntegral(modeB.m, modeA.m) *
            sineCosineIntegral(modeA.n, modeB.n);
          const coupling = this.mu * integralYX + this.lambda * integralXY;
          const xDof = 2 * indexA;
          const yDof = 2 * indexB + 1;

          set(xDof, yDof, coupling);
          set(yDof, xDof, coupling);
        });
      });

      return stiffness;
    }

    solve(rightHandSide) {
      return solveCholesky(this.factor, this.dofCount, rightHandSide);
    }

    basisAt(x, y, output) {
      const values = output || {
        phi: new Float64Array(this.scalarModeCount),
        derivativeX: new Float64Array(this.scalarModeCount),
        derivativeY: new Float64Array(this.scalarModeCount)
      };

      this.modes.forEach((mode, index) => {
        const xAngle = mode.m * PI * x / this.Lx;
        const yAngle = mode.n * PI * y / this.Ly;
        const sineX = Math.sin(xAngle);
        const sineY = Math.sin(yAngle);
        values.phi[index] = sineX * sineY;
        values.derivativeX[index] = (mode.m * PI / this.Lx) * Math.cos(xAngle) * sineY;
        values.derivativeY[index] = (mode.n * PI / this.Ly) * sineX * Math.cos(yAngle);
      });

      return values;
    }

    basisValuesAt(x, y, output = new Float64Array(this.scalarModeCount)) {
      this.modes.forEach((mode, index) => {
        output[index] = Math.sin(mode.m * PI * x / this.Lx) * Math.sin(mode.n * PI * y / this.Ly);
      });
      return output;
    }

    evaluateDisplacementFromPhi(q, phi, output = [0, 0]) {
      let displacementX = 0;
      let displacementY = 0;

      for (let index = 0; index < this.scalarModeCount; index += 1) {
        displacementX += q[2 * index] * phi[index];
        displacementY += q[2 * index + 1] * phi[index];
      }

      output[0] = displacementX;
      output[1] = displacementY;
      return output;
    }

    evaluateDisplacement(q, x, y, output = [0, 0]) {
      let displacementX = 0;
      let displacementY = 0;

      this.modes.forEach((mode, index) => {
        const phi = Math.sin(mode.m * PI * x / this.Lx) * Math.sin(mode.n * PI * y / this.Ly);
        displacementX += q[2 * index] * phi;
        displacementY += q[2 * index + 1] * phi;
      });

      output[0] = displacementX;
      output[1] = displacementY;
      return output;
    }

    evaluateStrainFromBasis(q, basis, output = [0, 0, 0]) {
      let derivativeXX = 0;
      let derivativeXY = 0;
      let derivativeYX = 0;
      let derivativeYY = 0;

      for (let index = 0; index < this.scalarModeCount; index += 1) {
        const derivativeX = basis.derivativeX[index];
        const derivativeY = basis.derivativeY[index];
        derivativeXX += q[2 * index] * derivativeX;
        derivativeXY += q[2 * index] * derivativeY;
        derivativeYX += q[2 * index + 1] * derivativeX;
        derivativeYY += q[2 * index + 1] * derivativeY;
      }

      output[0] = derivativeXX;
      output[1] = derivativeYY;
      output[2] = 0.5 * (derivativeXY + derivativeYX);
      return output;
    }

    evaluateGradient(q, x, y, output = [0, 0, 0, 0]) {
      let derivativeXX = 0;
      let derivativeXY = 0;
      let derivativeYX = 0;
      let derivativeYY = 0;

      this.modes.forEach((mode, index) => {
        const xAngle = mode.m * PI * x / this.Lx;
        const yAngle = mode.n * PI * y / this.Ly;
        const derivativeX = (mode.m * PI / this.Lx) * Math.cos(xAngle) * Math.sin(yAngle);
        const derivativeY = (mode.n * PI / this.Ly) * Math.sin(xAngle) * Math.cos(yAngle);
        derivativeXX += q[2 * index] * derivativeX;
        derivativeXY += q[2 * index] * derivativeY;
        derivativeYX += q[2 * index + 1] * derivativeX;
        derivativeYY += q[2 * index + 1] * derivativeY;
      });

      output[0] = derivativeXX;
      output[1] = derivativeXY;
      output[2] = derivativeYX;
      output[3] = derivativeYY;
      return output;
    }

    evaluateStrain(q, x, y, output = [0, 0, 0]) {
      return this.evaluateStrainFromBasis(q, this.basisAt(x, y), output);
    }

    normalizedSineAverages(anchor, length, modeCount) {
      const averages = new Float64Array(modeCount);
      let normalization = 0;

      for (let index = 0; index < this.quadrature.nodes.length; index += 1) {
        const coordinate = 0.5 * length * (this.quadrature.nodes[index] + 1);
        const measure = 0.5 * length * this.quadrature.weights[index];
        const gaussian = Math.exp(-0.5 * ((coordinate - anchor) / this.sigma) ** 2);
        const weight = measure * gaussian;
        normalization += weight;

        for (let mode = 1; mode <= modeCount; mode += 1) {
          averages[mode - 1] += weight * Math.sin(mode * PI * coordinate / length);
        }
      }

      for (let index = 0; index < averages.length; index += 1) averages[index] /= normalization;
      return averages;
    }

    prepareHandle(anchor) {
      const xAverages = this.normalizedSineAverages(anchor[0], this.Lx, this.order);
      const yAverages = this.normalizedSineAverages(anchor[1], this.Ly, this.order);
      const constraintX = new Float64Array(this.dofCount);
      const constraintY = new Float64Array(this.dofCount);

      this.modes.forEach((mode, index) => {
        const coefficient = xAverages[mode.m - 1] * yAverages[mode.n - 1];
        constraintX[2 * index] = coefficient;
        constraintY[2 * index + 1] = coefficient;
      });

      // K is factored once. These two solves construct K^{-1} B^T.
      const complianceX = this.solve(constraintX);
      const complianceY = this.solve(constraintY);
      const compliance00 = dot(constraintX, complianceX);
      const compliance01 = 0.5 * (dot(constraintX, complianceY) + dot(constraintY, complianceX));
      const compliance11 = dot(constraintY, complianceY);
      const determinant = compliance00 * compliance11 - compliance01 * compliance01;

      if (!(determinant > 1e-14)) throw new Error('The local displacement constraint is ill-conditioned.');

      const inverse00 = compliance11 / determinant;
      const inverse01 = -compliance01 / determinant;
      const inverse11 = compliance00 / determinant;
      const responseX = new Float64Array(this.dofCount);
      const responseY = new Float64Array(this.dofCount);

      for (let index = 0; index < this.dofCount; index += 1) {
        // q = K^{-1} B^T (B K^{-1} B^T)^{-1} D.
        responseX[index] = complianceX[index] * inverse00 + complianceY[index] * inverse01;
        responseY[index] = complianceX[index] * inverse01 + complianceY[index] * inverse11;
      }

      return {
        anchor: [anchor[0], anchor[1]],
        constraintX,
        constraintY,
        responseX,
        responseY,
        compliance: [compliance00, compliance01, compliance11]
      };
    }

    composeDisplacement(handle, displacement, output = new Float64Array(this.dofCount)) {
      for (let index = 0; index < this.dofCount; index += 1) {
        output[index] = handle.responseX[index] * displacement[0] + handle.responseY[index] * displacement[1];
      }
      return output;
    }

    createStrainProbe(handle, samplesX = 19, samplesY = 15) {
      const pointCount = samplesX * samplesY;
      const responseX = new Float64Array(pointCount * 3);
      const responseY = new Float64Array(pointCount * 3);
      const scratchX = [0, 0, 0];
      const scratchY = [0, 0, 0];
      let point = 0;

      for (let indexY = 0; indexY < samplesY; indexY += 1) {
        const y = this.Ly * indexY / (samplesY - 1);
        for (let indexX = 0; indexX < samplesX; indexX += 1) {
          const x = this.Lx * indexX / (samplesX - 1);
          this.evaluateStrain(handle.responseX, x, y, scratchX);
          this.evaluateStrain(handle.responseY, x, y, scratchY);
          const offset = point * 3;
          responseX[offset] = scratchX[0];
          responseX[offset + 1] = scratchX[1];
          responseX[offset + 2] = scratchX[2];
          responseY[offset] = scratchY[0];
          responseY[offset + 1] = scratchY[1];
          responseY[offset + 2] = scratchY[2];
          point += 1;
        }
      }

      return { responseX, responseY, pointCount };
    }

    maximumPrincipalStrain(probe, displacement) {
      let maximum = 0;
      const principal = [0, 0];

      for (let point = 0; point < probe.pointCount; point += 1) {
        const offset = point * 3;
        const epsilonXX = probe.responseX[offset] * displacement[0] + probe.responseY[offset] * displacement[1];
        const epsilonYY = probe.responseX[offset + 1] * displacement[0] + probe.responseY[offset + 1] * displacement[1];
        const epsilonXY = probe.responseX[offset + 2] * displacement[0] + probe.responseY[offset + 2] * displacement[1];
        principalStrains(epsilonXX, epsilonYY, epsilonXY, principal);
        maximum = Math.max(maximum, Math.abs(principal[0]), Math.abs(principal[1]));
      }

      return maximum;
    }

    limitDisplacement(probe, requested, maximumStrain) {
      const requestedStrain = this.maximumPrincipalStrain(probe, requested);
      const scale = requestedStrain > maximumStrain ? maximumStrain / requestedStrain : 1;
      return {
        displacement: [requested[0] * scale, requested[1] * scale],
        requestedStrain,
        scale
      };
    }

    constraintValue(handle, q) {
      return [dot(handle.constraintX, q), dot(handle.constraintY, q)];
    }

    energy(q) {
      return 0.5 * dot(q, multiplyMatrixVector(this.stiffness, this.dofCount, q));
    }
  }

  const relativeFieldDifference = (left, right) => {
    let numerator = 0;
    let denominator = 0;
    for (let index = 0; index < left.length; index += 1) {
      const difference = left[index] - right[index];
      numerator += difference * difference;
      denominator += right[index] * right[index];
    }
    return Math.sqrt(numerator / Math.max(denominator, 1e-30));
  };

  const sampleField = (model, q, samplesX, samplesY) => {
    const values = new Float64Array(samplesX * samplesY * 2);
    const displacement = [0, 0];
    let index = 0;

    for (let row = 0; row < samplesY; row += 1) {
      const y = model.Ly * (row + 0.5) / samplesY;
      for (let column = 0; column < samplesX; column += 1) {
        const x = model.Lx * (column + 0.5) / samplesX;
        model.evaluateDisplacement(q, x, y, displacement);
        values[index] = displacement[0];
        values[index + 1] = displacement[1];
        index += 2;
      }
    }

    return values;
  };

  const runValidation = (options = {}) => {
    const Lx = options.Lx || 1.32;
    const Ly = options.Ly || 1;
    const sigma = options.sigma || 0.085 * Math.min(Lx, Ly);
    // The 10 x 10 result is only a convergence reference; the homepage uses 8 x 8.
    const orders = options.orders || [5, 6, 8, 10];
    const anchors = [
      [0.50 * Lx, 0.50 * Ly],
      [0.23 * Lx, 0.34 * Ly],
      [0.78 * Lx, 0.70 * Ly],
      [0.10 * Lx, 0.24 * Ly]
    ];
    const directions = [
      [0.020 * Ly, -0.012 * Ly],
      [-0.014 * Ly, 0.018 * Ly],
      [0.016 * Ly, 0.010 * Ly],
      [0.010 * Ly, -0.008 * Ly]
    ];
    const fields = new Map();
    let maximumBoundaryDisplacement = 0;
    let maximumConstraintResidual = 0;
    let minimumPivot = Infinity;
    let maximumSymmetryResidual = 0;
    let minimumEnergyIncrease = Infinity;
    let maximumOrthogonalityResidual = 0;
    let minimumDeformationJacobian = Infinity;

    orders.forEach((order) => {
      const model = new SpectralElasticSheet({ order, Lx, Ly, sigma });
      minimumPivot = Math.min(minimumPivot, model.minimumPivot);
      for (let row = 0; row < model.dofCount; row += 1) {
        for (let column = row + 1; column < model.dofCount; column += 1) {
          maximumSymmetryResidual = Math.max(
            maximumSymmetryResidual,
            Math.abs(model.stiffness[row * model.dofCount + column] - model.stiffness[column * model.dofCount + row])
          );
        }
      }
      const orderFields = [];

      anchors.forEach((anchor, testIndex) => {
        const handle = model.prepareHandle(anchor);
        const probe = model.createStrainProbe(handle, 33, 25);
        const limited = model.limitDisplacement(probe, directions[testIndex], 0.075);
        const q = model.composeDisplacement(handle, limited.displacement);
        const constraint = model.constraintValue(handle, q);
        maximumConstraintResidual = Math.max(
          maximumConstraintResidual,
          Math.abs(constraint[0] - limited.displacement[0]),
          Math.abs(constraint[1] - limited.displacement[1])
        );

        const boundarySamples = 17;
        const edge = [0, 0];
        for (let sample = 0; sample < boundarySamples; sample += 1) {
          const fraction = sample / (boundarySamples - 1);
          const positions = [
            [0, fraction * Ly],
            [Lx, fraction * Ly],
            [fraction * Lx, 0],
            [fraction * Lx, Ly]
          ];
          positions.forEach((position) => {
            model.evaluateDisplacement(q, position[0], position[1], edge);
            maximumBoundaryDisplacement = Math.max(maximumBoundaryDisplacement, Math.hypot(edge[0], edge[1]));
          });
        }

        // A positive sampled det(I + grad u) confirms the capped display has no folds.
        const gradient = [0, 0, 0, 0];
        for (let row = 0; row <= 30; row += 1) {
          for (let column = 0; column <= 40; column += 1) {
            model.evaluateGradient(q, Lx * column / 40, Ly * row / 30, gradient);
            const jacobian = (1 + gradient[0]) * (1 + gradient[3]) - gradient[1] * gradient[2];
            minimumDeformationJacobian = Math.min(minimumDeformationJacobian, jacobian);
          }
        }

        // A feasible perturbation z has Bz = 0. The minimizer must be K-orthogonal to it.
        const perturbation = new Float64Array(model.dofCount);
        for (let index = 0; index < perturbation.length; index += 1) {
          perturbation[index] = Math.sin(0.37 * (index + 1) * (testIndex + 2));
        }
        const rawConstraint = model.constraintValue(handle, perturbation);
        for (let index = 0; index < perturbation.length; index += 1) {
          perturbation[index] -= handle.responseX[index] * rawConstraint[0] + handle.responseY[index] * rawConstraint[1];
        }
        const perturbationConstraint = model.constraintValue(handle, perturbation);
        maximumOrthogonalityResidual = Math.max(
          maximumOrthogonalityResidual,
          Math.abs(perturbationConstraint[0]),
          Math.abs(perturbationConstraint[1])
        );
        const kPerturbation = multiplyMatrixVector(model.stiffness, model.dofCount, perturbation);
        const crossEnergy = Math.abs(dot(q, kPerturbation));
        maximumOrthogonalityResidual = Math.max(maximumOrthogonalityResidual, crossEnergy);
        const baseEnergy = model.energy(q);
        const step = 0.05 / Math.max(Math.sqrt(dot(perturbation, perturbation)), 1e-12);
        [-1, 1].forEach((sign) => {
          const competitor = new Float64Array(model.dofCount);
          for (let index = 0; index < competitor.length; index += 1) competitor[index] = q[index] + sign * step * perturbation[index];
          minimumEnergyIncrease = Math.min(minimumEnergyIncrease, model.energy(competitor) - baseEnergy);
        });

        orderFields.push(sampleField(model, q, 17, 13));
      });

      fields.set(order, orderFields);
    });

    const referenceOrder = Math.max(...orders);
    const referenceFields = fields.get(referenceOrder);
    const convergence = orders
      .filter((order) => order !== referenceOrder)
      .map((order) => {
        const comparisons = fields.get(order).map((field, index) => relativeFieldDifference(field, referenceFields[index]));
        return {
          order,
          maxRelativeDisplacementDifference: Math.max(...comparisons),
          meanRelativeDisplacementDifference: comparisons.reduce((sum, value) => sum + value, 0) / comparisons.length
        };
      });

    return {
      parameters: { Lx, Ly, sigma, nu: 0.35, mu: 1, orders },
      boundary: { maximumDisplacement: maximumBoundaryDisplacement },
      constraint: { maximumResidual: maximumConstraintResidual },
      stiffness: { maximumSymmetryResidual, minimumCholeskyPivot: minimumPivot },
      minimization: { minimumFeasibleEnergyIncrease: minimumEnergyIncrease, maximumKOrthogonalityResidual: maximumOrthogonalityResidual },
      response: { minimumDeformationJacobian },
      convergence
    };
  };

  return {
    SpectralElasticSheet,
    principalStrains,
    runValidation
  };
});
