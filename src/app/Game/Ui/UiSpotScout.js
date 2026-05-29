import _UiComponent from "./UiComponent";
import SpotScout from "../Util/SpotScout";

class UiSpotScout extends _UiComponent {
  constructor(ui, intro) {
    super(ui, "<span></span>");
    this.intro = intro;
    this.init();
  }

  init() {
    this.spotScoutBtn = document.getElementById("hud-intro-spotscout");
    this.spotScoutModal = document.getElementById("spotscout-modal");
    this.spotScoutClose = document.getElementById("spotscout-close");
    this.spotScoutDropzone = document.getElementById("spotscout-dropzone");
    this.spotScoutFileBtn = document.getElementById("spotscout-file");
    this.spotScoutFileInput = document.getElementById("spotscout-file-input");
    this.spotScoutWorkspace = document.getElementById("spotscout-workspace");
    this.spotScoutCanvas = document.getElementById("spotscout-canvas");
    this.spotScoutScanner = document.getElementById("spotscout-scanner");
    this.spotScoutStatus = document.getElementById("spotscout-status");
    this.spotScoutManualControls = document.getElementById("spotscout-manual-controls");
    this.spotScoutClearBtn = document.getElementById("spotscout-clear-btn");
    this.spotScoutSolveBtn = document.getElementById("spotscout-solve-btn");
    this.spotScoutResult = document.getElementById("spotscout-result");

    if (!this.spotScoutModal) return;

    this.spotScoutCtx = this.spotScoutCanvas.getContext("2d");
    this.customMarkers = [];
    this.activeTool = "Tree";
    this.calibrationActive = false;

    // Show/Hide Modal
    this.spotScoutBtn.addEventListener("click", () => {
      this.spotScoutModal.style.display = "flex";
      this.resetSpotScout();
    });

    this.spotScoutClose.addEventListener("click", () => {
      this.spotScoutModal.style.display = "none";
    });

    // Close on overlay click
    this.spotScoutModal.addEventListener("click", (e) => {
      if (e.target === this.spotScoutModal) {
        this.spotScoutModal.style.display = "none";
      }
    });

    // File Input Trigger
    this.spotScoutFileBtn.addEventListener("click", () => {
      this.spotScoutFileInput.click();
    });

    this.spotScoutFileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        this.handleSpotScoutImage(e.target.files[0]);
      }
    });

    // Drag and Drop
    this.spotScoutDropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.spotScoutDropzone.classList.add("dragover");
    });

    this.spotScoutDropzone.addEventListener("dragleave", () => {
      this.spotScoutDropzone.classList.remove("dragover");
    });

    this.spotScoutDropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      this.spotScoutDropzone.classList.remove("dragover");
      if (e.dataTransfer.files.length > 0) {
        this.handleSpotScoutImage(e.dataTransfer.files[0]);
      }
    });

    // Paste from Clipboard
    window.addEventListener("paste", (e) => {
      if (this.spotScoutModal && this.spotScoutModal.style.display === "flex") {
        const items = (e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData)) && (e.clipboardData || e.originalEvent.clipboardData).items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              this.handleSpotScoutImage(file);
              break;
            }
          }
        }
      }
    });

    // Tool Selector Click
    const toolBtns = document.querySelectorAll(".spotscout-tool-btn");
    toolBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        toolBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.activeTool = btn.getAttribute("data-type");
      });
    });

    // Clear Custom Markers
    this.spotScoutClearBtn.addEventListener("click", () => {
      this.customMarkers = [];
      this.drawWorkspaceCanvas();
      this.spotScoutResult.style.display = "none";
      this.spotScoutStatus.innerText = "Place at least 3 markers, then click 'Find Spot'.";
      this.spotScoutStatus.style.color = "#eee";
    });

    // Solve Custom Markers Button
    if (this.spotScoutSolveBtn) {
      this.spotScoutSolveBtn.addEventListener("click", () => {
        this.solveCustomMarkers();
      });
    }

    // Canvas click for manual calibration
    this.spotScoutCanvas.addEventListener("click", (e) => {
      if (!this.calibrationActive) return;
      const rect = this.spotScoutCanvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      // Translate to image pixel coordinate space
      const imgX = (cx / this.spotScoutCanvas.width) * this.loadedImageWidth;
      const imgY = (cy / this.spotScoutCanvas.height) * this.loadedImageHeight;

      this.customMarkers.push({
        x: imgX,
        y: imgY,
        type: this.activeTool
      });

      this.drawWorkspaceCanvas();
      this.spotScoutStatus.innerText = `${this.customMarkers.length} marker(s) placed. Tap more or click 'Find Spot'!`;
      this.spotScoutStatus.style.color = "#eee";
    });
  }

  resetSpotScout() {
    this.spotScoutDropzone.style.display = "flex";
    this.spotScoutWorkspace.style.display = "none";
    this.spotScoutFileInput.value = "";
    this.customMarkers = [];
    this.calibrationActive = false;
    this.spotScoutStatus.innerText = "Analyzing image...";
    this.spotScoutStatus.style.color = "#eee";
    this.spotScoutManualControls.style.display = "none";
    this.spotScoutResult.style.display = "none";
  }

  handleSpotScoutImage(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        this.loadedImage = img;
        this.loadedImageWidth = img.width;
        this.loadedImageHeight = img.height;

        this.spotScoutDropzone.style.display = "none";
        this.spotScoutWorkspace.style.display = "flex";

        // Fit canvas to sidebar workspace
        const maxWidth = 480;
        const maxHeight = 360;
        let cWidth = img.width;
        let cHeight = img.height;

        if (cWidth > maxWidth) {
          cHeight = (maxWidth / cWidth) * cHeight;
          cWidth = maxWidth;
        }
        if (cHeight > maxHeight) {
          cWidth = (maxHeight / cHeight) * cWidth;
          cHeight = maxHeight;
        }

        this.spotScoutCanvas.width = cWidth;
        this.spotScoutCanvas.height = cHeight;

        this.drawWorkspaceCanvas();

        // Run detection
        setTimeout(() => this.runAutoDetection(), 100);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  drawWorkspaceCanvas() {
    if (!this.spotScoutCtx || !this.loadedImage) return;
    const ctx = this.spotScoutCtx;
    const w = this.spotScoutCanvas.width;
    const h = this.spotScoutCanvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.loadedImage, 0, 0, w, h);

    // Draw manual markers
    this.customMarkers.forEach(m => {
      const sx = (m.x / this.loadedImageWidth) * w;
      const sy = (m.y / this.loadedImageHeight) * h;

      if (m.type === "Tree") ctx.fillStyle = "#2ecc71";
      else if (m.type === "Stone") ctx.fillStyle = "#95a5a6";
      else if (m.type === "NeutralCamp") ctx.fillStyle = "#e74c3c";

      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(m.type[0], sx, sy);
    });
  }

  runAutoDetection() {
    this.spotScoutScanner.style.display = "block";
    this.spotScoutStatus.innerText = "Scanning screenshot pattern...";
    this.spotScoutStatus.style.color = "#eee";

    setTimeout(() => {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = this.loadedImageWidth;
      tempCanvas.height = this.loadedImageHeight;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.drawImage(this.loadedImage, 0, 0);

      const imgData = tempCtx.getImageData(0, 0, this.loadedImageWidth, this.loadedImageHeight);
      const detected = SpotScout.detectNodes(imgData);
      const result = SpotScout.solve(detected, window.serverspots);

      this.spotScoutScanner.style.display = "none";

      if (result.success) {
        this.applySpotScoutResult(result);
      } else {
        this.calibrationActive = true;
        this.spotScoutStatus.innerText = "Automatic scanning failed.";
        this.spotScoutStatus.style.color = "#ff4d4d";
        this.spotScoutManualControls.style.display = "block";
      }
    }, 800);
  }

  solveCustomMarkers() {
    if (this.customMarkers.length < 3) {
      this.spotScoutResult.style.display = "none";
      this.spotScoutStatus.innerText = `Need at least 3 markers to solve (placed ${this.customMarkers.length}).`;
      this.spotScoutStatus.style.color = "#ff4d4d";
      return;
    }

    this.spotScoutStatus.innerText = "Searching database...";
    this.spotScoutStatus.style.color = "#eee";
    const result = SpotScout.solve(this.customMarkers, window.serverspots);

    if (result.success) {
      this.applySpotScoutResult(result);
    } else {
      this.spotScoutResult.style.display = "none";
      this.spotScoutStatus.innerText = "No match found. Adjust markers or add more!";
      this.spotScoutStatus.style.color = "#ff4d4d";
    }
  }

  applySpotScoutResult(result) {
    this.calibrationActive = false;
    this.spotScoutManualControls.style.display = "none";
    this.spotScoutStatus.innerText = "Spot Found!";
    this.spotScoutStatus.style.color = "#eee";

    // Set Server Selector Value
    this.intro.serverElem.value = result.serverId;

    // Set Custom Spawn Point
    window.customSpawnPoint = {
      x: Math.round(result.spawnPoint.x),
      y: Math.round(result.spawnPoint.y)
    };

    // Update Intro Screen Previews
    this.intro.updatePreview();

    // Show result details nicely
    this.spotScoutResult.style.display = "block";
    this.spotScoutResult.innerHTML = `
      <div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 4px; text-align: left;">
        <p style="margin: 5px 0; font-size: 13px; color: #eee; font-family: 'Open Sans', sans-serif;"><strong>Server:</strong> ${result.serverId}</p>
        <p style="margin: 5px 0; font-size: 13px; color: #eee; font-family: 'Open Sans', sans-serif;"><strong>Spawn:</strong> [${Math.round(result.spawnPoint.x)}, ${Math.round(result.spawnPoint.y)}]</p>
        <p style="margin: 5px 0; font-size: 11px; color: rgba(255, 255, 255, 0.6); font-family: 'Open Sans', sans-serif;">Matches: ${result.matchesCount}/${result.totalDetected} nodes</p>
        <button type="button" class="btn btn-green" id="spotscout-success-btn" style="margin-top: 15px; width: 100%; height: 38px; line-height: 38px; font-family: 'Hammersmith One', sans-serif;">Close & Play</button>
      </div>
    `;

    document.getElementById("spotscout-success-btn").addEventListener("click", () => {
      this.spotScoutModal.style.display = "none";
      this.intro.submitElem.focus();
    });
  }
}

export default UiSpotScout;
