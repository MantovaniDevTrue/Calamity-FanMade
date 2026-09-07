const SUNKEN_TEMPLATE_WIDTH = 320;
const SUNKEN_TEMPLATE_HEIGHT = 180;
const SULPHUR_CONTOUR_SAMPLES = 520;
const SULPHUR_FIELD_WIDTH = 160;
const SULPHUR_FIELD_HEIGHT = 120;
const SULPHUR_PLAN_WIDTH = 520;
const SULPHUR_PLAN_HEIGHT = 320;
const INV_SQRT2 = 0.7071067811865476;

const GradientX = [1, -1, 0, 0, INV_SQRT2, -INV_SQRT2, INV_SQRT2, -INV_SQRT2];
const GradientY = [0, 0, 1, -1, INV_SQRT2, INV_SQRT2, -INV_SQRT2, -INV_SQRT2];

let Prepared = false;
let SunkenField = null;
let SulphurContour = null;
let SulphurField = null;
let SulphurPlanTemplate = null;
let PrepareElapsedMs = 0;
let SunkenSeed = 1451;
let PreparedSunkenSeed = null;

function NormalizeSeed(seed) {
    let n = Math.floor(Number(seed) || 1451) | 0;
    n ^= n >>> 16;
    n = Math.imul(n, 0x7feb352d);
    n ^= n >>> 15;
    n = Math.imul(n, 0x846ca68b);
    n ^= n >>> 16;
    return n | 0;
}

function SeedUnit(index) {
    const h = Hash2D(index * 17 + 11, index * 31 + 7, SunkenSeed);
    return (h >>> 0) / 4294967295;
}

function Clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
}

function FadeQuintic(t) {
    const x = Clamp(t, 0, 1);
    return x * x * x * (x * (x * 6 - 15) + 10);
}

function Lerp(a, b, t) {
    return a + (b - a) * t;
}

function Hash2D(x, y, seed) {
    let n = (Math.imul(Math.floor(x), 374761393)
        + Math.imul(Math.floor(y), 668265263)
        + Math.imul(Math.floor(seed), 69069)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return (n ^ (n >>> 16)) >>> 0;
}

function GradientDot(ix, iy, x, y, seed) {
    const hash = Hash2D(ix, iy, seed) & 7;
    const dx = x - ix;
    const dy = y - iy;
    return GradientX[hash] * dx + GradientY[hash] * dy;
}

function GradientNoise2D(x, y, seed) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    const sx = FadeQuintic(x - x0);
    const sy = FadeQuintic(y - y0);
    const n00 = GradientDot(x0, y0, x, y, seed);
    const n10 = GradientDot(x1, y0, x, y, seed);
    const n01 = GradientDot(x0, y1, x, y, seed);
    const n11 = GradientDot(x1, y1, x, y, seed);
    const ix0 = Lerp(n00, n10, sx);
    const ix1 = Lerp(n01, n11, sx);
    return Clamp(Lerp(ix0, ix1, sy) * 1.42, -1, 1);
}

function FractalGradientNoise(x, y, seed) {
    let frequency = 1;
    let amplitude = 0.57;
    let total = 0;
    let normalizer = 0;
    for (let octave = 0; octave < 3; octave++) {
        total += GradientNoise2D(x * frequency, y * frequency, seed + octave * 1013) * amplitude;
        normalizer += amplitude;
        frequency *= 2.07;
        amplitude *= 0.49;
    }
    return normalizer > 0 ? Clamp(total / normalizer, -1, 1) : 0;
}

function BuildField(width, height, scaleX, scaleY, seed) {
    const field = new Array(width * height);
    for (let y = 0; y < height; y++) {
        const row = y * width;
        for (let x = 0; x < width; x++)
            field[row + x] = FractalGradientNoise(x * scaleX, y * scaleY, seed);
    }
    return field;
}

function Wrap(value, size) {
    const n = Math.floor(Number(value) || 0);
    const s = Math.max(1, Math.floor(Number(size) || 1));
    return ((n % s) + s) % s;
}

function SampleWrapped(field, width, height, x, y) {
    if (!field)
        return 0;
    const fx = Number(x) || 0;
    const fy = Number(y) || 0;
    const x0Raw = Math.floor(fx);
    const y0Raw = Math.floor(fy);
    const tx = FadeQuintic(fx - x0Raw);
    const ty = FadeQuintic(fy - y0Raw);
    const x0 = Wrap(x0Raw, width);
    const y0 = Wrap(y0Raw, height);
    const x1 = Wrap(x0Raw + 1, width);
    const y1 = Wrap(y0Raw + 1, height);
    const a = Lerp(field[y0 * width + x0], field[y0 * width + x1], tx);
    const b = Lerp(field[y1 * width + x0], field[y1 * width + x1], tx);
    return Lerp(a, b, ty);
}

function SampleClamped(field, width, height, x, y) {
    if (!field)
        return 0;
    const fx = Clamp(x, 0, width - 1);
    const fy = Clamp(y, 0, height - 1);
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(width - 1, x0 + 1);
    const y1 = Math.min(height - 1, y0 + 1);
    const tx = FadeQuintic(fx - x0);
    const ty = FadeQuintic(fy - y0);
    const a = Lerp(field[y0 * width + x0], field[y0 * width + x1], tx);
    const b = Lerp(field[y1 * width + x0], field[y1 * width + x1], tx);
    return Lerp(a, b, ty);
}

function SampleContour(normalizedX) {
    if (!SulphurContour)
        return 0;
    const position = Clamp(normalizedX, 0, 1) * (SULPHUR_CONTOUR_SAMPLES - 1);
    const i0 = Math.floor(position);
    const i1 = Math.min(SULPHUR_CONTOUR_SAMPLES - 1, i0 + 1);
    return Lerp(SulphurContour[i0], SulphurContour[i1], FadeQuintic(position - i0));
}

function SampleSulphurField(u, v, offsetU = 0, offsetV = 0) {
    const x = (Clamp(u, 0, 1) + offsetU) * (SULPHUR_FIELD_WIDTH - 1);
    const y = (Clamp(v, 0, 1) + offsetV) * (SULPHUR_FIELD_HEIGHT - 1);
    return SampleWrapped(SulphurField, SULPHUR_FIELD_WIDTH, SULPHUR_FIELD_HEIGHT, x, y);
}

function EllipseDistance(nx, ny, cx, cy, rx, ry) {
    const dx = (nx - cx) / rx;
    const dy = (ny - cy) / ry;
    return dx * dx + dy * dy;
}

function SegmentDistanceSquared(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;
    const denominator = abx * abx + aby * aby;
    const t = denominator > 0 ? Clamp((apx * abx + apy * aby) / denominator, 0, 1) : 0;
    const x = ax + abx * t;
    const y = ay + aby * t;
    const dx = px - x;
    const dy = py - y;
    return dx * dx + dy * dy;
}

function ComputeSulphurousBandNormalized(u, v) {
    const contour = SampleContour(u);
    const detail = SampleSulphurField(u, v);
    const strataNoise = SampleSulphurField(u, v, 0.37, 0.23);
    const inlandLimit = Clamp(0.845 + contour * 0.052 + detail * 0.020, 0.74, 0.92);
    if (u >= inlandLimit)
        return 0;
    const normalizedInland = Clamp(u / Math.max(0.001, inlandLimit), 0, 1);
    const depthFactor = Math.pow(Math.max(0, Math.sin((1 - normalizedInland) * Math.PI * 0.5)), 0.24);
    const bottomV = Clamp(depthFactor + contour * 0.045 + detail * 0.028 + strataNoise * 0.014, 0.025, 1.03);
    if (v >= bottomV)
        return 0;
    const depth01 = Clamp(v / Math.max(0.001, bottomV), 0, 1);
    const band = depth01 + detail * 0.075 + strataNoise * 0.040 + contour * 0.018;
    if (band < 0.25)
        return 1;
    if (band < 0.55)
        return 2;
    if (band < 0.80)
        return 3;
    return 4;
}

function Prepare() {
    const started = Date.now();
    if (PreparedSunkenSeed !== SunkenSeed || !SunkenField) {
        SunkenField = BuildField(SUNKEN_TEMPLATE_WIDTH, SUNKEN_TEMPLATE_HEIGHT, 0.021, 0.023, SunkenSeed);
        PreparedSunkenSeed = SunkenSeed;
    }
    if (!SulphurContour) {
        SulphurContour = new Array(SULPHUR_CONTOUR_SAMPLES);
        for (let x = 0; x < SULPHUR_CONTOUR_SAMPLES; x++)
            SulphurContour[x] = FractalGradientNoise(x * 0.018, 7.35, 2843);
    }
    if (!SulphurField)
        SulphurField = BuildField(SULPHUR_FIELD_WIDTH, SULPHUR_FIELD_HEIGHT, 0.055, 0.058, 3917);
    if (!SulphurPlanTemplate) {
        SulphurPlanTemplate = new Array(SULPHUR_PLAN_WIDTH * SULPHUR_PLAN_HEIGHT);
        for (let y = 0; y < SULPHUR_PLAN_HEIGHT; y++) {
            const v = (y + 0.5) / SULPHUR_PLAN_HEIGHT;
            const row = y * SULPHUR_PLAN_WIDTH;
            for (let x = 0; x < SULPHUR_PLAN_WIDTH; x++) {
                const u = (x + 0.5) / SULPHUR_PLAN_WIDTH;
                SulphurPlanTemplate[row + x] = ComputeSulphurousBandNormalized(u, v);
            }
        }
    }
    Prepared = true;
    PrepareElapsedMs = Date.now() - started;
}

function ConfigureSunkenSeed(seed) {
    const next = NormalizeSeed(seed);
    if (next === SunkenSeed)
        return;
    SunkenSeed = next;
    PreparedSunkenSeed = null;
    SunkenField = null;
    CachedSunkenPlan = null;
    CachedSunkenWidth = 0;
    CachedSunkenHeight = 0;
    CachedSunkenSeed = null;
}

let CachedSunkenPlan = null;
let CachedSunkenWidth = 0;
let CachedSunkenHeight = 0;
let CachedSunkenSeed = null;
let CachedSunkenClusterCount = 0;
let CachedSunkenHubCount = 0;
let CachedSunkenBuildMs = 0;

function MakeSeededRandom(seed) {
    let state = NormalizeSeed(seed) >>> 0;
    if (state === 0)
        state = 0x6d2b79f5;
    return {
        nextFloat() {
            state = (state + 0x6d2b79f5) >>> 0;
            let t = state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        },
        nextBool() {
            return this.nextFloat() < 0.5;
        },
        nextInt(minInclusive, maxExclusive) {
            const lo = Math.floor(Number(minInclusive) || 0);
            const hi = Math.max(lo + 1, Math.floor(Number(maxExclusive) || lo + 1));
            return lo + Math.floor(this.nextFloat() * (hi - lo));
        }
    };
}

function SearchCluster(hubMap, width, height, out, x, y, level = 2) {
    const index = y * width + x;
    if (hubMap[index] === 0)
        return;
    out.push(x, y);
    hubMap[index] = 0;
    level--;
    if (level === -1)
        return;
    if (x > 0 && hubMap[index - 1] !== 0)
        SearchCluster(hubMap, width, height, out, x - 1, y, level);
    if (x < width - 1 && hubMap[index + 1] !== 0)
        SearchCluster(hubMap, width, height, out, x + 1, y, level);
    if (y > 0 && hubMap[index - width] !== 0)
        SearchCluster(hubMap, width, height, out, x, y - 1, level);
    if (y < height - 1 && hubMap[index + width] !== 0)
        SearchCluster(hubMap, width, height, out, x, y + 1, level);
}

function GenerateDesktopClusters(groupWidth, groupHeight, rng) {
    const hubMap = new Uint8Array(groupWidth * groupHeight);
    const clusterPos = (groupWidth >> 1) - 1;
    const clusterHeight = (groupHeight >> 1) - 1;
    const clusterSize = (clusterPos + 1) * (clusterPos + 1);
    const centerX = clusterPos;
    const centerY = clusterHeight;

    for (let y = centerY - clusterHeight; y <= centerY + clusterHeight; y++) {
        if (y < 0 || y >= groupHeight)
            continue;
        const vertical = clusterHeight > 0 ? (clusterPos / clusterHeight) * (y - centerY) : 0;
        const radius = Math.min(clusterPos, Math.floor(Math.sqrt(Math.max(0, clusterSize - vertical * vertical))));
        const x0 = Math.max(0, centerX - radius);
        const x1 = Math.min(groupWidth - 1, centerX + radius);
        for (let x = x0; x <= x1; x++)
            hubMap[y * groupWidth + x] = rng.nextBool() ? 1 : 0;
    }

    const pointClusters = [];
    for (let x = 0; x < groupWidth; x++) {
        for (let y = 0; y < groupHeight; y++) {
            const index = y * groupWidth + x;
            if (hubMap[index] === 0 || !rng.nextBool())
                continue;
            const points = [];
            SearchCluster(hubMap, groupWidth, groupHeight, points, x, y, 2);
            if (points.length >= 6)
                pointClusters.push(points);
        }
    }

    const indexMap = new Int32Array(groupWidth * groupHeight);
    indexMap.fill(-1);
    for (let i = 0; i < pointClusters.length; i++) {
        const points = pointClusters[i];
        for (let p = 0; p < points.length; p += 2)
            indexMap[points[p + 1] * groupWidth + points[p]] = i;
    }

    function AttemptClaim(x, y, index) {
        if (x < 0 || y < 0 || x >= groupWidth || y >= groupHeight)
            return;
        const neighbor = indexMap[y * groupWidth + x];
        if (neighbor === -1 || neighbor === index)
            return;
        const replacement = rng.nextBool() ? -1 : index;
        const points = pointClusters[neighbor];
        for (let p = 0; p < points.length; p += 2)
            indexMap[points[p + 1] * groupWidth + points[p]] = replacement;
    }

    for (let i = 0; i < pointClusters.length; i++) {
        const points = pointClusters[i];
        for (let p = 0; p < points.length; p += 2) {
            const x = points[p];
            const y = points[p + 1];
            const currentIndex = indexMap[y * groupWidth + x];
            if (currentIndex === -1)
                break;
            AttemptClaim(x - 1, y, currentIndex);
            AttemptClaim(x + 1, y, currentIndex);
            AttemptClaim(x, y - 1, currentIndex);
            AttemptClaim(x, y + 1, currentIndex);
        }
    }

    const owned = new Array(pointClusters.length);
    for (let i = 0; i < owned.length; i++)
        owned[i] = [];
    for (let y = 0; y < groupHeight; y++) {
        for (let x = 0; x < groupWidth; x++) {
            const index = indexMap[y * groupWidth + x];
            if (index >= 0)
                owned[index].push(x, y);
        }
    }

    const clusters = [];
    let totalHubs = 0;
    for (const points of owned) {
        if (points.length < 8)
            continue;
        const hubs = new Float32Array(points.length);
        for (let p = 0; p < points.length; p += 2) {
            hubs[p] = points[p] + (rng.nextFloat() - 0.5) * 0.5;
            hubs[p + 1] = points[p + 1] + (rng.nextFloat() - 0.5) * 0.5;
        }
        totalHubs += hubs.length >> 1;
        clusters.push({ firstX: hubs[0], firstY: hubs[1], hubs });
    }
    return { clusters, totalHubs };
}

function ApplyGeode(plan, width, height, cx, cy, radius, outerRatio, salt) {
    const minX = Math.max(0, Math.floor(cx - radius - 3));
    const maxX = Math.min(width - 1, Math.ceil(cx + radius + 3));
    const minY = Math.max(0, Math.floor(cy - radius - 3));
    const maxY = Math.min(height - 1, Math.ceil(cy + radius + 3));
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const dx = x + 0.5 - cx;
            const dy = y + 0.5 - cy;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const noise = ((Hash2D(x + salt * 11, y + salt * 23, SunkenSeed + salt * 101) >>> 0) / 4294967295 - 0.5);
            const roughRadius = radius * (1 + noise * 0.13);
            const normalized = distance / Math.max(1, roughRadius);
            if (normalized >= 1)
                continue;
            const index = y * width + x;
            if (normalized < outerRatio * 0.30)
                plan[index] = 2;
            else if (normalized < outerRatio * 0.60)
                plan[index] = 5;
            else if (normalized < outerRatio)
                plan[index] = 4;
            else
                plan[index] = 1;
        }
    }
}

function BuildDesktopSunkenPlan(width, height) {
    const started = Date.now();
    const w = Math.max(160, Math.floor(Number(width) || SUNKEN_TEMPLATE_WIDTH));
    const h = Math.max(120, Math.floor(Number(height) || SUNKEN_TEMPLATE_HEIGHT));
    // The desktop pass iterates from -20 to +20 around the 4x/2x cluster field.
    // Fresh-world metadata uses that complete envelope, so reserve a 20-tile rim here.
    const padding = (w >= 200 && h >= 150) ? 20 : 0;
    const coreWidth = Math.max(80, w - padding * 2);
    const coreHeight = Math.max(84, h - padding * 2);
    const groupWidth = Math.max(20, Math.floor(coreWidth / 4));
    const groupHeight = Math.max(20, Math.floor(coreHeight / 2));
    const rng = MakeSeededRandom(SunkenSeed ^ Math.imul(groupWidth, 73856093) ^ Math.imul(groupHeight, 19349663));
    const generated = GenerateDesktopClusters(groupWidth, groupHeight, rng);
    const clusters = generated.clusters;

    // Original PlaceClusters only considers clusters whose first hub is within 10 low-res
    // cells. Bucket those anchors so evaluating the 4x/2x terrain field stays mobile-safe.
    const bucketSize = 10;
    const bucketWidth = Math.max(1, Math.ceil(groupWidth / bucketSize));
    const bucketHeight = Math.max(1, Math.ceil(groupHeight / bucketSize));
    const buckets = new Array(bucketWidth * bucketHeight);
    for (let i = 0; i < clusters.length; i++) {
        const c = clusters[i];
        const bx = Math.max(0, Math.min(bucketWidth - 1, Math.floor(c.firstX / bucketSize)));
        const by = Math.max(0, Math.min(bucketHeight - 1, Math.floor(c.firstY / bucketSize)));
        const bi = by * bucketWidth + bx;
        if (!buckets[bi]) buckets[bi] = [];
        buckets[bi].push(i);
    }

    const plan = new Uint8Array(w * h);
    for (let localY = 0; localY < h; localY++) {
        const terrainY = localY - padding;
        const vectorY = terrainY / 2;
        const radialY = terrainY / Math.max(1, coreHeight) * 2 - 1;
        const by0 = Math.max(0, Math.floor((vectorY - 10) / bucketSize));
        const by1 = Math.min(bucketHeight - 1, Math.floor((vectorY + 10) / bucketSize));
        for (let localX = 0; localX < w; localX++) {
            const terrainX = localX - padding;
            const vectorX = terrainX / 4;
            const radialX = terrainX / Math.max(1, coreWidth) * 2 - 1;
            const bx0 = Math.max(0, Math.floor((vectorX - 10) / bucketSize));
            const bx1 = Math.min(bucketWidth - 1, Math.floor((vectorX + 10) / bucketSize));
            let strongest = 0;
            let second = 0;
            let strongestCluster = -1;

            for (let by = by0; by <= by1; by++) {
                for (let bx = bx0; bx <= bx1; bx++) {
                    const bucket = buckets[by * bucketWidth + bx];
                    if (!bucket)
                        continue;
                    for (let bi = 0; bi < bucket.length; bi++) {
                        const clusterIndex = bucket[bi];
                        const cluster = clusters[clusterIndex];
                        if (Math.abs(cluster.firstX - vectorX) > 10 || Math.abs(cluster.firstY - vectorY) > 10)
                            continue;
                        let score = 0;
                        const hubs = cluster.hubs;
                        for (let p = 0; p < hubs.length; p += 2) {
                            const dx = hubs[p] - vectorX;
                            const dy = hubs[p + 1] - vectorY;
                            const distanceSq = Math.max(0.0001, dx * dx + dy * dy);
                            score += 1 / distanceSq;
                        }
                        if (score > strongest) {
                            second = strongest;
                            strongest = score;
                            strongestCluster = clusterIndex;
                        } else if (score > second) {
                            second = score;
                        }
                    }
                }
            }

            const density = strongest + second;
            const outer = Math.sqrt(radialX * radialX + radialY * radialY) >= 0.8;
            let code = 0;
            // Codes 6..11 preserve PlaceClusters behavior that depends on whether the
            // destination tile was solid before Calamity touched it. Resolving that at
            // application time is important around the outer 20-tile falloff: the old
            // TLPro approximation forced those cells solid and produced an unnaturally
            // clean oval on the world map.
            // 6 = outer >1.8, existing solid -> Eutrophic/Navystone wall, air -> water/Navystone wall
            // 7 = outer >0.7, existing solid -> Eutrophic/Eutrophic wall, air -> water/Eutrophic wall
            // 8 = accepted >0.25 dither, solid -> Eutrophic/Eutrophic wall, air -> water/Navystone wall
            // 9 = strong-cluster open water, no wall (ClearEverything in desktop)
            // 10 = strong-cluster Eutrophic solid, no wall
            // 11 = inner >1.8 Eutrophic solid with Navystone wall
            if (density > 4.5) {
                code = strongestCluster >= 0 && strongestCluster % 5 === 2 ? 10 : 9;
            } else if (density > 1.8) {
                code = outer ? 6 : 11;
            } else if (density > 0.7 || !outer) {
                code = outer ? 7 : 3;
            } else if (density > 0.25) {
                const chance = Clamp((density - 0.25) / 0.45, 0, 1);
                if (rng.nextFloat() < chance)
                    code = 8;
            }
            plan[localY * w + localX] = code;
        }
    }

    // AddGeodes from desktop: one large central geode at 33% depth and 4/6/8 smaller
    // holes inside the upper 70% of the cluster zone. Keep the same world-size scaling.
    const scale = Clamp(coreWidth / 320, 1, 2);
    const centralRadius = Math.floor(rng.nextInt(24, 28) * scale);
    const centralOuter = rng.nextInt(40, 56) * 0.01;
    const centralX = padding + coreWidth * 0.5;
    const centralY = padding + coreHeight * 0.33;
    ApplyGeode(plan, w, h, centralX, centralY, centralRadius, centralOuter, 301);

    const smallCount = Math.max(4, Math.min(8, Math.floor(4 * scale)));
    const centralLeft = centralX - centralRadius;
    const centralRight = centralX + centralRadius;
    const centralTop = centralY - centralRadius;
    const centralBottom = centralY + centralRadius;
    let placed = 0;
    for (let attempt = 0; attempt < smallCount * 20 && placed < smallCount; attempt++) {
        const xMin = padding + 30;
        const xMax = padding + coreWidth - 30;
        const yMin = padding + 20;
        const yMax = padding + coreHeight * 0.70;
        if (xMax <= xMin || yMax <= yMin)
            break;
        const cx = xMin + rng.nextFloat() * (xMax - xMin);
        const cy = yMin + rng.nextFloat() * (yMax - yMin);
        if (cx >= centralLeft && cx <= centralRight && cy >= centralTop && cy <= centralBottom)
            continue;
        const radius = Math.max(5, Math.floor(rng.nextInt(8, 11) * scale));
        const outer = rng.nextInt(65, 81) * 0.01;
        ApplyGeode(plan, w, h, cx, cy, radius, outer, 401 + placed * 17);
        placed++;
    }

    CachedSunkenClusterCount = clusters.length;
    CachedSunkenHubCount = generated.totalHubs;
    CachedSunkenBuildMs = Date.now() - started;
    return plan;
}

function EnsureSunkenPlan(width, height) {
    Prepare();
    const w = Math.max(160, Math.floor(Number(width) || SUNKEN_TEMPLATE_WIDTH));
    const h = Math.max(120, Math.floor(Number(height) || SUNKEN_TEMPLATE_HEIGHT));
    if (CachedSunkenPlan && CachedSunkenWidth === w && CachedSunkenHeight === h && CachedSunkenSeed === SunkenSeed)
        return CachedSunkenPlan;
    CachedSunkenWidth = w;
    CachedSunkenHeight = h;
    CachedSunkenSeed = SunkenSeed;
    CachedSunkenPlan = BuildDesktopSunkenPlan(w, h);
    return CachedSunkenPlan;
}

// 0 = untouched, 1 = water/eutrophic wall, 2 = water/navystone wall,
// 3 = eutrophic solid, 4 = navystone solid, 5 = sea prism solid.
function SunkenPlanCode(localX, localY, width, height) {
    const w = Math.max(160, Math.floor(Number(width) || SUNKEN_TEMPLATE_WIDTH));
    const h = Math.max(120, Math.floor(Number(height) || SUNKEN_TEMPLATE_HEIGHT));
    const x = Math.floor(Number(localX) || 0);
    const y = Math.floor(Number(localY) || 0);
    if (x < 0 || y < 0 || x >= w || y >= h)
        return 0;
    const plan = EnsureSunkenPlan(w, h);
    return plan[y * w + x] || 0;
}

// 0 = untouched, 1 = sulphurous sand, 2 = sandstone, 3 = hardened sand, 4 = shale.
function SulphurousPlanBand(localX, localY, width, height, atLeft, surfaceLocal) {
    Prepare();
    const w = Math.max(1, Number(width) || 1);
    const h = Math.max(1, Number(height) || 1);
    const uRaw = (Number(localX) + 0.5) / w;
    const u = atLeft === true ? uRaw : 1 - uRaw; // Ocean edge to inland.
    const y = Number(localY) || 0;
    const surface = Clamp(surfaceLocal, 8, h - 8);
    if (y < surface - 10)
        return 0;
    const v = Clamp((y - surface) / Math.max(1, h - surface), 0, 1);
    const templateX = Math.min(SULPHUR_PLAN_WIDTH - 1, Math.max(0, Math.floor(u * SULPHUR_PLAN_WIDTH)));
    const templateY = Math.min(SULPHUR_PLAN_HEIGHT - 1, Math.max(0, Math.floor(v * SULPHUR_PLAN_HEIGHT)));
    return SulphurPlanTemplate[templateY * SULPHUR_PLAN_WIDTH + templateX] || 0;
}

export const OrganicBiomePlanner = Object.freeze({
    Prepare,
    ConfigureSunkenSeed,
    SunkenPlanCode,
    SulphurousPlanBand,
    GetStats() {
        return {
            prepared: Prepared,
            elapsedMs: PrepareElapsedMs,
            sunkenFieldCells: SUNKEN_TEMPLATE_WIDTH * SUNKEN_TEMPLATE_HEIGHT,
            sunkenClusterCount: CachedSunkenClusterCount,
            sunkenHubCount: CachedSunkenHubCount,
            sunkenPlanBuildMs: CachedSunkenBuildMs,
            sulphurContourSamples: SULPHUR_CONTOUR_SAMPLES,
            sulphurFieldCells: SULPHUR_FIELD_WIDTH * SULPHUR_FIELD_HEIGHT,
            sulphurPlanCells: SULPHUR_PLAN_WIDTH * SULPHUR_PLAN_HEIGHT
        };
    }
});
