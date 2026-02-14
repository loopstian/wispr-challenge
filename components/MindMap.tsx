import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Plus, Edit3, Move } from 'lucide-react';
import { GraphNode, GraphLink, ContextMenuState, EditModalState } from '../types';
import { THEME, INITIAL_DATA } from '../constants';
import EditModal from './EditModal';

const STORAGE_KEY = 'architecture_of_love_data';

const MindMap: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  
  // Load initial data
  const loadInitialData = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          nodes: parsed.nodes || [...INITIAL_DATA.nodes],
          links: parsed.links || [...INITIAL_DATA.links],
          partnerName: parsed.partnerName || ''
        };
      }
    } catch (e) {
      console.error("Failed to load data", e);
    }
    return {
      nodes: [...INITIAL_DATA.nodes],
      links: [...INITIAL_DATA.links],
      partnerName: ''
    };
  };

  const [initialData] = useState(loadInitialData);

  // Data State
  const [nodes, setNodes] = useState<GraphNode[]>(initialData.nodes);
  const [links, setLinks] = useState<GraphLink[]>(initialData.links);

  // UI State
  const [partnerName, setPartnerName] = useState(initialData.partnerName);
  const [isEditingName, setIsEditingName] = useState(false);

  // Simulation Ref
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  // Interaction State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ x: 0, y: 0, nodeId: null, isOpen: false });
  const [editModal, setEditModal] = useState<EditModalState>({ isOpen: false, nodeId: null, label: '', color: '#ffffff' });
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });

  // Persistence Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      const dataToSave = {
        nodes: nodes.map(n => ({
          id: n.id,
          label: n.label,
          type: n.type,
          imageUrl: n.imageUrl,
          backgroundColor: n.backgroundColor,
          // Save physics state to restore layout
          x: n.x,
          y: n.y,
          fx: n.fx,
          fy: n.fy
        })),
        links: links.map(l => ({
          id: l.id,
          // D3 replaces source/target with objects, we need to save IDs
          source: (typeof l.source === 'object' ? (l.source as any).id : l.source),
          target: (typeof l.target === 'object' ? (l.target as any).id : l.target)
        })),
        partnerName
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }, 1000); // Debounce saves by 1s

    return () => clearTimeout(timer);
  }, [nodes, links, partnerName]);

  // Initialize Simulation
  useEffect(() => {
    if (!svgRef.current || simulationRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Center the view initially
    const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2);
    setTransform({ k: 1, x: width / 2, y: height / 2 });
    
    // Zoom Behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        if (gRef.current) {
          d3.select(gRef.current).attr('transform', event.transform.toString());
          setTransform(event.transform);
          setContextMenu(prev => ({ ...prev, isOpen: false }));
        }
      });

    const svg = d3.select(svgRef.current);
    svg.call(zoom).call(zoom.transform, initialTransform);

    // Disable default double click zoom
    svg.on("dblclick.zoom", null);

    // Create Simulation
    const simulation = d3.forceSimulation<GraphNode, GraphLink>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(THEME.physics.linkDistance))
      .force('charge', d3.forceManyBody().strength(THEME.physics.chargeStrength))
      .force('collide', d3.forceCollide().radius((d) => {
        return d.type === 'root' ? 150 : 120; // Collision radius based on node size
      }))
      .force('x', d3.forceX(0).strength(0.01)) // Gentle centering
      .force('y', d3.forceY(0).strength(0.01));

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, []); // Run once on mount

  // Update Simulation Data
  useEffect(() => {
    if (!simulationRef.current) return;

    const simulation = simulationRef.current;
    
    // Maintain positions of existing nodes
    simulation.nodes(nodes);
    (simulation.force('link') as d3.ForceLink<GraphNode, GraphLink>).links(links);
    
    simulation.alpha(0.3).restart();
  }, [nodes, links]);

  // Tick update
  useEffect(() => {
    if (!simulationRef.current) return;

    const simulation = simulationRef.current;
    
    simulation.on('tick', () => {
      if (!gRef.current) return;
      
      const g = d3.select(gRef.current);

      // Update Links
      g.selectAll<SVGLineElement, GraphLink>('line.link')
        .data(links, (d) => d.id)
        .join(
          enter => enter.append('line')
            .attr('class', 'link')
            .attr('stroke', '#000')
            .attr('stroke-width', THEME.dimensions.strokeWidth)
            .lower(), // Move links to the background
          update => update,
          exit => exit.remove()
        )
        .attr('x1', d => (d.source as GraphNode).x ?? 0)
        .attr('y1', d => (d.source as GraphNode).y ?? 0)
        .attr('x2', d => (d.target as GraphNode).x ?? 0)
        .attr('y2', d => (d.target as GraphNode).y ?? 0);

      // Update Nodes
      const nodeSelection = g.selectAll<SVGGElement, GraphNode>('g.node')
        .data(nodes, (d) => d.id);
        
      const nodeEnter = nodeSelection.enter()
        .append('g')
        .attr('class', 'node cursor-grab active:cursor-grabbing')
        .call(d3.drag<SVGGElement, GraphNode>()
          .on('start', dragStarted)
          .on('drag', dragged)
          .on('end', dragEnded)
        )
        .on('click', handleNodeClick);

      // Draw Root Node
      nodeEnter.filter(d => d.type === 'root').each(function(d) {
        const el = d3.select(this);
        const heartPath = "M0,-30 C-20,-50 -60,-40 -60,0 C-60,40 0,70 0,70 C0,70 60,40 60,0 C60,-40 20,-50 0,-30 Z";

        // Shadow
        el.append('path')
          .attr('d', heartPath)
          .attr('fill', '#000')
          .attr('transform', 'translate(6, 6)');
        
        // Main Shape
        const main = el.append('g').attr('class', 'main-shape');
        
        main.append('path')
          .attr('d', heartPath)
          .attr('fill', d.backgroundColor || '#fff')
          .attr('stroke', '#000')
          .attr('stroke-width', 4);

        // Image Clip Path
        main.append('defs').append('clipPath')
          .attr('id', `clip-${d.id}`)
          .append('path')
          .attr('d', heartPath);

        // Image container group
        const imgGroup = main.append('g')
            .attr('clip-path', `url(#clip-${d.id})`)
            .attr('class', 'image-group'); // Class for selection
        
        // Image
        imgGroup.append('image')
           .attr('class', 'node-image')
           .attr('x', -60) // Tighter bounds to fit the heart
           .attr('y', -50)
           .attr('width', 120)
           .attr('height', 120)
           .attr('preserveAspectRatio', 'xMidYMid slice');

        // Text
        main.append('text')
          .attr('class', 'node-label pointer-events-none')
          .attr('text-anchor', 'middle')
          .attr('dy', '10px') 
          .style('font-family', 'Space Mono, monospace')
          .style('font-weight', 'bold')
          .style('font-size', '14px')
          .style('text-transform', 'uppercase')
          .text(d.label);
      });

      // Draw Child Nodes
      nodeEnter.filter(d => d.type === 'child').each(function(d) {
        const el = d3.select(this);
        const w = THEME.dimensions.childNodeWidth;
        const h = THEME.dimensions.childNodeHeight;

        // Shadow
        el.append('rect')
          .attr('width', w)
          .attr('height', h)
          .attr('x', -w / 2 + 6)
          .attr('y', -h / 2 + 6)
          .attr('fill', '#000');
        
        const main = el.append('g').attr('class', 'main-shape');

        // Background Rect
        main.append('rect')
          .attr('class', 'bg-rect')
          .attr('width', w)
          .attr('height', h)
          .attr('x', -w / 2)
          .attr('y', -h / 2)
          .attr('fill', d.backgroundColor || '#fff')
          .attr('stroke', '#000')
          .attr('stroke-width', 3);

        // Image Group
        // We set up a clip path that matches the rect so images don't spill out
        main.append('defs').append('clipPath')
          .attr('id', `clip-child-${d.id}`)
          .append('rect')
          .attr('width', w)
          .attr('height', h)
          .attr('x', -w / 2)
          .attr('y', -h / 2);

        const imgGroup = main.append('g')
            .attr('clip-path', `url(#clip-child-${d.id})`);

        imgGroup.append('image')
          .attr('class', 'node-image')
          .attr('x', -w / 2)
          .attr('y', -h / 2)
          .attr('width', w)
          .attr('height', h)
          .attr('preserveAspectRatio', 'xMidYMid slice')
          .style('display', 'none'); // Hidden by default

        // Text Container
        const fo = main.append('foreignObject')
          .attr('class', 'node-text-fo')
          .attr('x', -w / 2 + 10)
          .attr('y', -h / 2 + 10)
          .attr('width', w - 20)
          .attr('height', h - 20);

        fo.append('xhtml:div')
          .style('width', '100%')
          .style('height', '100%')
          .style('display', 'flex')
          .style('align-items', 'center')
          .style('justify-content', 'center')
          .style('text-align', 'center')
          .style('font-family', 'Space Mono, monospace')
          .style('font-size', '12px')
          .style('line-height', '1.2')
          .style('color', '#000')
          .style('overflow', 'hidden')
          .style('word-break', 'break-word')
          .text(d.label);
      });

      // --- Update Phase for ALL nodes (handling changes) ---
      
      // Update Root Nodes
      const rootNodes = nodeSelection.filter(d => d.type === 'root');
      
      // Update Background Color
      rootNodes.select('.main-shape > path')
        .attr('fill', d => d.backgroundColor || '#ffffff');

      rootNodes.select('text.node-label')
        .text(d => d.label)
        .style('fill', d => d.imageUrl ? 'transparent' : '#000'); // Hide text if image present
      
      rootNodes.select('image.node-image')
        .attr('href', d => d.imageUrl || '')
        .attr('xlink:href', d => d.imageUrl || ''); // Fallback for some browsers

      // Update Child Nodes
      const childNodes = nodeSelection.filter(d => d.type === 'child');
      
      // Update Background Color
      childNodes.select('.bg-rect')
        .attr('fill', d => d.backgroundColor || '#ffffff');

      childNodes.each(function(d) {
          const sel = d3.select(this);
          const hasImage = !!d.imageUrl;
          
          // Toggle Image Visibility
          sel.select('image.node-image')
            .style('display', hasImage ? 'block' : 'none')
            .attr('href', d.imageUrl || '')
            .attr('xlink:href', d.imageUrl || '');
            
          // If has image, text needs to be styled differently (e.g. pill overlay)
          // or just simple white bg text.
          const textDiv = sel.select('.node-text-fo div');
          
          if (hasImage) {
              textDiv
                .style('background-color', 'rgba(255, 255, 255, 0.9)')
                .style('border', '2px solid black')
                .style('color', '#000')
                .style('padding', '4px')
                .style('height', 'auto') // Shrink to fit content
                .style('max-height', '80%');
          } else {
              textDiv
                .style('background-color', 'transparent')
                .style('border', 'none')
                .style('color', '#000')
                .style('height', '100%');
          }
      });
      
      childNodes.select('.node-text-fo div').text(d => d.label);


      // Position Updates
      nodeSelection.merge(nodeEnter as any)
        .attr('transform', d => `translate(${d.x},${d.y})`);

      nodeSelection.exit().remove();
    });

  }, [nodes, links]);


  // Drag Functions
  const dragStarted = (event: any, d: GraphNode) => {
    if (!event.active) simulationRef.current?.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  };

  const dragged = (event: any, d: GraphNode) => {
    d.fx = event.x;
    d.fy = event.y;
  };

  const dragEnded = (event: any, d: GraphNode) => {
    if (!event.active) simulationRef.current?.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  };

  // Interaction Handlers
  const handleNodeClick = (event: any, d: GraphNode) => {
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: d.id,
      isOpen: true
    });
  };

  const addNode = () => {
    if (!contextMenu.nodeId) return;
    const parentId = contextMenu.nodeId;
    // Ensure we are working with valid node references
    const parentNode = nodes.find(n => n.id === parentId);
    
    if (!parentNode) return;

    const newId = `node-${Date.now()}`;
    const newNode: GraphNode = {
      id: newId,
      label: 'New Memory',
      type: 'child',
      // Spawn near parent
      x: (parentNode.x || 0) + (Math.random() - 0.5) * 50,
      y: (parentNode.y || 0) + (Math.random() - 0.5) * 50,
      backgroundColor: '#ffffff', // Default color
    };

    const newLink: GraphLink = {
      source: parentId,
      target: newId,
      id: `${parentId}-${newId}`
    };

    setNodes(prev => [...prev, newNode]);
    setLinks(prev => [...prev, newLink]);
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  };

  const openEditModal = () => {
    if (!contextMenu.nodeId) return;
    const node = nodes.find(n => n.id === contextMenu.nodeId);
    if (node) {
      setEditModal({
        isOpen: true,
        nodeId: node.id,
        label: node.label,
        imageUrl: node.imageUrl,
        color: node.backgroundColor || '#ffffff'
      });
      setContextMenu(prev => ({ ...prev, isOpen: false }));
    }
  };

  const saveNodeEdit = (label: string, imageUrl?: string, color?: string) => {
    if (!editModal.nodeId) return;
    
    // CRITICAL FIX: Mutate the object properties but create a new array reference.
    // D3 links hold references to the node OBJECTS. If we replace the object with { ...n },
    // the link references break because they point to the old object.
    
    // 1. Find the node object in the current array
    const node = nodes.find(n => n.id === editModal.nodeId);
    
    if (node) {
        // 2. Mutate properties that don't affect topology/physics
        node.label = label;
        node.imageUrl = imageUrl;
        node.backgroundColor = color;
    }

    // 3. Trigger React re-render with new array reference
    setNodes([...nodes]);
    setEditModal(prev => ({ ...prev, isOpen: false }));
  };

  const deleteNode = () => {
    if (!editModal.nodeId) return;
    const idToDelete = editModal.nodeId;

    const nodesToDelete = new Set<string>();
    const stack = [idToDelete];
    while (stack.length > 0) {
        const currentId = stack.pop()!;
        nodesToDelete.add(currentId);
        // Find children
        const childrenLinks = links.filter(l => (typeof l.source === 'object' ? (l.source as GraphNode).id : l.source) === currentId);
        childrenLinks.forEach(l => {
             const targetId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
             stack.push(targetId as string);
        });
    }

    setNodes(prev => prev.filter(n => !nodesToDelete.has(n.id)));
    setLinks(prev => prev.filter(l => {
        const sId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
        const tId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
        return !nodesToDelete.has(sId as string) && !nodesToDelete.has(tId as string);
    }));
    
    setEditModal(prev => ({ ...prev, isOpen: false }));
  }

  return (
    <div className="relative w-full h-screen bg-white overflow-hidden">
        {/* Background Grid */}
        <div 
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
                backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                transform: `translate(${transform.x % 40}px, ${transform.y % 40}px) scale(${transform.k})`,
                transformOrigin: '0 0'
            }}
        />

        {/* Info / Title Overlay */}
        <div className="absolute top-6 left-6 z-10 max-w-[80vw]">
            <div 
                className={`
                    flex flex-wrap items-stretch bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] mb-2 transition-all
                    ${!isEditingName ? 'cursor-pointer hover:bg-gray-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none' : ''}
                `}
                onClick={() => !isEditingName && setIsEditingName(true)}
            >
                <h1 className="text-3xl font-bold uppercase tracking-tighter text-black px-3 py-2 flex items-center">
                    Why I Love You
                </h1>
                
                {isEditingName ? (
                    <input
                        type="text"
                        value={partnerName}
                        onChange={(e) => setPartnerName(e.target.value)}
                        onBlur={() => setIsEditingName(false)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') setIsEditingName(false);
                        }}
                        autoFocus
                        className="text-3xl font-bold uppercase tracking-tighter bg-blue-600 text-white px-3 py-2 outline-none min-w-[100px] max-w-[300px] placeholder-blue-300"
                        placeholder="NAME"
                    />
                ) : (
                    <div className={`px-3 py-2 flex items-center ${partnerName ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                         <span className="text-3xl font-bold uppercase tracking-tighter">
                            {partnerName || "..."}
                         </span>
                    </div>
                )}
            </div>
        </div>

        {/* D3 Canvas */}
        <svg 
            ref={svgRef} 
            className="w-full h-full cursor-move active:cursor-grabbing"
            onClick={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
        >
            <g ref={gRef} className="node-group"></g>
        </svg>

        {/* Context Menu */}
        {contextMenu.isOpen && (
            <div 
                className="absolute z-20 flex flex-col gap-2 p-2 bg-white text-black border-2 border-black shadow-[6px_6px_0px_0px_#000]"
                style={{ 
                    left: contextMenu.x + 20, 
                    top: contextMenu.y - 20 
                }}
            >
                <button 
                    onClick={addNode}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-black hover:text-white transition-colors font-bold uppercase text-sm text-black"
                >
                    <Plus size={16} />
                    <span>Expand Structure</span>
                </button>
                <button 
                    onClick={openEditModal}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-black hover:text-white transition-colors font-bold uppercase text-sm text-black"
                >
                    <Edit3 size={16} />
                    <span>Modify Data</span>
                </button>
            </div>
        )}

        {/* Edit Modal */}
        <EditModal 
            isOpen={editModal.isOpen}
            initialLabel={editModal.label}
            initialImage={editModal.imageUrl}
            initialColor={editModal.color}
            onClose={() => setEditModal(prev => ({ ...prev, isOpen: false }))}
            onSave={saveNodeEdit}
            onDelete={deleteNode}
            isRoot={nodes.find(n => n.id === editModal.nodeId)?.type === 'root'}
        />
    </div>
  );
};

export default MindMap;