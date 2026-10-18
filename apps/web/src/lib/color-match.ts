// FrameDock: "调色对齐" — pulls an image's overall brightness, colour temperature and contrast towards a master
// image (Reinhard et al., "Color Transfer between Images", 2001): convert to CIE Lab, then shift and scale each
// channel so its mean and spread match the master's. It evens out the grade of a set of shots; it does not move
// light sources or shadows. Pure functions on ImageData-like pixels, no DOM.

export type Pixels = { data: Uint8ClampedArray; width: number; height: number };
export type LabStats = { mean: [number, number, number]; std: [number, number, number]; samples: number };
export type ColorMatchOptions = {
    /** 0–1: how far to move towards the master. */
    strength: number;
    /** "all": brightness and colour; "tone": colour only, keep each pixel's lightness. */
    scope: "all" | "tone";
};

// Pixels this dark or bright carry no usable colour and would drag the averages (blown highlights, crushed blacks).
const MIN_L = 3;
const MAX_L = 97;
// About 512 × 512 samples is plenty for stable statistics, whatever the image size.
const STAT_SAMPLES = 512 * 512;

const SRGB_TO_LINEAR = Float64Array.from({ length: 256 }, (_, v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

function linearToSrgb(c: number) {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255);
}

// D65 white point.
const XN = 0.95047;
const YN = 1;
const ZN = 1.08883;
const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
const fInverse = (t: number) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
    const lr = SRGB_TO_LINEAR[r]!;
    const lg = SRGB_TO_LINEAR[g]!;
    const lb = SRGB_TO_LINEAR[b]!;
    const x = (0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb) / XN;
    const y = (0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb) / YN;
    const z = (0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb) / ZN;
    const fx = f(x);
    const fy = f(y);
    const fz = f(z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function labToRgb(l: number, a: number, bb: number): [number, number, number] {
    const fy = (l + 16) / 116;
    const fx = fy + a / 500;
    const fz = fy - bb / 200;
    const x = fInverse(fx) * XN;
    const y = fInverse(fy) * YN;
    const z = fInverse(fz) * ZN;
    const lr = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
    const lg = -0.969266 * x + 1.8760108 * y + 0.041556 * z;
    const lb = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
    return [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)];
}

/** Mean and standard deviation per Lab channel, over a sample of the visible, non-extreme pixels. */
export function labStats(pixels: Pixels): LabStats {
    const { data, width, height } = pixels;
    const step = Math.max(1, Math.floor(Math.sqrt((width * height) / STAT_SAMPLES)));
    const sum = [0, 0, 0];
    const squares = [0, 0, 0];
    let samples = 0;
    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const i = (y * width + x) * 4;
            if (data[i + 3]! < 16) continue;
            const lab = rgbToLab(data[i]!, data[i + 1]!, data[i + 2]!);
            if (lab[0] < MIN_L || lab[0] > MAX_L) continue;
            for (let c = 0; c < 3; c++) {
                sum[c]! += lab[c]!;
                squares[c]! += lab[c]! ** 2;
            }
            samples++;
        }
    }
    if (!samples) return { mean: [50, 0, 0], std: [1, 1, 1], samples: 0 };
    const mean = sum.map((value) => value / samples) as LabStats["mean"];
    const std = squares.map((value, c) => Math.sqrt(Math.max(0, value / samples - mean[c]! ** 2))) as LabStats["std"];
    return { mean, std, samples };
}

/** A new image whose Lab statistics are moved towards the master's by `strength`. Alpha is kept as is. */
export function matchColors(target: Pixels, master: LabStats, options: ColorMatchOptions): Pixels {
    const strength = Math.min(1, Math.max(0, options.strength));
    const out = new Uint8ClampedArray(target.data);
    const source = labStats(target);
    // Nothing reliable to match against (blank, transparent or all-extreme image): leave it untouched.
    if (!strength || !source.samples || !master.samples) return { data: out, width: target.width, height: target.height };
    const channels = options.scope === "tone" ? [1, 2] : [0, 1, 2];
    // A flat channel (std ≈ 0) cannot be rescaled meaningfully; only shift it.
    const scale = [0, 1, 2].map((c) => (source.std[c]! > 0.5 ? master.std[c]! / source.std[c]! : 1));
    for (let i = 0; i < out.length; i += 4) {
        const lab = rgbToLab(out[i]!, out[i + 1]!, out[i + 2]!);
        for (const c of channels) {
            const matched = (lab[c]! - source.mean[c]!) * scale[c]! + master.mean[c]!;
            lab[c] = lab[c]! + strength * (matched - lab[c]!);
        }
        const [r, g, b] = labToRgb(Math.min(100, Math.max(0, lab[0])), lab[1], lab[2]);
        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
    }
    return { data: out, width: target.width, height: target.height };
}
