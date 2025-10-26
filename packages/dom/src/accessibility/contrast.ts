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
  const ctx = canvas.getContext("2d", {
    alpha: true,
    willReadFrequently: true,
  })!
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


interface ImageMetrics {
  colorPurity: number;     // 0-1, how close the image is to a single color
  dominantColor: string;   // HEX color of the dominant color
  brightness: number;      // 0-255, average brightness of visible pixels
  transparency: number;    // 0-1, overall transparency ratio
  visiblePixelCount: number;
}

/**
 * Calculate image color purity and other metrics with maximum performance
 */
export function calculateImageMetrics(image: HTMLImageElement, maxDimension: number = 60): ImageMetrics {
  if (!image.complete) {
    throw new Error('Image not loaded');
  }

  // Create canvas and context
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas context not available');

  // Calculate optimized dimensions
  const { width, height } = calculateDownsampledDimensions(
    image.naturalWidth, 
    image.naturalHeight, 
    maxDimension
  );

  canvas.width = width;
  canvas.height = height;

  // Draw image to canvas
  ctx.drawImage(image, 0, 0, width, height);

  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const pixelCount = width * height;

  // Use Map for color frequency counting (faster than object for this use case)
  const colorFrequency = new Map<string, number>();
  let totalBrightness = 0;
  let visiblePixelCount = 0;
  let transparentPixelCount = 0;

  // Pre-allocate variables to avoid recreation in loop
  let r: number, g: number, b: number, a: number;
  let colorKey: string;
  let brightness: number;

  for (let i = 0; i < data.length; i += 4) {
    r = data[i];
    g = data[i + 1];
    b = data[i + 2];
    a = data[i + 3];

    if (a === 0) {
      transparentPixelCount++;
      continue;
    }

    // Count color frequency
    colorKey = `${r},${g},${b}`;
    colorFrequency.set(colorKey, (colorFrequency.get(colorKey) || 0) + 1);

    // Calculate brightness
    brightness = (r + g + b) / 3;
    totalBrightness += brightness;
    visiblePixelCount++;
  }

  // Find dominant color and calculate color purity
  let maxFrequency = 0;
  let dominantColor = '';
  let dominantR = 0, dominantG = 0, dominantB = 0;

  colorFrequency.forEach((frequency, color) => {
    if (frequency > maxFrequency) {
      maxFrequency = frequency;
      dominantColor = color;
      [dominantR, dominantG, dominantB] = color.split(',').map(Number);
    }
  });

  // Calculate color purity (ratio of most frequent color to all visible pixels)
  const colorPurity = visiblePixelCount > 0 ? maxFrequency / visiblePixelCount : 0;

  // Convert dominant color to HEX
  const dominantColorHex = rgbToHex(dominantR, dominantG, dominantB);

  return {
    colorPurity: Math.round(colorPurity * 1000) / 1000, // 3 decimal places
    dominantColor: dominantColorHex,
    brightness: visiblePixelCount > 0 ? Math.round(totalBrightness / visiblePixelCount) : 0,
    transparency: transparentPixelCount / pixelCount,
    visiblePixelCount
  };
}

/**
 * Calculate optimized dimensions for processing
 */
function calculateDownsampledDimensions(
  originalWidth: number, 
  originalHeight: number, 
  maxDimension: number
): { width: number; height: number } {
  const ratio = Math.min(maxDimension / originalWidth, maxDimension / originalHeight);
  
  return {
    width: Math.max(1, Math.round(originalWidth * ratio)),
    height: Math.max(1, Math.round(originalHeight * ratio))
  };
}

/**
 * Convert RGB values to HEX color string
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + 
    ((1 << 24) + (r << 16) + (g << 8) + b)
      .toString(16)
      .slice(1)
      .toUpperCase();
}

/**
 * Alternative color purity calculation using color distance
 * This version considers how close all colors are to the dominant color
 */
export function calculateImageMetricsWithDistance(image: HTMLImageElement, maxDimension: number = 60): ImageMetrics {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas context not available');

  const { width, height } = calculateDownsampledDimensions(
    image.naturalWidth, 
    image.naturalHeight, 
    maxDimension
  );

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const pixelCount = width * height;

  const colorFrequency = new Map<string, number>();
  let totalBrightness = 0;
  let visiblePixelCount = 0;
  let transparentPixelCount = 0;

  // First pass: find dominant color
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) {
      transparentPixelCount++;
      continue;
    }

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const colorKey = `${r},${g},${b}`;
    
    colorFrequency.set(colorKey, (colorFrequency.get(colorKey) || 0) + 1);
    visiblePixelCount++;
  }

  // Find dominant color
  let maxFrequency = 0;
  let dominantR = 0, dominantG = 0, dominantB = 0;
  
  colorFrequency.forEach((frequency, color) => {
    if (frequency > maxFrequency) {
      maxFrequency = frequency;
      [dominantR, dominantG, dominantB] = color.split(',').map(Number);
    }
  });

  // Second pass: calculate color purity based on distance to dominant color
  let totalColorDistance = 0;
  visiblePixelCount = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Calculate color distance (Euclidean distance in RGB space)
    const distance = Math.sqrt(
      Math.pow(r - dominantR, 2) + 
      Math.pow(g - dominantG, 2) + 
      Math.pow(b - dominantB, 2)
    );
    
    totalColorDistance += distance;
    totalBrightness += (r + g + b) / 3;
    visiblePixelCount++;
  }

  // Normalize color distance to 0-1 purity (0 = completely different, 1 = identical)
  const maxPossibleDistance = Math.sqrt(3 * Math.pow(255, 2)); // Max RGB distance
  const avgDistance = visiblePixelCount > 0 ? totalColorDistance / visiblePixelCount : 0;
  const colorPurity = 1 - (avgDistance / maxPossibleDistance);

  return {
    colorPurity: Math.max(0, Math.round(colorPurity * 1000) / 1000),
    dominantColor: rgbToHex(dominantR, dominantG, dominantB),
    brightness: visiblePixelCount > 0 ? Math.round(totalBrightness / visiblePixelCount) : 0,
    transparency: transparentPixelCount / pixelCount,
    visiblePixelCount
  };
}
