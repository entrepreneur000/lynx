let faceDetector = null
let currentImageUrl = null
let isModelLoading = false
let cameraStream = null

document.addEventListener("DOMContentLoaded", () => {
  initDarkMode()
  initMobileMenu()
  initPageTransitions()

  if (document.getElementById("file-input")) {
    initAnalyzePage()
    loadTensorFlowModel()
  }

  if (document.getElementById("contact-form")) {
    initContactForm()
  }

  document.body.classList.add("fade-enter")
})

async function loadTensorFlowModel() {
  if (isModelLoading || faceDetector) return
  isModelLoading = true

  try {
    console.log("[v0] Loading TensorFlow.js face detection model...")

    let attempts = 0
    while (!window.tf && attempts < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      attempts++
    }

    if (!window.tf) {
      console.error("[v0] TensorFlow.js not loaded from CDN")
      isModelLoading = false
      return
    }

    try {
      await window.tf.setBackend("webgl")
      await window.tf.ready()
      console.log("[v0] Using WebGL backend for better performance")
    } catch (e) {
      console.log("[v0] WebGL failed, falling back to CPU backend")
      await window.tf.setBackend("cpu")
      await window.tf.ready()
    }

    attempts = 0
    while (!window.faceLandmarksDetection && attempts < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      attempts++
    }

    if (!window.faceLandmarksDetection) {
      console.error("[v0] face-landmarks-detection library not loaded from CDN")
      isModelLoading = false
      return
    }

    const model = window.faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh
    faceDetector = await window.faceLandmarksDetection.createDetector(model, {
      runtime: "tfjs",
      refineLandmarks: true,
      maxFaces: 1,
    })

    console.log("[v0] Face detection model loaded and ready")
    isModelLoading = false
  } catch (error) {
    console.error("[v0] Failed to load face detection model:", error)
    isModelLoading = false
  }
}

function initDarkMode() {
  const themeToggle = document.getElementById("theme-toggle")
  const themeToggleMobile = document.getElementById("theme-toggle-mobile")
  const themeIconLight = document.getElementById("theme-icon-light")
  const themeIconDark = document.getElementById("theme-icon-dark")
  const themeIconMobile = document.getElementById("theme-icon-mobile")
  const themeTextMobile = document.getElementById("theme-text-mobile")

  const currentTheme = localStorage.getItem("theme") || "light"
  if (currentTheme === "dark") {
    document.body.classList.add("dark-mode")
    if (themeIconLight) themeIconLight.classList.add("hidden")
    if (themeIconDark) themeIconDark.classList.remove("hidden")
    if (themeTextMobile) themeTextMobile.textContent = "Light Mode"
  }

  function toggleTheme() {
    document.body.classList.toggle("dark-mode")
    const isDark = document.body.classList.contains("dark-mode")

    if (themeIconLight && themeIconDark) {
      themeIconLight.classList.toggle("hidden")
      themeIconDark.classList.toggle("hidden")
    }

    if (themeTextMobile) {
      themeTextMobile.textContent = isDark ? "Light Mode" : "Dark Mode"
    }

    if (themeIconMobile) {
      if (isDark) {
        themeIconMobile.innerHTML =
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>'
      } else {
        themeIconMobile.innerHTML =
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>'
      }
    }

    localStorage.setItem("theme", isDark ? "dark" : "light")
  }

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

  const resizedImage = await resizeImage(file, 1024)

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

function drawEnhancedLandmarks(landmarks, width, height) {
  const canvas = document.getElementById("overlay-canvas")
  const ctx = canvas.getContext("2d")

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = "rgba(0, 255, 0, 0.5)"
  landmarks.forEach((point) => {
    ctx.beginPath()
    ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI)
    ctx.fill()
  })

  ctx.strokeStyle = "rgba(0, 200, 255, 0.8)"
  ctx.lineWidth = 2

  const noseTip = landmarks[1]
  ctx.beginPath()
  ctx.moveTo(noseTip.x, 0)
  ctx.lineTo(noseTip.x, canvas.height)
  ctx.stroke()

  const leftEye = landmarks[33]
  const rightEye = landmarks[263]
  ctx.strokeStyle = "rgba(255, 100, 100, 0.8)"
  ctx.beginPath()
  ctx.moveTo(leftEye.x, leftEye.y)
  ctx.lineTo(rightEye.x, rightEye.y)
  ctx.stroke()

  const leftNostril = landmarks[98]
  const rightNostril = landmarks[327]
  ctx.strokeStyle = "rgba(100, 255, 100, 0.8)"
  ctx.beginPath()
  ctx.moveTo(leftNostril.x, leftNostril.y)
  ctx.lineTo(rightNostril.x, rightNostril.y)
  ctx.stroke()

  const leftMouth = landmarks[61]
  const rightMouth = landmarks[291]
  ctx.strokeStyle = "rgba(255, 150, 255, 0.8)"
  ctx.beginPath()
  ctx.moveTo(leftMouth.x, leftMouth.y)
  ctx.lineTo(rightMouth.x, rightMouth.y)
  ctx.stroke()

  const foreheadTop = landmarks[10]
  const eyebrowLine = landmarks[8]
  const noseTipPoint = landmarks[2]
  const chinBottom = landmarks[152]

  ctx.strokeStyle = "rgba(255, 200, 0, 0.7)"
  ctx.setLineDash([5, 5])

  ctx.beginPath()
  ctx.moveTo(0, eyebrowLine.y)
  ctx.lineTo(canvas.width, eyebrowLine.y)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(0, noseTipPoint.y)
  ctx.lineTo(canvas.width, noseTipPoint.y)
  ctx.stroke()

  ctx.setLineDash([])
}

function distance(p1, p2) {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  return Math.sqrt(dx * dx + dy * dy)
}

function calculateMetrics(landmarks, width, height, gender) {
  const leftEye = landmarks[33]
  const rightEye = landmarks[263]
  const ipd = distance(leftEye, rightEye)

  const leftCheek = landmarks[234]
  const rightCheek = landmarks[454]
  const faceWidth = distance(leftCheek, rightCheek)

  const foreheadTop = landmarks[10]
  const chinBottom = landmarks[152]
  const faceHeight = distance(foreheadTop, chinBottom)

  let symmetryScore = 0
  const leftPoints = [33, 133, 234, 61]
  const rightPoints = [263, 362, 454, 291]
  const centerX = landmarks[1].x

  for (let i = 0; i < leftPoints.length; i++) {
    const leftDist = Math.abs(landmarks[leftPoints[i]].x - centerX)
    const rightDist = Math.abs(landmarks[rightPoints[i]].x - centerX)
    symmetryScore += Math.abs(leftDist - rightDist)
  }
  symmetryScore = (symmetryScore / leftPoints.length / width) * 100

  const leftNostril = landmarks[98]
  const rightNostril = landmarks[327]
  const noseWidth = distance(leftNostril, rightNostril)
  const noseTip = landmarks[1]
  const noseBridge = landmarks[6]
  const noseLength = distance(noseTip, noseBridge)

  const leftMouth = landmarks[61]
  const rightMouth = landmarks[291]
  const mouthWidth = distance(leftMouth, rightMouth)

  const eyebrowLine = landmarks[8]
  const noseTipPoint = landmarks[2]
  const upperThird = distance(foreheadTop, eyebrowLine)
  const midThird = distance(eyebrowLine, noseTipPoint)
  const lowerThird = distance(noseTipPoint, chinBottom)
  const totalThirds = upperThird + midThird + lowerThird

  let attractivenessScore = 75

  if (symmetryScore <= 2) attractivenessScore += 10
  else if (symmetryScore <= 5) attractivenessScore += 5
  else if (symmetryScore > 10) attractivenessScore -= 10

  const faceRatio = faceHeight / faceWidth
  if (faceRatio >= 1.3 && faceRatio <= 1.5) attractivenessScore += 5

  const upperRatio = upperThird / totalThirds
  const midRatio = midThird / totalThirds
  const lowerRatio = lowerThird / totalThirds
  if (Math.abs(upperRatio - 0.33) < 0.05 && Math.abs(midRatio - 0.33) < 0.05) {
    attractivenessScore += 5
  }

  if (gender === "male") {
    const jawWidth = distance(landmarks[172], landmarks[397])
    if (jawWidth / faceWidth > 0.7) attractivenessScore += 3
  } else {
    if (mouthWidth / noseWidth >= 1.5 && mouthWidth / noseWidth <= 1.8) attractivenessScore += 3
  }

  attractivenessScore = Math.max(55, Math.min(98, attractivenessScore))

  return {
    ipd: { value: ipd.toFixed(2), unit: "px" },
    faceWidth: { value: faceWidth.toFixed(2), unit: "px" },
    faceHeight: { value: faceHeight.toFixed(2), unit: "px" },
    faceRatio: (faceHeight / faceWidth).toFixed(2),
    symmetryScore: symmetryScore.toFixed(2),
    noseWidth: { value: noseWidth.toFixed(2), unit: "px" },
    noseLength: { value: noseLength.toFixed(2), unit: "px" },
    mouthWidth: { value: mouthWidth.toFixed(2), unit: "px" },
    facialThirds: `${(upperRatio * 100).toFixed(1)}% / ${(midRatio * 100).toFixed(1)}% / ${(lowerRatio * 100).toFixed(1)}%`,
    attractivenessScore: attractivenessScore.toFixed(0),
    gender,
  }
}

function displayMetrics(metrics) {
  const metricsGrid = document.getElementById("metrics-grid")
  metricsGrid.innerHTML = ""

  const metricsList = [
    { name: "Interpupillary Distance (IPD)", value: `${metrics.ipd.value} ${metrics.ipd.unit}`, tag: "Base unit" },
    { name: "Face Width", value: `${metrics.faceWidth.value} ${metrics.faceWidth.unit}`, tag: "Measured" },
    { name: "Face Height", value: `${metrics.faceHeight.value} ${metrics.faceHeight.unit}`, tag: "Measured" },
    {
      name: "Face Height/Width Ratio",
      value: metrics.faceRatio,
      tag: metrics.faceRatio >= 1.3 && metrics.faceRatio <= 1.5 ? "Ideal" : "Good",
    },
    {
      name: "Facial Symmetry",
      value: `${metrics.symmetryScore}%`,
      tag: metrics.symmetryScore <= 5 ? "Excellent" : metrics.symmetryScore <= 10 ? "Good" : "OK",
    },
    { name: "Nose Width", value: `${metrics.noseWidth.value} ${metrics.noseWidth.unit}`, tag: "Measured" },
    { name: "Nose Length", value: `${metrics.noseLength.value} ${metrics.noseLength.unit}`, tag: "Measured" },
    { name: "Mouth Width", value: `${metrics.mouthWidth.value} ${metrics.mouthWidth.unit}`, tag: "Measured" },
    { name: "Facial Thirds (Upper/Mid/Lower)", value: metrics.facialThirds, tag: "Proportions" },
  ]

  metricsList.forEach((metric) => {
    const card = document.createElement("div")
    card.className = "metric-card"
    card.innerHTML = `
      <div class="metric-title">${metric.name}</div>
      <div class="metric-value">${metric.value}</div>
      <span class="metric-tag ${metric.tag === "Ideal" || metric.tag === "Excellent" ? "tag-ideal" : metric.tag === "Good" ? "tag-good" : "tag-ok"}">${metric.tag}</span>
    `
    metricsGrid.appendChild(card)
  })

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
  const errorMessage = document.getElementById("error-message")
  const analyzeBtn = document.getElementById("analyze-btn")

  errorMessage.classList.add("hidden")

  analyzeBtn.textContent = "Analyzing..."
  analyzeBtn.disabled = true

  await new Promise((resolve) => setTimeout(resolve, 50))

  try {
    if (!faceDetector) {
      console.log("[v0] Waiting for model to load...")
      let waitTime = 0
      while ((!faceDetector || isModelLoading) && waitTime < 20000) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        waitTime += 500
      }

      if (!faceDetector) {
        showError("AI model failed to load. Please refresh the page and try again.")
        analyzeBtn.textContent = "Analyze"
        analyzeBtn.disabled = false
        return
      }
    }

    const selectedGender = document.querySelector('input[name="gender"]:checked').value

    console.log("[v0] Starting face detection...")

    const faces = await faceDetector.estimateFaces(previewImage, {
      flipHorizontal: false,
      staticImageMode: true,
    })

    console.log("[v0] Face detection complete, found", faces ? faces.length : 0, "faces")

    if (!faces || faces.length === 0) {
      showError(
        "No face detected. Please ensure: 1) Face is clearly visible and centered, 2) Good lighting, 3) Eyes are open, 4) Face is looking forward.",
      )
      analyzeBtn.textContent = "Analyze"
      analyzeBtn.disabled = false
      return
    }

    if (faces.length > 1) {
      console.log("[v0] Multiple faces detected, analyzing the first face")
    }

    const face = faces[0]
    const landmarks = face.keypoints

    console.log("[v0] Drawing landmarks and calculating metrics...")

    drawEnhancedLandmarks(landmarks, previewImage.naturalWidth, previewImage.naturalHeight)

    const metrics = calculateMetrics(landmarks, previewImage.naturalWidth, previewImage.naturalHeight, selectedGender)

    displayMetrics(metrics)

    console.log("[v0] Analysis complete")

    analyzeBtn.textContent = "Analyze"
    analyzeBtn.disabled = false
  } catch (error) {
    console.error("[v0] Analysis error:", error)
    showError("Analysis failed: " + error.message + ". Please try uploading a clearer face photo.")
    analyzeBtn.textContent = "Analyze"
    analyzeBtn.disabled = false
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
