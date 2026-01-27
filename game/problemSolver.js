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
    this.init();
  }


  /* INITIALIZE */
  init() {
    this.problems = problems;
    this.selectRandomProblem();
    this.setupUI();
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
  renderCurrentStep() {
    const container = document.getElementById('stepsContainer');
    if (!container) return;
    container.innerHTML = TEMPLATES[`STEP${this.currentStep}`](this.problem);

    if (this.currentStep === 1) {
      container.innerHTML = TEMPLATES.STEP1(this.problem);
    } else if (this.currentStep === 2) {
      container.innerHTML = TEMPLATES.STEP2(this.problem);
    } else {
      const currentUnknown = this.problem.unknowns?.[this.currentUnknownIndex];
      if (currentUnknown) {
        container.innerHTML = TEMPLATES.CALC_STEP(this.problem, currentUnknown, this.currentUnknownIndex, this.solvedVariables);
      } else {
        this.showCompletion();
      }
    }

    document.querySelectorAll('.drop-zone:empty').forEach(zone => {
    const varName = zone.getAttribute('data-var')?.toUpperCase() || '?';
    zone.textContent = `${varName} = ?`;
    });
  }

  /* CALCULATOR SYSTEM */
  toggleCalculator() {
    const overlay = document.getElementById('calcOverlay');
    if (overlay) {
      overlay.remove();
      if (this.boundKeyHandler) {
        document.removeEventListener('keydown', this.boundKeyHandler);
        delete this.boundKeyHandler;
      }
    } else {
      this.showCalculator();
    }
  }
  showCalculator() {
    const overlay = document.createElement('div');
    overlay.id = 'calcOverlay';
    overlay.innerHTML = TEMPLATES.CALCULATOR(this.problem.givens[0]?.label, this.problem.givens[1]?.label);
    this.leftPanel.appendChild(overlay);
    this.bindCalculator();
  }
  bindCalculator() {
    this.leftPanel.addEventListener('click', (e) => {
      if (e.target.classList.contains('calc-btn')) {
        const display = document.getElementById('calcDisplay');
        if (display) {
          this.handleCalcInput(e.target.dataset.value, display);
          const finalInput = document.getElementById('finalAnswer');
          if (finalInput && !finalInput.value) finalInput.value = display.value;
        }
      }
    });

    this.boundKeyHandler = (e) => {
      if (!document.getElementById('calcOverlay')) return;
      let value = '';
      if ('0123456789.'.includes(e.key)) value = e.key;
      else if (e.key === '+') value = '+';
      else if (e.key === '-') value = '-';
      else if (e.key === '*') value = '×';
      else if (e.key === '/') value = '÷';
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
          let expr = current.replace(/×/g, '*').replace(/÷/g, '/');
          let result = eval(expr);
          display.value = isNaN(result) ? 'Error' : result.toFixed(1);
        } catch { display.value = 'Error'; }
        break;
      case '+': case '-': case '×': case '÷':
        display.value = current === '0' ? value : current + value;
        break;
      default:
        display.value = (current === '0' && value !== '.') ? value : current + value;
    }
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
        window.location.href = "../homepage.html";
      }
    });

    setTimeout(() => this.setupDragDrop(), 100);
  }

  /* DRAGGER SYSTEM */
  setupDragDrop() {
  console.log('Setting up drag-drop...');
  
  // Drag start - contentArea delegation
  this.contentArea.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.drag-item');
    if (!item) return;
    
    const value = item.dataset.value || item.dataset.formula;  // ✅ Value or formula
    const label = item.dataset.label || item.textContent.trim();
    
    if (value) {
      // ✅ FIXED: Store the identifying data consistently
      e.dataTransfer.setData('text/plain', value);      // The unique identifier
      e.dataTransfer.setData('text/label', label);      // Visual label for debugging
      e.dataTransfer.setData('text/element-id', item.id || `drag-${value}`); // Element ID fallback
      
      // ✅ NEW: Mark this specific element for easy lookup
      item.dataset.draggedValue = value;
      item.style.opacity = '0.5';
      console.log('Drag started:', value, label);
    }
  });

  // Drag over - Blue glow effect + allow drop
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Remove previous drag-over states
    document.querySelectorAll('.drop-zone.drag-over').forEach(zone => {
      zone.classList.remove('drag-over');
    });
    
    // Light up zone under cursor
    const targetZone = e.target.closest('.drop-zone');
    if (targetZone) {
      targetZone.classList.add('drag-over');
    }
  });

  // Dragleave - Clear highlight when leaving drop zone
  document.addEventListener('dragleave', (e) => {
    if (!e.target.closest('.drop-zone')) {
      document.querySelectorAll('.drop-zone.drag-over').forEach(zone => {
        zone.classList.remove('drag-over');
      });
    }
  });

  // ✅ FIXED: Drop handler - now actually works!
  document.addEventListener('drop', (e) => {
    // Clear ALL highlights immediately
    document.querySelectorAll('.drop-zone.drag-over').forEach(zone => {
      zone.classList.remove('drag-over');
    });
    
    e.preventDefault();
    
    const zone = e.target.closest('.drop-zone');
    if (!zone) return;
    
    // ✅ FIXED: Get the dragged value from dataTransfer
    const draggedValue = e.dataTransfer.getData('text/plain');
    console.log('Drop detected:', draggedValue, 'on zone:', zone.dataset.var || zone.dataset.target);
    
    // ✅ Method 1: Find by data-value/data-formula (most reliable)
    const draggedItem = document.querySelector(
      `[data-value="${draggedValue}"], [data-formula="${draggedValue}"]`
    );
    
    // ✅ Method 2: Fallback - search all drag items with matching value
    if (!draggedItem) {
      const allItems = document.querySelectorAll('.drag-item');
      for (let item of allItems) {
        if ((item.dataset.value === draggedValue || item.dataset.formula === draggedValue)) {
          draggedItem = item;
          break;
        }
      }
    }
    
    if (draggedItem && draggedItem !== zone.querySelector('.drag-item')) {
      // Clear zone and move the actual DOM element
      zone.innerHTML = '';
      zone.appendChild(draggedItem);
      
      // Visual feedback
      zone.style.background = 'rgba(76, 175, 80, 0.2)';
      setTimeout(() => {
        zone.style.background = '';
      }, 500);
      
      console.log('✅ Item dropped successfully:', draggedValue);
    } else {
      console.log('❌ No valid item found for value:', draggedValue);
    }
  });

  // Drag end - Reset dragged item opacity
  document.addEventListener('dragend', (e) => {
    document.querySelectorAll('.drag-item').forEach(item => {
      item.style.opacity = '1';
    });
    
    // Clear any remaining highlights
    document.querySelectorAll('.drop-zone.drag-over').forEach(zone => {
      zone.classList.remove('drag-over');
    });
  });
}
  createDragItem(value, target = null) {
    const given = this.problem.givens.find(g => g.value === value);
    const label = given ? given.label : value;
    
    const div = document.createElement('div');
    div.className = 'drag-item';
    div.draggable = true;
    div.dataset.value = value;
    div.dataset.label = label;
    if (target) div.dataset.target = target;
    
    div.style.cssText = `
      padding: 10px 15px; margin: 5px; 
      background: #c2bc45ff; border-radius: 8px; 
      cursor: grab; display: inline-block; 
      font-weight: bold; min-width: 80px; text-align: center;
    `;
    div.textContent = label;
    return div;
}
  handleDrop(e) {
  const zone = e.target.closest('.drop-zone');
  if (!zone) return;
  
  const payload = e.dataTransfer.getData('text/plain');
  const label = e.dataTransfer.getData('text/label');
  
  // Just MOVE the DOM element - NO recreation
  const dragged = document.querySelector(`[data-payload="${payload}"]`);
  if (dragged) {
    zone.innerHTML = '';
    zone.appendChild(dragged);
  }
}

  /* CHECKING SYSTEM */
  checkStep1() {
  const zones = document.querySelectorAll('.drop-zone[data-var]');
  const correct = Array.from(zones).every(zone => {
    const item = zone.querySelector('.drag-item');
    const expected = this.problem.givens.find(g => g.target === zone.dataset.var);
    const targetVar = zone.dataset.var;
    
    // Case 1: GIVEN variable - must match exact value
    if (expected) {
      return item?.dataset.value === expected.value;
    }
    
    // Case 2: UNKNOWN variable - "?" is correct
    return item?.dataset.value === '?';
  });

  console.log('Step 1 correct:', correct);
  
  if (correct) {
    this.awardPoints(30);
  } else {
    this.penalize();
  }
}
  checkStep2() {
  console.group('STEP 2 DEBUG');
  
  const zones = document.querySelectorAll('.drop-zone[data-target]');
  console.log('Found zones:', zones.length);
  
  Array.from(zones).forEach((zone, i) => {
    const item = zone.querySelector('.drag-item');
    const formulaData = item?.dataset.formula;
    const target = zone.dataset.target;
    const expected = this.problem.formulas.find(f => f.target === target);
    
    console.log(`Zone ${i}:`, {
      target,
      hasItem: !!item,
      itemFormula: formulaData,
      expectedFormula: expected?.formula,
      isCorrect: item && formulaData === expected?.formula
    });
  });
  
  const correct = Array.from(zones).every(zone => {
    const item = zone.querySelector('.drag-item');
    const expectedFormula = this.problem.formulas.find(f => f.target === zone.dataset.target);
    return item && item.dataset.formula === expectedFormula?.formula;
  });
  
  console.log('FINAL RESULT:', correct);
  console.groupEnd();
  
  if (correct) {
    this.awardPoints(30);
  } else {
    this.penalize();
  }
}
  checkStep3() {
    const answer = parseFloat(document.getElementById('finalAnswer')?.value);
    const currentUnknown = this.problem.unknowns?.[this.currentUnknownIndex];
    const expected = currentUnknown?.answer;
    
    console.log("Answer:", answer, "Expected:", expected);
    
    if (isNaN(answer)) return this.highlightWrongAnswer();
    
    const tolerance = 1.0;
    if (Math.abs(answer - expected) <= tolerance) {
      // Save solved variable
      this.solvedVariables.push({
        value: answer,
        target: currentUnknown.target,
        label: `${answer} ${currentUnknown.target.toUpperCase()}`
      });
      
      this.currentUnknownIndex++;
      this.score += 40;
      this.updateScore();
      
      // Next unknown or complete
      setTimeout(() => {
        if (this.problem.unknowns?.[this.currentUnknownIndex]) {
          this.renderCurrentStep();
        } else {
          this.showCompletion();
        }
      }, 800);
    } else {
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
    this.penalize();
}

  /* SCORING SYSTEM */
  awardPoints(basePoints) {
    const timeBonus = Math.max(0.5, 3.0 - (Date.now() - this.startTime) / 10000);
    this.score += basePoints * timeBonus;
    this.updateScore();
    this.nextStep();
  }
  penalize() {
    this.mistakes++;
    this.score = Math.max(0, this.score - 10);
    this.updateScore();
  }
  updateScore() {
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
  }

  nextProblem() {
    console.log('Next problem requested...');
    this.currentStep = 1;
    this.currentUnknownIndex = 0;
    this.solvedVariables = [];
    this.startTime = Date.now();
    
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
    this.currentStep = 1;
    this.currentUnknownIndex = 0;
    this.solvedVariables = [];
    this.selectRandomProblem();
    this.updateScore();
    this.renderCurrentStep();
    this.startTimer();
  }

  goHome() {

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
