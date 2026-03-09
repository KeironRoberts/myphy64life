// problemSolver.js - kill me
import { problems } from './config.js';
import { TEMPLATES } from './templates.js';
import { GameUtilities } from './gameUtilities.js';
import { saveGameProgress } from '../auth.js';


export class ProblemSolver {
  constructor() {
    // Game state
    this.currentStep = 1;
    this.score = 0;
    this.startTime = Date.now();
    this.currentProblem = 0;
    this.mistakes = 0;
    this.solvedProblems = new Set();
    this.currentUnknownIndex = 0;
    this.solvedVariables = [];
    this.problemsInSession = 0; // Track problems completed THIS session
    console.debug('PS: base state initialized', { currentStep: this.currentStep, score: this.score, startTime: this.startTime });

    // load progress
    this.completedProblems = JSON.parse(localStorage.getItem('physicsProgress') || '[]');
    this.highScore = parseInt(localStorage.getItem('physicsHighScore') || '0');
    console.debug('PS: progress loaded', { completedProblems: this.completedProblems, highScore: this.highScore });

    // Initialize utilities instance
    this.utils = new GameUtilities();
    console.debug('PS: GameUtilities initialized');

    // Randomization preference (persisted)
    try {
      const val = localStorage.getItem('ps_randomizePlacement');
      if (val === null) {
        this.randomizePlacement = true; // default
      } else {
        this.randomizePlacement = val === '1' || val === 'true';
      }
    } catch (e) {
      this.randomizePlacement = true;
    }

    // Drag state for calculator
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.boundMouseMove = null;
    this.boundMouseUp = null;
    console.debug('PS: drag state initialized', { isDragging: this.isDragging });

    // Audio setup
    this.correctSound = new Audio('sounds/correct-yay.mp3');
    this.correctSound.volume = 0.33;
    this.wrongSound = new Audio('sounds/wrong-buzzer.mp3');
    this.wrongSound.volume = 0.33;
    this.backgroundMusic = null;
    this.tapSfx = new Audio('sounds/tap-sfx.wav');
    this.tapSfx.volume = 0.5;
    this.dropSfx = new Audio('sounds/drop-sfx.wav');
    this.dropSfx.volume = 0.5;

    this.musicFiles = [
      'sounds/music/onAndOn.mp3',
      'sounds/music/invincible.mp3',
      'sounds/music/drumstep.mp3',
      'sounds/music/disfigure.mp3',
      'sounds/music/elektronomia.mp3'
    ];

    this.debouncedSetupDrag = this.utils.debounce(this.setupDragDrop.bind(this), 200);
    console.debug('PS: audio and music configured', { musicCount: this.musicFiles.length });

    // Global event listeners
    window.addEventListener('beforeunload', () => this.saveProgress());
    document.addEventListener('keydown', (e) => this.handleDebugKeybind(e));
    console.debug('PS: global event listeners added');

    // initialize
    console.debug('PS: init starting');
    this.init();
    console.debug('PS: init complete');
  }
  /* INITIALIZE */
  init() {
    console.debug('PS.init: start');
    this.problems = problems;
    console.debug('PS.init: problems assigned', this.problems?.length);
    this.selectRandomProblem();
    console.debug('PS.init: after selectRandomProblem');
    this.setupUI();
    console.debug('PS.init: after setupUI');
    this.setupMusicOnFirstInteraction();
    console.debug('PS.init: completed');
  }

  setupMusicOnFirstInteraction() {
    const playMusicOnce = () => {
      console.debug('PS.setupMusicOnFirstInteraction: playing background music');
      this.utils.playBackgroundMusic(this.musicFiles);
      document.removeEventListener('click', playMusicOnce);
      document.removeEventListener('keydown', playMusicOnce);
    };
    document.addEventListener('click', playMusicOnce, { once: true });
    document.addEventListener('keydown', playMusicOnce, { once: true });
    console.debug('PS.setupMusicOnFirstInteraction: listeners attached');
  }
  selectRandomProblem() {
    console.debug('PS.selectRandomProblem: start');
    let attempts = 0;
    do {
      this.currentProblem = Math.floor(Math.random() * this.problems.length);
      attempts++;
    } while (this.solvedProblems.has(this.currentProblem) && attempts < 20);

    this.problem = this.problems[this.currentProblem];
    console.debug('PS.selectRandomProblem: selected', this.currentProblem, this.problem?.text?.substring(0, 50));
  }
  setupUI() {
    console.debug('PS.setupUI: start');
    this.createGameLayout();
    console.debug('PS.setupUI: createGameLayout done');
    this.renderPanel();
    console.debug('PS.setupUI: renderPanel done');
    this.renderProblemText();
    console.debug('PS.setupUI: renderProblemText done');
    this.bindEvents();
    console.debug('PS.setupUI: bindEvents done');
    this.renderCurrentStep();
    console.debug('PS.setupUI: renderCurrentStep done');
    // Wait for loading overlay to disappear before starting timer
    if (window.__gameLoaded) {
      console.debug('PS.setupUI: game already loaded, starting timer');
      this.startTimer();
    } else {
      console.debug('PS.setupUI: waiting for gameLoaded event to start timer');
      window.addEventListener('gameLoaded', () => this.startTimer(), { once: true });
    }
  }
  createGameLayout() {
    console.debug('PS.createGameLayout: start');
    if (document.getElementById('gameContainer')) {
      console.debug('PS.createGameLayout: skipped - gameContainer already exists');
      return;
    }

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

    // Mobile replay button - shown on small screens instead of canvas text
    const replayBtn = document.createElement('button');
    replayBtn.id = 'replayAnimationBtn';
    replayBtn.textContent = 'Replay Animation';
    replayBtn.setAttribute('aria-label', 'Replay animation');
    replayBtn.className = 'mobile-replay-btn';
    replayBtn.onclick = () => {
      // Trigger animation replay via window event - animations.js listens for this
      window.dispatchEvent(new Event('replayAnimation'));
    };
    this.leftPanel.appendChild(replayBtn);

    const contentArea = document.createElement('div');
    contentArea.id = 'panelContent';
    this.leftPanel.appendChild(contentArea);
    this.contentArea = contentArea;

    // Styles moved to `game/gameStyle.css` for maintainability and better caching.
    // Keep a note in case dynamic adjustments are needed at runtime.

    // Mute and Announcements controls (persisted state) - use GameUtilities
    this.isMuted = this.utils.isMuted;
    this.announcementsEnabled = this.utils.announcementsEnabled;

    if (!document.getElementById('muteToggle')) {
      const muteBtn = document.createElement('button');
      muteBtn.id = 'muteToggle';
      muteBtn.textContent = this.isMuted ? '🔇' : '🔊';
      muteBtn.setAttribute('aria-pressed', this.isMuted ? 'true' : 'false');
      muteBtn.setAttribute('aria-label', 'Toggle music mute');
      // Styling handled by CSS
      muteBtn.classList.add('ps-fab-btn');
      muteBtn.classList.add('ps-fab-mute');
      muteBtn.onclick = () => {
        const symbol = this.utils.toggleMute();
        this.utils.applyMute(this.utils.backgroundMusic, this.correctSound, this.wrongSound);
        const btn = document.getElementById('muteToggle');
        if (btn) {
          btn.textContent = symbol;
          btn.setAttribute('aria-pressed', this.utils.isMuted ? 'true' : 'false');
        }
        this.utils.announce(this.utils.isMuted ? 'Music muted' : 'Music unmuted');
      };
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
      annBtn.onclick = () => {
        const txt = this.utils.toggleAnnouncements();
        this.utils.announce(this.utils.announcementsEnabled ? 'Announcements enabled' : 'Announcements disabled');
        const btn = document.getElementById('announceToggle');
        if (btn) {
          btn.textContent = txt;
          btn.setAttribute('aria-pressed', this.utils.announcementsEnabled ? 'true' : 'false');
        }
      };
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
        this.utils.debugMode = !this.utils.debugMode;
        dbgBtn.setAttribute('aria-pressed', this.utils.debugMode ? 'true' : 'false');
        const ov = document.getElementById('psDebugOverlay');
        if (this.utils.debugMode) {
          // reset dedup state when (re)enabling debug so prior repeat counters don't carry over
          this.utils.debugLastMessage = null;
          this.utils.debugRepeatCount = 0;
          if (ov) ov.classList.remove('hidden');
        } else {
          if (ov) ov.classList.add('hidden');
        }
        this.utils.debugLog('Debug ' + (this.utils.debugMode ? 'enabled' : 'disabled'));
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

    this.utils.applyMute(this.utils.backgroundMusic, this.correctSound, this.wrongSound);
    console.debug('PS.createGameLayout: completed');
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
    console.debug('PS.startTimer: starting timer');
    const update = () => {
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
      const timerDisplay = document.getElementById('timerDisplay');
      if (timerDisplay) timerDisplay.textContent = elapsed;
      if (this.currentStep < 4) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  getSourceZoneId(el) {
    if (!el) return 'source';
    const sourceZone = el.closest ? el.closest('.drop-zone, .source-zone') : null;
    if (!sourceZone) return 'source';
    if (sourceZone.closest && sourceZone.closest('.source-zone')) return 'source';
    return (sourceZone.dataset && (sourceZone.dataset.var || sourceZone.dataset.target)) ? (sourceZone.dataset.var || sourceZone.dataset.target) : 'unknown';
  }

  zoneName(zone) {
    if (!zone) return 'none';
    if (zone.dataset && (zone.dataset.var || zone.dataset.target)) return zone.dataset.var || zone.dataset.target;
    if (zone.classList && zone.classList.contains('source-zone')) return 'source';
    return 'unknown';
  }

  safeSetDataTransfer(dt, key, value) {
    try {
      if (dt && dt.setData) dt.setData(key, String(value));
    } catch (e) { }
  }

  playSfx(audio) {
    if (!audio) return;
    try {
      audio.currentTime = 0;
      audio.play().catch(() => { });
    } catch (e) { }
  }

  clearDragVisuals(el) {
    if (!el) return;
    try {
      el.style.opacity = '';
      if (el.classList) el.classList.remove('dragging');
      try {
        if (this._lastDragOverElement) {
          this._lastDragOverElement.classList.remove('drag-over');
          this._lastDragOverElement = null;
        }
      } catch (err) { }
    } catch (e) { }
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
    console.debug('PS.renderCurrentStep: rendering step', this.currentStep);
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

    setTimeout(() => {
      this.debouncedSetupDrag();
      try {
        if (this.randomizePlacement === undefined) this.randomizePlacement = true; // default on
        if (this.randomizePlacement && (this.currentStep === 1 || this.currentStep === 2)) {
          this.randomizePlacementLayout();
        }
      } catch (e) {
        console.warn('ProblemSolver: randomizePlacement failed', e);
      }
    }, 100);
  }

  // Shuffler (Fisher-Yates) for arrays
  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Randomize DOM placement of items in source-zone and variable zones
  randomizePlacementLayout() {
    console.debug('PS.randomizePlacementLayout: shuffling source items and variables');

    // Shuffle items inside each source-zone (use DocumentFragment to reduce reflow)
    document.querySelectorAll('.source-zone').forEach((source) => {
      const items = Array.from(source.querySelectorAll('.drag-item'));
      if (items.length <= 1) return;
      const shuffled = this.shuffleArray(items.slice());
      const frag = document.createDocumentFragment();
      shuffled.forEach((it) => frag.appendChild(it));
      source.appendChild(frag);
    });

    // Shuffle variable drop-zones inside variable containers (use DocumentFragment)
    document.querySelectorAll('.variables').forEach((varsContainer) => {
      const zones = Array.from(varsContainer.querySelectorAll('.drop-zone'));
      if (zones.length <= 1) return;
      const shuffled = this.shuffleArray(zones.slice());
      const frag = document.createDocumentFragment();
      shuffled.forEach((z) => frag.appendChild(z));
      varsContainer.appendChild(frag);
    });

    // Ensure any newly moved items are initialized
    try {
      this.ensureItemsInit();
    } catch (e) {
      console.warn('ProblemSolver: ensureItemsInit failed after randomize', e);
    }
  }

  setRandomizePlacement(enabled) {
    this.randomizePlacement = Boolean(enabled);
    try {
      localStorage.setItem('ps_randomizePlacement', this.randomizePlacement ? '1' : '0');
    } catch (e) { }
    console.debug('PS.setRandomizePlacement:', this.randomizePlacement);
  }

  /* CALCULATOR SYSTEM */
  toggleCalculator() {
    const overlay = document.getElementById('calculator');
    if (overlay) {
      // Remove old click listener before removing element
      if (this.boundClickHandler) {
        document.removeEventListener('click', this.boundClickHandler);
        this.boundClickHandler = null;
      }
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

      // Dispose mobile drag handlers to avoid leaking global event listeners when calculator closed
      try {
        if (this._mobileDragDisposable && typeof this._mobileDragDisposable.dispose === 'function') {
          this._mobileDragDisposable.dispose();
          this._mobileDragDisposable = null;
        }
      } catch (e) { }

      // Also remove native drag handlers so they can be re-registered when needed
      try {
        if (this._onDragStart) document.removeEventListener('dragstart', this._onDragStart);
        if (this._onDragOver) document.removeEventListener('dragover', this._onDragOver);
        if (this._onDrop) document.removeEventListener('drop', this._onDrop);
        if (this._onDragEnd) document.removeEventListener('dragend', this._onDragEnd);
        window.problemSolverDragSetup = false;
      } catch (e) { }

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
    this.boundClickHandler = (e) => {
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
    };
    document.addEventListener('click', this.boundClickHandler);

    this.boundKeyHandler = (/** @type {{ key: string; preventDefault: () => void; }} */ e) => {
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
      case 'C':
        display.value = '0';
        break;
      case 'BACKSPACE':
        display.value = current === '0' || current === 'Error' ? '0' : current.slice(0, -1) || '0';
        break;
      case '=':
        try {
          let expr = current
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/\)\(/g, ')*(')
            .replace(/\)(\d)/g, ')*$1')
            .replace(/(\d)\(/g, '$1*(')
            .replace(/sin/g, 'Math.sin')
            .replace(/cos/g, 'Math.cos')
            .replace(/tan/g, 'Math.tan')
            .replace(/√\(([^)]+)\)/g, 'Math.sqrt($1)')
            .replace(/\(([^)]+)\)²/g, '($1*$1)');

          // Convert degrees to radians for trig functions
          expr = expr.replace(/Math\.(sin|cos|tan)\(([^)]+)\)/g, (/** @type {any} */ match, /** @type {any} */ func, /** @type {any} */ angle) => {
            return `Math.${func}(${angle}*Math.PI/180)`;
          });

          let result = eval(expr);
          display.value = isNaN(result) ? 'Error' : result.toFixed(4);
        } catch {
          display.value = 'Error';
        }
        break;
      case '+':
      case '-':
      case '×':
      case '÷':
        display.value = current === '0' ? value : current + value;
        break;
      case '(':
      case ')':
        display.value = current === '0' ? value : current + value;
        break;
      case 'sin':
      case 'cos':
      case 'tan':
        display.value = current === '0' ? value + '(' : current + value + '(';
        break;
      case 'x²':
        display.value = current === '0' ? '(0)²' : `(${current})²`;
        break;
      case '√':
        display.value = current === '0' ? '√(0)' : `√(${current})`;
        break;
      default:
        display.value = current === '0' && value !== '.' ? value : current + value;
    }
  }

  makeCalculatorDraggable() {
    const calcOverlay = document.getElementById('calculator');
    if (!calcOverlay) return;

    const header = calcOverlay.querySelector('.calc-header');
    if (!header) return;

    header.style.cursor = 'grab';

    const handleMouseDown = (/** @type {{ clientX: number; clientY: number; preventDefault: () => void; }} */ e) => {
      this.isDragging = true;
      header.style.cursor = 'grabbing';

      const rect = calcOverlay.getBoundingClientRect();
      this.dragOffsetX = e.clientX - rect.left;
      this.dragOffsetY = e.clientY - rect.top;

      e.preventDefault();
    };

    this.boundMouseMove = (/** @type {{ clientX: number; clientY: number; }} */ e) => {
      if (!this.isDragging) return;
      calcOverlay.style.left = e.clientX - this.dragOffsetX + 'px';
      calcOverlay.style.top = e.clientY - this.dragOffsetY + 'px';
    };

    this.boundMouseUp = () => {
      this.isDragging = false;
      header.style.cursor = 'grab';
    };

    header.addEventListener('mousedown', /** @type {any} */ (handleMouseDown));
    header.addEventListener('pointerdown', /** @type {any} */ (handleMouseDown));
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
      } else if (e.target.id === 'homepage') {
        window.location.href = '../index.html';
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
            const sourceZoneId = this.getSourceZoneId(active);
            this.keyboardHeld = {
              elem: active,
              data: { value, originalLabel, tempId, sourceZoneId },
            };
            active.classList.add('held');
          } else {
            this.keyboardHeld.elem.classList.remove('held');
            this.keyboardHeld = null;
          }
        } else if (active.classList && active.classList.contains('drop-zone')) {
          e.preventDefault();
          if (this.keyboardHeld) {
            this.handleDrop(
              active,
              this.keyboardHeld.data.value,
              this.keyboardHeld.data.originalLabel,
              this.keyboardHeld.data.tempId,
              this.keyboardHeld.data.sourceZoneId
            );
            this.keyboardHeld.elem.classList.remove('held');
            this.keyboardHeld = null;
          }
        }
      }
    });
  }

  /* DRAGGER SYSTEM */
  setupDragDrop() {
    if (window.problemSolverDragSetup) {
      console.info('ProblemSolver: setupDragDrop skipped — already initialized');
      return;
    }
    window.problemSolverDragSetup = true;
    console.info('ProblemSolver: setupDragDrop started');

    // bind handlers
    this._onDragStart = this._onDragStart.bind(this);
    this._onDragOver = this._onDragOver.bind(this);
    this._onDrop = this._onDrop.bind(this);
    this._onDragEnd = this._onDragEnd.bind(this);

    // Decide which drag system to enable based on touch capability
    const isTouchDevice = !!(
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    );

    // store mode for debugging/teardown
    const mode = isTouchDevice ? 'mobile' : 'native';
    window.problemSolverDragMode = mode;
    // Log mode to developer console and to in-app debug overlay (if enabled)
    console.info(`ProblemSolver: drag mode detected — ${mode}`);
    try { this.utils.debugLog(`Drag mode: ${mode}`); } catch (e) { };


    if (isTouchDevice) {
      // Register mobile (pointer/touch) handlers only on touch-capable devices
      this._mobileDragDisposable = this.utils.registerMobileDragHandlers({
        itemSelector: '.drag-item',
        zoneSelector: '.drop-zone, .source-zone',
        onDrop: this.handleDrop.bind(this),
        getSourceZoneId: this.getSourceZoneId.bind(this),
        zoneName: this.zoneName.bind(this),
        announce: (/** @type {any} */ msg, /** @type {boolean} */ assertive) => { try { this.utils.announce(msg, assertive); } catch (e) { } },
        debugLog: (/** @type {any} */ msg) => { try { this.utils.debugLog(msg); } catch (e) { } },
        onPick: () => { try { this.playSfx(this.tapSfx); } catch (e) { } },
      });
    } else {
      // Register native HTML5 drag handlers only on non-touch (PC) devices
      this.registerNativeDragHandlers();
    }

    // initialize items and observer
    this.ensureItemsInit();
    this.attachMutationObserver();

    console.info('ProblemSolver: setupDragDrop completed');
  }

  registerNativeDragHandlers() {
    document.addEventListener('dragstart', this._onDragStart);
    document.addEventListener('dragover', this._onDragOver);
    document.addEventListener('drop', this._onDrop);
    document.addEventListener('dragend', this._onDragEnd);
  }

  _onDragStart(e) {
    if (!(e.target instanceof HTMLElement)) return;
    const item = e.target.closest('.drag-item');
    if (!item) return;

    const sourceZoneId = this.getSourceZoneId(item);
    const value = item.dataset.value || item.dataset.formula || '?';
    const originalLabel = item.dataset.originalLabel || item.textContent.trim();
    const id = item.dataset.tempDragId || `drag-${Date.now()}`;

    this.safeSetDataTransfer(e.dataTransfer, 'text/plain', value);
    this.safeSetDataTransfer(e.dataTransfer, 'text/label', originalLabel);
    this.safeSetDataTransfer(e.dataTransfer, 'text/id', id);
    this.safeSetDataTransfer(e.dataTransfer, 'text/sourceZoneId', sourceZoneId);

    item.dataset.originalLabel = originalLabel;
    item.dataset.tempDragId = id;
    item.style.opacity = '0.5';
    item.classList.add('dragging');
    this.playSfx(this.tapSfx);
    window.problemSolverNativeDragActive = true;
    console.info('ProblemSolver: dragstart', originalLabel, 'from', sourceZoneId);
    try {
      this.utils.debugLog(`dragstart: ${originalLabel} (from ${sourceZoneId})`);
    } catch (e) { }
    try {
      this.utils.announce(`Picked up ${originalLabel}`);
    } catch (e) { }
  }

  _onDragOver(e) {
    try {
      e.preventDefault(); // allow dropping
      const it = e.target.closest && e.target.closest('.drag-item');
      if (it) this.clearDragVisuals(it);
      try {
        e.dataTransfer.dropEffect = 'move';
      } catch (err) { }
      // Avoid scanning the whole DOM on every dragover: track the last hovered zone element
      const newZone = e.target && e.target.closest ? e.target.closest('.drop-zone, .source-zone') : null;
      try {
        if (this._lastDragOverElement && this._lastDragOverElement !== newZone) {
          this._lastDragOverElement.classList.remove('drag-over');
        }
        if (newZone && newZone !== this._lastDragOverElement) {
          newZone.classList.add('drag-over');
          this._lastDragOverElement = newZone;
        }
        if (!newZone && this._lastDragOverElement) {
          this._lastDragOverElement.classList.remove('drag-over');
          this._lastDragOverElement = null;
        }
      } catch (err) { /* ignore DOM errors */ }
      const zoneName = this.zoneName(newZone);
      // Avoid noisy per-frame dragover logging. Only emit a small event when the hovered zone changes.
      try {
        if (this._lastDragOverZone !== zoneName) {
          this._lastDragOverZone = zoneName;
          this.utils.debugLog(`dragover enter ${zoneName}`);
        }
      } catch (e) { }

      // If no zone is hovered, reset the tracker so we can log on next entry
      if (!newZone) this._lastDragOverZone = null;
    } catch (err) { }
  }

  _onDrop(e) {
    e.preventDefault();
    // Clear cached hover element to avoid full DOM scan
    try {
      if (this._lastDragOverElement) {
        this._lastDragOverElement.classList.remove('drag-over');
        this._lastDragOverElement = null;
      }
    } catch (err) { /* ignore */ }

    let zone = e.target && e.target.closest ? e.target.closest('.drop-zone, .source-zone') : null;
    if (!zone) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el) {
        const src = el.closest('.source-zone');
        if (src) zone = src;
      }
      if (!zone) return;
    }

    let value = '?', originalLabel = '', tempId = '', sourceZoneId = 'unknown';
    try {
      if (e.dataTransfer) {
        value = e.dataTransfer.getData('text/plain') || '?';
        originalLabel = e.dataTransfer.getData('text/label') || '';
        tempId = e.dataTransfer.getData('text/id') || '';
        sourceZoneId = e.dataTransfer.getData('text/sourceZoneId') || 'unknown';
      }
    } catch (err) { }

    const zoneName = this.zoneName(zone);
    console.info('ProblemSolver: drop', originalLabel, value, 'on', zoneName, 'at', e.clientX + ',' + e.clientY);
    try {
      this.utils.debugLog(`drop at (${e.clientX},${e.clientY}) on ${zoneName}`);
    } catch (e) { }
    this.handleDrop(zone, value, originalLabel, tempId, sourceZoneId);
  }

  _onDragEnd(e) {
    window.problemSolverNativeDragActive = false;
    const it = e.target && e.target.closest && e.target.closest('.drag-item');
    if (it) this.clearDragVisuals(it);
    try {
      // Determine the destination: variable name or 'source zone'
      let dest = 'unknown';
      try {
        const destZone = it && it.closest && (it.closest('.drop-zone[data-var], .drop-zone[data-target]') || it.closest('.source-zone'));
        if (destZone) {
          dest = destZone.classList && destZone.classList.contains('source-zone') ? 'source zone' : (destZone.dataset.var || destZone.dataset.target || 'unknown');
        }
      } catch (err) { /* ignore */ }
      this.utils.debugLog(`dragend: ${it?.dataset?.originalLabel || it.textContent.trim()} to ${dest}`);
    } catch (e) { }
  }

  ensureItemsInit() {
    const self = this;
    const itemDragStartHandler = function (/** @type {{ dataTransfer: any; }} */ e) {
      const item = this;
      const originalLabel = item.dataset.originalLabel || item.textContent.trim();
      const value = item.dataset.value || item.dataset.formula || '?';
      const id = item.dataset.tempDragId || `drag-${Date.now()}`;
      const sourceZoneId = self.getSourceZoneId(item);
      if (e.dataTransfer) {
        self.safeSetDataTransfer(e.dataTransfer, 'text/plain', value);
        self.safeSetDataTransfer(e.dataTransfer, 'text/label', originalLabel);
        self.safeSetDataTransfer(e.dataTransfer, 'text/id', id);
        self.safeSetDataTransfer(e.dataTransfer, 'text/sourceZoneId', sourceZoneId);
      }
      item.style.opacity = '0.5';
      try {
        // play a tap SFX on drag start
        self.playSfx(self.tapSfx);
      } catch (e) { }
      try {
        self.utils.announce(`Picked up ${originalLabel}`);
      } catch (e) { }
    };

    const newly = document.querySelectorAll('.drag-item:not([data-ps-init])');
    newly.forEach((item) => {
      item.setAttribute('data-ps-init', '1');
      item.draggable = true;
      if (!item.hasAttribute('tabindex')) item.tabIndex = 0;
      if (!item.dataset.originalLabel) item.dataset.originalLabel = item.textContent.trim();
      if (!item.dataset.tempDragId) item.dataset.tempDragId = `drag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      item.addEventListener('dragstart', /** @type {any} */ (itemDragStartHandler));
      item.addEventListener('dragend', function () {
        // dragend shouldn't play drop SFX by itself — drop SFX is played only on successful drops in handleDrop
        self.clearDragVisuals(this);
        try {
          let dest = 'unknown';
          try {
            const destZone = this && this.closest && (this.closest('.drop-zone[data-var], .drop-zone[data-target]') || this.closest('.source-zone'));
            if (destZone) {
              dest = destZone.classList && destZone.classList.contains('source-zone') ? 'source zone' : (destZone.dataset.var || destZone.dataset.target || 'unknown');
            } else if (this.parentElement) {
              const parZone = this.parentElement.closest('.drop-zone');
              if (parZone) dest = parZone.dataset.var || parZone.dataset.target || (parZone.classList && parZone.classList.contains('source-zone') ? 'source zone' : 'unknown');
            }
          } catch (err) { /* ignore */ }
          self.utils.debugLog(`dragend: ${this.dataset.originalLabel || this.textContent.trim()} to ${dest}`);
        } catch (e) { }
      });
      item.addEventListener('mousedown', function (ev) {
        try {
          self.utils.debugLog(`mousedown on ${this.dataset.originalLabel || this.textContent.trim()} (button ${ev.button})`);
        } catch (e) { }
      });
    });
    const total = document.querySelectorAll('.drag-item[data-ps-init="1"]').length;
    console.info('ProblemSolver: ensureItems run. new:', newly.length, 'total initialized:', total);
    if (newly.length > 0) {
      try {
        this.utils.debugLog(`ensureItems initialized ${newly.length} items`);
      } catch (e) { }
    }
  }

  attachMutationObserver() {
    const panel = document.getElementById('panelContent');
    if (!panel) return;
    let ensureDebounceTimer = null;
    this._mo = new MutationObserver((records) => {
      const should = Array.from(records).some((r) => {
        return Array.from(r.addedNodes).some((node) => {
          if (node.nodeType !== 1) return false;
          try {
            if (node.matches && node.matches('.drag-item')) return true;
            if (node.querySelector && node.querySelector('.drag-item')) return true;
          } catch (e) {
            /* ignore */
          }
          return false;
        });
      });
      if (should) {
        if (ensureDebounceTimer) clearTimeout(ensureDebounceTimer);
        ensureDebounceTimer = setTimeout(() => {
          this.ensureItemsInit();
          ensureDebounceTimer = null;
        }, 120);
      }
    });
    this._mo.observe(panel, { childList: true, subtree: true });
    console.info('ProblemSolver: MutationObserver attached to panelContent (filtered)');
  }

  // Ensure placeholder text and dataset state are consistent for empty zones
  updateEmptyZones() {
    document.querySelectorAll('.drop-zone[data-var], .drop-zone[data-target]').forEach((zone) => {
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

  handleDrop(zone, value, originalLabel, tempId, sourceZoneId) {
  if (!zone) {
    console.info('ProblemSolver: drop failed — no drop zone at drop point');
    try { this.utils.debugLog('Drop failed: no drop zone detected at drop point'); } catch (e) {}
    return;
  }
  
  const zoneName = zone
    ? zone.dataset.var ||
      zone.dataset.target ||
      (zone.classList && zone.classList.contains('source-zone') ? 'source' : 'unknown')
    : 'none';
    
  console.info(
    'ProblemSolver: handleDrop target',
    zoneName,
    'value',
    value,
    'from',
    sourceZoneId,
    'tempId',
    tempId
  );
  
  try {
    this.utils.debugLog(`handleDrop target ${zoneName} value ${value} from ${sourceZoneId}`);
  } catch (e) {}

  // Check if we're dropping back into source zone from a variable zone
  const isDroppingToSource = zone.classList && zone.classList.contains('source-zone');

  // If the item originated in a variable zone, identify the previous drag-item but do NOT remove it yet
  let _prevChildToRemove = null;
  if (sourceZoneId && sourceZoneId !== 'unknown' && sourceZoneId !== 'source') {
    const prevZone = document.querySelector(`[data-var="${sourceZoneId}"], [data-target="${sourceZoneId}"]`);
    if (prevZone) {
      const prevChild = prevZone.querySelector('.drag-item');
      if (prevChild) {
        // mark for removal only if it matches the moved item
        if (
          prevChild.dataset.tempDragId === tempId ||
          prevChild.dataset.originalLabel === originalLabel ||
          prevChild.dataset.value === value
        ) {
          _prevChildToRemove = { prevChild, prevZone, sourceZoneId };
        } else {
          console.info(
            'ProblemSolver: handleDrop did not mark prevChild for removal — mismatch',
            prevChild.dataset.tempDragId,
            tempId,
            prevChild.dataset.originalLabel,
            originalLabel
          );
        }
      }
    }
  }

  // Find the draggable source item if it exists but do NOT remove yet
  const sourceItem = document.querySelector(`[data-temp-drag-id="${tempId}"]`);
  let _sourceItemToRemove = null;
  if (sourceItem) {
    try {
      const targetSource = zone.closest('.source-zone');
      const sourceItemSource = sourceItem.closest('.source-zone');
      // If dropping into a non-source destination, schedule the original source item for removal
      if (!targetSource) {
        _sourceItemToRemove = sourceItem;
      } else if (sourceItemSource !== targetSource) {
        // if sourceItem lives in a different source container, schedule for removal
        _sourceItemToRemove = sourceItem;
      } else {
        // item already present in the target source container — do not remove
        console.info('ProblemSolver: sourceItem present in target source container — not removing');
      }
    } catch (e) {
      try { console.info('ProblemSolver: sourceItem check failed', e); } catch (err) {}
    }
  }

  // If the destination already had an item, swap it back to source
  const existingValue = zone.querySelector('.drag-item');
  if (existingValue && !isDroppingToSource) {
    const sourceContainer = document.querySelector('.source-zone');
    if (sourceContainer) {
      const restoredItem = existingValue.cloneNode(true);
      restoredItem.dataset.originalLabel = existingValue.dataset.originalLabel || existingValue.textContent.trim();
      restoredItem.dataset.value = existingValue.dataset.value;
      restoredItem.dataset.label = existingValue.dataset.label || existingValue.textContent.trim();
      restoredItem.dataset.tempDragId = `drag-${Date.now()}`;
      restoredItem.draggable = true;
      restoredItem.tabIndex = 0;
      restoredItem.setAttribute('role', 'button');
      restoredItem.setAttribute('aria-grabbed', 'false');
      restoredItem.classList.add('drag-item', 'source-item');
      sourceContainer.appendChild(restoredItem);
      try { this.playSfx(this.dropSfx); } catch (e) {}

      // If we moved an existing variable-item back to source, remove original variable's item
      try {
        if (_prevChildToRemove && _prevChildToRemove.prevChild && _prevChildToRemove.prevChild.parentNode) {
          _prevChildToRemove.prevChild.remove();
          _prevChildToRemove.prevZone.dataset.value = '?';
          delete _prevChildToRemove.prevZone.dataset.label;
          _prevChildToRemove.prevZone.innerHTML = `${_prevChildToRemove.sourceZoneId.toUpperCase()} = ?`;
          _prevChildToRemove = null;
        }
      } catch (e) {}

      // Remove the original source item if scheduled
      try {
        if (_sourceItemToRemove && _sourceItemToRemove.parentNode) {
          _sourceItemToRemove.remove();
          _sourceItemToRemove = null;
        }
      } catch (e) {}
    }
    // DO NOT RETURN - continue to add the new item to the zone
  }

  // No existing item - handle new drop
  const targetVar = zone.dataset.var || zone.dataset.target;
  
  if (targetVar && !isDroppingToSource) {
    // Dropped into variable zone
    const displayItem = document.createElement('div');
    displayItem.draggable = true;
    displayItem.dataset.value = value;
    displayItem.dataset.originalLabel = originalLabel;
    displayItem.dataset.label = originalLabel;
    displayItem.dataset.tempDragId = `drag-${Date.now()}`;
    displayItem.tabIndex = 0;
    displayItem.setAttribute('role', 'button');
    displayItem.setAttribute('aria-grabbed', 'false');
    displayItem.textContent = originalLabel;
    displayItem.classList.add('drag-item');
    zone.appendChild(displayItem);
    // Update the variable zone to display the assigned value (remove the '?')
    try {
      zone.dataset.value = value;
      zone.dataset.label = originalLabel;
      // rebuild zone content: label + item
      zone.innerHTML = '';
      const labelSpan = document.createElement('span');
      labelSpan.className = 'zone-label';
      labelSpan.textContent = `${targetVar.toUpperCase()} = `;
      zone.appendChild(labelSpan);
      // Append the display item without modifying its classes
      zone.appendChild(displayItem);
    } catch (e) {
      try { console.warn('ProblemSolver: failed to update variable label', e); } catch (err) {}
    }

    try { this.playSfx(this.dropSfx); } catch (e) {}
    try { this.utils.announce(`Placed ${originalLabel} into ${targetVar.toUpperCase()}`); } catch (e) {}

    // Drop succeeded: cleanup queued items
    try {
      if (_prevChildToRemove && _prevChildToRemove.prevChild && _prevChildToRemove.prevChild.parentNode) {
        _prevChildToRemove.prevChild.remove();
        _prevChildToRemove.prevZone.dataset.value = '?';
        delete _prevChildToRemove.prevZone.dataset.label;
        _prevChildToRemove.prevZone.innerHTML = `${_prevChildToRemove.sourceZoneId.toUpperCase()} = ?`;
        _prevChildToRemove = null;
      }
    } catch (e) {}

    try {
      if (_sourceItemToRemove && _sourceItemToRemove.parentNode) {
        _sourceItemToRemove.remove();
        _sourceItemToRemove = null;
      }
    } catch (e) {}
    
  } else if (isDroppingToSource) {
    // Dropped into source zone - restore item from variable zone
    const sourceContainer = zone;
    console.info('ProblemSolver: DROP TO SOURCE - sourceZoneId:', sourceZoneId, 'originalLabel:', originalLabel);
    try { this.utils.debugLog(`DROP TO SOURCE: from zone "${sourceZoneId}", item "${originalLabel}"`); } catch (e) {}
    
    if (sourceContainer) {
      // Check if item already exists in source (don't create duplicates)
      const itemExists = [...sourceContainer.children].some(child => 
        child && child.classList && child.classList.contains('drag-item') && 
        (child.dataset.tempDragId === tempId || child.textContent.trim() === originalLabel)
      );
      
      if (!itemExists) {
        const restored = document.createElement('div');
        restored.className = 'drag-item source-item';
        restored.draggable = true;
        restored.dataset.value = value;
        restored.dataset.originalLabel = originalLabel;
        restored.dataset.label = originalLabel;
        restored.dataset.tempDragId = `drag-${Date.now()}`;
        restored.tabIndex = 0;
        restored.setAttribute('role', 'button');
        restored.setAttribute('aria-grabbed', 'false');
        restored.textContent = originalLabel;
        sourceContainer.appendChild(restored);
        try { this.playSfx(this.dropSfx); } catch (e) {}
        try { this.utils.announce(`Restored ${originalLabel} to source`); } catch (e) {}
        console.info('ProblemSolver: restored item to source:', originalLabel);
        try { this.utils.debugLog(`Restored to source: ${originalLabel}`); } catch (e) {}
      }

      // Remove the item from variable zone after restoring to source
      // If item came from a variable zone (not the source), clean it up
      console.info('ProblemSolver: checking removal - sourceZoneId:', sourceZoneId, 'type:', typeof sourceZoneId);
      if (sourceZoneId && sourceZoneId !== 'unknown' && sourceZoneId !== 'source') {
        console.info('ProblemSolver: attempting to remove from zone:', sourceZoneId);
        try { this.utils.debugLog(`Attempting to remove item from zone: ${sourceZoneId}`); } catch (e) {}
        
        const sourceVarZone = document.querySelector(`[data-var="${sourceZoneId}"], [data-target="${sourceZoneId}"]`);
        console.info('ProblemSolver: found zone?', !!sourceVarZone, 'selector was [data-var="' + sourceZoneId + '"] or [data-target="' + sourceZoneId + '"]');
        try { this.utils.debugLog(`Zone found: ${!!sourceVarZone}`); } catch (e) {}
        
        if (sourceVarZone) {
          const itemInZone = sourceVarZone.querySelector('.drag-item');
          console.info('ProblemSolver: found item in zone?', !!itemInZone);
          try { this.utils.debugLog(`Item in zone: ${!!itemInZone}`); } catch (e) {}
          
          if (itemInZone) {
            console.info('ProblemSolver: REMOVING item:', itemInZone.textContent.trim());
            itemInZone.remove();
            sourceVarZone.dataset.value = '?';
            delete sourceVarZone.dataset.label;
            sourceVarZone.innerHTML = `${sourceZoneId.toUpperCase()} = ?`;
            console.info('ProblemSolver: item removed and zone reset');
            try { this.utils.debugLog(`Item removed, zone reset: ${sourceZoneId}`); } catch (e) {}
          }
        } else {
          console.warn('ProblemSolver: could not find source var zone with selector [data-var="' + sourceZoneId + '"] or [data-target="' + sourceZoneId + '"]');
          try { this.utils.debugLog(`ERROR: Zone not found for: ${sourceZoneId}`); } catch (e) {}
        }
      } else {
        console.info('ProblemSolver: sourceZoneId not valid for removal:', sourceZoneId);
        try { this.utils.debugLog(`Invalid Zone ID for removal: ${sourceZoneId}`); } catch (e) {}
      }
    }
  }

  this.updateEmptyZones();
}


  /* CHECKING SYSTEM */
  checkStep1() {
    const zones = document.querySelectorAll('.drop-zone[data-var]');
    const correct = Array.from(zones).every((zone) => {
      const item = zone.querySelector('.drag-item');
      const expected = this.problem.givens.find((g) => g.target === zone.dataset.var);

      if (expected) return item?.dataset.value === expected.value;
      return item?.dataset.value === '?';
    });

    if (correct) {
      this.utils.playSound(this.correctSound);
      this.updateScore(30);
      this.solvedVariables = this.problem.givens.map((g) => ({
        value: g.value,
        target: g.target,
        label: g.label,
      }));
      this.utils.announce('Step 1 complete. Proceed to Step 2.');
      this.nextStep();
    } else {
      this.utils.playSound(this.wrongSound);
      this.updateScore(0, true);
    }
  }
  checkStep2() {
    const zones = document.querySelectorAll('.drop-zone[data-target]');
    let allCorrect = true;
    zones.forEach((zone) => {
      const item = zone.querySelector('.drag-item');
      const targetVar = zone.dataset.target;
      const expectedFormula = this.problem.formulas.find((f) => f.target === targetVar);
      if (!item || !expectedFormula) {
        allCorrect = false;
        return;
      }
      // Accept match if formula string or label matches
      const itemFormula = item.dataset.formula || item.textContent.trim();
      if (
        (item.dataset.target && item.dataset.target === expectedFormula.target) ||
        (itemFormula === expectedFormula.formula) ||
        (itemFormula === expectedFormula.label)
      ) {
        // correct
      } else {
        allCorrect = false;
      }
    });

    if (allCorrect) {
      this.utils.playSound(this.correctSound);
      this.updateScore(30);
      this.utils.announce('Step 2 complete. Proceed to Step 3.');
      this.nextStep();
    } else {
      this.utils.playSound(this.wrongSound);
      // pass (score, points, isPenalty)
      this.utils.updateScore(0, 0, true);
      this.utils.debugLog('Step 2 check failed: at least one formula did not match.');
    }
  }
  checkStep3() {
    const answer = parseFloat(document.getElementById('finalAnswer')?.value);
    const currentUnknown = this.problem.unknowns?.[this.currentUnknownIndex];
    const expected = currentUnknown?.answer;

    if (isNaN(answer)) return this.highlightWrongAnswer();

    // Use relative tolerance (5% error) with a minimum absolute tolerance of 0.5
    // This handles both small numbers and large numbers with different decimal rounding
    const relativeError = Math.abs(answer - expected) / Math.abs(expected);
    const isClose = relativeError <= 0.05 || Math.abs(answer - expected) <= 0.5;
    
    if (isClose) {
      this.utils.playSound(this.correctSound);
      this.utils.announce(`Correct — ${currentUnknown.target.toUpperCase()} = ${answer}`);
      this.solvedVariables.push({
        value: answer,
        target: currentUnknown.target,
        label: `${answer} ${currentUnknown.target.toUpperCase()}`,
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
      this.utils.playSound(this.wrongSound);
      this.utils.announce('Incorrect — try again', true);
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
      // Exponential time decay: score multiplier approaches 0 as time increases
      const elapsedSeconds = (Date.now() - this.startTime) / 1000;
      const timeMultiplier = Math.max(0.1, Math.exp(-elapsedSeconds / 40));
      this.score += points * timeMultiplier;
    }

    const scoreEl = document.getElementById('scoreDisplay');
    if (scoreEl) scoreEl.textContent = String(Math.round(this.score));
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

    localStorage.setItem('physicsHighScore', String(Math.max(this.highScore, this.score)));
    this.completedProblems.push(this.currentProblem);
    // Note: Full save happens in nextProblem() -> saveProgress()
    this.utils.announce(`Problem complete. Final score: ${Math.round(this.score)} points.`, true);
  }

  nextProblem() {
    console.log('[GAME] Next problem requested...', { problemsInSession: this.problemsInSession });
    
    // Save progress after completing a problem
    this.saveProgress();
    this.problemsInSession++;
    
    // Check if game should finish (4 problems completed)
    if (this.problemsInSession >= 4) {
      this.finishGame();
      return;
    }
    
    this.resetProblemState();
    this.selectRandomProblem(); // Fixed: select first, mark later
    window.dispatchEvent(new CustomEvent('problemChanged', { detail: this.problem }));

    setTimeout(() => {
      this.renderProblemText();
      this.renderCurrentStep();
      this.startTimer();
      this.utils.announce(`New problem: ${this.problem.text.slice(0, 80)}`);
    }, 150);
  }

  finishGame() {
    console.log('[GAME] Game finished! Problems completed:', this.problemsInSession, 'Final score:', Math.round(this.score));
    
    // Show game finished screen
    this.contentArea.innerHTML = `
      <div class="problem-complete">
        <h2>Game Finished!</h2>
        <p>You completed ${this.problemsInSession} problems</p>
        <p>Final Score: ${Math.round(this.score)} pts</p>
        <button id="homepage" class="btn-home">Back to Homepage</button>
      </div>
    `;
    
    // Save final progress to Firestore
    if (window.currentUser) {
      console.log('[GAME] Saving final game progress for user:', window.currentUser.uid);
      saveGameProgress(
        window.currentUser.uid,
        Math.max(this.highScore, this.score),
        this.completedProblems
      ).then(() => {
        console.log('[GAME] Final progress saved successfully');
      }).catch((err) => {
        console.error('[GAME] Error saving final progress:', err);
      });
    }
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
    // Update current high score and save to localStorage
    const newHighScore = Math.max(this.highScore, this.score);
    if (newHighScore > this.highScore) {
      this.highScore = newHighScore;
      localStorage.setItem('physicsHighScore', String(this.highScore));
      console.log('[GAME] New high score set:', this.highScore);
    }
    
    // Update completed problems in localStorage
    localStorage.setItem('physicsProgress', JSON.stringify(this.completedProblems));
    
    // Save to Firebase if user is logged in
    if (window.currentUser) {
      console.log('[GAME] Saving progress to Firebase:', { 
        uid: window.currentUser.uid,
        highScore: this.highScore,
        completedProblemsCount: this.completedProblems.length,
        sessionProblems: this.problemsInSession
      });
      saveGameProgress(
        window.currentUser.uid,
        this.highScore,
        this.completedProblems
      ).catch((err) => {
        console.error('[GAME] Firebase save error:', err.message);
        console.error('[GAME] Full error:', err);
      });
    } else {
      console.log('[GAME] User not logged in, only saving to localStorage');
    }
  }
}

// Initialize ProblemSolver when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ProblemSolver());
} else {
  console.log('DOM already ready, starting ProblemSolver...');
  new ProblemSolver();
}
