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
  {
    text: "A stone is thrown horizontally at 8.0 m/s from a cliff 80m high. How far from the base will it strike?",
    givens: [
      { value: '8.0', label: '8.0 m/s', target: 'vx' },
      { value: '0', label: '0 m/s', target: 'vy0' },
      { value: '80', label: '80 m', target: 'h' },
      { value: '9.8', label: '9.8 m/s²', target: 'g' }
    ],
    formulas: [
      { formula: 'x = vx × t', label: 'x = vx × t', target: 'range' },
      { formula: 'h = ½gt²', label: 'h = ½gt²', target: 'time' }
    ],
    unknowns: [
      { target: 'time', formula: 'h = ½gt²', answer: 4.0 },
      { target: 'range', formula: 'x = vx × t', answer: 32.3 }
    ]
  },

  {
    text: "Barry Bonds hits a 125m (450') home run. Assuming 45° angle, how long was the ball in the air?",
    givens: [
      { value: '125', label: '125 m', target: 'x' },
      { value: '45', label: '45°', target: 'angle' },
      { value: '9.8', label: '9.8 m/s²', target: 'g' }
    ],
    formulas: [
      { formula: 't = 2x tanθ / g', label: 't = 2x tanθ / g', target: 'time' }
    ],
    unknowns: [
      { target: 'time', formula: 't = 2x tanθ / g', answer: 12.7 }
    ]
  },

  {
    text: "Will Clark throws baseball at 25 m/s horizontal. Takes 3s to return. Calculate range.",
    givens: [
      { value: '25', label: '25 m/s', target: 'vx' },
      { value: '3', label: '3 s', target: 't' }
    ],
    formulas: [
      { formula: 'x = vx × t', label: 'x = vx × t', target: 'range' }
    ],
    unknowns: [
      { target: 'range', formula: 'x = vx × t', answer: 75 }
    ]
  },

  {
    text: "Bald eagle at 135m drops fish at 25 m/s. How far from drop point does fish land?",
    givens: [
      { value: '25', label: '25 m/s', target: 'vx' },
      { value: '135', label: '135 m', target: 'h' },
      { value: '9.8', label: '9.8 m/s²', target: 'g' }
    ],
    formulas: [
      { formula: 'h = ½gt²', label: 'h = ½gt²', target: 'time' },
      { formula: 'x = vx × t', label: 'x = vx × t', target: 'range' }
    ],
    unknowns: [
      { target: 'time', formula: 'h = ½gt²', answer: 5.25 },
      { target: 'range', formula: 'x = vx × t', answer: 131 }
    ]
  }
];


window.problems = problems;