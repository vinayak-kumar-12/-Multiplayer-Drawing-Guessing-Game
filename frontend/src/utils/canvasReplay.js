export function renderStroke(ctx, stroke, width, height) {
  if (!ctx || !stroke || !stroke.points || stroke.points.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.size * (width / 800);

  const pts = stroke.points;
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0].x * width, pts[0].y * height, (stroke.size * (width / 800)) / 2, 0, Math.PI * 2);
    ctx.fillStyle = stroke.color;
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(pts[0].x * width, pts[0].y * height);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x * width, pts[i].y * height);
  }
  ctx.stroke();
  ctx.restore();
}

export function redrawCanvas(canvas, strokes) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  if (!Array.isArray(strokes)) return;
  for (const stroke of strokes) {
    renderStroke(ctx, stroke, width, height);
  }
}
