import { encode } from 'uqr'

/** Brand purple on white: dark enough to scan, the light-mode accent colour. */
const INK = '#6b3fa0'
const PAPER = '#ffffff'
const QUIET = 4
const CAPTION_HEIGHT = 3

export interface QrImage {
    svg: string
    /** Size in SVG units: modules plus quiet zone, plus the caption. */
    width: number
    height: number
}

/**
 * Branded QR code for a link as a standalone SVG: purple modules on white, a
 * 4-module quiet zone, and the site name underneath so a printed badge says
 * where it goes. Printing at 3cm or more scans reliably.
 */
export function qrImage(url: string, caption: string): QrImage {
    const grid = encode(url, { ecc: 'M', border: 0 }).data
    const size = grid.length
    const width = size + QUIET * 2
    const height = width + CAPTION_HEIGHT
    let path = ''
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (grid[y][x]) path += `M${x + QUIET} ${y + QUIET}h1v1h-1z`
        }
    }
    const label = caption
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width * 10}" height="${height * 10}">` +
        `<rect width="${width}" height="${height}" fill="${PAPER}"/>` +
        `<path d="${path}" fill="${INK}" shape-rendering="crispEdges"/>` +
        `<text x="${width / 2}" y="${width - 0.5}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="2" font-weight="700" fill="${INK}">${label}</text>` +
        `</svg>`
    return { svg, width, height }
}
