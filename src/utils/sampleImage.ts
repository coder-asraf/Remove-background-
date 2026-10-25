/**
 * Generates an ultra clean high-resolution synthetic studio portrait photograph
 * onto an HTML5 Canvas, rendered as a PNG data URL.
 * Provides an immediate, zero-friction testing workflow without needing manual file uploads.
 */
export function generateSamplePortrait(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d')!;

  // 1. Soft neutral studio light grey backdrop
  const bgGrad = ctx.createRadialGradient(400, 450, 100, 400, 500, 600);
  bgGrad.addColorStop(0, '#E2E8F0');
  bgGrad.addColorStop(1, '#CBD5E1');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Torso / Shoulders in dark navy suit
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.ellipse(400, 950, 260, 220, 0, 0, Math.PI * 2);
  ctx.fill();

  // White collared shirt
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.moveTo(330, 800);
  ctx.lineTo(400, 920);
  ctx.lineTo(470, 800);
  ctx.closePath();
  ctx.fill();

  // Tie
  ctx.fillStyle = '#DC2626';
  ctx.beginPath();
  ctx.moveTo(390, 840);
  ctx.lineTo(410, 840);
  ctx.lineTo(415, 1000);
  ctx.lineTo(385, 1000);
  ctx.closePath();
  ctx.fill();

  // 3. Neck
  ctx.fillStyle = '#E2B897';
  ctx.fillRect(360, 660, 80, 120);

  // Neck shadow
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.beginPath();
  ctx.ellipse(400, 690, 42, 20, 0, 0, Math.PI);
  ctx.fill();

  // 4. Head / Face oval
  ctx.fillStyle = '#F0CCA8';
  ctx.beginPath();
  ctx.ellipse(400, 500, 140, 180, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  ctx.fillStyle = '#E5BD99';
  ctx.beginPath();
  ctx.ellipse(255, 510, 22, 40, 0, 0, Math.PI * 2);
  ctx.ellipse(545, 510, 22, 40, 0, 0, Math.PI * 2);
  ctx.fill();

  // 5. Hair
  ctx.fillStyle = '#292524';
  ctx.beginPath();
  ctx.ellipse(400, 400, 146, 120, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(320, 440, 40, 80, 0.2, 0, Math.PI * 2);
  ctx.ellipse(480, 440, 40, 80, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // 6. Eyes (symmetric, forward-looking for biometric compliance)
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(345, 480, 24, 13, 0, 0, Math.PI * 2);
  ctx.ellipse(455, 480, 24, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Irises
  ctx.fillStyle = '#3B82F6';
  ctx.beginPath();
  ctx.arc(345, 480, 10, 0, Math.PI * 2);
  ctx.arc(455, 480, 10, 0, Math.PI * 2);
  ctx.fill();

  // Pupils
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(345, 480, 5, 0, Math.PI * 2);
  ctx.arc(455, 480, 5, 0, Math.PI * 2);
  ctx.fill();

  // Catchlights
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(348, 477, 2.5, 0, Math.PI * 2);
  ctx.arc(458, 477, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrows
  ctx.strokeStyle = '#292524';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(320, 455);
  ctx.quadraticCurveTo(345, 448, 370, 458);
  ctx.moveTo(430, 458);
  ctx.quadraticCurveTo(455, 448, 480, 455);
  ctx.stroke();

  // 7. Nose
  ctx.strokeStyle = '#D1A37E';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(400, 485);
  ctx.lineTo(396, 545);
  ctx.lineTo(412, 545);
  ctx.stroke();

  // 8. Lips / Mouth (neutral expression)
  ctx.fillStyle = '#CE8170';
  ctx.beginPath();
  ctx.ellipse(400, 595, 28, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL('image/png');
}
