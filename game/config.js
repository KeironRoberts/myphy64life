// config.js - Game Configuration and Constants

export const canvasSettings = {
  logicalWidth: 1000,
  logicalHeight: 800
};

export const physics = {
  g: 9.8,
  angle: 45 * Math.PI / 180,
  scale: 3,
  vx: 25 * Math.cos(45 * Math.PI / 180) * 3,
  vy: 40 * Math.sin(45 * Math.PI / 180) * 3,
  startX: 50,
  startY: 600 - 90,
  radius: 10,
  Tscale: 0.05,
  groundY: null
};

export const styles = {
  background: '#3659789e',
  groundTop: '#8b6522ff',
  groundGrass: '#4CAF50',
  ballFill: '#c2bc45ff',
  ballStroke: 'rgba(20,20,255, 0.7)',
  trailStroke: '#000042ff',
  trailShadow: 'rgba(74,144,226,0.8)',
  ballShadow: '#c2bc45ff'
};

export function setupClouds(cloudsData) {
  const cloudImg = new Image();
  cloudImg.src = 'images/cloud2.png';
  return cloudsData.map(data => ({ img: cloudImg, ...data }));
}

export const cloudsData = [
  { x: 150, y: 70 },
  { x: 650, y: 90 }
];

export const problems = [

  // Stone thrown from cliff
  {
    text: "A stone is thrown horizontally at 8.0 m/s from a cliff 80m high. How far from the base will it strike?",
    givens: [
      { value: '8.0', label: '8.0 m/s', target: 'vx' },
      { value: '0', label: '0 m/s', target: 'vy' },
      { value: '80', label: '80 m', target: 'y' },
      { value: '9.8', label: '9.8m/s²', target: 'g' }
    ],
    formulas: [
      { formula: 'x=vxt', label: 'x = vx × t', target: 'range' },
      { formula: 'y=0.5gt^2', label: 'h = ½gt²', target: 'time' }
    ],
    unknowns: [
      {formula: 'y=vy0​t+21​gt²', 
      target: 't', 
      answer: 4.04  /* t² = √(80/4.9) = 4.04s */},
      {formula: 'x=vxt', 
      target: 'range', 
      answer: 32.32  /* (8.0m/s)(4.04s) = 32.32m */}
    ], // done
  },

  // Barry Bonds home run
  {
    text: "Barry Bonds hits a 125m (450') home run. Assuming that the ball left the bat at an angle of 45° from the horizontal, calculate how long the ball was in the air.",
    givens: [
      { value: '125', label: '125 m', target: 'x' },
      { value: '45', label: '45 °', target: 'angle' },
      { value: '9.8', label: '9.8m/s²', target: 'g' }
    ],
    formulas: [
      { formula: 'x=(v0cosθ)t', label: 'x = (v₀cosθ)t', target: 'time' }
    ],
    unknowns: [
      {formula: 't² = (2X)(tanθ)/g', 
        target: 'time', 
        answer: 12.7  /* t² = (2(125)(1))/9.8 = 5.05s */}
    ], // DONE!!!
  },

  // Will Clark baseball
  {
    text: "Will Clark throws a baseball with a horizontal component of velocity of 25 m/s. It takes 3.00s to come back to its original height. Calculate its horizontal range.",
    givens: [
      { value: '25', label: '25 m/s', target: 'vx' },
      { value: '3', label: '3.00 s', target: 't' }
    ],
    formulas: [
      { formula: 'x=vxt', label: 'x = vx × t', target: 'range' },
      { formula: 'vy=g×t/2', label: 'vy = g×t/2', target: 'vy' }
    ],
    unknowns: [
      {formula: 'x = v*t', 
      target: 'range', 
      answer: 75  /* 25 m/s × 3 s = 75 m */}
    ], // DONE!!!!
  },
  
  // Bald eagle fish drop
  {
    text: "A bald eagle in level flight at a height of 135m drops the fish it caught. If the eagle's speed is 25.0 m/s how far from the drop point will the fish land?",
    givens: [
      { value: '25', label: '25.0 m/s', target: 'vx' },
      { value: '135', label: '135 m', target: 'h' }
    ],
    formulas: [
      { formula: 'x=vxt', label: 'x = vx × t', target: 'range' },
      { formula: 'h=0.5gt^2', label: 'h = ½gt²', target: 'time' }
    ],
    unknowns: [
      {formula: 'h  = ½gt²', 
      target: 'time', 
      answer: 5.25  /* 25 m/s × 2.1s (t=√(2×135/9.8)) */},
      {formula: 'x = v*t', 
      target: 'range', 
      answer: 131  /* (25)(5.25) = 131m */}
    ], // DONE!!!
  }
];

window.problems = problems;