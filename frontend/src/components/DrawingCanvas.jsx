import React, { useRef, useEffect, useState, useCallback } from 'react';
import { renderStroke, redrawCanvas } from '../utils/canvasReplay.js';

export default function DrawingCanvas({
  strokes,
  onSendStroke,
  tool,
  color,
  brushSize,
  isDrawer
}) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef([]);
  const [isPointerDown, setIsPointerDown] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    redrawCanvas(canvas, strokes);
  }, [strokes]);

  const getNormalizedPoint = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    return {
      x: Math.max(0, Math.min(1, Number(x.toFixed(4)))),
      y: Math.max(0, Math.min(1, Number(y.toFixed(4))))
    };
  }, []);

  const handlePointerDown = (e) => {
    if (!isDrawer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture?.(e.pointerId);
    isDrawingRef.current = true;
    setIsPointerDown(true);

    const pt = getNormalizedPoint(e);
    currentPointsRef.current = [pt];

    const ctx = canvas.getContext('2d');
    const singleStroke = {
      tool,
      color: tool === 'eraser' ? '#FFFFFF' : color,
      size: brushSize,
      points: [pt]
    };
    renderStroke(ctx, singleStroke, canvas.width, canvas.height);
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current || !isDrawer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pt = getNormalizedPoint(e);
    const lastPt = currentPointsRef.current[currentPointsRef.current.length - 1];
    if (lastPt && Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y) < 0.003) {
      return;
    }

    currentPointsRef.current.push(pt);

    const ctx = canvas.getContext('2d');
    const segmentStroke = {
      tool,
      color: tool === 'eraser' ? '#FFFFFF' : color,
      size: brushSize,
      points: [lastPt || pt, pt]
    };
    renderStroke(ctx, segmentStroke, canvas.width, canvas.height);
  };

  const handlePointerUp = (e) => {
    if (!isDrawingRef.current || !isDrawer) return;
    isDrawingRef.current = false;
    setIsPointerDown(false);

    const canvas = canvasRef.current;
    if (canvas && canvas.releasePointerCapture) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }

    if (currentPointsRef.current.length > 0) {
      const stroke = {
        tool,
        color: tool === 'eraser' ? '#FFFFFF' : color,
        size: brushSize,
        points: currentPointsRef.current
      };
      onSendStroke(stroke);
      currentPointsRef.current = [];
    }
  };

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        width={800}
        height={560}
        className={`game-canvas ${isDrawer ? 'can-draw' : 'view-only'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}
