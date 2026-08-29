/* ARHAT EDIT — canvas composition & file handling */
(() => {
  "use strict";

  /* ===== STATE ===== */
  const state = {
    profileImg: null,
    collectionImg: null,
    favoriteImg: null,
    skinCrops: [],
    rowSize: 5,
  };

  /* ===== DOM CACHE ===== */
  const canvas = document.getElementById("editor-canvas");
  const ctx = canvas.getContext("2d");

  const inputs = {
    profile: document.getElementById("input-profile"),
    collection: document.getElementById("input-collection"),
    photos: document.getElementById("input-photos"),
    favorite: document.getElementById("input-favorite"),
  };

  const buttons = {
    profile: document.getElementById("btn-profile"),
    collection: document.getElementById("btn-collection"),
    favorite: document.getElementById("btn-favorite"),
    addPhotos: document.getElementById("btn-add-photos"),
    clear: document.getElementById("btn-clear"),
    save: document.getElementById("btn-save"),
    rowMinus: document.getElementById("row-minus"),
    rowPlus: document.getElementById("row-plus"),
  };

  const dots = {
    profile: document.getElementById("dot-profile"),
    collection: document.getElementById("dot-collection"),
    favorite: document.getElementById("dot-favorite"),
  };

  const statusText = document.getElementById("status-text");
  const rowValue = document.getElementById("row-value");

  /* ===== CANVAS RENDER ===== */
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, "#0a0a0f");
    bgGrad.addColorStop(1, "#1a1a2e");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle top glow
    ctx.fillStyle = "rgba(0, 229, 255, 0.02)";
    ctx.fillRect(0, 0, canvas.width, 120);

    // Slot definitions (1920x1080 space)
    const profileSlot = { cx: 180, cy: 200, r: 130, label: "PROFILE" };
    const collectionSlot = { x: 440, y: 80, w: 760, h: 260, radius: 14, label: "COLLECTION" };
    const favoriteSlot = { x: 440, y: 380, w: 760, h: 260, radius: 14, label: "FAVORITE" };
    const skinSlot = { x: 440, y: 680, w: 760, h: 320, label: "SKINS" };

    drawRectSlot(collectionSlot);
    drawRectSlot(favoriteSlot);
    drawRectSlot(skinSlot);

    // Skin grid
    drawSkinGrid(skinSlot);

    // Profile circle slot
    drawProfileSlot(profileSlot);

    // Draw images
    drawProfileImage(profileSlot);
    drawRectImage(collectionSlot, state.collectionImg, collectionSlot.label);
    drawRectImage(favoriteSlot, state.favoriteImg, favoriteSlot.label);
    drawSkinCrops(skinSlot);

    // Watermark
    drawWatermark();

    updateStatus();
  }

  /* ===== SLOT BACKGROUNDS ===== */
  function drawRectSlot(slot) {
    // Outer glow
    ctx.shadowColor = "rgba(0, 229, 255, 0.06)";
    ctx.shadowBlur = 0;

    // Inner fill
    ctx.fillStyle = "rgba(18, 18, 34, 0.5)";
    ctx.strokeStyle = "rgba(0, 229, 255, 0.15)";
    ctx.lineWidth = 1;
    roundRect(ctx, slot.x, slot.y, slot.w, slot.h, slot.radius);
    ctx.fill();
    ctx.stroke();

    // Inner border
    ctx.strokeStyle = "rgba(0, 229, 255, 0.06)";
    ctx.lineWidth = 1;
    roundRect(ctx, slot.x + 3, slot.y + 3, slot.w - 6, slot.h - 6, slot.radius - 3);
    ctx.stroke();

    // Label
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "rgba(0, 229, 255, 0.3)";
    ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(slot.label, slot.x + 18, slot.y + 14);
  }

  function drawProfileSlot(slot) {
    // Subtle ring
    ctx.fillStyle = "rgba(18, 18, 34, 0.5)";
    ctx.strokeStyle = "rgba(0, 229, 255, 0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(slot.cx, slot.cy, slot.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner ring
    ctx.strokeStyle = "rgba(0, 229, 255, 0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(slot.cx, slot.cy, slot.r - 4, 0, Math.PI * 2);
    ctx.stroke();

    // Label
    ctx.fillStyle = "rgba(0, 229, 255, 0.3)";
    ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(slot.label, slot.cx, slot.cy - slot.r - 28);
  }

  /* ===== SKIN GRID ===== */
  function drawSkinGrid(slot) {
    const cols = state.rowSize;
    const gap = 14;
    const startX = slot.x;
    const startY = slot.y;
    const cellW = Math.floor((slot.w - gap * (cols - 1)) / cols);

    const total = Math.max(state.skinCrops.length, cols);
    const rows = Math.ceil(total / cols);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        if (idx >= state.skinCrops.length && idx >= total) continue;

        const x = startX + col * (cellW + gap);
        const y = startY + row * (cellW + gap);
        const hasImg = idx < state.skinCrops.length;

        if (hasImg) {
          // Filled cell
          ctx.fillStyle = "rgba(18, 18, 34, 0.3)";
          ctx.strokeStyle = "rgba(0, 229, 255, 0.12)";
          ctx.lineWidth = 1;
          roundRect(ctx, x, y, cellW, cellW, 8);
          ctx.fill();
          ctx.stroke();

          // Cell number badge (top-left)
          const badgeSize = Math.round(cellW * 0.26);
          ctx.fillStyle = "rgba(0, 229, 255, 0.85)";
          ctx.strokeStyle = "rgba(0, 132, 180, 0.9)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x + badgeSize / 2 + 6, y + badgeSize / 2 + 6, badgeSize / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Number
          ctx.fillStyle = "#0a0a0f";
          ctx.font = `bold ${Math.round(cellW * 0.11)}px -apple-system, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(idx + 1, x + badgeSize / 2 + 6, y + badgeSize / 2 + 6);
        } else {
          // Empty cell
          ctx.fillStyle = "rgba(30, 30, 48, 0.3)";
          ctx.strokeStyle = "rgba(0, 229, 255, 0.06)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          roundRect(ctx, x, y, cellW, cellW, 8);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
  }

  /* ===== PROFILE SLOT ===== */
  function drawProfileImage(slot) {
    if (!state.profileImg) {
      ctx.fillStyle = "rgba(30, 30, 48, 0.3)";
      ctx.strokeStyle = "rgba(0, 229, 255, 0.15)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(slot.cx, slot.cy, slot.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Dotted inner circle
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "rgba(0, 229, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(slot.cx, slot.cy, slot.r - 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Camera hint
      ctx.fillStyle = "rgba(0, 229, 255, 0.2)";
      ctx.font = "bold 42px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("📷", slot.cx, slot.cy);

      return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(slot.cx, slot.cy, slot.r, 0, Math.PI * 2);
    ctx.clip();
    drawImageCover(ctx, state.profileImg, slot.cx - slot.r, slot.cy - slot.r, slot.r * 2, slot.r * 2);
    ctx.restore();

    // Outer ring
    ctx.strokeStyle = "rgba(0, 229, 255, 0.5)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(slot.cx, slot.cy, slot.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  /* ===== RECT SLOTS ===== */
  function drawRectImage(slot, img, label) {
    if (!img) return; // slot already drawn empty with label in drawRectSlot

    drawImageCover(ctx, img, slot.x + 4, slot.y + 4, slot.w - 8, slot.h - 8);

    ctx.strokeStyle = "rgba(0, 229, 255, 0.35)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(0, 229, 255, 0.25)";
    ctx.shadowBlur = 12;
    roundRect(ctx, slot.x + 2, slot.y + 2, slot.w - 4, slot.h - 4, slot.radius);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dim the label slightly when filled
    ctx.fillStyle = "rgba(0, 229, 255, 0.18)";
    ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(label, slot.x + 18, slot.y + 14);
  }

  /* ===== SKIN CROPS ===== */
  function drawSkinCrops(slot) {
    const cols = state.rowSize;
    const gap = 14;
    const startX = slot.x;
    const startY = slot.y;
    const cellW = Math.floor((slot.w - gap * (cols - 1)) / cols);

    state.skinCrops.forEach((img, i) => {
      if (!img) return;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cellW + gap);
      const y = startY + row * (cellW + gap);

      ctx.save();
      ctx.shadowColor = "transparent";
      roundRect(ctx, x + 4, y + 4, cellW - 8, cellW - 8, 6);
      ctx.clip();
      ctx.filter = "drop-shadow(0 2px 6px rgba(0,0,0,0.35))";
      drawImageCover(ctx, img, x + 4, y + 4, cellW - 8, cellW - 8);
      ctx.filter = "none";
      ctx.restore();

      ctx.strokeStyle = "rgba(0, 229, 255, 0.2)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, x + 4, y + 4, cellW - 8, cellW - 8, 6);
      ctx.stroke();
    });
  }

  /* ===== WATERMARK ===== */
  function drawWatermark() {
    ctx.save();
    ctx.fillStyle = "rgba(0, 229, 255, 0.035)";
    ctx.font = "bold 36px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ARHAT EDIT", canvas.width / 2, canvas.height - 24);
    ctx.restore();
  }

  /* ===== HELPERS ===== */
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  function drawImageCover(c, img, x, y, w, h) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (iw === 0 || ih === 0) return;

    const scale = Math.max(w / iw, h / ih);
    const iw2 = iw * scale;
    const ih2 = ih * scale;
    const offsetX = x + (w - iw2) / 2;
    const offsetY = y + (h - ih2) / 2;

    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.drawImage(img, offsetX, offsetY, iw2, ih2);
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    });
  }

  function loadImageMany(files) {
    return Promise.all(
      Array.from(files).map(f => loadImage(f).catch(() => null))
    );
  }

  /* ===== BUTTON HANDLERS ===== */
  function setupPicker(btn, input, setter, dotKey) {
    btn.onclick = () => {
      input.value = "";
      input.onchange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        try {
          const img = await loadImage(f);
          setter(img);
          render();
        } catch (err) {
          statusText.textContent = "Error loading image";
          setTimeout(() => statusText.textContent = "Ready", 2000);
        }
      };
      input.click();
    };
  }

  setupPicker(buttons.profile, inputs.profile, (img) => { state.profileImg = img; });
  setupPicker(buttons.collection, inputs.collection, (img) => { state.collectionImg = img; });
  setupPicker(buttons.favorite, inputs.favorite, (img) => { state.favoriteImg = img; });

  buttons.addPhotos.onclick = () => {
    inputs.photos.value = "";
    inputs.photos.onchange = async (e) => {
      if (!e.target.files.length) return;
      const imgs = await loadImageMany(e.target.files);
      for (const img of imgs) {
        if (img) state.skinCrops.push(img);
      }
      render();
    };
    inputs.photos.click();
  };

  buttons.clear.onclick = () => {
    if (!confirm("Clear all images?")) return;
    state.profileImg = null;
    state.collectionImg = null;
    state.favoriteImg = null;
    state.skinCrops = [];
    state.rowSize = 5;
    rowValue.textContent = state.rowSize;
    render();
  };

  buttons.save.onclick = () => {
    const hasContent = state.profileImg || state.collectionImg || state.favoriteImg || state.skinCrops.length > 0;
    if (!hasContent) {
      statusText.textContent = "Add images first!";
      setTimeout(() => statusText.textContent = "Ready", 2000);
      return;
    }
    statusText.textContent = "Saving...";
    const dataURL = canvas.toDataURL("image/png", 0.95);
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = "arhat-edit.png";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    statusText.textContent = "✓ Saved as arhat-edit.png";
    setTimeout(() => statusText.textContent = "Ready", 3000);
  };

  buttons.rowMinus.onclick = () => {
    if (state.rowSize > 3) {
      state.rowSize--;
      rowValue.textContent = state.rowSize;
      render();
    }
  };

  buttons.rowPlus.onclick = () => {
    if (state.rowSize < 10) {
      state.rowSize++;
      rowValue.textContent = state.rowSize;
      render();
    }
  };

  /* ===== STATUS ===== */
  function updateStatus() {
    Object.entries(dots).forEach(([key, dot]) => {
      dot.classList.toggle("active", !!state[key + "Img"]);
    });

    const total = state.skinCrops.length;
    if (total > 0) {
      statusText.textContent = `${total} skin${total > 1 ? "s" : ""} loaded • Row: ${state.rowSize}`;
    } else {
      statusText.textContent = state.rowSize ? `Ready • Row: ${state.rowSize}` : "Ready";
    }
  }

  /* ===== INIT ===== */
  render();
})();
