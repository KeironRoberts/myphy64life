// templates.js - templates for problem solver html panels WHAHWAHAHSDHWA

export const TEMPLATES = {
  SOLVER_PANEL: `
    <div class="solver-header">
      <span>Score: <span id="scoreDisplay">0</span></span>
      <span>Time: <span id="timerDisplay">0.0s</span></span>
    </div>
    <div id="probText"></div>
    <div id="stepsContainer" class="steps-scroll"></div>
  `,

  // templates.js
STEP1: (problem) => `
<div class="step active step-panel">
  <h3>Step 1: Match Given and Unknown Variable values</h3>
  <div class="source-zone drop-zone">
    ${problem.givens.map(g => `
      <div class="drag-item source-item" 
           draggable="true" 
           tabindex="0" role="button" aria-grabbed="false"
           data-value="${g.value}"
           data-label="${g.label}"
           data-minwidth="80">
        ${g.label}
      </div>
    `).join('')}
    
    ${problem.unknowns.map((u, i) => `
  <div class="drag-item placeholder" 
       draggable="true"
       tabindex="0" role="button" aria-grabbed="false"
       data-value="?" 
       data-label="?"
       data-target="${u.target}"
       data-id="unknown-${i}"
       data-minwidth="60">
    ?
  </div>
`).join('')}
  </div>
  
  <div class="variables" style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 20px;">
    ${[...problem.givens, ...problem.unknowns].map(g => `
      <div class="drop-zone drop-small" tabindex="0" role="button" aria-dropeffect="none" data-var="${g.target}">
        ${g.target.toUpperCase()} = ?
      </div>
    `).join('')}
  </div>
  
  <button class="check-btn">Check & Next →</button>
</div>
`,

  STEP2: (problem) => `
<div class="step active step-panel">
  <h3>Step 2: Match the formulas for Unknown Variables</h3>
  <div class="source-zone drop-zone">
    ${problem.formulas.map(formula => `
      <div class="drag-item source-item" 
           draggable="true" 
           tabindex="0" role="button" aria-grabbed="false"
           data-formula="${formula.formula}"
           data-target="${formula.target}"
           data-label="${formula.label}"
           data-minwidth="120">
        ${formula.label}
      </div>
    `).join('')}
  </div>
  
  <div class="variables" style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 20px;">
    ${problem.unknowns.map(unknown => `
      <div class="drop-zone drop-large" tabindex="0" role="button" aria-dropeffect="none" data-target="${unknown.target}">
        ${unknown.target.toUpperCase()}
      </div>
    `).join('')}
  </div>
  
  <button class="check-btn">Check & Next →</button>
</div>
`,

// templates.js
STEP3: (problem, solvedVariables = []) => `
  <div class="step active step-panel">
    <h3>Step 3: Calculate ${problem.unknowns?.[0]?.target.toUpperCase()}</h3>
    
    <div class="info-box">
      <strong>Available variables:</strong><br>
      <div class="chip-list">
        ${solvedVariables.map(g => `<span class="chip">${g.label} = ${g.target.toUpperCase()}</span>`).join('')}
      </div>
    </div>

    <div class="info-box">
      <strong>Formula:</strong><br>
      <div class="chip-list">
        <span class="chip">${problem.unknowns?.[0]?.formula}</span>
      </div>
    </div>
    
    <div class="calc-prompt">${problem.unknowns?.[0]?.target.toUpperCase()} = ?</div>
    <input type="number" id="finalAnswer" step="0.1" value="" class="full-input">
    <button class="check-btn">Check Answer</button>
  </div>
`,

  CALC_STEP: (problem, currentUnknown, stepIndex, solvedVariables = []) => {
  const stepNum = stepIndex + 3;
  const givensHtml = [...problem.givens, ...solvedVariables].map(g => 
    `<div class="given-chip">${g.label || g.value}: ${g.value}</div>`
  ).join('');
  
  return `
    <div class="step active step-panel">
      <h3>Step ${stepNum}: Solve ${currentUnknown.target.toUpperCase()}</h3>
      <div class="calc-prompt">${currentUnknown.formula} = ?</div>
      <div class="info-box">
        <strong>Available values:</strong><br>${givensHtml}
      </div>
      <div class="section-gap">
        <label for="finalAnswer" class="label-block">Enter ${currentUnknown.target.toUpperCase()}:</label>
        <input type="number" id="finalAnswer" step="0.1" 
               value="${currentUnknown.answer}" 
               class="full-input">
      </div>
      <button class="check-btn">Check Answer</button>
    </div>
  `;
},

  CALCULATOR: (given1, given2) => {
  const buttons = ['C', '⌫', '±', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '(', ')', 'sin', 'cos', 'tan', '0', '.', '='];
  return `
      <div class="calc-header">Calculator <span class="close-btn">&times;</span></div>
      <div class="calc-help">
        <div class="calc-hint">Press keys 0-9, +, -, ×, ÷, Enter, Backspace</div>
      </div>
      <div class="calc-grid">
        <input id="calcDisplay" type="text" value="0" readonly class="calc-display">
        ${buttons.map(btn => `<button class="calc-btn" data-value="${btn === '⌫' ? 'BACKSPACE' : btn}">${btn}</button>`).join('')}
      </div>
      <div class="calc-footer">
        For Step 3: ${given1} × ${given2}
      </div>
  `;
}

};


