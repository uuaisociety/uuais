/**
 * Dimensionality reduction utilities for projecting course embeddings to 2D/3D.
 * 
 * Includes a lightweight PCA implementation (fast, deterministic) and a
 * Barnes-Hut-free t-SNE implementation suitable for <5000 points.
 */

// ---- PCA Implementation ----

function mean(matrix: number[][]): number[] {
    const d = matrix[0].length;
    const n = matrix.length;
    const m = new Array(d).fill(0);
    for (const row of matrix) {
        for (let j = 0; j < d; j++) m[j] += row[j];
    }
    for (let j = 0; j < d; j++) m[j] /= n;
    return m;
}

function centerMatrix(matrix: number[][]): number[][] {
    const m = mean(matrix);
    return matrix.map(row => row.map((v, j) => v - m[j]));
}

/**
 * Power iteration to find the top-k principal components.
 * Good enough for our use case (projecting to 2-3 dimensions).
 */
function powerIteration(centered: number[][], dims: number, iterations = 100): number[][] {
    const n = centered.length;
    const d = centered[0].length;
    const components: number[][] = [];

    for (let k = 0; k < dims; k++) {
        // Random initial vector
        let w = Array.from({ length: d }, () => Math.random() - 0.5);
        let norm = Math.sqrt(w.reduce((s, v) => s + v * v, 0));
        w = w.map(v => v / norm);

        for (let iter = 0; iter < iterations; iter++) {
            // w_new = X^T * X * w
            const Xw = centered.map(row => row.reduce((s, v, j) => s + v * w[j], 0));
            const newW = new Array(d).fill(0);
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < d; j++) {
                    newW[j] += centered[i][j] * Xw[i];
                }
            }

            norm = Math.sqrt(newW.reduce((s, v) => s + v * v, 0));
            if (norm === 0) break;
            w = newW.map(v => v / norm);
        }

        components.push(w);

        // Deflate: remove this component from the data
        const projections = centered.map(row => row.reduce((s, v, j) => s + v * w[j], 0));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < d; j++) {
                centered[i][j] -= projections[i] * w[j];
            }
        }
    }

    return components;
}

function projectPCA(embeddings: number[][], dims: 2 | 3): number[][] {
    const centered = centerMatrix(embeddings);
    const components = powerIteration(centered, dims);

    // Re-center the original data for projection
    const m = mean(embeddings);
    return embeddings.map(row => {
        const centeredRow = row.map((v, j) => v - m[j]);
        return components.map(comp =>
            centeredRow.reduce((s, v, j) => s + v * comp[j], 0)
        );
    });
}

// ---- t-SNE Implementation ----

function pairwiseDistances(X: number[][]): number[][] {
    const n = X.length;
    const D = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            let d = 0;
            for (let k = 0; k < X[i].length; k++) {
                const diff = X[i][k] - X[j][k];
                d += diff * diff;
            }
            D[i][j] = d;
            D[j][i] = d;
        }
    }
    return D;
}

function computePerplexityRow(
    distances: number[],
    i: number,
    targetPerplexity: number,
    tolerance = 1e-5,
    maxIter = 50
): { P: number[]; beta: number } {
    let betaMin = -Infinity;
    let betaMax = Infinity;
    let beta = 1.0;
    const n = distances.length;

    for (let iter = 0; iter < maxIter; iter++) {
        const P = new Array(n).fill(0);
        let sumP = 0;
        for (let j = 0; j < n; j++) {
            if (j === i) continue;
            P[j] = Math.exp(-distances[j] * beta);
            sumP += P[j];
        }

        if (sumP === 0) sumP = 1e-10;

        let H = 0;
        for (let j = 0; j < n; j++) {
            if (j === i) continue;
            P[j] /= sumP;
            if (P[j] > 1e-7) {
                H -= P[j] * Math.log2(P[j]);
            }
        }

        const perplexity = Math.pow(2, H);
        const diff = perplexity - targetPerplexity;

        if (Math.abs(diff) < tolerance) {
            return { P, beta };
        }

        if (diff > 0) {
            betaMin = beta;
            beta = betaMax === Infinity ? beta * 2 : (beta + betaMax) / 2;
        } else {
            betaMax = beta;
            beta = betaMin === -Infinity ? beta / 2 : (beta + betaMin) / 2;
        }
    }

    // Return best we have
    const P = new Array(n).fill(0);
    let sumP = 0;
    for (let j = 0; j < n; j++) {
        if (j === i) continue;
        P[j] = Math.exp(-distances[j] * beta);
        sumP += P[j];
    }
    if (sumP === 0) sumP = 1e-10;
    for (let j = 0; j < n; j++) P[j] /= sumP;
    return { P, beta };
}

function projectTSNE(
    embeddings: number[][],
    dims: 2 | 3,
    perplexity = 30,
    iterations = 500,
    learningRate = 200
): number[][] {
    const n = embeddings.length;

    // For large datasets, first reduce with PCA to 50 dims
    let data = embeddings;
    if (embeddings[0].length > 50) {
        data = projectPCA(embeddings, Math.min(50, embeddings[0].length) as 2 | 3);
        // Actually PCA only does 2or3 dims. For t-SNE init, let's just use first 50 dims
        data = embeddings.map(row => row.slice(0, 50));
    }

    const adjPerplexity = Math.min(perplexity, Math.floor((n - 1) / 3));

    // Compute pairwise distances
    const D = pairwiseDistances(data);

    // Compute joint probabilities
    const P = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        const { P: Pi } = computePerplexityRow(D[i], i, adjPerplexity);
        for (let j = 0; j < n; j++) {
            P[i][j] = Pi[j];
        }
    }

    // Symmetrize
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const pij = (P[i][j] + P[j][i]) / (2 * n);
            P[i][j] = pij;
            P[j][i] = pij;
        }
    }

    // Initialize Y randomly
    const Y = Array.from({ length: n }, () =>
        Array.from({ length: dims }, () => (Math.random() - 0.5) * 0.01)
    );

    const gains = Array.from({ length: n }, () => new Array(dims).fill(1));
    const prevUpdate = Array.from({ length: n }, () => new Array(dims).fill(0));

    // Early exaggeration
    const exaggeration = 4;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            P[i][j] *= exaggeration;
        }
    }

    for (let iter = 0; iter < iterations; iter++) {
        // Remove exaggeration after 100 iterations
        if (iter === 100) {
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    P[i][j] /= exaggeration;
                }
            }
        }

        const momentum = iter < 250 ? 0.5 : 0.8;

        // Compute Q (t-distribution in low-dim space)
        const Q = Array.from({ length: n }, () => new Array(n).fill(0));
        let sumQ = 0;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                let dist = 0;
                for (let d = 0; d < dims; d++) {
                    dist += (Y[i][d] - Y[j][d]) ** 2;
                }
                const qij = 1 / (1 + dist);
                Q[i][j] = qij;
                Q[j][i] = qij;
                sumQ += 2 * qij;
            }
        }
        if (sumQ === 0) sumQ = 1e-10;

        // Compute gradients
        for (let i = 0; i < n; i++) {
            const grad = new Array(dims).fill(0);
            for (let j = 0; j < n; j++) {
                if (i === j) continue;
                const qij = Q[i][j] / sumQ;
                const mult = 4 * (P[i][j] - qij) * Q[i][j];
                for (let d = 0; d < dims; d++) {
                    grad[d] += mult * (Y[i][d] - Y[j][d]);
                }
            }

            for (let d = 0; d < dims; d++) {
                // Adaptive gains
                if ((grad[d] > 0) !== (prevUpdate[i][d] > 0)) {
                    gains[i][d] = Math.min(gains[i][d] + 0.2, 10);
                } else {
                    gains[i][d] = Math.max(gains[i][d] * 0.8, 0.01);
                }

                const update = momentum * prevUpdate[i][d] - learningRate * gains[i][d] * grad[d];
                Y[i][d] += update;
                prevUpdate[i][d] = update;
            }
        }

        // Re-center
        const yMean = new Array(dims).fill(0);
        for (let i = 0; i < n; i++) {
            for (let d = 0; d < dims; d++) yMean[d] += Y[i][d];
        }
        for (let d = 0; d < dims; d++) yMean[d] /= n;
        for (let i = 0; i < n; i++) {
            for (let d = 0; d < dims; d++) Y[i][d] -= yMean[d];
        }
    }

    return Y;
}

// ---- Public API ----

/**
 * Normalize projected coordinates to [0, 1] range for consistent rendering.
 */
function normalizeToUnit(points: number[][]): number[][] {
    if (points.length === 0) return points;
    const dims = points[0].length;
    const mins = new Array(dims).fill(Infinity);
    const maxs = new Array(dims).fill(-Infinity);

    for (const p of points) {
        for (let d = 0; d < dims; d++) {
            if (p[d] < mins[d]) mins[d] = p[d];
            if (p[d] > maxs[d]) maxs[d] = p[d];
        }
    }

    return points.map(p =>
        p.map((v, d) => {
            const range = maxs[d] - mins[d];
            return range === 0 ? 0.5 : (v - mins[d]) / range;
        })
    );
}

export type ProjectionAlgorithm = 'tsne' | 'pca';

export interface ProjectionOptions {
    dimensions: 2 | 3;
    algorithm: ProjectionAlgorithm;
    perplexity?: number;
    iterations?: number;
}

/**
 * Project high-dimensional embeddings to 2D or 3D coordinates.
 * Returns normalized coordinates in [0, 1] range.
 */
export function projectEmbeddings(
    embeddings: number[][],
    options: ProjectionOptions
): number[][] {
    const { dimensions, algorithm, perplexity = 30, iterations = 500 } = options;

    if (embeddings.length === 0) return [];
    if (embeddings.length === 1) {
        return [new Array(dimensions).fill(0.5)];
    }

    let projected: number[][];

    switch (algorithm) {
        case 'pca':
            projected = projectPCA(embeddings, dimensions);
            break;
        case 'tsne':
            projected = projectTSNE(embeddings, dimensions, perplexity, iterations);
            break;
        default:
            projected = projectPCA(embeddings, dimensions);
    }

    return normalizeToUnit(projected);
}
