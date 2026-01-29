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


    const container = document.createElement('div');
    container.id = 'gameContainer';
    Object.assign(container.style, {
      display: 'flex', alignItems: 'stretch', gap: '40px',
      maxWidth: '1450px', margin: '20px auto'
    });
    container.style.alignItems = 'stretch';


    const canvasContainer = document.getElementById('problem-container');


    document.body.insertBefore(container, document.body.firstChild);
    container.appendChild(canvasContainer);


    this.leftPanel = document.createElement('div');
    this.leftPanel.id = 'solverPanel';
    Object.assign(this.leftPanel.style, {
      position: 'relative', width: '380px', height: '660px', flexShrink: '0',
      background: 'rgba(255,255,255,0.95)', border: '4px solid black',
      borderRadius: '25px', padding: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
      fontFamily: "'Courier New', monospace", overflowY: 'auto'
    });
    container.insertBefore(this.leftPanel, canvasContainer);


    const calcButton = document.createElement('button');
    calcButton.id = 'calcToggle';
    calcButton.textContent = 'Calculator';
    Object.assign(calcButton.style, {
      position: 'absolute', bottom: '25px', left: '25px', padding: '12px 20px',
      background: '#2196F3', color: 'white', border: 'none', borderRadius: '25px',
      cursor: 'pointer', fontSize: '16px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
      fontWeight: 'bold'
    });
    calcButton.onclick = () => this.toggleCalculator();
    this.leftPanel.appendChild(calcButton);


    const contentArea = document.createElement('div');
    contentArea.id = 'panelContent';
    this.leftPanel.appendChild(contentArea);
    this.contentArea = contentArea;
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
  document.addEventListener('mousemove', this.boundMouseMove);
  document.addEventListener('mouseup', this.boundMouseUp);
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
  }


  /* DRAGGER SYSTEM */
  setupDragDrop() {
  if (window.problemSolverDragSetup) return;
  window.problemSolverDragSetup = true;


  document.addEventListener('dragstart', function(e) {
    const item = e.target.closest('.drag-item');
    if (!item) return;


    const sourceZone = item.closest('.drop-zone');
    if (sourceZone && !sourceZone.closest('.source-zone')) {
      e.dataTransfer.setData('text/sourceZoneId', sourceZone.dataset.var || 'unknown');
    }
   
    const value = item.dataset.value || item.dataset.formula || '?';
    const originalLabel = item.textContent.trim();
   
    // 🔒 Store original label in BOTH dataTransfer AND dataset
    e.dataTransfer.setData('text/plain', value);
    e.dataTransfer.setData('text/label', originalLabel);
    e.dataTransfer.setData('text/id', `drag-${Date.now()}`);
   
    item.dataset.originalLabel = originalLabel;
    item.dataset.tempDragId = e.dataTransfer.getData('text/id');
    item.style.opacity = '0.5';
  });


  document.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.drop-zone.drag-over').forEach(z => z.classList.remove('drag-over'));
    const zone = e.target.closest('.drop-zone');
    if (zone) zone.classList.add('drag-over');
  });


  document.addEventListener('drop', function(e) {
  e.preventDefault(); // Prevent browser from interrupting
  document.querySelectorAll('.drop-zone.drag-over').forEach(z => z.classList.remove('drag-over')); // Handle CSS Blue Hover Design


  // Variables
  const zone = e.target.closest('.drop-zone');
  if (!zone) return; // NULL Prevention
  const value = e.dataTransfer.getData('text/plain');
  const originalLabel = e.dataTransfer.getData('text/label');
  const tempId = e.dataTransfer.getData('text/id');
  const targetVar = zone.dataset.var || zone.dataset.target;
  const sourceZoneId = e.dataTransfer.getData('text/sourceZoneId');


  if (sourceZoneId !== 'unknown') {
    const sourceZone = document.querySelector(`[data-var="${sourceZoneId}"]`);
    if (sourceZone) {
      sourceZone.innerHTML = `${sourceZoneId.toUpperCase()} = ?`;
      sourceZone.dataset.value = '?';
    }
  }
 
  // Remove source item
  const sourceItem = document.querySelector(`[data-temp-drag-id="${tempId}"]`);
  if (sourceItem) sourceItem.remove();


  // Initialize drag-items
  const createDragItem = (itemData, isDropZone = false) => {
    const item = document.createElement('div');
    item.className = 'drag-item';
    item.draggable = true;
    Object.assign(item.dataset, {
      value: itemData.value,
      originalLabel: itemData.originalLabel,
      label: itemData.label,
      ...(isDropZone && { target: itemData.target })
    });
    item.textContent = isDropZone ? itemData.label : itemData.originalLabel;
    const bgColor = isDropZone ? '#4CAF50' : '#c2bc45ff';
    item.style.cssText = `padding: 10px 15px; background: ${bgColor}; border-radius: 8px; font-weight: bold; text-align: center; cursor: grab;`;
    return item;
  };


  // SWAPPING MECHANIC
  const existingValue = zone.querySelector('.drag-item');
  if (existingValue) {
    const sourceContainer = document.querySelector('.source-zone');
    if (sourceContainer) {
      // Create item to be brought back to source
      const restoredItem = createDragItem({
        value: existingValue.dataset.value,
        originalLabel: existingValue.dataset.originalLabel,
        label: existingValue.dataset.label
      }, false);
      sourceContainer.appendChild(restoredItem);
    }
  }
 
  // Update drop-zone text AND add draggable item
  if (targetVar && !zone.closest('.source-zone')) {
    zone.innerHTML = `${targetVar.toUpperCase()} = `;
   
    // Store data for checking
    zone.dataset.value = value;
    zone.dataset.label = originalLabel;
    zone.dataset.target = targetVar;
   
    // Display item
    const displayItem = createDragItem({
      value,
      originalLabel,
      label: originalLabel,
      target: targetVar
    }, true);
    zone.appendChild(displayItem);
    this.updateEmptyZones();
  }
  });
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
      <div style="text-align:center;padding:30px;background:linear-gradient(45deg,#4CAF50,#81C784);color:white;border-radius:15px;">
        <h2>🎉 Problem Complete!</h2>
        <p>Final Score: ${Math.round(this.score)} pts</p>
        <div style="margin: 20px 0;">
          <button id="nextProblem" style="padding:12px 24px;margin:5px;background:#2196F3;color:white;border:none;border-radius:20px;cursor:pointer;">Next Problem</button>
          <button id="homepage" style="padding:12px 24px;margin:5px;background:#ff9800;color:white;border:none;border-radius:20px;cursor:pointer;">Homepage</button>
        </div>
      </div>
    `;


    localStorage.setItem('physicsHighScore', Math.max(this.highScore, this.score));
    this.completedProblems.push(this.currentProblem);
    localStorage.setItem('physicsProgress', JSON.stringify(this.completedProblems.slice(-10)));
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