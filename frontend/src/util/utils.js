export const intToColor = (c) => `#${c.toString(16).padStart(6, "0")}`;
export const intToColorWithAlpha = (c, a) =>
    `#${c.toString(16).padStart(6, "0")}${Math.round(255 * a)
        .toString(16)
        .padStart(2, "0")}`;

export const rgbaToInt = (cr, cg, cb, ca, bgColor) => {
    const bb = bgColor & 255;
    const bg = (bgColor >> 8) & 255;
    const br = (bgColor >> 16) & 255;

    const r = Math.round(cr * ca + br * (1 - ca));
    const g = Math.round(cg * ca + bg * (1 - ca));
    const b = Math.round(cb * ca + bb * (1 - ca));
    return (r << 16) + (g << 8) + b;
};

export const imgColorToInt = (c, bgColor) => {
    const cr = c & 255;
    const cg = (c >> 8) & 255;
    const cb = (c >> 16) & 255;
    const ca = ((c >> 24) & 255) / 255;
    return rgbaToInt(cr, cg, cb, ca, bgColor);
};

export const int2hsv = (cInt) => {
    cInt = intToColor(cInt).substr(1);
    const r = parseInt(cInt.substr(0, 2), 16) / 255;
    const g = parseInt(cInt.substr(2, 2), 16) / 255;
    const b = parseInt(cInt.substr(4, 2), 16) / 255;
    let v = Math.max(r, g, b),
        c = v - Math.min(r, g, b);
    let h =
        c && (v === r ? (g - b) / c : v === g ? 2 + (b - r) / c : 4 + (r - g) / c);
    return [60 * (h < 0 ? h + 6 : h), v && c / v, v];
};
export const transparentColor = (c, a) =>
    `rgba(${c >> 16}, ${(c >> 8) & 0xff}, ${c & 0xff}, ${a})`;
    export const generateGamma = (hue) => {
    const gammaColors = [];
    for (let i = 0; i < MaxNumColors; ++i) {
        gammaColors.push(`hsl(${hue}, 100%, ${(100 * i) / (MaxNumColors - 1)}%)`);
    }
    return gammaColors;
};
export const decodeLine = (line) => {
    let buf = Buffer.from(line, "base64");
    if (buf.length !== ExpectedLineLength) {
        throw new Error("Unexpected encoded line length");
    }
    let pixels = [];
    for (let i = 4; i < buf.length; i += 8) {
        let color = buf.readUInt32LE(i);
        let ownerIndex = buf.readUInt32LE(i + 4);
        pixels.push({
            color,
            ownerIndex,
        });
    }
    return pixels;
};

export const BoardHeight = 50;
export const BoardWidth = 50;
export const NumLinesPerFetch = 50;
export const ExpectedLineLength = 4 + 8 * BoardWidth;
export const CellWidth = 12;
export const CellHeight = 12;
export const MaxNumColors = 31;
export const BatchOfPixels = 100;
// 500 ms
export const BatchTimeout = 500;
export const RefreshBoardTimeout = 1000; //changed from 1000
export const MaxWorkTime = 10 * 60 * 1000;
// export const OneDayMs = 24 * 60 * 60 * 1000;