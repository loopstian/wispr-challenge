export const THEME = {
  colors: {
    background: '#ffffff',
    foreground: '#000000',
    accent: '#ff0000', // Neon Red
    accentBlue: '#0000ff', // Hyper Blue
    palette: [
      '#ffffff', // White
      '#ff0000', // Neon Red
      '#0000ff', // Hyper Blue
      '#ffff00', // Warning Yellow
      '#00ff00', // Terminal Green
      '#ff00ff', // Magenta
      '#00ffff', // Cyan
      '#f5f5f5', // Light Grey
    ]
  },
  dimensions: {
    rootNodeSize: 120,
    childNodeWidth: 200,
    childNodeHeight: 100,
    strokeWidth: 2,
  },
  physics: {
    chargeStrength: -800,
    linkDistance: 250,
    collideRadius: 100,
  }
};

export const INITIAL_DATA = {
  nodes: [
    { id: 'root', label: 'MY PARTNER', type: 'root' as const, x: 0, y: 0, backgroundColor: '#ffffff' }
  ],
  links: []
};