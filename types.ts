import * as d3 from 'd3';

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'root' | 'child';
  imageUrl?: string;
  backgroundColor?: string;
  // Visual properties managed by simulation
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  id: string;
}

export interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string | null;
  isOpen: boolean;
}

export interface EditModalState {
  isOpen: boolean;
  nodeId: string | null;
  label: string;
  imageUrl?: string;
  color?: string;
}