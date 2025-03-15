export type GetImgContrastOptions = {
  canvasSize?: number
  colorVariation?: number
}

export function getImgContrast(
  img: HTMLImageElement,
  bgColor: string,
  options: GetImgContrastOptions = {}
) {
  const { canvasSize = 16, colorVariation = 10 } = options

  // create offscreen canvas
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d", { alpha: true })!
  canvas.width = canvasSize
  canvas.height = canvasSize

  // draw background color to canvas and get its RGB value
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, canvasSize, canvasSize)
  const bgColorData = ctx.getImageData(0, 0, 1, 1).data
  const bgColorRGB = [bgColorData[0], bgColorData[1], bgColorData[2]]

  // draw and analyze image
  ctx.drawImage(img, 0, 0, canvasSize, canvasSize)
  const imageData = ctx.getImageData(0, 0, canvasSize, canvasSize).data

  // color analysis
  const colorMap = new Map()
  let totalPixels = 0
  let transparentPixels = 0

  // color clustering statistics
  for (let i = 0; i < imageData.length; i += 4) {
    const alpha = imageData[i + 3]
    if (alpha === 0) {
      transparentPixels++
      continue
    }

    const r = imageData[i]
    const g = imageData[i + 1]
    const b = imageData[i + 2]
    totalPixels++

    // color clustering simplification
    const tr = (v: number) => Math.round(v / colorVariation) * colorVariation
    const key = `${tr(r)},${tr(g)},${tr(b)}`
    colorMap.set(key, (colorMap.get(key) || 0) + 1)
  }

  // calculate dominant color and solid rate
  let maxCount = 0
  let dominantColor: number[] = [0, 0, 0]
  colorMap.forEach((count, color) => {
    if (count > maxCount) {
      maxCount = count
      dominantColor = color.split(",").map(Number)
    }
  })

  const solidRate = totalPixels > 0 ? maxCount / totalPixels : 0

  // calculate average color (backup solution)
  let rTotal = 0,
    gTotal = 0,
    bTotal = 0
  colorMap.forEach((count, color) => {
    const [r, g, b] = color.split(",").map(Number)
    rTotal += r * count
    gTotal += g * count
    bTotal += b * count
  })
  const avgColor = [
    Math.round(rTotal / totalPixels),
    Math.round(gTotal / totalPixels),
    Math.round(bTotal / totalPixels),
  ]

  // convert color to hexadecimal
  const toHex = (color: number[]) =>
    "#" + color.map((v) => v.toString(16).padStart(2, "0")).join("")

  // calculate relative brightness
  const getLuminance = (color: number[]) => {
    const [r, g, b] = color.map((v) => {
      v /= 255
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  // calculate contrast
  const bgLuminance = getLuminance(bgColorRGB)
  const iconLuminance =
    solidRate > 0.8 ? getLuminance(dominantColor) : getLuminance(avgColor)

  const contrast =
    (Math.max(bgLuminance, iconLuminance) + 0.05) /
    (Math.min(bgLuminance, iconLuminance) + 0.05)

  return {
    contrast: Number(contrast.toFixed(2)),
    dominantColor: toHex(dominantColor),
    avgColor: toHex(avgColor),
    solidRate: Number(solidRate.toFixed(2)),
    transparency: (transparentPixels / canvasSize ** 2).toFixed(2),
  }
}
