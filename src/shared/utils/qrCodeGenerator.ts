/**
 * Standards-compliant ISO/IEC 18004 QR Code matrix & SVG generator (Byte mode, ECC Level L).
 * Zero external runtime dependencies.
 */

export interface QrSvgOptions {
  size?: number
  color?: string
  bgColor?: string
  quietZone?: number
}

// Version capacities (total data codewords, EC codewords per block, block count) for ECC Level L
interface VersionSpec {
  version: number
  size: number
  totalDataCodewords: number
  ecCodewordsPerBlock: number
  blocksGroup1: [number, number] // [numBlocks, dataCodewordsPerBlock]
  blocksGroup2?: [number, number]
  alignmentCenters: number[]
}

const VERSION_SPECS: VersionSpec[] = [
  { version: 1, size: 21, totalDataCodewords: 19, ecCodewordsPerBlock: 7, blocksGroup1: [1, 19], alignmentCenters: [] },
  { version: 2, size: 25, totalDataCodewords: 34, ecCodewordsPerBlock: 10, blocksGroup1: [1, 34], alignmentCenters: [6, 18] },
  { version: 3, size: 29, totalDataCodewords: 55, ecCodewordsPerBlock: 15, blocksGroup1: [1, 55], alignmentCenters: [6, 22] },
  { version: 4, size: 33, totalDataCodewords: 80, ecCodewordsPerBlock: 20, blocksGroup1: [1, 80], alignmentCenters: [6, 26] },
  { version: 5, size: 37, totalDataCodewords: 108, ecCodewordsPerBlock: 26, blocksGroup1: [1, 108], alignmentCenters: [6, 30] },
  { version: 6, size: 41, totalDataCodewords: 136, ecCodewordsPerBlock: 18, blocksGroup1: [2, 68], alignmentCenters: [6, 34] },
  { version: 7, size: 45, totalDataCodewords: 156, ecCodewordsPerBlock: 20, blocksGroup1: [2, 78], alignmentCenters: [6, 22, 38] },
  { version: 8, size: 49, totalDataCodewords: 194, ecCodewordsPerBlock: 24, blocksGroup1: [2, 97], alignmentCenters: [6, 24, 42] },
  { version: 9, size: 53, totalDataCodewords: 232, ecCodewordsPerBlock: 30, blocksGroup1: [2, 116], alignmentCenters: [6, 26, 46] },
  { version: 10, size: 57, totalDataCodewords: 274, ecCodewordsPerBlock: 18, blocksGroup1: [2, 68], blocksGroup2: [2, 69], alignmentCenters: [6, 28, 50] },
]

// GF(256) log/exp tables with primitive polynomial 0x11d
const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)
;(function initGaloisField() {
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]
  }
})()

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF_EXP[GF_LOG[a] + GF_LOG[b]]
}

function reedSolomonGenerator(degree: number): Uint8Array {
  let poly: number[] = [1]
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(poly.length + 1).fill(0)
    const root = GF_EXP[i]
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], root)
    }
    poly = next
  }
  return Uint8Array.from(poly)
}

function reedSolomonRemainder(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = reedSolomonGenerator(ecLen)
  const res = new Uint8Array(ecLen)
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ res[0]
    for (let j = 0; j < ecLen - 1; j++) {
      res[j] = res[j + 1] ^ gfMul(gen[j + 1], factor)
    }
    res[ecLen - 1] = gfMul(gen[ecLen], factor)
  }
  return res
}

function encodeUtf8(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str)
  }
  const bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) & 0xff)
  }
  return Uint8Array.from(bytes)
}

function selectVersion(byteLen: number): VersionSpec {
  for (const spec of VERSION_SPECS) {
    const countBits = spec.version <= 9 ? 8 : 16
    const requiredBytes = Math.ceil((4 + countBits + byteLen * 8) / 8)
    if (requiredBytes <= spec.totalDataCodewords) {
      return spec
    }
  }
  return VERSION_SPECS[VERSION_SPECS.length - 1]
}

function buildDataAndEcCodewords(bytes: Uint8Array, spec: VersionSpec): Uint8Array {
  const maxPayloadBytes = spec.totalDataCodewords - (spec.version <= 9 ? 2 : 3)
  const payload = bytes.length > maxPayloadBytes ? bytes.slice(0, maxPayloadBytes) : bytes

  const bits: number[] = []
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1)
    }
  }

  // Byte mode indicator (0100)
  pushBits(0b0100, 4)
  pushBits(payload.length, spec.version <= 9 ? 8 : 16)
  for (let i = 0; i < payload.length; i++) {
    pushBits(payload[i], 8)
  }

  const totalDataBits = spec.totalDataCodewords * 8
  const terminatorLen = Math.min(4, totalDataBits - bits.length)
  for (let i = 0; i < terminatorLen; i++) bits.push(0)
  while (bits.length % 8 !== 0) bits.push(0)

  const dataCodewords = new Uint8Array(spec.totalDataCodewords)
  let cwIndex = 0
  for (let i = 0; i < bits.length && cwIndex < spec.totalDataCodewords; i += 8) {
    let byte = 0
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | (bits[i + b] ?? 0)
    }
    dataCodewords[cwIndex++] = byte
  }

  const padBytes = [0xec, 0x11]
  let padIdx = 0
  while (cwIndex < spec.totalDataCodewords) {
    dataCodewords[cwIndex++] = padBytes[padIdx++ % 2]
  }

  // Split into blocks and compute Reed-Solomon EC codewords
  const dataBlocks: Uint8Array[] = []
  const ecBlocks: Uint8Array[] = []
  let offset = 0

  const groups: Array<[number, number]> = [spec.blocksGroup1]
  if (spec.blocksGroup2) groups.push(spec.blocksGroup2)

  for (const [count, size] of groups) {
    for (let b = 0; b < count; b++) {
      const block = dataCodewords.slice(offset, offset + size)
      offset += size
      dataBlocks.push(block)
      ecBlocks.push(reedSolomonRemainder(block, spec.ecCodewordsPerBlock))
    }
  }

  const out: number[] = []
  const maxDataBlockLen = Math.max(...dataBlocks.map(b => b.length))
  for (let i = 0; i < maxDataBlockLen; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) out.push(block[i])
    }
  }
  for (let i = 0; i < spec.ecCodewordsPerBlock; i++) {
    for (const block of ecBlocks) {
      if (i < block.length) out.push(block[i])
    }
  }

  return Uint8Array.from(out)
}

// Precomputed 15-bit format strings for ECC Level L (01) and mask 0..7
const FORMAT_BITS_L = [
  0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976,
]

// Precomputed 18-bit version info for versions 7..10
const VERSION_BITS: Record<number, number> = {
  7: 0x07c94,
  8: 0x085bc,
  9: 0x09a99,
  10: 0x0a4d3,
}

export function generateQrMatrix(text: string): boolean[][] {
  const input = text || 'https://khelgrid.com'
  const bytes = encodeUtf8(input)
  const spec = selectVersion(bytes.length)
  const n = spec.size
  const codewords = buildDataAndEcCodewords(bytes, spec)

  const modules: boolean[][] = Array.from({ length: n }, () => Array<boolean>(n).fill(false))
  const isFunction: boolean[][] = Array.from({ length: n }, () => Array<boolean>(n).fill(false))

  const setFunctionModule = (r: number, c: number, dark: boolean) => {
    if (r < 0 || r >= n || c < 0 || c >= n) return
    modules[r][c] = dark
    isFunction[r][c] = true
  }

  // Finder patterns + separators
  const drawFinder = (top: number, left: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = top + r
        const cc = left + c
        if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue
        const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4
        setFunctionModule(rr, cc, inOuter && (isBorder || isCenter))
      }
    }
  }
  drawFinder(0, 0)
  drawFinder(0, n - 7)
  drawFinder(n - 7, 0)

  // Timing patterns
  for (let i = 8; i < n - 8; i++) {
    setFunctionModule(6, i, i % 2 === 0)
    setFunctionModule(i, 6, i % 2 === 0)
  }

  // Alignment patterns
  const centers = spec.alignmentCenters
  for (let i = 0; i < centers.length; i++) {
    for (let j = 0; j < centers.length; j++) {
      const cr = centers[i]
      const cc = centers[j]
      if ((i === 0 && j === 0) || (i === 0 && j === centers.length - 1) || (i === centers.length - 1 && j === 0)) {
        continue
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc))
          setFunctionModule(cr + dr, cc + dc, dist !== 1)
        }
      }
    }
  }

  // Reserve format info areas and dark module
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      setFunctionModule(8, i, false)
      setFunctionModule(i, 8, false)
    }
  }
  for (let i = n - 8; i < n; i++) {
    setFunctionModule(8, i, false)
    setFunctionModule(i, 8, false)
  }
  setFunctionModule(n - 8, 8, true)

  // Version information for version >= 7
  const verBits = VERSION_BITS[spec.version]
  if (verBits !== undefined) {
    for (let i = 0; i < 18; i++) {
      const bit = ((verBits >>> i) & 1) === 1
      const a = Math.floor(i / 3)
      const b = n - 11 + (i % 3)
      setFunctionModule(a, b, bit)
      setFunctionModule(b, a, bit)
    }
  }

  // Place data bits in upward/downward zig-zag columns
  let bitIdx = 0
  const totalBits = codewords.length * 8
  let upward = true
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < n; vert++) {
      const r = upward ? n - 1 - vert : vert
      for (let j = 0; j < 2; j++) {
        const c = right - j
        if (isFunction[r][c]) continue
        let dark = false
        if (bitIdx < totalBits) {
          const cw = codewords[bitIdx >>> 3]
          dark = ((cw >>> (7 - (bitIdx & 7))) & 1) === 1
          bitIdx++
        }
        // Apply mask pattern 0: (r + c) % 2 === 0
        modules[r][c] = (r + c) % 2 === 0 ? !dark : dark
      }
    }
    upward = !upward
  }

  // Write format bits for ECC L, mask 0
  const fmt = FORMAT_BITS_L[0]
  for (let i = 0; i <= 5; i++) setFunctionModule(8, i, ((fmt >>> i) & 1) === 1)
  setFunctionModule(8, 7, ((fmt >>> 6) & 1) === 1)
  setFunctionModule(8, 8, ((fmt >>> 7) & 1) === 1)
  setFunctionModule(7, 8, ((fmt >>> 8) & 1) === 1)
  for (let i = 9; i < 15; i++) setFunctionModule(14 - i, 8, ((fmt >>> i) & 1) === 1)

  for (let i = 0; i < 8; i++) setFunctionModule(n - 1 - i, 8, ((fmt >>> i) & 1) === 1)
  for (let i = 8; i < 15; i++) setFunctionModule(8, n - 15 + i, ((fmt >>> i) & 1) === 1)

  return modules
}

export function generateQrSvgString(text: string, options: QrSvgOptions = {}): string {
  const size = options.size ?? 160
  const color = options.color ?? '#0B1C2D'
  const bgColor = options.bgColor ?? '#FFFFFF'
  const quietZone = options.quietZone ?? 2

  const matrix = generateQrMatrix(text)
  const n = matrix.length
  const total = n + quietZone * 2

  let pathData = ''
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        pathData += `M${c + quietZone},${r + quietZone}h1v1h-1z`
      }
    }
  }

  const bgRect =
    bgColor && bgColor !== 'transparent'
      ? `<rect width="${total}" height="${total}" fill="${bgColor}"/>`
      : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="QR Code">${bgRect}<path d="${pathData}" fill="${color}"/></svg>`
}
