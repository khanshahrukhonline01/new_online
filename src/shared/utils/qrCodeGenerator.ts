/**
 * Self-contained, zero-dependency QR Code generator in pure TypeScript.
 * Generates ISO/IEC 18004 compliant QR code matrices (Versions 1-4)
 * with Byte Mode and Level M error correction for athlete profile URLs.
 */

// Galois Field GF(256) tables for Reed-Solomon polynomial math
const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)

;(() => {
  let val = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = val
    GF_EXP[i + 255] = val
    GF_LOG[val] = i
    val = (val << 1) ^ (val & 0x80 ? 0x11d : 0)
  }
  GF_LOG[0] = 0
})()

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF_EXP[GF_LOG[a] + GF_LOG[b]]
}

function rsCompute(data: number[], numEc: number): number[] {
  let gen = [1]
  for (let i = 0; i < numEc; i++) {
    const nextGen = new Array(gen.length + 1).fill(0)
    for (let j = 0; j < gen.length; j++) {
      nextGen[j] ^= gfMul(gen[j], GF_EXP[i])
      nextGen[j + 1] ^= gen[j]
    }
    gen = nextGen
  }

  const remainder = new Array(numEc).fill(0)
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0]
    for (let j = 0; j < numEc - 1; j++) {
      remainder[j] = remainder[j + 1] ^ gfMul(gen[j + 1], factor)
    }
    remainder[numEc - 1] = gfMul(gen[numEc], factor)
  }
  return remainder
}

// Version capacities for Error Correction Level M
interface VersionInfo {
  version: number
  size: number
  totalCodewords: number
  dataCodewords: number
  ecCodewords: number
  alignments: number[]
}

const VERSIONS: VersionInfo[] = [
  { version: 1, size: 21, totalCodewords: 26, dataCodewords: 16, ecCodewords: 10, alignments: [] },
  { version: 2, size: 25, totalCodewords: 44, dataCodewords: 28, ecCodewords: 16, alignments: [6, 18] },
  { version: 3, size: 29, totalCodewords: 70, dataCodewords: 44, ecCodewords: 26, alignments: [6, 22] },
  { version: 4, size: 33, totalCodewords: 100, dataCodewords: 64, ecCodewords: 36, alignments: [6, 26] },
  { version: 5, size: 37, totalCodewords: 134, dataCodewords: 86, ecCodewords: 48, alignments: [6, 30] },
]

export function generateQrMatrix(text: string): boolean[][] {
  const encoder = new TextEncoder()
  const bytes = Array.from(encoder.encode(text))

  // Choose smallest version that fits data (Mode 8-bit byte: 4 bits mode + 8 bits count + bytes * 8)
  const neededBits = 4 + 8 + bytes.length * 8
  const neededBytes = Math.ceil(neededBits / 8)

  const vInfo = VERSIONS.find(v => v.dataCodewords >= neededBytes) || VERSIONS[VERSIONS.length - 1]
  const { size, dataCodewords, ecCodewords, alignments } = vInfo

  // 1. Bit Stream construction
  const bits: number[] = []
  function pushBits(val: number, length: number) {
    for (let i = length - 1; i >= 0; i--) {
      bits.push((val >> i) & 1)
    }
  }

  // Byte mode indicator: 0100
  pushBits(0b0100, 4)
  // Character count (8 bits for versions 1-9)
  pushBits(bytes.length, 8)
  // Data bytes
  for (const b of bytes) {
    pushBits(b, 8)
  }
  // Terminator up to 4 bits
  const termLength = Math.min(4, dataCodewords * 8 - bits.length)
  pushBits(0, termLength)
  // Byte alignment padding
  while (bits.length % 8 !== 0) {
    bits.push(0)
  }
  // Pad bytes (0xEC, 0x11 alternating)
  const padBytes = [0xec, 0x11]
  let padIdx = 0
  while (bits.length < dataCodewords * 8) {
    pushBits(padBytes[padIdx % 2], 8)
    padIdx++
  }

  // Convert bits to data codewords
  const data: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let byteVal = 0
    for (let j = 0; j < 8; j++) {
      byteVal = (byteVal << 1) | bits[i + j]
    }
    data.push(byteVal)
  }

  // 2. Reed-Solomon Error Correction
  const ec = rsCompute(data, ecCodewords)
  const fullCodewords = [...data, ...ec]

  // 3. Matrix grid setup
  const grid: (boolean | null)[][] = Array.from({ length: size }, () => new Array(size).fill(null))

  // Place Finder Pattern
  function placeFinder(startX: number, startY: number) {
    for (let y = -1; y <= 7; y++) {
      for (let x = -1; x <= 7; x++) {
        const r = startY + y
        const c = startX + x
        if (r >= 0 && r < size && c >= 0 && c < size) {
          if (x >= 0 && x <= 6 && y >= 0 && y <= 6) {
            grid[r][c] = x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4)
          } else {
            grid[r][c] = false // Separator
          }
        }
      }
    }
  }

  placeFinder(0, 0)
  placeFinder(size - 7, 0)
  placeFinder(0, size - 7)

  // Alignment patterns
  if (alignments.length === 2) {
    const [aX, aY] = [alignments[1], alignments[1]]
    for (let y = -2; y <= 2; y++) {
      for (let x = -2; x <= 2; x++) {
        const r = aY + y
        const c = aX + x
        if (grid[r][c] === null) {
          grid[r][c] = Math.max(Math.abs(x), Math.abs(y)) !== 1
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (grid[6][i] === null) grid[6][i] = i % 2 === 0
    if (grid[i][6] === null) grid[i][6] = i % 2 === 0
  }

  // Dark module
  grid[size - 8][8] = true

  // Format Information reserve
  for (let i = 0; i < 9; i++) {
    if (grid[8][i] === null) grid[8][i] = false
    if (grid[i][8] === null) grid[i][8] = false
  }
  for (let i = 0; i < 8; i++) {
    if (grid[8][size - 1 - i] === null) grid[8][size - 1 - i] = false
    if (grid[size - 1 - i][8] === null) grid[size - 1 - i][8] = false
  }

  // 4. Place Data Bits in 2-column zig-zag
  const allBits: number[] = []
  for (const cw of fullCodewords) {
    for (let i = 7; i >= 0; i--) {
      allBits.push((cw >> i) & 1)
    }
  }

  let bitIdx = 0
  let upward = true
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right-- // Skip vertical timing column
    const rows = upward ? Array.from({ length: size }, (_, i) => size - 1 - i) : Array.from({ length: size }, (_, i) => i)

    for (const r of rows) {
      for (const c of [right, right - 1]) {
        if (grid[r][c] === null) {
          let b = false
          if (bitIdx < allBits.length) {
            b = allBits[bitIdx] === 1
            bitIdx++
          }
          // Mask 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0
          grid[r][c] = b !== mask
        }
      }
    }
    upward = !upward
  }

  // 5. Fill Format Info (Level M + Mask 0 = 101010000010010)
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0]
  // Top-left
  const topCoords = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ]
  for (let i = 0; i < 15; i++) {
    const [r, c] = topCoords[i]
    grid[r][c] = formatBits[i] === 1
  }
  // Bottom-left / Top-right split
  for (let i = 0; i < 7; i++) {
    grid[size - 1 - i][8] = formatBits[i] === 1
  }
  for (let i = 0; i < 8; i++) {
    grid[8][size - 8 + i] = formatBits[7 + i] === 1
  }

  return grid.map(row => row.map(cell => Boolean(cell)))
}

export function generateQrSvgString(
  text: string,
  options: { size?: number; color?: string; bgColor?: string } = {},
): string {
  const { size = 160, color = '#A7F36B', bgColor = 'transparent' } = options
  const matrix = generateQrMatrix(text)
  const n = matrix.length
  const viewBoxSize = n

  let paths = ''
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        paths += `M${c},${r}h1v1h-1z `
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" shape-rendering="crispEdges">
  ${bgColor !== 'transparent' ? `<rect width="${viewBoxSize}" height="${viewBoxSize}" fill="${bgColor}" />` : ''}
  <path d="${paths.trim()}" fill="${color}" />
</svg>`
}
