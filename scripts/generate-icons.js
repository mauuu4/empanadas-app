// Script to generate PNG icons from SVG for PWA
// Uses built-in Node.js modules only
const fs = require('fs')
const { execSync } = require('child_process')
const path = require('path')

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512]
const iconsDir = path.join(__dirname, '..', 'public', 'icons')

// Create a simple HTML file that renders SVGs to canvas and downloads PNGs
// Since we don't have canvas in Node, let's create minimal placeholder PNGs
// using a pure-JS PNG encoder

function createPNG(width, height, r, g, b) {
  // Create a minimal valid PNG with a solid color
  // PNG format: signature + IHDR + IDAT + IEND

  function crc32(data) {
    let crc = 0xffffffff
    const table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      }
      table[n] = c
    }
    for (let i = 0; i < data.length; i++) {
      crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
    }
    return (crc ^ 0xffffffff) >>> 0
  }

  function adler32(data) {
    let a = 1,
      b = 0
    for (let i = 0; i < data.length; i++) {
      a = (a + data[i]) % 65521
      b = (b + a) % 65521
    }
    return ((b << 16) | a) >>> 0
  }

  function writeUint32BE(val) {
    return Buffer.from([
      (val >>> 24) & 0xff,
      (val >>> 16) & 0xff,
      (val >>> 8) & 0xff,
      val & 0xff,
    ])
  }

  function makeChunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii')
    const len = writeUint32BE(data.length)
    const combined = Buffer.concat([typeBytes, data])
    const crc = writeUint32BE(crc32(combined))
    return Buffer.concat([len, combined, crc])
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR: width, height, bit depth (8), color type (2=RGB), compression, filter, interlace
  const ihdrData = Buffer.concat([
    writeUint32BE(width),
    writeUint32BE(height),
    Buffer.from([8, 2, 0, 0, 0]),
  ])
  const ihdr = makeChunk('IHDR', ihdrData)

  // Create raw pixel data (filter byte 0 + RGB for each row)
  const rawRows = []
  // Simple design: orange circle on orange background with lighter center
  const cx = width / 2
  const cy = height / 2
  const outerR = width / 2
  const innerR = width * 0.35

  for (let y = 0; y < height; y++) {
    const row = [0] // filter byte: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > outerR) {
        // Transparent-ish (white for PNG without alpha)
        // Actually let's make the whole thing the orange circle
        row.push(249, 115, 22) // orange-500
      } else if (dist < innerR) {
        // Inner area - lighter (empanada color)
        const factor = dist / innerR
        // Blend from cream to orange
        const cr = Math.round(254 + (249 - 254) * factor)
        const cg = Math.round(243 + (115 - 243) * factor)
        const cb = Math.round(199 + (22 - 199) * factor)
        row.push(cr, cg, cb)
      } else {
        // Orange area
        row.push(249, 115, 22) // orange-500
      }
    }
    rawRows.push(Buffer.from(row))
  }

  const rawData = Buffer.concat(rawRows)

  // Deflate compress (use zlib)
  const zlib = require('zlib')
  const compressed = zlib.deflateSync(rawData)

  const idat = makeChunk('IDAT', compressed)

  // IEND
  const iend = makeChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdr, idat, iend])
}

// Generate icons
for (const size of sizes) {
  const png = createPNG(size, size, 249, 115, 22)
  const filePath = path.join(iconsDir, `icon-${size}x${size}.png`)
  fs.writeFileSync(filePath, png)
  console.log(`Created ${filePath}`)
}

console.log('Done! All icons generated.')
