import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * usePanZoom - Pan and zoom state management for fullscreen location exploration
 *
 * Handles:
 * - Zoom open/close state
 * - Pan offset calculation and bounds clamping
 * - Touch and mouse event handling for pan
 * - Canvas dimension calculation based on aspect ratio
 * - Window resize listener
 * - Body scroll locking when zoomed
 */

interface UsePanZoomOptions {
  /** Zoom scale factor (default: 2.0) */
  zoomScale?: number;
  /** Canvas aspect ratio width:height (default: 16/9) */
  aspectRatio?: number;
}

interface UsePanZoomReturn {
  // State
  isZoomed: boolean;
  panOffset: { x: number; y: number };
  isDragging: boolean;
  canvasDimensions: { width: number; height: number };

  // Refs
  containerRef: React.RefObject<HTMLDivElement | null>;

  // Methods
  openZoom: () => void;
  closeZoom: () => void;

  // Event handlers for the container
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
  };
}

export function usePanZoom(
  options: UsePanZoomOptions = {}
): UsePanZoomReturn {
  const { zoomScale = 2.0, aspectRatio = 16 / 9 } = options;

  // --- State ---
  const [isZoomed, setIsZoomed] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 0,
    height: 0,
  });

  // --- Refs ---
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  // --- Helper Functions ---

  /**
   * Calculate the canvas dimensions that fit within the viewport
   * while maintaining the specified aspect ratio
   */
  const calculateCanvasDimensions = useCallback(() => {
    if (typeof window === 'undefined') return { width: 0, height: 0 };

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const viewportRatio = viewportWidth / viewportHeight;

    let canvasWidth: number;
    let canvasHeight: number;

    if (viewportRatio > aspectRatio) {
      // Viewport is wider than aspect ratio - fit to height
      canvasHeight = viewportHeight;
      canvasWidth = canvasHeight * aspectRatio;
    } else {
      // Viewport is taller than aspect ratio - fit to width
      canvasWidth = viewportWidth;
      canvasHeight = canvasWidth / aspectRatio;
    }

    return { width: canvasWidth, height: canvasHeight };
  }, [aspectRatio]);

  /**
   * Calculate pan bounds based on scaled canvas vs viewport
   */
  const calculateBounds = useCallback(() => {
    if (typeof window === 'undefined') {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Scaled canvas dimensions
    const scaledWidth = canvasDimensions.width * zoomScale;
    const scaledHeight = canvasDimensions.height * zoomScale;

    // How much the scaled canvas extends beyond the viewport
    const extraWidth = Math.max(0, (scaledWidth - viewportWidth) / 2);
    const extraHeight = Math.max(0, (scaledHeight - viewportHeight) / 2);

    return {
      minX: -extraWidth,
      maxX: extraWidth,
      minY: -extraHeight,
      maxY: extraHeight,
    };
  }, [canvasDimensions, zoomScale]);

  /**
   * Clamp pan offset within calculated bounds
   */
  const clampPan = useCallback(
    (x: number, y: number) => {
      const bounds = calculateBounds();
      return {
        x: Math.max(bounds.minX, Math.min(bounds.maxX, x)),
        y: Math.max(bounds.minY, Math.min(bounds.maxY, y)),
      };
    },
    [calculateBounds]
  );

  // --- Drag Handlers ---

  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      setIsDragging(true);
      dragStartRef.current = { x: clientX, y: clientY };
      panStartRef.current = { ...panOffset };
    },
    [panOffset]
  );

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging) return;

      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = clientY - dragStartRef.current.y;

      const newPan = clampPan(
        panStartRef.current.x + deltaX,
        panStartRef.current.y + deltaY
      );

      setPanOffset(newPan);
    },
    [isDragging, clampPan]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // --- Touch Event Handlers ---

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    [handleDragStart]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        // Note: We don't call e.preventDefault() here because:
        // 1. The container has touchAction: 'none' which already prevents scrolling
        // 2. Calling preventDefault on passive touch events causes console errors
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    [handleDragMove]
  );

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // --- Mouse Event Handlers ---

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleDragStart(e.clientX, e.clientY);
    },
    [handleDragStart]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      handleDragMove(e.clientX, e.clientY);
    },
    [handleDragMove]
  );

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  const handleMouseLeave = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // --- Zoom Control ---

  const openZoom = useCallback(() => {
    // Calculate dimensions before opening
    const dims = calculateCanvasDimensions();
    setCanvasDimensions(dims);
    // Reset pan to center
    setPanOffset({ x: 0, y: 0 });
    setIsZoomed(true);
  }, [calculateCanvasDimensions]);

  const closeZoom = useCallback(() => {
    setIsZoomed(false);
  }, []);

  // --- Effects ---

  /**
   * Update dimensions on window resize
   */
  useEffect(() => {
    if (!isZoomed) return;

    const handleResize = () => {
      const dims = calculateCanvasDimensions();
      setCanvasDimensions(dims);
      // Re-clamp pan offset with new bounds
      setPanOffset((prev) => clampPan(prev.x, prev.y));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isZoomed, calculateCanvasDimensions, clampPan]);

  /**
   * Prevent body scroll when zoomed
   */
  useEffect(() => {
    if (isZoomed) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isZoomed]);

  return {
    isZoomed,
    panOffset,
    isDragging,
    canvasDimensions,
    containerRef,
    openZoom,
    closeZoom,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
    },
  };
}
