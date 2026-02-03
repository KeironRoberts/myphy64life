// gameUtilities.js - Utility methods

export class GameUtilities {
  constructor() {
    // Debug state
    this.debugMode = false;
    this.debugLastMessage = null;
    this.debugRepeatCount = 0;
    this.debugPending = null;
    this.debugLastUpdateTime = 0;
    this.debugTimer = null;

    // Audio state
    this.isMuted = localStorage.getItem('physicsMuted') === 'true';
    this.announcementsEnabled = localStorage.getItem('physicsAnnouncements') !== 'false';
    // Initialize persistent/score state
    this.highScore = parseInt(localStorage.getItem('physicsHighScore') || '0', 10) || 0;
    this.mistakes = 0;

    // Throttle constants
    this.DEBUG_RATE_MS = 250;
  }

  // === AUDIO UTILITIES ===
  playSound(audio) {
    audio.currentTime = 0;
    audio.play().catch((e) => console.log('Audio play failed', e));
  }

  playBackgroundMusic(musicFiles) {
    if (this.backgroundMusic) this.backgroundMusic.pause();

    const randomTrack = musicFiles[Math.floor(Math.random() * musicFiles.length)];
    this.backgroundMusic = new Audio(randomTrack);
    this.backgroundMusic.loop = true;
    this.backgroundMusic.volume = 0.05;
    this.backgroundMusic.muted = !!this.isMuted;
    this.backgroundMusic.play().catch((e) => console.log('Music play failed', e));
  }

  /**
   * Register mobile (pointer/touch) and synthetic mouse drag handlers.
   * Options:
   *  - itemSelector, zoneSelector
   *  - onDrop(zone, value, originalLabel, tempId, sourceZoneId)
   *  - getSourceZoneId(el)
   *  - zoneName(zone)
   *  - announce(msg)
   *  - debugLog(msg)
   * Returns an object with dispose() to remove handlers.
   */
  registerMobileDragHandlers(opts = {}) {
    const {
      itemSelector = '.drag-item',
      zoneSelector = '.drop-zone, .source-zone',
      onDrop,
      getSourceZoneId,
      zoneName,
      announce,
      debugLog,
      onPick,
    } = opts;
    // state for pointer drag
    let pointerActive = null;
    let pointerGhost = null;
    let pointerOffsetX = 0;
    let pointerOffsetY = 0;

    const onPointerMove = (ev) => {
      if (!pointerActive || !pointerGhost) return;
      pointerGhost.style.left = ev.clientX - pointerOffsetX + 'px';
      pointerGhost.style.top = ev.clientY - pointerOffsetY + 'px';
      document
        .querySelectorAll('.drop-zone.drag-over, .source-zone.drag-over')
        .forEach((z) => z.classList.remove('drag-over'));
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const zone = el && el.closest ? el.closest(zoneSelector) : null;
      if (zone) zone.classList.add('drag-over');
      const zn = zoneName
        ? zoneName(zone)
        : zone
        ? (zone.dataset && (zone.dataset.var || zone.dataset.target)) || 'unknown'
        : 'none';
      try {
        debugLog && debugLog(`pointermove at (${ev.clientX},${ev.clientY}) over ${zn}`);
      } catch (e) {}
    };

    const onPointerUp = (ev) => {
      if (!pointerActive) return;
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      let zone = el && el.closest ? el.closest(zoneSelector) : null;
      document
        .querySelectorAll('.drop-zone.drag-over')
        .forEach((z) => z.classList.remove('drag-over'));
      if (!zone && el) zone = el.closest('.source-zone') || null;
      const { value, originalLabel, tempId, sourceZoneId } = pointerActive.data;
      try {
        debugLog &&
          debugLog(
            `pointerup at (${ev.clientX},${ev.clientY}) on ${
              zoneName
                ? zoneName(zone)
                : zone
                ? zone.dataset.var || zone.dataset.target || 'unknown'
                : 'none'
            }`
          );
      } catch (e) {}
      try {
        onDrop && onDrop(zone, value, originalLabel, tempId, sourceZoneId);
      } catch (e) {}

      if (pointerGhost && pointerGhost.parentNode)
        pointerGhost.parentNode.removeChild(pointerGhost);
      if (pointerActive.elem) {
        pointerActive.elem.style.opacity = '';
        pointerActive.elem.classList.remove('dragging');
      }
      pointerActive = null;
      pointerGhost = null;

      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };

    const onPointerDown = (e) => {
      const item = e.target && e.target.closest ? e.target.closest(itemSelector) : null;
      if (!item) return;
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      e.preventDefault();
      const value = item.dataset.value || item.dataset.formula || '?';
      const originalLabel = item.dataset.originalLabel || item.textContent.trim();
      const tempId = item.dataset.tempDragId || `drag-${Date.now()}`;
      item.dataset.tempDragId = tempId;
      const sourceZoneId = getSourceZoneId
        ? getSourceZoneId(item)
        : item.closest
        ? item.closest('.drop-zone, .source-zone')?.dataset?.var || 'source'
        : 'source';

      pointerActive = { elem: item, data: { value, originalLabel, tempId, sourceZoneId } };
      try {
        debugLog && debugLog(`pointerdown pick up ${originalLabel} from ${sourceZoneId}`);
      } catch (e) {}
      try {
        announce && announce(`Picked up ${originalLabel}`);
      } catch (e) {}
      try {
        onPick && onPick();
      } catch (e) {}

      pointerGhost = item.cloneNode(true);
      pointerGhost.style.position = 'fixed';
      pointerGhost.style.left = e.clientX - 20 + 'px';
      pointerGhost.style.top = e.clientY - 12 + 'px';
      pointerGhost.style.pointerEvents = 'none';
      pointerGhost.style.opacity = '0.95';
      pointerGhost.style.zIndex = 10000;
      document.body.appendChild(pointerGhost);

      const rect = item.getBoundingClientRect();
      pointerOffsetX = e.clientX - rect.left;
      pointerOffsetY = e.clientY - rect.top;

      item.style.opacity = '0.5';
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    };

    // Synthetic mouse fallback
    let syntheticActive = null;
    const startSyntheticDrag = (item, ev) => {
      if (window.problemSolverNativeDragActive) return;
      if (syntheticActive && syntheticActive.active) return;

      const value = item.dataset.value || item.dataset.formula || '?';
      const originalLabel = item.dataset.originalLabel || item.textContent.trim();
      const tempId = item.dataset.tempDragId || `drag-${Date.now()}`;
      item.dataset.tempDragId = tempId;
      const sourceZoneId = getSourceZoneId
        ? getSourceZoneId(item)
        : item.closest
        ? item.closest('.drop-zone, .source-zone')?.dataset?.var || 'source'
        : 'source';

      const ghostEl = item.cloneNode(true);
      ghostEl.style.position = 'fixed';
      ghostEl.style.left = ev.clientX - 20 + 'px';
      ghostEl.style.top = ev.clientY - 12 + 'px';
      ghostEl.style.pointerEvents = 'none';
      ghostEl.style.opacity = '0.95';
      ghostEl.style.zIndex = 10000;
      document.body.appendChild(ghostEl);

      try {
        debugLog && debugLog(`synthetic drag start pick up ${originalLabel} from ${sourceZoneId}`);
      } catch (e) {}
      try {
        announce && announce(`Picked up ${originalLabel}`);
      } catch (e) {}
      try {
        onPick && onPick();
      } catch (e) {}

      item.style.opacity = '0.5';
      item.classList.add('dragging');

      syntheticActive = {
        active: true,
        elem: item,
        ghost: ghostEl,
        data: { value, originalLabel, tempId, sourceZoneId },
        moveHandler: null,
        upHandler: null,
      };

      syntheticActive.moveHandler = function (mv) {
        if (!syntheticActive.active) return;
        syntheticActive.ghost.style.left = mv.clientX - 20 + 'px';
        syntheticActive.ghost.style.top = mv.clientY - 12 + 'px';
        document
          .querySelectorAll('.drop-zone.drag-over, .source-zone.drag-over')
          .forEach((z) => z.classList.remove('drag-over'));
        const el = document.elementFromPoint(mv.clientX, mv.clientY);
        const zone = el && el.closest ? el.closest(zoneSelector) : null;
        if (zone) zone.classList.add('drag-over');
        try {
          debugLog &&
            debugLog(
              `synthetic mousemove at (${mv.clientX},${mv.clientY}) over ${
                zoneName
                  ? zoneName(zone)
                  : zone
                  ? zone.dataset.var || zone.dataset.target || 'unknown'
                  : 'none'
              }`
            );
        } catch (e) {}
      };

      syntheticActive.upHandler = function (mu) {
        if (!syntheticActive.active) return;
        const el = document.elementFromPoint(mu.clientX, mu.clientY);
        let zone = el && el.closest ? el.closest(zoneSelector) : null;
        if (!zone && el) zone = el.closest('.source-zone') || null;
        try {
          debugLog &&
            debugLog(
              `synthetic mouseup at (${mu.clientX},${mu.clientY}) on ${
                zoneName
                  ? zoneName(zone)
                  : zone
                  ? zone.dataset.var || zone.dataset.target || 'unknown'
                  : 'none'
              }`
            );
        } catch (e) {}
        try {
          onDrop &&
            onDrop(
              zone,
              syntheticActive.data.value,
              syntheticActive.data.originalLabel,
              syntheticActive.data.tempId,
              syntheticActive.data.sourceZoneId
            );
        } catch (e) {}

        if (syntheticActive.ghost && syntheticActive.ghost.parentNode)
          syntheticActive.ghost.parentNode.removeChild(syntheticActive.ghost);
        if (syntheticActive.elem) {
          syntheticActive.elem.style.opacity = '';
          syntheticActive.elem.classList.remove('dragging');
        }

        document.removeEventListener('mousemove', syntheticActive.moveHandler);
        document.removeEventListener('mouseup', syntheticActive.upHandler);
        syntheticActive.active = false;
        syntheticActive = null;
      };

      document.addEventListener('mousemove', syntheticActive.moveHandler);
      document.addEventListener('mouseup', syntheticActive.upHandler);
    };

    const onMouseDownSynthetic = (e) => {
      if (e.button !== 0) return;
      const item = e.target && e.target.closest ? e.target.closest(itemSelector) : null;
      if (!item) return;
      if (window.problemSolverNativeDragActive) return;

      const sx = e.clientX,
        sy = e.clientY;
      const onMove = function (mv) {
        if (Math.hypot(mv.clientX - sx, mv.clientY - sy) > 6) {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          startSyntheticDrag(item, mv);
        }
      };
      const onUp = function () {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('mousedown', onMouseDownSynthetic);

    return {
      dispose() {
        document.removeEventListener('pointerdown', onPointerDown);
        document.removeEventListener('mousedown', onMouseDownSynthetic);
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
      },
    };
  }

  applyMute(backgroundMusic, correctSound, wrongSound) {
    if (backgroundMusic) backgroundMusic.muted = !!this.isMuted;
    if (correctSound) correctSound.muted = !!this.isMuted;
    if (wrongSound) wrongSound.muted = !!this.isMuted;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('physicsMuted', String(this.isMuted));
    return this.isMuted ? '🔇' : '🔊';
  }

  // === DEBUG UTILITIES ===
  debugLog(msg) {
    if (!this.debugMode) return;

    try {
      const ts = new Date().toLocaleTimeString();
      console.debug('PS DEBUG', ts, msg);

      // Track repeats immediately
      if (this.debugLastMessage === msg) {
        this.debugRepeatCount++;
      } else {
        this.debugLastMessage = msg;
        this.debugRepeatCount = 1;
      }

      this.debugPending = {
        msg: this.debugLastMessage,
        count: this.debugRepeatCount,
        ts,
      };

      const ov = document.getElementById('psDebugOverlay');
      if (!ov) return;

      const doUpdate = () => {
        try {
          ov.classList.remove('hidden');
          const pending = this.debugPending;
          const text =
            pending.count > 1
              ? `${pending.ts} ${pending.msg} (${pending.count}x)`
              : `${pending.ts} ${pending.msg}`;

          const first = ov.firstChild;
          if (first && first.textContent.indexOf(pending.msg) !== -1) {
            first.textContent = text;
          } else {
            const line = document.createElement('div');
            line.textContent = text;
            ov.insertBefore(line, ov.firstChild);
          }

          // Limit log lines
          while (ov.childElementCount > 60) {
            ov.removeChild(ov.lastChild);
          }
          this.debugLastUpdateTime = Date.now();
        } catch (e) {}
      };

      const now = Date.now();
      const elapsed = now - (this.debugLastUpdateTime || 0);

      if (!this.debugTimer && elapsed >= this.DEBUG_RATE_MS) {
        doUpdate();
      } else {
        if (this.debugTimer) clearTimeout(this.debugTimer);
        const wait = Math.max(0, this.DEBUG_RATE_MS - elapsed);
        this.debugTimer = setTimeout(() => {
          this.debugTimer = null;
          doUpdate();
        }, wait);
      }
    } catch (e) {}
  }

  // === STATE MANAGEMENT ===
  saveProgress(highScore, completedProblems) {
    const hs = Math.max(highScore || 0, this.highScore || 0);
    localStorage.setItem('physicsHighScore', String(hs));
    localStorage.setItem('physicsProgress', JSON.stringify(completedProblems.slice(-10)));
  }

  resetProblemState(currentStep, currentUnknownIndex, solvedVariables, startTime) {
    currentStep = 1;
    currentUnknownIndex = 0;
    solvedVariables = [];
    startTime = Date.now();
  }

  // === GENERAL HELPERS ===
  debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  updateScore(score, points = 0, isPenalty = false, startTime) {
    if (isPenalty) {
      this.mistakes++;
      score = Math.max(0, score - 10);
    } else if (points > 0) {
      const timeBonus = Math.max(0.5, 3.0 - (Date.now() - startTime) / 10000);
      score += points * timeBonus;
    }

    const scoreEl = document.getElementById('scoreDisplay');
    if (scoreEl) scoreEl.textContent = String(Math.round(score));
    return Math.round(score);
  }

  // === ANNOUNCEMENTS ===
  announce(msg, assertive = false) {
    if (!this.announcementsEnabled) return;

    try {
      const el = document.getElementById('psLive');
      if (!el) return;

      el.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
      el.textContent = msg;
      setTimeout(() => (el.textContent = ''), 20);
    } catch (e) {
      console.warn('Announce failed', e);
    }
  }

  toggleAnnouncements() {
    this.announcementsEnabled = !this.announcementsEnabled;
    localStorage.setItem('physicsAnnouncements', String(this.announcementsEnabled));
    return this.announcementsEnabled ? 'Aa' : 'aA';
  }
}
