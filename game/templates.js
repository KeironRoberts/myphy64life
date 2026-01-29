// templates.js - templates for problem solver html panels WHAHWAHAHSDHWA

export const TEMPLATES = {
  SOLVER_PANEL: `
    <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:18px;margin-bottom:15px;">
      <span>Score: <span id="scoreDisplay">0</span></span>
      <span>Time: <span id="timerDisplay">0.0s</span></span>
    </div>
    <div id="probText" style="font-size:16px;line-height:1.5;margin-bottom:20px;height:120px;overflow-y:auto;"></div>
    <div id="stepsContainer" style="height:320px;overflow-y:auto;"></div>
  `,

  // templates.js
STEP1: (problem) => `
<div class="step active" style="border: 2px solid #4CAF50; padding: 20px; border-radius: 10px;">
  <h3>Step 1: Match Given and Unknown Variable values</h3>
  <div class="source-zone drop-zone" style="min-height: 60px;">
    ${problem.givens.map(g => `
      <div class="drag-item" 
           draggable="true" 
           data-value="${g.value}"
           data-label="${g.label}"
           style="padding: 10px 15px; margin: 5px; background: #c2bc45ff; border-radius: 8px; cursor: grab; display: inline-block; font-weight: bold; min-width: 80px; text-align: center;">
        ${g.label}
      </div>
    `).join('')}
    
    ${problem.unknowns.map((u, i) => `
  <div class="drag-item placeholder" 
       draggable="true" 
       data-value="?" 
       data-label="?"
       data-target="${u.target}"
       data-id="unknown-${i}"
       style="padding: 10px 15px; margin: 5px; background: #ff9800ff; border-radius: 8px; cursor: grab; display: inline-block; font-weight: bold; min-width: 60px; text-align: center;">
    ?
  </div>
`).join('')}
  </div>
  
  <div class="variables" style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 20px;">
    ${[...problem.givens, ...problem.unknowns].map(g => `
      <div class="drop-zone" data-var="${g.target}" 
           style="height: 60px; padding: 8px 12px; border: 2px dashed #666; display: flex; align-items: center; justify-content: center; border-radius: 8px; min-width: 80px; font-weight: bold;">
        ${g.target.toUpperCase()} = ?
      </div>
    `).join('')}
  </div>
  
  <button class="check-btn" style="margin-top: 20px; padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; width: 100%; font-size: 16px;">Check & Next →</button>
</div>
`,

  STEP2: (problem) => `
<div class="step active" style="border: 2px solid #4CAF50; padding: 20px; border-radius: 10px;">
  <h3>Step 2: Match the formulas for Unknown Variables</h3>
  <div class="source-zone drop-zone" style="min-height: 60px;">
    ${problem.formulas.map(formula => `
      <div class="drag-item" 
           draggable="true" 
           data-formula="${formula.formula}"
           data-target="${formula.target}"
           data-label="${formula.label}"
           style="padding: 10px 15px; margin: 5px; background: #c2bc45ff; border-radius: 8px; cursor: grab; display: inline-block; font-weight: bold; min-width: 120px; text-align: center; white-space: nowrap;">
        ${formula.label}
      </div>
    `).join('')}
  </div>
  
  <div class="variables" style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 20px;">
    ${problem.unknowns.map(unknown => `
      <div class="drop-zone" data-target="${unknown.target}" 
           style="height: 60px; padding: 12px; border: 2px dashed #666; display: flex; align-items: center; justify-content: center; border-radius: 8px; min-width: 120px; font-weight: bold;">
        ${unknown.target.toUpperCase()}
      </div>
    `).join('')}
  </div>
  
  <button class="check-btn" style="margin-top: 20px; padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; width: 100%; font-size: 16px;">Check & Next →</button>
</div>
`,

// templates.js
STEP3: (problem, solvedVariables = []) => `
  <div class="step active">
    <h3>Step 3: Calculate ${problem.unknowns?.[0]?.target.toUpperCase()}</h3>
    
    <div style="margin: 20px 0; background: #f0f8f0; padding: 15px; border-radius: 8px;">
      <strong>Available variables:</strong><br>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
        ${solvedVariables.map(g => 
          `<span style="padding: 5px 10px; background: #e8f5e8; border-radius: 4px; white-space: nowrap;">
            ${g.label} = ${g.target.toUpperCase()}
          </span>`
        ).join('')}
      </div>
    </div>

    <div style="margin: 20px 0; background: #f0f8f0; padding: 15px; border-radius: 8px;">
      <strong>Formula:</strong><br>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
        <span style="padding: 5px 10px; background: #e8f5e8; border-radius: 4px; white-space: nowrap;">
          ${problem.unknowns?.[0]?.formula}
        </span>
      </div>
    </div>
    
    <div style="font-size: 18px; margin: 15px 0;">${problem.unknowns?.[0]?.target.toUpperCase()} = ?</div>
    <input type="number" id="finalAnswer" step="0.1" value="" style="width: 100%; padding: 10px; font-size: 16px; border: 2px solid #666; border-radius: 5px;">
    <button class="check-btn" style="margin-top: 15px; padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; width: 100%; font-size: 16px;">Check Answer</button>
  </div>
`,

  CALC_STEP: (problem, currentUnknown, stepIndex, solvedVariables = []) => {
  const stepNum = stepIndex + 3;
  const givensHtml = [...problem.givens, ...solvedVariables].map(g => 
    `<div style="padding: 8px; background: #e8f5e8; border-radius: 5px; margin: 2px;">${g.label || g.value}: ${g.value}</div>`
  ).join('');
  
  return `
    <div class="step active" style="border: 2px solid #4CAF50; padding: 20px; border-radius: 10px;">
      <h3>Step ${stepNum}: Solve ${currentUnknown.target.toUpperCase()}</h3>
      <div style="font-size: 18px; margin: 20px 0;">${currentUnknown.formula} = ?</div>
      <div style="margin: 20px 0; background: #f0f8f0; padding: 15px; border-radius: 8px;">
        <strong>Available values:</strong><br>${givensHtml}
      </div>
      <div style="margin: 20px 0;">
        <label for="finalAnswer" style="display: block; margin-bottom: 10px; font-weight: bold;">Enter ${currentUnknown.target.toUpperCase()}:</label>
        <input type="number" id="finalAnswer" step="0.1" 
               value="${currentUnknown.answer}" 
               style="width: 100%; padding: 12px; font-size: 18px; border: 2px solid #666; border-radius: 5px;">
      </div>
      <button class="check-btn" style="padding: 12px 24px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">Check Answer</button>
    </div>
  `;
},

  CALCULATOR: (given1, given2) => {
  const buttons = ['C', '⌫', '±', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '(', ')', 'sin', 'cos', 'tan', '0', '.', '='];
  return `
      <div class="calc-header" style="cursor: grab; padding: 10px; background: #2196F3; color: white; border-radius: 12px 12px 0 0; margin: 0 -10px 15px -10px; user-select: none;">Calculator <span class="close-btn">&times;</span></div>
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 12px; color: #666;">Press keys 0-9, +, -, ×, ÷, Enter, Backspace</div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; max-width: 300px; margin: 0 auto;">
        <input id="calcDisplay" type="text" value="0" readonly style="grid-column: span 4; padding: 20px; font-size: 24px; text-align: right; border: 2px solid #ccc; border-radius: 10px; background: #f8f9fa;">
        ${buttons.map(btn => `<button class="calc-btn" data-value="${btn === '⌫' ? 'BACKSPACE' : btn}" style="padding: 12px; font-size: 14px; border: 1px solid #ddd; border-radius: 10px; background: #e9ecef; cursor: pointer;">${btn}</button>`).join('')}
      </div>
      <div style="margin-top: 15px; font-size: 12px; color: #666; text-align: center;">
        For Step 3: ${given1} × ${given2}
      </div>
  `;
}

};


