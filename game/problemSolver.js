// problemSolver.js - kill me
import { problems } from './config.js';
import { TEMPLATES } from './templates.js';


export class ProblemSolver {
  constructor() {
  this.currentStep = 1;
  this.score = 0;
  this.startTime = Date.now();
  this.currentProblem = 0;
  this.mistakes = 0;
  this.solvedProblems = new Set();
  this.currentUnknownIndex = 0;
  this.solvedVariables = [];
 
  this.completedProblems = JSON.parse(localStorage.getItem('physicsProgress') || '[]');
  this.highScore = parseInt(localStorage.getItem('physicsHighScore') || '0');
  this.debouncedSetupDrag = this.debounce(this.setupDragDrop.bind(this), 200);
  
  // Drag state for calculator
  this.isDragging = false;
  this.dragOffsetX = 0;
  this.dragOffsetY = 0;
  this.boundMouseMove = null;
  this.boundMouseUp = null;

  // Audio setup
  this.correctSound = new Audio('./sounds/correct-yay.mp3');
  this.correctSound.volume = 0.33;
  this.wrongSound = new Audio('./sounds/wrong-buzzer.mp3');
  this.wrongSound.volume = 0.33;
  this.backgroundMusic = null;
  this.musicFiles = [
    './sounds/music/Cartoon, Jéja - On & On (feat. Daniel Levi).mp3',
    './sounds/music/DEAF KEV - Invincible.mp3',
    './sounds/music/Different Heaven & EH!DE - My Heart  Drumstep.mp3',
    './sounds/music/Disfigure - Blank.mp3',
    './sounds/music/Elektronomia - Sky High Progressive House.mp3'
  ];
 
  window.addEventListener('beforeunload', () => this.saveProgress());
  document.addEventListener('keydown', (e) => this.handleDebugKeybind(e));
  this.init();
}
  /* INITIALIZE */
  init() {
    this.problems = problems;
    this.selectRandomProblem();
    this.setupUI();
    this.setupMusicOnFirstInteraction();
  }

  setupMusicOnFirstInteraction() {
    const playMusicOnce = () => {
      this.playBackgroundMusic();
      document.removeEventListener('click', playMusicOnce);
      document.removeEventListener('keydown', playMusicOnce);
    };
    document.addEventListener('click', playMusicOnce, { once: true });
    document.addEventListener('keydown', playMusicOnce, { once: true });
  }
  selectRandomProblem() {
    let attempts = 0;
    do {
      this.currentProblem = Math.floor(Math.random() * this.problems.length);
      attempts++;
    } while (this.solvedProblems.has(this.currentProblem) && attempts < 20);
   
    this.problem = this.problems[this.currentProblem];
    console.log('Selected problem:', this.problem.text.substring(0, 50));
  }
  setupUI() {
    this.createGameLayout();
    this.renderPanel();
    this.renderProblemText();
    this.bindEvents();
    this.renderCurrentStep();
    this.startTimer();
  }
  createGameLayout() {
    if (document.getElementById('gameContainer')) return;

    // Main container with a class we can target in CSS for responsive behavior
    const container = document.createElement('div');
    container.id = 'gameContainer';
    container.className = 'game-layout';
    // Container styles handled via `game/gameStyle.css` (#gameContainer)

    const canvasContainer = document.getElementById('problem-container');

    document.body.insertBefore(container, document.body.firstChild);
    container.appendChild(canvasContainer);

    this.leftPanel = document.createElement('div');
    this.leftPanel.id = 'solverPanel';
    this.leftPanel.className = 'solver-panel';
    // Visual styles for `#solverPanel` are defined in `game/gameStyle.css`
    container.insertBefore(this.leftPanel, canvasContainer);

    const calcButton = document.createElement('button');
    calcButton.id = 'calcToggle';
    calcButton.textContent = 'Calculator';
    // Styling handled by CSS: add class for calc toggle
    calcButton.classList.add('calc-toggle');
    calcButton.onclick = () => this.toggleCalculator();
    this.leftPanel.appendChild(calcButton);

    const contentArea = document.createElement('div');
    contentArea.id = 'panelContent';
    this.leftPanel.appendChild(contentArea);
    this.contentArea = contentArea;

    // Styles moved to `game/gameStyle.css` for maintainability and better caching.
    // Keep a note in case dynamic adjustments are needed at runtime.

    // Mute and Announcements controls (persisted state)
    this.isMuted = localStorage.getItem('physicsMuted') === 'true';
    let storedAnn = localStorage.getItem('physicsAnnouncements');
    this.announcementsEnabled = (storedAnn === null) ? true : (storedAnn === 'true');

    if (!document.getElementById('muteToggle')) {
      const muteBtn = document.createElement('button');
      muteBtn.id = 'muteToggle';
      muteBtn.textContent = this.isMuted ? '🔇' : '🔊';
      muteBtn.setAttribute('aria-pressed', this.isMuted ? 'true' : 'false');
      muteBtn.setAttribute('aria-label', 'Toggle music mute');
      // Styling handled by CSS
      muteBtn.classList.add('ps-fab-btn');
      muteBtn.classList.add('ps-fab-mute');
      muteBtn.onclick = () => this.toggleMute();
      document.body.appendChild(muteBtn);
    }

    if (!document.getElementById('announceToggle')) {
      const annBtn = document.createElement('button');
      annBtn.id = 'announceToggle';
      annBtn.textContent = this.announcementsEnabled ? 'Aa' : 'aA';
      annBtn.setAttribute('aria-pressed', this.announcementsEnabled ? 'true' : 'false');
      annBtn.setAttribute('aria-label', 'Toggle announcements');
      // Styling handled by CSS
      annBtn.classList.add('ps-fab-btn');
      annBtn.classList.add('ps-fab-ann');
      annBtn.onclick = () => this.toggleAnnouncements();
      document.body.appendChild(annBtn);
    }

    // Debug toggle and overlay
    this.debugMode = false;
    if (!document.getElementById('debugToggle')) {
      const dbgBtn = document.createElement('button');
      dbgBtn.id = 'debugToggle';
      dbgBtn.textContent = 'Dbg';
      dbgBtn.setAttribute('aria-pressed', 'false');
      dbgBtn.setAttribute('aria-label', 'Toggle debug logs');
      // Styling handled by CSS
      dbgBtn.classList.add('ps-fab-btn');
      dbgBtn.classList.add('ps-fab-dbg');
      dbgBtn.onclick = () => {
        this.debugMode = !this.debugMode;
        dbgBtn.setAttribute('aria-pressed', this.debugMode ? 'true' : 'false');
        const ov = document.getElementById('psDebugOverlay');
        if (this.debugMode) {
          // reset dedup state when (re)enabling debug so prior repeat counters don't carry over
          this._debugLastMessage = null;
          this._debugRepeatCount = 0;
          if (ov) ov.classList.remove('hidden');
        } else {
          if (ov) ov.classList.add('hidden');
        }
        this.debugLog('Debug ' + (this.debugMode ? 'enabled' : 'disabled'));
      };
      document.body.appendChild(dbgBtn);
    }

    if (!document.getElementById('psDebugOverlay')) {
      const ov = document.createElement('div');
      ov.id = 'psDebugOverlay';
      // Presentation handled by `game/gameStyle.css` now; initially keep it hidden
      ov.classList.add('hidden');
      ov.setAttribute('aria-hidden', 'true');
      document.body.appendChild(ov);
    }

    // Hidden live region for screen readers
    if (!document.getElementById('psLive')) {
      const live = document.createElement('div');
      live.id = 'psLive';
      // Hide live region visually; CSS class handles positioning
      live.classList.add('visually-hidden');
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      document.body.appendChild(live);
    }

    this.applyMute();
  }
  renderPanel() {
    if (!this.contentArea) return;
    this.contentArea.innerHTML = TEMPLATES.SOLVER_PANEL;
  }
  renderProblemText() {
    const probText = document.getElementById('probText');
    if (probText) probText.textContent = this.problem.text;
  }
  startTimer() {
    const update = () => {
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
      const timerDisplay = document.getElementById('timerDisplay');
      if (timerDisplay) timerDisplay.textContent = elapsed;
      if (this.currentStep < 4) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }


  debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

  playSound(audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.log('Audio play failed:', e));
  }

  playBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
    }
    const randomTrack = this.musicFiles[Math.floor(Math.random() * this.musicFiles.length)];
    this.backgroundMusic = new Audio(randomTrack);
    this.backgroundMusic.loop = true;
    this.backgroundMusic.volume = 0.05;
    // Respect saved mute preference
    this.backgroundMusic.muted = !!this.isMuted;
    this.backgroundMusic.play().catch(e => console.log('Music play failed:', e));
  }

  handleDebugKeybind(e) {
    if (e.altKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      this.nextStep();
    }
  }

  resetProblemState() {
    this.currentStep = 1;
    this.currentUnknownIndex = 0;
    this.solvedVariables = [];
    this.startTime = Date.now();
  }

  // Start
  renderCurrentStep() {
  const container = document.getElementById('stepsContainer');
  if (!container) return;
 
  if (this.currentStep === 1) {
    container.innerHTML = TEMPLATES.STEP1(this.problem);
  } else if (this.currentStep === 2) {
    container.innerHTML = TEMPLATES.STEP2(this.problem);
  } else if (this.currentStep === 3) {
    const currentUnknown = this.problem.unknowns?.[this.currentUnknownIndex || 0];
    container.innerHTML = TEMPLATES.STEP3({ ...this.problem, unknowns: [currentUnknown] }, this.solvedVariables);
  }

  setTimeout(() => this.debouncedSetupDrag(), 100);
}



  /* CALCULATOR SYSTEM */
  toggleCalculator() {
    const overlay = document.getElementById('calculator');
    if (overlay) {
      // Remove old drag listeners before removing element
      if (this.boundMouseMove) {
        document.removeEventListener('mousemove', this.boundMouseMove);
        this.boundMouseMove = null;
      }
      if (this.boundMouseUp) {
        document.removeEventListener('mouseup', this.boundMouseUp);
        this.boundMouseUp = null;
      }
      // Remove old keyboard listener before removing element
      if (this.boundKeyHandler) {
        document.removeEventListener('keydown', this.boundKeyHandler);
        this.boundKeyHandler = null;
      }
      overlay.remove();
    } else {
      this.showCalculator();
    }
  }
  showCalculator() {
    const overlay = document.createElement('div');
    overlay.id = 'calculator';
    overlay.className = 'calculator';
    overlay.innerHTML = TEMPLATES.CALCULATOR(this.problem.givens[0]?.label, this.problem.givens[1]?.label);
    overlay.style.left = '20px';
    overlay.style.top = '100px';
    document.body.appendChild(overlay);
    this.bindCalculator();
    this.makeCalculatorDraggable();
  }
  bindCalculator() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('calc-btn')) {
        const display = document.getElementById('calcDisplay');
        if (display) {
          this.handleCalcInput(e.target.dataset.value, display);
          const finalInput = document.getElementById('finalAnswer');
          if (finalInput && !finalInput.value) finalInput.value = display.value;
        }
      } else if (e.target.classList.contains('close-btn')) {
        this.toggleCalculator();
      }
    });


    this.boundKeyHandler = (e) => {
      if (!document.getElementById('calculator')) return;
      let value = '';
      if ('0123456789.'.includes(e.key)) value = e.key;
      else if (e.key === '+') value = '+';
      else if (e.key === '-') value = '-';
      else if (e.key === '*') value = '×';
      else if (e.key === '/') value = '÷';
      else if (e.key === '(') value = '(';
      else if (e.key === ')') value = ')';
      else if (e.key === 'Enter' || e.key === '=') value = '=';
      else if (e.key === 'Backspace') value = 'BACKSPACE';
      else if (e.key === 'Escape') return this.toggleCalculator();
     
      if (value) {
        e.preventDefault();
        const display = document.getElementById('calcDisplay');
        if (display) this.handleCalcInput(value, display);
      }
    };
    document.addEventListener('keydown', this.boundKeyHandler);
  }
  handleCalcInput(value, display) {
    let current = display.value;
   
    switch (value) {
      case 'C': display.value = '0'; break;
      case 'BACKSPACE':
        display.value = current === '0' || current === 'Error' ? '0' : current.slice(0, -1) || '0';
        break;
      case '=':
        try {
          let expr = current
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/sin/g, 'Math.sin')
            .replace(/cos/g, 'Math.cos')
            .replace(/tan/g, 'Math.tan');
          
          // Convert degrees to radians for trig functions
          expr = expr.replace(/Math\.(sin|cos|tan)\(([^)]+)\)/g, (match, func, angle) => {
            return `Math.${func}(${angle}*Math.PI/180)`;
          });
          
          let result = eval(expr);
          display.value = isNaN(result) ? 'Error' : result.toFixed(4);
        } catch { 
          display.value = 'Error'; 
        }
        break;
      case '+': case '-': case '×': case '÷':
        display.value = current === '0' ? value : current + value;
        break;
      case '(': case ')':
        display.value = current === '0' ? value : current + value;
        break;
      case 'sin': case 'cos': case 'tan':
        display.value = current === '0' ? value + '(' : current + value + '(';
        break;
      default:
        display.value = (current === '0' && value !== '.') ? value : current + value;
    }
  }

  makeCalculatorDraggable() {
  const calcOverlay = document.getElementById('calculator');
  if (!calcOverlay) return;

  const header = calcOverlay.querySelector('.calc-header');
  if (!header) return;

  header.style.cursor = 'grab';

  const handleMouseDown = (e) => {
    this.isDragging = true;
    header.style.cursor = 'grabbing';
    
    const rect = calcOverlay.getBoundingClientRect();
    this.dragOffsetX = e.clientX - rect.left;
    this.dragOffsetY = e.clientY - rect.top;
    
    e.preventDefault();
  };

  this.boundMouseMove = (e) => {
    if (!this.isDragging) return;
    calcOverlay.style.left = (e.clientX - this.dragOffsetX) + 'px';
    calcOverlay.style.top = (e.clientY - this.dragOffsetY) + 'px';
  };

  this.boundMouseUp = () => {
    this.isDragging = false;
    header.style.cursor = 'grab';
  };

  header.addEventListener('mousedown', handleMouseDown);
  header.addEventListener('pointerdown', handleMouseDown);
  document.addEventListener('mousemove', this.boundMouseMove);
  document.addEventListener('pointermove', this.boundMouseMove);
  document.addEventListener('mouseup', this.boundMouseUp);
  document.addEventListener('pointerup', this.boundMouseUp);
}



  bindEvents() {
    // Event delegation for ALL check buttons
    this.contentArea.addEventListener('click', (e) => {
      if (e.target.matches('.check-btn')) {
        console.log('Check button clicked, step:', this.currentStep);
        this[`checkStep${this.currentStep}`]?.call(this);
      }
    });


    // Completion buttons
    document.addEventListener('click', (e) => {
      if (e.target.id === 'nextProblem') {
        this.nextProblem();
      } else if (e.target.id === 'restartAll') {
        this.restartAll();
      }
      else if (e.target.id === 'homepage'){
        window.location.href = "../index.html";
      }
    });

    // Keyboard-based drag/drop (Enter/Space to pick up, Enter/Space on drop-zone to drop, Esc to cancel)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.keyboardHeld) {
          this.keyboardHeld.elem.classList.remove('held');
          this.keyboardHeld = null;
        }
      }

      if (e.key === 'Enter' || e.key === ' ') {
        const active = document.activeElement;
        if (!active) return;

        if (active.classList && active.classList.contains('drag-item')) {
          e.preventDefault();
          if (!this.keyboardHeld) {
            const value = active.dataset.value || active.dataset.formula || '?';
            const originalLabel = active.dataset.originalLabel || active.textContent.trim();
            const tempId = active.dataset.tempDragId || `kbd-${Date.now()}`;
            active.dataset.tempDragId = tempId;
            const sourceZone = active.closest('.drop-zone, .source-zone');
            const sourceZoneId = sourceZone ? (sourceZone.closest('.source-zone') ? 'source' : (sourceZone.dataset.var || 'unknown')) : 'source';
            this.keyboardHeld = { elem: active, data: { value, originalLabel, tempId, sourceZoneId } };
            active.classList.add('held');
          } else {
            this.keyboardHeld.elem.classList.remove('held');
            this.keyboardHeld = null;
          }
        } else if (active.classList && active.classList.contains('drop-zone')) {
          e.preventDefault();
          if (this.keyboardHeld) {
            this.handleDrop(active, this.keyboardHeld.data.value, this.keyboardHeld.data.originalLabel, this.keyboardHeld.data.tempId, this.keyboardHeld.data.sourceZoneId);
            this.keyboardHeld.elem.classList.remove('held');
            this.keyboardHeld = null;
          }
        }
      }
    });
  }


  /* DRAGGER SYSTEM */
  setupDragDrop() {
  if (window.problemSolverDragSetup) { console.info('ProblemSolver: setupDragDrop skipped — already initialized'); return; }
  window.problemSolverDragSetup = true;
  console.info('ProblemSolver: setupDragDrop started');

  const self = this;

  // Native drag events (desktop)
  document.addEventListener('dragstart', function(e) {
    const item = e.target.closest('.drag-item');
    if (!item) return;

    const sourceZone = item.closest('.drop-zone, .source-zone');
    const sourceZoneId = sourceZone ? (sourceZone.closest('.source-zone') ? 'source' : (sourceZone.dataset.var || 'unknown')) : 'source';

    const value = item.dataset.value || item.dataset.formula || '?';
    const originalLabel = item.dataset.originalLabel || item.textContent.trim();
    const id = item.dataset.tempDragId || `drag-${Date.now()}`;

    try {
      e.dataTransfer.setData('text/plain', value);
      e.dataTransfer.setData('text/label', originalLabel);
      e.dataTransfer.setData('text/id', id);
      e.dataTransfer.setData('text/sourceZoneId', sourceZoneId);
    } catch (err) { /* ignore */ }

    item.dataset.originalLabel = originalLabel;
    item.dataset.tempDragId = id;
    item.style.opacity = '0.5';
    item.classList.add('dragging');
    // mark native drag active so synthetic mouse fallback doesn't interfere
    window.problemSolverNativeDragActive = true;
    console.info('ProblemSolver: dragstart', originalLabel, 'from', sourceZoneId);
    try { self.debugLog && self.debugLog(`dragstart: ${originalLabel} (from ${sourceZoneId})`); } catch(e) {}
    try { self.announce && self.announce(`Picked up ${originalLabel}`); } catch(e) {}
  });

  // clear native drag flag on dragend
  document.addEventListener('dragend', function(e) {
    window.problemSolverNativeDragActive = false;
    try { const it = e.target.closest && e.target.closest('.drag-item'); if (it) { it.style.opacity = ''; it.classList.remove('dragging'); } } catch (err) {}
  });

  document.addEventListener('dragover', function(e) {
    e.preventDefault();
    try { e.dataTransfer.dropEffect = 'move'; } catch(err) {}
    document.querySelectorAll('.drop-zone.drag-over').forEach(z => z.classList.remove('drag-over'));
    const zone = e.target.closest('.drop-zone, .source-zone');
    if (zone) zone.classList.add('drag-over');
    const zoneName = zone ? (zone.dataset.var || zone.dataset.target || (zone.classList && zone.classList.contains('source-zone') ? 'source' : 'unknown')) : 'none';
    console.info('ProblemSolver: dragover at', e.clientX + ',' + e.clientY, 'over', zoneName);
    try { self.debugLog && self.debugLog(`dragover at (${e.clientX},${e.clientY}) over ${zoneName}`); } catch(e) {}
  });

  document.addEventListener('drop', function(e) {
    e.preventDefault();
    document.querySelectorAll('.drop-zone.drag-over').forEach(z => z.classList.remove('drag-over'));

    let zone = e.target.closest('.drop-zone, .source-zone');
    if (!zone) {
      // if not on a drop-zone or source area, try to resolve the source container under the point
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el) {
        const src = el.closest('.source-zone');
        if (src) zone = src;
      }
      if (!zone) return;
    }

    const value = e.dataTransfer.getData('text/plain');
    const originalLabel = e.dataTransfer.getData('text/label');
    const tempId = e.dataTransfer.getData('text/id');
    const sourceZoneId = e.dataTransfer.getData('text/sourceZoneId') || 'unknown';

    const zoneName = zone ? (zone.dataset.var || zone.dataset.target || (zone.classList && zone.classList.contains('source-zone') ? 'source' : 'unknown')) : 'none';
    console.info('ProblemSolver: drop', originalLabel, value, 'on', zoneName, 'at', e.clientX + ',' + e.clientY);
    try { self.debugLog && self.debugLog(`drop at (${e.clientX},${e.clientY}) on ${zoneName}`); } catch(e) {}
    self.handleDrop(zone, value, originalLabel, tempId, sourceZoneId);
  });

  // Pointer (touch) based dragging for mobile/tablet
  let active = null;
  let ghost = null;
  let offsetX = 0, offsetY = 0;

  const onPointerMove = (ev) => {
    if (!active || !ghost) return;
    ghost.style.left = (ev.clientX - offsetX) + 'px';
    ghost.style.top = (ev.clientY - offsetY) + 'px';
    document.querySelectorAll('.drop-zone.drag-over, .source-zone.drag-over').forEach(z => z.classList.remove('drag-over'));
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const zone = el && el.closest ? el.closest('.drop-zone, .source-zone') : null;
    if (zone) zone.classList.add('drag-over');
    const zoneName = zone ? (zone.dataset.var || zone.dataset.target || (zone.classList && zone.classList.contains('source-zone') ? 'source' : 'unknown')) : 'none';
    console.info('ProblemSolver: pointermove at', ev.clientX + ',' + ev.clientY, 'over', zoneName);
    try { self.debugLog && self.debugLog(`pointermove at (${ev.clientX},${ev.clientY}) over ${zoneName}`); } catch(e) {}
  };

  const onPointerUp = (ev) => {
    if (!active) return;
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    let zone = el && el.closest ? el.closest('.drop-zone, .source-zone') : null;

    document.querySelectorAll('.drop-zone.drag-over').forEach(z => z.classList.remove('drag-over'));

    // fallback: try to find source zone directly under the point
    if (!zone && el) zone = el.closest('.source-zone') || null;

    const { value, originalLabel, tempId, sourceZoneId } = active.data;

    const zoneName = zone ? (zone.dataset.var || zone.dataset.target || (zone.classList && zone.classList.contains('source-zone') ? 'source' : 'unknown')) : 'none';
    console.info('ProblemSolver: pointerup at', ev.clientX + ',' + ev.clientY, 'on', zoneName);
    try { self.debugLog && self.debugLog(`pointerup at (${ev.clientX},${ev.clientY}) on ${zoneName}`); } catch(e) {}
    self.handleDrop(zone, value, originalLabel, tempId, sourceZoneId);

    if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
    if (active.elem) {
      active.elem.style.opacity = '';
      active.elem.classList.remove('dragging');
    }
    active = null;
    ghost = null;

    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
  };

  document.addEventListener('pointerdown', function(e) {
    const item = e.target.closest('.drag-item');
    if (!item) return;

    // Handle touch and pen; leave mouse to native drag
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;

    e.preventDefault();

    const value = item.dataset.value || item.dataset.formula || '?';
    const originalLabel = item.dataset.originalLabel || item.textContent.trim();
    const tempId = item.dataset.tempDragId || `drag-${Date.now()}`;
    item.dataset.tempDragId = tempId;

    const sourceZone = item.closest('.drop-zone, .source-zone');
    const sourceZoneId = sourceZone ? (sourceZone.closest('.source-zone') ? 'source' : (sourceZone.dataset.var || 'unknown')) : 'source';

    active = { elem: item, data: { value, originalLabel, tempId, sourceZoneId } };
    console.info('ProblemSolver: pointerdown pick up', originalLabel, 'from', sourceZoneId);
    try { self.announce && self.announce(`Picked up ${originalLabel}`); } catch(e) {}

    // Create ghost element to follow finger
    ghost = item.cloneNode(true);
    ghost.style.position = 'fixed';
    ghost.style.left = (e.clientX - 20) + 'px';
    ghost.style.top = (e.clientY - 12) + 'px';
    ghost.style.pointerEvents = 'none';
    ghost.style.opacity = '0.95';
    ghost.style.zIndex = 10000;
    document.body.appendChild(ghost);

    const rect = item.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    item.style.opacity = '0.5';

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  });

  // Synthetic mouse fallback: mousedown -> small move -> synthetic drag (for desktops where native dragstart is unreliable)
  (function(){
    let mouseSynthetic = null;

    const startSyntheticDrag = (item, ev) => {
      if (window.problemSolverNativeDragActive) return;
      if (mouseSynthetic && mouseSynthetic.active) return;

      const value = item.dataset.value || item.dataset.formula || '?';
      const originalLabel = item.dataset.originalLabel || item.textContent.trim();
      const tempId = item.dataset.tempDragId || `drag-${Date.now()}`;
      item.dataset.tempDragId = tempId;
      const sourceZone = item.closest('.drop-zone, .source-zone');
      const sourceZoneId = sourceZone ? (sourceZone.closest('.source-zone') ? 'source' : (sourceZone.dataset.var || 'unknown')) : 'source';

      const ghostEl = item.cloneNode(true);
      ghostEl.style.position = 'fixed';
      ghostEl.style.left = (ev.clientX - 20) + 'px';
      ghostEl.style.top = (ev.clientY - 12) + 'px';
      ghostEl.style.pointerEvents = 'none';
      ghostEl.style.opacity = '0.95';
      ghostEl.style.zIndex = 10000;
      document.body.appendChild(ghostEl);

      item.style.opacity = '0.5';
      item.classList.add('dragging');

      mouseSynthetic = {
        active: true,
        elem: item,
        ghost: ghostEl,
        data: { value, originalLabel, tempId, sourceZoneId },
        moveHandler: null,
        upHandler: null
      };

      mouseSynthetic.moveHandler = function(mv) {
        if (!mouseSynthetic.active) return;
        mouseSynthetic.ghost.style.left = (mv.clientX - 20) + 'px';
        mouseSynthetic.ghost.style.top = (mv.clientY - 12) + 'px';
        document.querySelectorAll('.drop-zone.drag-over, .source-zone.drag-over').forEach(z => z.classList.remove('drag-over'));
        const el = document.elementFromPoint(mv.clientX, mv.clientY);
        const zone = el && el.closest ? el.closest('.drop-zone, .source-zone') : null;
        if (zone) zone.classList.add('drag-over');
        const zoneName = zone ? (zone.dataset.var || zone.dataset.target || (zone.classList && zone.classList.contains('source-zone') ? 'source' : 'unknown')) : 'none';
        console.info('ProblemSolver: synthetic mousemove at', mv.clientX + ',' + mv.clientY, 'over', zoneName);
        try { self.debugLog && self.debugLog(`synthetic mousemove at (${mv.clientX},${mv.clientY}) over ${zoneName}`); } catch(e) {}
      };

      mouseSynthetic.upHandler = function(mu) {
        if (!mouseSynthetic.active) return;
        const el = document.elementFromPoint(mu.clientX, mu.clientY);
        let zone = el && el.closest ? el.closest('.drop-zone, .source-zone') : null;
        if (!zone && el) zone = el.closest('.source-zone') || null;
        const zoneName = zone ? (zone.dataset.var || zone.dataset.target || (zone.classList && zone.classList.contains('source-zone') ? 'source' : 'unknown')) : 'none';
        console.info('ProblemSolver: synthetic mouseup at', mu.clientX + ',' + mu.clientY, 'on', zoneName);
        try { self.debugLog && self.debugLog(`synthetic mouseup at (${mu.clientX},${mu.clientY}) on ${zoneName}`); } catch(e) {}
        self.handleDrop(zone, mouseSynthetic.data.value, mouseSynthetic.data.originalLabel, mouseSynthetic.data.tempId, mouseSynthetic.data.sourceZoneId);

        if (mouseSynthetic.ghost && mouseSynthetic.ghost.parentNode) mouseSynthetic.ghost.parentNode.removeChild(mouseSynthetic.ghost);
        if (mouseSynthetic.elem) {
          mouseSynthetic.elem.style.opacity = '';
          mouseSynthetic.elem.classList.remove('dragging');
        }

        document.removeEventListener('mousemove', mouseSynthetic.moveHandler);
        document.removeEventListener('mouseup', mouseSynthetic.upHandler);
        mouseSynthetic.active = false;
        mouseSynthetic = null;
      };

      document.addEventListener('mousemove', mouseSynthetic.moveHandler);
      document.addEventListener('mouseup', mouseSynthetic.upHandler);
    };

    // Start tracking on mousedown; begin synthetic drag after small move threshold
    document.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      const item = e.target.closest('.drag-item');
      if (!item) return;
      if (window.problemSolverNativeDragActive) return;

      const sx = e.clientX, sy = e.clientY;
      const onMove = function(mv) {
        if (Math.hypot(mv.clientX - sx, mv.clientY - sy) > 6) {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          startSyntheticDrag(item, mv);
        }
      };
      const onUp = function() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  })();

  // Ensure drag-items are initialized when inserted (handles re-renders)
  const itemDragStartHandler = function(e) {
    const item = this;
    const originalLabel = item.dataset.originalLabel || item.textContent.trim();
    const value = item.dataset.value || item.dataset.formula || '?';
    const id = item.dataset.tempDragId || `drag-${Date.now()}`;
    const sourceZone = item.closest('.drop-zone, .source-zone');
    const sourceZoneId = sourceZone ? (sourceZone.closest('.source-zone') ? 'source' : (sourceZone.dataset.var || 'unknown')) : 'source';
    try {
      if (e.dataTransfer) {
        e.dataTransfer.setData('text/plain', value);
        e.dataTransfer.setData('text/label', originalLabel);
        e.dataTransfer.setData('text/id', id);
        e.dataTransfer.setData('text/sourceZoneId', sourceZoneId);
      }
    } catch (err) { /* ignore */ }
    item.style.opacity = '0.5';
    try { self.announce && self.announce(`Picked up ${originalLabel}`); } catch(e) {}
  };

  const ensureItems = () => {
    const newly = document.querySelectorAll('.drag-item:not([data-ps-init])');
    newly.forEach(item => {
      item.setAttribute('data-ps-init','1');
      item.draggable = true;
      if (!item.hasAttribute('tabindex')) item.tabIndex = 0;
      if (!item.dataset.originalLabel) item.dataset.originalLabel = item.textContent.trim();
      if (!item.dataset.tempDragId) item.dataset.tempDragId = `drag-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
      item.addEventListener('dragstart', itemDragStartHandler);
      item.addEventListener('dragend', function() {
        this.style.opacity = '';
        this.classList.remove('dragging');
        document.querySelectorAll('.drop-zone.drag-over').forEach(z => z.classList.remove('drag-over'));
        try { self.debugLog && self.debugLog(`dragend: ${this.dataset.originalLabel || this.textContent.trim()}`); } catch(e) {}
      });
      // mousedown for debug fallback / detection
      item.addEventListener('mousedown', function(ev){ try { self.debugLog && self.debugLog(`mousedown on ${this.dataset.originalLabel || this.textContent.trim()} (button ${ev.button})`); } catch(e) {} });
    });
    const total = document.querySelectorAll('.drag-item[data-ps-init="1"]').length;
    console.info('ProblemSolver: ensureItems run. new:', newly.length, 'total initialized:', total);
    if (newly.length > 0) {
      try { self.debugLog && self.debugLog(`ensureItems initialized ${newly.length} items`); } catch(e) {}
    }
    };

  // Observe DOM changes under the panel so newly rendered items are initialized
  const panel = document.getElementById('panelContent');
  if (panel) {
    let ensureDebounceTimer = null;
    const mo = new MutationObserver((records) => {
      // Only trigger ensureItems when added nodes include drag-items (or contain them)
      const should = Array.from(records).some(r => {
        return Array.from(r.addedNodes).some(node => {
          if (node.nodeType !== 1) return false;
          try {
            if (node.matches && node.matches('.drag-item')) return true;
            if (node.querySelector && node.querySelector('.drag-item')) return true;
          } catch (e) { /* ignore */ }
          return false;
        });
      });
      if (should) {
        if (ensureDebounceTimer) clearTimeout(ensureDebounceTimer);
        ensureDebounceTimer = setTimeout(() => { ensureItems(); ensureDebounceTimer = null; }, 120);
      }
    });
    mo.observe(panel, { childList: true, subtree: true });
    console.info('ProblemSolver: MutationObserver attached to panelContent (filtered)');
  }

  // Run once now
  ensureItems();
  console.info('ProblemSolver: setupDragDrop completed');
}

  // Ensure placeholder text and dataset state are consistent for empty zones
  updateEmptyZones() {
    document.querySelectorAll('.drop-zone[data-var], .drop-zone[data-target]').forEach(zone => {
      const target = zone.dataset.var || zone.dataset.target;
      const hasItem = zone.querySelector('.drag-item');
      if (!hasItem) {
        if (zone.closest('.source-zone')) return; // don't modify the source area
        zone.textContent = `${(target || '').toUpperCase()} = ?`;
        zone.dataset.value = '?';
        delete zone.dataset.label;
      }
    });
  }

  // Unified drop logic used by both native and pointer-based drags
  handleDrop(zone, value, originalLabel, tempId, sourceZoneId) {
    if (!zone) return;
    const zoneName = zone ? (zone.dataset.var || zone.dataset.target || (zone.classList && zone.classList.contains('source-zone') ? 'source' : 'unknown')) : 'none';
    console.info('ProblemSolver: handleDrop target', zoneName, 'value', value, 'from', sourceZoneId, 'tempId', tempId);
    try { this.debugLog && this.debugLog(`handleDrop target ${zoneName} value ${value} from ${sourceZoneId}`); } catch(e) {}

    // If the item originated in a variable zone, clear only the previous drag-item
    if (sourceZoneId && sourceZoneId !== 'unknown' && sourceZoneId !== 'source') {
      const prevZone = document.querySelector(`[data-var="${sourceZoneId}"]`);
      if (prevZone) {
        const prevChild = prevZone.querySelector('.drag-item');
        if (prevChild) {
          // only remove if it matches the moved item (by temp id or label/value) to avoid accidental deletions
          if (prevChild.dataset.tempDragId === tempId || prevChild.dataset.originalLabel === originalLabel || prevChild.dataset.value === value) {
            prevChild.remove();
            prevZone.dataset.value = '?';
            delete prevZone.dataset.label;
            prevZone.innerHTML = `${sourceZoneId.toUpperCase()} = ?`;
          } else {
            console.info('ProblemSolver: handleDrop did not remove prevChild — mismatch', prevChild.dataset.tempDragId, tempId, prevChild.dataset.originalLabel, originalLabel);
          }
        }
      }
    }

    // Remove the draggable source item if it exists (from source area)
    const sourceItem = document.querySelector(`[data-temp-drag-id="${tempId}"]`);
    if (sourceItem) {
      if (sourceItem.dataset.tempDragId === tempId) {
        sourceItem.remove();
      } else {
        console.info('ProblemSolver: source item found but tempId mismatch', sourceItem.dataset.tempDragId, tempId);
      }
    }

    // If the destination already had an item, move it back to the source panel
    const existingValue = zone.querySelector('.drag-item');
    if (existingValue && zone.closest('.source-zone') === null) {
      const sourceContainer = document.querySelector('.source-zone');
      if (sourceContainer) {
          const restoredItem = existingValue.cloneNode(true);
        restoredItem.dataset.originalLabel = existingValue.dataset.originalLabel || existingValue.textContent.trim();
        restoredItem.dataset.value = existingValue.dataset.value;
        restoredItem.dataset.label = existingValue.dataset.label || existingValue.textContent.trim();
        restoredItem.dataset.tempDragId = `drag-${Date.now()}`;
        restoredItem.draggable = true;
        restoredItem.tabIndex = 0;
        restoredItem.setAttribute('role','button');
        restoredItem.setAttribute('aria-grabbed','false');
        restoredItem.classList.add('drag-item','source-item');
        sourceContainer.appendChild(restoredItem);
      }
    }

    // If dropped into a variable drop-zone, display the variable and add the drag item
    const targetVar = zone.dataset.var || zone.dataset.target;
    if (targetVar && !zone.closest('.source-zone')) {
      zone.innerHTML = `${targetVar.toUpperCase()} = `;
      zone.dataset.value = value;
      zone.dataset.label = originalLabel;
      const displayItem = document.createElement('div');
      displayItem.className = 'drag-item';
      displayItem.draggable = true;
      displayItem.dataset.value = value;
      displayItem.dataset.originalLabel = originalLabel;
      displayItem.dataset.label = originalLabel;
      displayItem.dataset.tempDragId = `drag-${Date.now()}`;
      displayItem.tabIndex = 0;
      displayItem.setAttribute('role','button');
      displayItem.setAttribute('aria-grabbed','false');
      displayItem.textContent = originalLabel;
      displayItem.classList.add('drag-item','placed');
      zone.appendChild(displayItem);
      try { this.announce(`Placed ${originalLabel} into ${targetVar.toUpperCase()}`); } catch(e) {}
    } else {
      // Dropped into a source zone: restore a drag-item there
      const sourceContainer = zone.closest('.source-zone') || document.querySelector('.source-zone');
      if (sourceContainer) {
        const restored = document.createElement('div');
        restored.className = 'drag-item';
        restored.draggable = true;
        restored.dataset.value = value;
        restored.dataset.originalLabel = originalLabel;
        restored.dataset.label = originalLabel;
        restored.dataset.tempDragId = `drag-${Date.now()}`;
        restored.tabIndex = 0;
        restored.setAttribute('role','button');
        restored.setAttribute('aria-grabbed','false');
        restored.textContent = originalLabel;
        restored.classList.add('source-item');
        sourceContainer.appendChild(restored);
        try { this.announce(`Restored ${originalLabel} to source`); } catch(e) {}
      }
    }

    this.updateEmptyZones();
  }

  // Mute controls
  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('physicsMuted', this.isMuted ? 'true' : 'false');
    this.applyMute();
    const btn = document.getElementById('muteToggle');
    if (btn) {
      btn.textContent = this.isMuted ? '🔇' : '🔊';
      btn.setAttribute('aria-pressed', this.isMuted ? 'true' : 'false');
    }
    this.announce(this.isMuted ? 'Music muted' : 'Music unmuted');
  }
  applyMute() {
    if (this.backgroundMusic) this.backgroundMusic.muted = !!this.isMuted;
    if (this.correctSound) this.correctSound.muted = !!this.isMuted;
    if (this.wrongSound) this.wrongSound.muted = !!this.isMuted;
  }

  // Announcements: helper + toggle
  announce(msg, assertive = false) {
    try {
      if (!this.announcementsEnabled) return;
      const el = document.getElementById('psLive');
      if (!el) return;
      el.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
      el.textContent = '';
      setTimeout(() => { el.textContent = msg; }, 20);
    } catch (e) {
      console.warn('Announce failed:', e);
    }
  }

  toggleAnnouncements() {
    this.announcementsEnabled = !this.announcementsEnabled;
    localStorage.setItem('physicsAnnouncements', this.announcementsEnabled ? 'true' : 'false');
    const btn = document.getElementById('announceToggle');
    if (btn) {
      btn.textContent = this.announcementsEnabled ? 'Aa' : 'aA';
      btn.setAttribute('aria-pressed', this.announcementsEnabled ? 'true' : 'false');
    }
    if (this.announcementsEnabled) this.announce('Announcements enabled');
  }

  // Debug logging helper (dedup repeated messages with a repeat counter and rate limiting)
  debugLog(msg) {
    if (!this.debugMode) return;
    try {
      const ts = new Date().toLocaleTimeString();
      console.debug(`[PS DEBUG ${ts}]`, msg);

      // Track last message and repeat count immediately (so repeat count increases even while throttled)
      if (this._debugLastMessage === msg) {
        this._debugRepeatCount = (this._debugRepeatCount || 1) + 1;
      } else {
        this._debugLastMessage = msg;
        this._debugRepeatCount = 1;
      }

      // Prepare pending state for DOM update
      this._debugPending = { msg: this._debugLastMessage, count: this._debugRepeatCount, ts };

      const RATE_MS = 250; // throttle DOM updates to at most once per this interval
      const ov = document.getElementById('psDebugOverlay');
      // If overlay does not exist yet, bail — state is tracked in _debugPending for when overlay appears
      if (!ov) return;

      // function that actually updates the overlay DOM
      const doUpdate = () => {
        try {
          ov.classList.remove('hidden');
          const pending = this._debugPending || { msg: this._debugLastMessage, count: this._debugRepeatCount, ts };
          const text = pending.count > 1 ? `${pending.ts} — ${pending.msg} (${pending.count}x)` : `${pending.ts} — ${pending.msg}`;
          const first = ov.firstChild;

          if (first && first.textContent && first.textContent.indexOf(pending.msg) !== -1) {
            // same message at top — update its counter/text
            first.textContent = text;
          } else {
            // new message — insert at top
            const line = document.createElement('div');
            line.textContent = text;
            ov.insertBefore(line, ov.firstChild);
            // limit children
            while (ov.childElementCount > 60) ov.removeChild(ov.lastChild);
          }

          this._debugLastUpdateTime = Date.now();
        } catch (e) { /* ignore DOM update errors */ }
      };

      // Throttle logic: schedule or run immediately
      const now = Date.now();
      const last = this._debugLastUpdateTime || 0;
      const elapsed = now - last;
      if (!this._debugTimer && elapsed >= RATE_MS) {
        // allowed to run immediately
        doUpdate();
      } else {
        // schedule an update for when the window has passed RATE_MS since last update
        if (this._debugTimer) clearTimeout(this._debugTimer);
        const wait = Math.max(0, RATE_MS - elapsed);
        this._debugTimer = setTimeout(() => { this._debugTimer = null; doUpdate(); }, wait);
      }
    } catch (e) { /* ignore */ }
  }



  /* CHECKING SYSTEM */
  checkStep1() {
  const zones = document.querySelectorAll('.drop-zone[data-var]');
  const correct = Array.from(zones).every(zone => {
    const item = zone.querySelector('.drag-item');
    const expected = this.problem.givens.find(g => g.target === zone.dataset.var);
   
    if (expected) return item?.dataset.value === expected.value;
    return item?.dataset.value === '?';
  });
 
  if (correct) {
    this.playSound(this.correctSound);
    this.updateScore(30);
    this.solvedVariables = this.problem.givens.map(g => ({
      value: g.value,
      target: g.target,
      label: g.label
    }));
    this.announce('Step 1 complete. Proceed to Step 2.');
    this.nextStep();
  } else {
    this.playSound(this.wrongSound);
    this.updateScore(0, true);
  }
}
  checkStep2() {
  const zones = document.querySelectorAll('.drop-zone[data-target]');
  const correct = Array.from(zones).every(zone => {
    const item = zone.querySelector('.drag-item');
    const targetVar = zone.dataset.target;
    const expectedFormula = this.problem.formulas.find(f => f.target === targetVar);
   
    return item && item.dataset.target === expectedFormula?.target;
  });
 
  if (correct) {
    this.playSound(this.correctSound);
    this.updateScore(30);
    this.announce('Step 2 complete. Proceed to Step 3.');
    this.nextStep();
  } else {
    this.playSound(this.wrongSound);
    this.updateScore(0, true);
  }
}
  checkStep3() {
    const answer = parseFloat(document.getElementById('finalAnswer')?.value);
    const currentUnknown = this.problem.unknowns?.[this.currentUnknownIndex];
    const expected = currentUnknown?.answer;
   
    if (isNaN(answer)) return this.highlightWrongAnswer();
   
    const tolerance = 1.0;
    if (Math.abs(answer - expected) <= tolerance) {
      this.playSound(this.correctSound);
      this.announce(`Correct — ${currentUnknown.target.toUpperCase()} = ${answer}`);
      this.solvedVariables.push({
        value: answer,
        target: currentUnknown.target,
        label: `${answer} ${currentUnknown.target.toUpperCase()}`
      });
     
      this.currentUnknownIndex++;
      this.updateScore(40);
     
      setTimeout(() => {
        if (this.problem.unknowns?.[this.currentUnknownIndex]) {
          this.renderCurrentStep();
        } else {
          this.showCompletion();
        }
      }, 800);
    } else {
      this.playSound(this.wrongSound);
      this.announce('Incorrect — try again', true);
      this.highlightWrongAnswer();
    }
}
  highlightWrongAnswer() {
    const input = document.getElementById('finalAnswer');
    if (input) {
      input.style.borderColor = '#f44336';
      input.style.background = '#ffebee';
      setTimeout(() => {
        input.style.borderColor = '#666';
        input.style.background = 'white';
      }, 1000);
    }
    this.updateScore(0, true);
}

  /* SCORING SYSTEM */
  updateScore(points = 0, isPenalty = false) {
    if (isPenalty) {
      this.mistakes++;
      this.score = Math.max(0, this.score - 10);
    } else if (points > 0) {
      const timeBonus = Math.max(0.5, 3.0 - (Date.now() - this.startTime) / 10000);
      this.score += points * timeBonus;
    }
    
    const scoreEl = document.getElementById('scoreDisplay');
    if (scoreEl) scoreEl.textContent = Math.round(this.score);
  }


  nextStep() {
    this.currentStep++;
    this.renderCurrentStep();
  }


  showCompletion() {
    this.solvedProblems.add(this.currentProblem);
    document.getElementById('stepsContainer').innerHTML = `
      <div class="finish-panel">
        <h2>🎉 Problem Complete!</h2>
        <p>Final Score: ${Math.round(this.score)} pts</p>
        <div class="finish-actions">
          <button id="nextProblem" class="btn-next">Next Problem</button>
          <button id="homepage" class="btn-home">Homepage</button>
        </div>
      </div>
    `;


    localStorage.setItem('physicsHighScore', Math.max(this.highScore, this.score));
    this.completedProblems.push(this.currentProblem);
    localStorage.setItem('physicsProgress', JSON.stringify(this.completedProblems.slice(-10)));
    this.announce(`Problem complete. Final score: ${Math.round(this.score)} points.`, true);
  }


  nextProblem() {
    console.log('Next problem requested...');
    this.resetProblemState();
   
    this.selectRandomProblem(); // Fixed: select first, mark later
    window.dispatchEvent(new CustomEvent('problemChanged', { detail: this.problem }));
   
    setTimeout(() => {
      this.renderProblemText();
      this.renderCurrentStep();
      this.startTimer();
      this.announce(`New problem: ${this.problem.text.slice(0,80)}`);
    }, 150);
  }


  restartAll() {
    this.score = 0;
    this.solvedProblems.clear();
    this.resetProblemState();
    this.selectRandomProblem();
    this.updateScore();
    this.renderCurrentStep();
    this.startTimer();
  }


  saveProgress() {
  localStorage.setItem('physicsHighScore', Math.max(this.highScore, this.score));
}
}


// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting ProblemSolver...');
    new ProblemSolver();
  });
} else {
  console.log('DOM already ready, starting ProblemSolver...');
  new ProblemSolver();
}