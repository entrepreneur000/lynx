let faceLandmarker = null
let currentImageUrl = null
let cameraStream = null
let initReady = false
const isAnalyzing = false
const usingTensorFlow = false

document.addEventListener("DOMContentLoaded", () => {
  initDarkMode()
  initMobileMenu()
  initPageTransitions()

  if (document.getElementById("file-input")) {
    initAnalyzePage()
    loadMediaPipeModelInBackground()
  }

  if (document.getElementById("contact-form")) {
    initContactForm()
  }

  document.body.classList.add("fade-enter")
})

function initDarkMode() {
  const themeToggle = document.getElementById("theme-toggle")
  const themeToggleMobile = document.getElementById("theme-toggle-mobile")
  const themeIconLight = document.getElementById("theme-icon-light")
  const themeIconDark = document.getElementById("theme-icon-dark")
  const themeIconMobile = document.getElementById("theme-icon-mobile")
  const themeTextMobile = document.getElementById("theme-text-mobile")

  // Check for saved theme preference or default to light mode
  const currentTheme = localStorage.getItem("theme") || "light"
  if (currentTheme === "dark") {
    document.body.classList.add("dark-mode")
    if (themeIconLight) themeIconLight.classList.add("hidden")
    if (themeIconDark) themeIconDark.classList.remove("hidden")
    if (themeTextMobile) themeTextMobile.textContent = "Light Mode"
  }

  // Toggle theme function
  function toggleTheme() {
    document.body.classList.toggle("dark-mode")
    const isDark = document.body.classList.contains("dark-mode")

    // Update icons
    if (themeIconLight && themeIconDark) {
      themeIconLight.classList.toggle("hidden")
      themeIconDark.classList.toggle("hidden")
    }

    // Update mobile text
    if (themeTextMobile) {
      themeTextMobile.textContent = isDark ? "Light Mode" : "Dark Mode"
    }

    // Update mobile icon
    if (themeIconMobile) {
      if (isDark) {
        themeIconMobile.innerHTML =
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>'
      } else {
        themeIconMobile.innerHTML =
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>'
      }
    }

    // Save preference
    localStorage.setItem("theme", isDark ? "dark" : "light")
  }

  // Add event listeners
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme)
  }
  if (themeToggleMobile) {
    themeToggleMobile.addEventListener("click", toggleTheme)
  }
}

function initMobileMenu() {
  const menuBtn = document.getElementById("mobile-menu-btn")
  const mobileMenu = document.getElementById("mobile-menu")

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", () => {
      mobileMenu.classList.toggle("hidden")
    })
  }
}

function initPageTransitions() {
  const progressBar = document.getElementById("top-progress")

  document
    .querySelectorAll(
      'a[href^="index.html"], a[href^="analyze.html"], a[href^="privacy.html"], a[href^="contact.html"]',
    )
    .forEach((link) => {
      link.addEventListener("click", (e) => {
        const href = link.getAttribute("href")
        if (href && !href.startsWith("#")) {
          progressBar.style.width = "70%"
          progressBar.classList.add("active")
        }
      })
    })
}

async function initAnalyzePage() {
  const fileInput = document.getElementById("file-input")
  const uploadBtn = document.getElementById("upload-btn")
  const analyzeBtn = document.getElementById("analyze-btn")
  const resetBtn = document.getElementById("reset-btn")
  const previewSection = document.getElementById("preview-section")
  const previewImage = document.getElementById("preview-image")
  const loadingState = document.getElementById("loading-state")
  const errorMessage = document.getElementById("error-message")

  const dropZone = document.getElementById("drop-zone")

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault()
    dropZone.classList.add("border-cyan-500", "bg-gray-50")
  })

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("border-cyan-500", "bg-gray-50")
  })

  dropZone.addEventListener("drop", async (e) => {
    e.preventDefault()
    dropZone.classList.remove("border-cyan-500", "bg-gray-50")

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      await loadImageFromFile(file)
    }
  })

  uploadBtn.addEventListener("click", () => fileInput.click())

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0]
    if (file) {
      await loadImageFromFile(file)
    }
  })

  const urlBtn = document.getElementById("url-btn")
  const urlInput = document.getElementById("url-input")

  urlBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim()
    if (!url) return

    errorMessage.classList.add("hidden")
    loadingState.classList.remove("hidden")

    try {
      const response = await fetch(url)
      const blob = await response.blob()
      await loadImageFromFile(blob)
      loadingState.classList.add("hidden")
    } catch (error) {
      loadingState.classList.add("hidden")
      showError("Failed to load image from URL. Please check the URL and try again.")
    }
  })

  const cameraBtn = document.getElementById("camera-btn")
  const cameraModal = document.getElementById("camera-modal")
  const cameraVideo = document.getElementById("camera-video")
  const cameraCanvas = document.getElementById("camera-canvas")
  const captureBtn = document.getElementById("capture-btn")
  const cancelCamera = document.getElementById("cancel-camera")
  const closeCamera = document.getElementById("close-camera")

  cameraBtn.addEventListener("click", async () => {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      cameraVideo.srcObject = cameraStream
      cameraModal.classList.remove("hidden")
    } catch (error) {
      showError("Failed to access camera. Please ensure camera permissions are granted.")
    }
  })

  captureBtn.addEventListener("click", () => {
    cameraCanvas.width = cameraVideo.videoWidth
    cameraCanvas.height = cameraVideo.videoHeight
    const ctx = cameraCanvas.getContext("2d")
    ctx.drawImage(cameraVideo, 0, 0)

    cameraCanvas.toBlob(
      async (blob) => {
        await loadImageFromFile(blob)
        stopCamera()
        cameraModal.classList.add("hidden")
      },
      "image/jpeg",
      0.95,
    )
  })

  cancelCamera.addEventListener("click", () => {
    stopCamera()
    cameraModal.classList.add("hidden")
  })

  closeCamera.addEventListener("click", () => {
    stopCamera()
    cameraModal.classList.add("hidden")
  })

  analyzeBtn.addEventListener("click", async () => {
    if (!previewImage.src) return
    await performAnalysis()
  })

  resetBtn.addEventListener("click", () => {
    if (currentImageUrl) {
      URL.revokeObjectURL(currentImageUrl)
      currentImageUrl = null
    }

    fileInput.value = ""
    urlInput.value = ""
    previewImage.src = ""
    previewSection.classList.add("hidden")
    document.getElementById("metrics-section").classList.add("hidden")
    errorMessage.classList.add("hidden")

    const canvas = document.getElementById("overlay-canvas")
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  })
}

async function loadImageFromFile(file) {
  const errorMessage = document.getElementById("error-message")
  const previewSection = document.getElementById("preview-section")
  const previewImage = document.getElementById("preview-image")

  errorMessage.classList.add("hidden")

  const strippedImage = await stripExif(file)

  const resizedImage = await resizeImage(strippedImage, 1024)

  if (currentImageUrl) {
    URL.revokeObjectURL(currentImageUrl)
  }
  currentImageUrl = URL.createObjectURL(resizedImage)

  previewImage.src = currentImageUrl
  previewImage.onload = () => {
    const canvas = document.getElementById("overlay-canvas")
    canvas.width = previewImage.naturalWidth
    canvas.height = previewImage.naturalHeight
    canvas.style.width = previewImage.clientWidth + "px"
    canvas.style.height = previewImage.clientHeight + "px"

    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    performAnalysis()
  }

  previewSection.classList.remove("hidden")
  document.getElementById("metrics-section").classList.add("hidden")
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop())
    cameraStream = null
  }
}

async function resizeImage(file, maxSize) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize
            width = maxSize
          } else {
            width = (width / height) * maxSize
            height = maxSize
          }
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], file.name || "image.jpg", { type: file.type || "image/jpeg" }))
          },
          file.type || "image/jpeg",
          0.92,
        )
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function checkImageBrightness(img) {
  const canvas = document.createElement("canvas")
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext("2d")
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  let sum = 0

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    sum += (r + g + b) / 3
  }

  return sum / (data.length / 4)
}

async function loadMediaPipeModelInBackground() {
  try {
    console.log("[v0] Loading MediaPipe model in background...")

    // Wait for MediaPipe library to load
    let attempts = 0
    while ((!window.FaceLandmarker || !window.FilesetResolver) && attempts < 100) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      attempts++
    }

    const FaceLandmarker = window.FaceLandmarker
    const FilesetResolver = window.FilesetResolver

    if (!FaceLandmarker || !FilesetResolver) {
      console.error("[v0] MediaPipe library not loaded")
      return
    }

    const wasmPath = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    const modelPath =
      "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

    const filesetResolver = await FilesetResolver.forVisionTasks(wasmPath)

    try {
      faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: modelPath,
          delegate: "GPU",
        },
        numFaces: 1,
        runningMode: "IMAGE",
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
      console.log("[v0] MediaPipe model loaded successfully with GPU")
    } catch (gpuError) {
      console.log("[v0] GPU failed, trying CPU:", gpuError)
      faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: modelPath,
          delegate: "CPU",
        },
        numFaces: 1,
        runningMode: "IMAGE",
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
      console.log("[v0] MediaPipe model loaded successfully with CPU")
    }

    initReady = true
    const analyzeBtn = document.getElementById("analyze-btn")
    if (analyzeBtn) analyzeBtn.disabled = false
  } catch (error) {
    console.error("[v0] Failed to load MediaPipe model:", error)
    // Model will be null, analysis will show error message when attempted
  }
}

function drawEnhancedLandmarks(landmarks) {
  const canvas = document.getElementById("overlay-canvas")
  const ctx = canvas.getContext("2d")
  const img = document.getElementById("preview-image")

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw all landmark points
  ctx.fillStyle = "rgba(0, 255, 0, 0.6)"
  landmarks.forEach((point) => {
    ctx.beginPath()
    ctx.arc(point.x * canvas.width, point.y * canvas.height, 2, 0, 2 * Math.PI)
    ctx.fill()
  })

  // Draw professional measurement lines
  ctx.strokeStyle = "rgba(0, 200, 255, 0.8)"
  ctx.lineWidth = 2

  // Vertical symmetry line
  ctx.beginPath()
  ctx.moveTo(canvas.width / 2, 0)
  ctx.lineTo(canvas.width / 2, canvas.height)
  ctx.stroke()

  // Horizontal facial thirds
  const foreheadTop = landmarks[10]
  const eyebrowLine = landmarks[8]
  const noseTip = landmarks[2]
  const chinBottom = landmarks[152]

  ctx.strokeStyle = "rgba(255, 200, 0, 0.7)"
  ctx.setLineDash([5, 5])

  // Upper third line
  ctx.beginPath()
  ctx.moveTo(0, eyebrowLine.y * canvas.height)
  ctx.lineTo(canvas.width, eyebrowLine.y * canvas.height)
  ctx.stroke()

  // Middle third line
  ctx.beginPath()
  ctx.moveTo(0, noseTip.y * canvas.height)
  ctx.lineTo(canvas.width, noseTip.y * canvas.height)
  ctx.stroke()

  ctx.setLineDash([])

  // Eye-to-eye distance
  const leftPupil = landmarks[468]
  const rightPupil = landmarks[473]
  ctx.strokeStyle = "rgba(255, 100, 100, 0.8)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(leftPupil.x * canvas.width, leftPupil.y * canvas.height)
  ctx.lineTo(rightPupil.x * canvas.width, rightPupil.y * canvas.height)
  ctx.stroke()

  // Nose width
  const leftNostril = landmarks[98]
  const rightNostril = landmarks[327]
  ctx.strokeStyle = "rgba(100, 255, 100, 0.8)"
  ctx.beginPath()
  ctx.moveTo(leftNostril.x * canvas.width, leftNostril.y * canvas.height)
  ctx.lineTo(rightNostril.x * canvas.width, rightNostril.y * canvas.height)
  ctx.stroke()

  // Mouth width
  const leftMouth = landmarks[61]
  const rightMouth = landmarks[291]
  ctx.strokeStyle = "rgba(255, 150, 255, 0.8)"
  ctx.beginPath()
  ctx.moveTo(leftMouth.x * canvas.width, leftMouth.y * canvas.height)
  ctx.lineTo(rightMouth.x * canvas.width, rightMouth.y * canvas.height)
  ctx.stroke()
}

function distance(p1, p2, width, height) {
  const dx = (p1.x - p2.x) * width
  const dy = (p1.y - p2.y) * height
  return Math.sqrt(dx * dx + dy * dy)
}

function calculateMetrics(landmarks, width, height, gender) {
  const leftPupil = landmarks[468]
  const rightPupil = landmarks[473]

  const ipd = distance(leftPupil, rightPupil, width, height)

  const leftInnerCanthus = landmarks[133]
  const rightInnerCanthus = landmarks[362]
  const icd = distance(leftInnerCanthus, rightInnerCanthus, width, height)
  const icdRatio = icd / ipd

  const leftCheek = landmarks[234]
  const rightCheek = landmarks[454]
  const faceWidth = distance(leftCheek, rightCheek, width, height)
  const faceWidthRatio = faceWidth / ipd

  const chinBottom = landmarks[152]
  const foreheadTop = landmarks[10]
  const faceHeight = distance(foreheadTop, chinBottom, width, height)
  const faceHeightRatio = faceHeight / ipd

  let symmetryScore = 0
  const leftPoints = [33, 133, 234, 61, 291]
  const rightPoints = [263, 362, 454, 291, 61]
  for (let i = 0; i < leftPoints.length; i++) {
    const leftDist = Math.abs(landmarks[leftPoints[i]].x - 0.5)
    const rightDist = Math.abs(landmarks[rightPoints[i]].x - 0.5)
    symmetryScore += Math.abs(leftDist - rightDist)
  }
  symmetryScore = (symmetryScore / leftPoints.length) * 100

  const leftOuterCanthus = landmarks[33]
  const rightOuterCanthus = landmarks[263]
  const leftTilt =
    Math.atan2((leftOuterCanthus.y - leftInnerCanthus.y) * height, (leftOuterCanthus.x - leftInnerCanthus.x) * width) *
    (180 / Math.PI)
  const rightTilt =
    Math.atan2(
      (rightInnerCanthus.y - rightOuterCanthus.y) * height,
      (rightInnerCanthus.x - rightOuterCanthus.x) * width,
    ) *
    (180 / Math.PI)
  const canthalTilt = (leftTilt + rightTilt) / 2

  const leftBrow = landmarks[70]
  const leftEye = landmarks[159]
  const browEyeDist = distance(leftBrow, leftEye, width, height) / ipd

  const leftNostril = landmarks[98]
  const rightNostril = landmarks[327]
  const nasalWidth = distance(leftNostril, rightNostril, width, height) / ipd

  const naseTip = landmarks[1]
  const naseBridge = landmarks[6]
  const nasalLength = distance(naseTip, naseBridge, width, height) / ipd

  const leftMouth = landmarks[61]
  const rightMouth = landmarks[291]
  const mouthWidth = distance(leftMouth, rightMouth, width, height) / ipd

  const upperLip = landmarks[13]
  const lowerLip = landmarks[14]
  const upperLipThickness = Math.abs(upperLip.y - landmarks[0].y) * height
  const lowerLipThickness = Math.abs(lowerLip.y - landmarks[17].y) * height
  const lipRatio = upperLipThickness / (lowerLipThickness || 1)

  const bizygomatic = distance(leftCheek, rightCheek, width, height)
  const leftJaw = landmarks[172]
  const rightJaw = landmarks[397]
  const bigonial = distance(leftJaw, rightJaw, width, height)
  const bizyBigonialRatio = bizygomatic / bigonial

  const chinTip = landmarks[152]
  const chinHeight = distance(chinTip, landmarks[200], width, height) / ipd
  const chinWidth = distance(landmarks[172], landmarks[397], width, height) / ipd
  const chinProjection = (Math.abs(chinTip.x - 0.5) * width) / ipd

  const jawline1 = landmarks[172]
  const jawline2 = landmarks[397]
  const jawlineSharpness = Math.min(1, distance(jawline1, jawline2, width, height) / (faceWidth || 1))

  const earPoint = landmarks[234]
  const jawAnglePoint = landmarks[172]
  const chinPoint = landmarks[152]
  const dx1 = (earPoint.x - jawAnglePoint.x) * width
  const dy1 = (earPoint.y - jawAnglePoint.y) * height
  const dx2 = (chinPoint.x - jawAnglePoint.x) * width
  const dy2 = (chinPoint.y - jawAnglePoint.y) * height
  const gonialAngle =
    Math.acos((dx1 * dx2 + dy1 * dy2) / (Math.sqrt(dx1 * dx1 + dy1 * dy1) * Math.sqrt(dx2 * dx2 + dy2 * dy2))) *
    (180 / Math.PI)

  const ramusHeight = distance(earPoint, jawAnglePoint, width, height) / ipd

  const upperThird = distance(foreheadTop, landmarks[8], width, height)
  const midThird = distance(landmarks[8], landmarks[2], width, height)
  const lowerThird = distance(landmarks[2], chinBottom, width, height)
  const totalThirds = upperThird + midThird + lowerThird
  const upperRatio = upperThird / totalThirds
  const midRatio = midThird / totalThirds
  const lowerRatio = lowerThird / totalThirds

  const facialIndex = faceHeight / faceWidth

  const glabella = landmarks[8]
  const subnasale = landmarks[2]
  const pogonion = chinTip
  const angle1 = Math.atan2((subnasale.y - glabella.y) * height, (subnasale.x - glabella.x) * width)
  const angle2 = Math.atan2((pogonion.y - subnasale.y) * height, (pogonion.x - subnasale.x) * width)
  const facialConvexity = (angle2 - angle1) * (180 / Math.PI)

  const harmonyFactors = []
  if (symmetryScore <= 5) harmonyFactors.push("excellent facial symmetry")
  else if (symmetryScore <= 10) harmonyFactors.push("good symmetry")
  if (Math.abs(upperRatio - midRatio) < 0.05 && Math.abs(midRatio - lowerRatio) < 0.05)
    harmonyFactors.push("well-balanced facial thirds")
  if (canthalTilt > 2 && canthalTilt < 8) harmonyFactors.push("ideal canthal tilt")
  if (bizyBigonialRatio >= 1.3 && bizyBigonialRatio <= 1.6) harmonyFactors.push("balanced cheek-to-jaw ratio")

  const harmonyText =
    harmonyFactors.length > 0
      ? `This face shows ${harmonyFactors.slice(0, 2).join(" and ")}. ${symmetryScore > 10 ? "Minor asymmetries are natural and common." : "Overall proportions appear harmonious."}`
      : "Facial proportions show natural variation. All measurements are within normal ranges."

  let attractivenessScore = 75

  // Symmetry (universal)
  if (symmetryScore <= 5) attractivenessScore += 8
  else if (symmetryScore <= 10) attractivenessScore += 4
  else if (symmetryScore > 15) attractivenessScore -= 8

  // Canthal tilt
  if (canthalTilt >= 2 && canthalTilt <= 8) attractivenessScore += 4

  // Facial thirds balance
  if (Math.abs(upperRatio - midRatio) < 0.05 && Math.abs(midRatio - lowerRatio) < 0.05) {
    attractivenessScore += 3
  }

  // Gender-specific adjustments
  if (gender === "male") {
    // Males: stronger jawline, higher bizy-bigonial ratio
    if (bizyBigonialRatio >= 1.35 && bizyBigonialRatio <= 1.55) attractivenessScore += 4
    if (jawlineSharpness >= 0.75) attractivenessScore += 3
    if (gonialAngle >= 120 && gonialAngle <= 130) attractivenessScore += 2
  } else {
    // Females: softer features, balanced proportions
    if (bizyBigonialRatio >= 1.3 && bizyBigonialRatio <= 1.5) attractivenessScore += 4
    if (lipRatio >= 0.9 && lipRatio <= 1.1) attractivenessScore += 2
    if (canthalTilt >= 3 && canthalTilt <= 7) attractivenessScore += 2
  }

  attractivenessScore = Math.max(55, Math.min(98, attractivenessScore))

  return {
    ipd: { value: ipd.toFixed(2), unit: "px" },
    icdRatio: icdRatio.toFixed(3),
    faceWidthRatio: faceWidthRatio.toFixed(2),
    faceHeightRatio: faceHeightRatio.toFixed(2),
    symmetryScore: symmetryScore.toFixed(2),
    canthalTilt: canthalTilt.toFixed(2),
    browEyeDist: browEyeDist.toFixed(3),
    nasalWidth: nasalWidth.toFixed(3),
    nasalLength: nasalLength.toFixed(3),
    mouthWidth: mouthWidth.toFixed(3),
    lipRatio: lipRatio.toFixed(2),
    bizyBigonialRatio: bizyBigonialRatio.toFixed(2),
    chinHeight: chinHeight.toFixed(3),
    chinWidth: chinWidth.toFixed(3),
    chinProjection: chinProjection.toFixed(3),
    jawlineSharpness: jawlineSharpness.toFixed(2),
    gonialAngle: gonialAngle.toFixed(1),
    ramusHeight: ramusHeight.toFixed(3),
    facialThirds: `${(upperRatio * 100).toFixed(1)}% / ${(midRatio * 100).toFixed(1)}% / ${(lowerRatio * 100).toFixed(1)}%`,
    facialIndex: facialIndex.toFixed(2),
    facialConvexity: facialConvexity.toFixed(1),
    harmonyText,
    attractivenessScore: attractivenessScore.toFixed(0),
    gender,
  }
}

function getTag(metricName, value) {
  const v = Number.parseFloat(value)

  switch (metricName) {
    case "ipd":
      return { tag: "Base unit", className: "tag-ideal" }
    case "icdRatio":
      if (v >= 0.3 && v <= 0.38) return { tag: "Ideal", className: "tag-ideal" }
      if (v >= 0.26 && v <= 0.42) return { tag: "Good", className: "tag-good" }
      return { tag: "Needs attention", className: "tag-attention" }
    case "faceWidthRatio":
      if (v >= 4.5 && v <= 5.5) return { tag: "Ideal", className: "tag-ideal" }
      if (v >= 4.0 && v <= 6.0) return { tag: "Good", className: "tag-good" }
      return { tag: "OK", className: "tag-ok" }
    case "faceHeightRatio":
      if (v >= 5.5 && v <= 6.5) return { tag: "Ideal", className: "tag-ideal" }
      if (v >= 5.0 && v <= 7.0) return { tag: "Good", className: "tag-good" }
      return { tag: "OK", className: "tag-ok" }
    case "symmetryScore":
      if (v <= 5) return { tag: "Ideal", className: "tag-ideal" }
      if (v <= 10) return { tag: "Good", className: "tag-good" }
      if (v <= 15) return { tag: "OK", className: "tag-ok" }
      return { tag: "Needs attention", className: "tag-attention" }
    case "canthalTilt":
      if (v >= 2 && v <= 8) return { tag: "Good", className: "tag-good" }
      if ((v >= -2 && v < 2) || (v > 8 && v <= 12)) return { tag: "OK", className: "tag-ok" }
      return { tag: "Needs attention", className: "tag-attention" }
    case "browEyeDist":
      if (v >= 0.15 && v <= 0.25) return { tag: "Ideal", className: "tag-ideal" }
      if (v >= 0.12 && v <= 0.3) return { tag: "Good", className: "tag-good" }
      return { tag: "OK", className: "tag-ok" }
    case "nasalWidth":
      if (v >= 0.18 && v <= 0.25) return { tag: "Ideal", className: "tag-ideal" }
      if (v >= 0.15 && v <= 0.3) return { tag: "Good", className: "tag-good" }
      return { tag: "OK", className: "tag-ok" }
    case "nasalLength":
      if (v >= 0.3 && v <= 0.4) return { tag: "Ideal", className: "tag-ideal" }
      if (v >= 0.25 && v <= 0.45) return { tag: "Good", className: "tag-good" }
      return { tag: "OK", className: "tag-ok" }
    case "mouthWidth":
      if (v >= 0.5 && v <= 0.65) return { tag: "Ideal", className: "tag-ideal" }
      if (v >= 0.45 && v <= 0.7) return { tag: "Good", className: "tag-good" }
      return { tag: "OK", className: "tag-ok" }
    case "lipRatio":
      if (v >= 0.8 && v <= 1.2) return { tag: "Ideal", className: "tag-ideal" }
      if (v >= 0.6 && v <= 1.4) return { tag: "Good", className: "tag-good" }
      return { tag: "OK", className: "tag-ok" }
    case "bizyBigonialRatio":
      if (v >= 1.3 && v <= 1.6) return { tag: "Ideal", className: "tag-ideal" }
      if (v >= 1.2 && v <= 1.7) return { tag: "Good", className: "tag-good" }
      return { tag: "OK", className: "tag-ok" }
    case "jawlineSharpness":
      if (v >= 0.75) return { tag: "Ideal", className: "tag-ideal" }
      if (v >= 0.6) return { tag: "Good", className: "tag-good" }
      if (v >= 0.45) return { tag: "OK", className: "tag-ok" }
      return { tag: "Needs attention", className: "tag-attention" }
    case "gonialAngle":
      if (v >= 120 && v <= 130) return { tag: "Ideal", className: "tag-ideal" }
      if (v >= 112 && v <= 140) return { tag: "Good", className: "tag-good" }
      return { tag: "Needs attention", className: "tag-attention" }
    case "facialIndex":
      if (v >= 1.1 && v <= 1.3) return { tag: "Ideal", className: "tag-ideal" }
      if (v >= 1.0 && v <= 1.4) return { tag: "Good", className: "tag-good" }
      return { tag: "OK", className: "tag-ok" }
    default:
      return { tag: "OK", className: "tag-ok" }
  }
}

function getNoteForMetric(metricName) {
  const notes = {
    ipd: "All ratios use IPD as scale.",
    icdRatio: "Centered spacing feel.",
    faceWidthRatio: "Broader values read wider.",
    faceHeightRatio: "Taller values read longer.",
    symmetryScore: "Lower is better; 0–5% looks balanced.",
    canthalTilt: "Slight positive tilt often reads lively.",
    browEyeDist: "Smaller = closer brows; larger = airier brow.",
    nasalWidth: "Width/length balance shapes midface.",
    nasalLength: "Width/length balance shapes midface.",
    mouthWidth: "Fullness ratio near 1.0 looks balanced.",
    lipRatio: "Fullness ratio near 1.0 looks balanced.",
    bizyBigonialRatio: "Cheek-to-jaw breadth balance.",
    chinHeight: "Projection adds definition.",
    chinWidth: "Projection adds definition.",
    chinProjection: "Projection adds definition.",
    jawlineSharpness: "Higher looks crisper.",
    gonialAngle: "Jaw corner openness.",
    ramusHeight: "Verticality near ear-jaw region.",
    facialThirds: "Even thirds read harmonious.",
    facialIndex: "Higher = longer; lower = broader.",
    facialConvexity: "Midface-to-chin curvature feel.",
  }
  return notes[metricName] || ""
}

function displayMetrics(metrics) {
  const metricsGrid = document.getElementById("metrics-grid")
  metricsGrid.innerHTML = ""

  const metricsList = [
    { name: "IPD (Interpupillary Distance)", key: "ipd", value: `${metrics.ipd.value} ${metrics.ipd.unit}` },
    { name: "ICD / IPD Ratio", key: "icdRatio", value: metrics.icdRatio },
    { name: "Face Width / IPD", key: "faceWidthRatio", value: metrics.faceWidthRatio },
    { name: "Face Height / IPD", key: "faceHeightRatio", value: metrics.faceHeightRatio },
    { name: "Symmetry Score", key: "symmetryScore", value: `${metrics.symmetryScore}%` },
    { name: "Canthal Tilt", key: "canthalTilt", value: `${metrics.canthalTilt}°` },
    { name: "Brow-Eye Distance", key: "browEyeDist", value: metrics.browEyeDist },
    { name: "Nasal Width", key: "nasalWidth", value: metrics.nasalWidth },
    { name: "Nasal Length", key: "nasalLength", value: metrics.nasalLength },
    { name: "Mouth Width", key: "mouthWidth", value: metrics.mouthWidth },
    { name: "Lip Ratio", key: "lipRatio", value: metrics.lipRatio },
    { name: "Bizygomatic : Bigonial Ratio", key: "bizyBigonialRatio", value: metrics.bizyBigonialRatio },
    { name: "Chin Height", key: "chinHeight", value: metrics.chinHeight },
    { name: "Chin Width", key: "chinWidth", value: metrics.chinWidth },
    { name: "Chin Projection", key: "chinProjection", value: metrics.chinProjection },
    { name: "Jawline Sharpness", key: "jawlineSharpness", value: metrics.jawlineSharpness },
    { name: "Gonial Angle", key: "gonialAngle", value: `${metrics.gonialAngle}°` },
    { name: "Ramus Height", key: "ramusHeight", value: metrics.ramusHeight },
    { name: "Facial Thirds (U/M/L)", key: "facialThirds", value: metrics.facialThirds },
    { name: "Facial Index", key: "facialIndex", value: metrics.facialIndex },
    { name: "Facial Convexity", key: "facialConvexity", value: `${metrics.facialConvexity}°` },
  ]

  metricsList.forEach((metric) => {
    const tagInfo = getTag(metric.key, metric.value)
    const note = getNoteForMetric(metric.key)

    const card = document.createElement("div")
    card.className = "metric-card"
    card.innerHTML = `
      <div class="metric-title">${metric.name}</div>
      <div class="metric-value">${metric.value}</div>
      <span class="metric-tag ${tagInfo.className}">${tagInfo.tag}</span>
      <div class="metric-note">${note}</div>
    `
    metricsGrid.appendChild(card)
  })

  const harmonyCard = document.createElement("div")
  harmonyCard.className = "metric-card"
  harmonyCard.style.gridColumn = "span 1"
  harmonyCard.innerHTML = `
    <div class="metric-title">Overall Harmony Summary</div>
    <div class="metric-note" style="font-size: 0.875rem; margin-top: 0.5rem;">${metrics.harmonyText}</div>
  `
  metricsGrid.appendChild(harmonyCard)

  const attractivenessCard = document.createElement("div")
  attractivenessCard.className = "metric-card"
  attractivenessCard.style.gridColumn = "span 1"
  attractivenessCard.innerHTML = `
    <div class="metric-title">Overall Beauty Score (${metrics.gender === "male" ? "Male" : "Female"})</div>
    <div class="metric-value">${metrics.attractivenessScore} / 100</div>
    <span class="metric-tag ${metrics.attractivenessScore >= 80 ? "tag-ideal" : metrics.attractivenessScore >= 70 ? "tag-good" : "tag-ok"}">Entertainment Only</span>
    <div class="metric-note">Score adjusted for ${metrics.gender === "male" ? "masculine" : "feminine"} features. For fun only.</div>
  `
  metricsGrid.appendChild(attractivenessCard)

  document.getElementById("metrics-section").classList.remove("hidden")
}

async function performAnalysis() {
  const previewImage = document.getElementById("preview-image")
  const loadingState = document.getElementById("loading-state")
  const errorMessage = document.getElementById("error-message")
  const analyzeBtn = document.getElementById("analyze-btn")

  if (!faceLandmarker) {
    loadingState.classList.remove("hidden")
    // Wait up to 10 seconds for model to load
    let waitTime = 0
    while (!faceLandmarker && waitTime < 10000) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      waitTime += 500
    }
    loadingState.classList.add("hidden")

    if (!faceLandmarker) {
      showError("AI model failed to load. Please refresh the page and try again.")
      return
    }
  }

  const selectedGender = document.querySelector('input[name="gender"]:checked').value

  errorMessage.classList.add("hidden")
  loadingState.classList.remove("hidden")
  if (analyzeBtn) analyzeBtn.disabled = true

  try {
    const results = faceLandmarker.detect(previewImage)

    loadingState.classList.add("hidden")

    if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
      showError(
        "No face detected. Please ensure: 1) Face is clearly visible, 2) Good lighting, 3) Eyes are open, 4) Face is looking forward.",
      )
      if (analyzeBtn) analyzeBtn.disabled = false
      return
    }

    if (results.faceLandmarks.length > 1) {
      console.log("[v0] Multiple faces detected, using largest face")
    }

    const landmarks = results.faceLandmarks[0]

    const brightness = checkImageBrightness(previewImage)
    if (brightness < 50) {
      showError("Image is too dark. Please use better lighting or adjust exposure.")
      if (analyzeBtn) analyzeBtn.disabled = false
      return
    } else if (brightness > 200) {
      showError("Image is too bright. Please reduce exposure or avoid direct lighting.")
      if (analyzeBtn) analyzeBtn.disabled = false
      return
    }

    drawEnhancedLandmarks(landmarks)
    const metrics = calculateMetrics(landmarks, previewImage.naturalWidth, previewImage.naturalHeight, selectedGender)
    displayMetrics(metrics)

    if (analyzeBtn) analyzeBtn.disabled = false
  } catch (error) {
    console.error("[v0] Analysis error:", error)
    loadingState.classList.add("hidden")
    if (analyzeBtn) analyzeBtn.disabled = false
    showError("Analysis failed: " + error.message + ". Please try uploading a different image.")
  }
}

function showError(message) {
  const errorMessage = document.getElementById("error-message")
  const errorText = document.getElementById("error-text")
  errorText.textContent = message
  errorMessage.classList.remove("hidden")
}

function initContactForm() {
  const form = document.getElementById("contact-form")
  const banner = document.getElementById("form-banner")

  form.addEventListener("submit", async (e) => {
    e.preventDefault()

    banner.classList.add("hidden")

    const formData = new FormData(form)

    try {
      const response = await fetch("https://formspree.io/f/xzzjolow", {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      })

      if (response.ok) {
        form.reset()
        banner.className = "banner banner-success"
        banner.textContent = "Thank you! Your message has been sent successfully."
        banner.classList.remove("hidden")
      } else {
        throw new Error("Failed to send message")
      }
    } catch (error) {
      banner.className = "banner banner-error"
      banner.textContent = "Sorry, there was an error sending your message. Please try again."
      banner.classList.remove("hidden")
    }
  })
}

async function stripExif(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext("2d")
        ctx.drawImage(img, 0, 0)

        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: file.type }))
        }, file.type)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}
