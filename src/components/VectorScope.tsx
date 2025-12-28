import React, { useEffect, useRef } from 'react';
import { Crosshair } from 'lucide-react';

interface VectorScopeProps {
  sentimentVector: number;
  priceVector: number;
  volumeVector?: number;
  isScanning: boolean;
  coherence: string;
}

const VectorScope: React.FC<VectorScopeProps> = ({
  sentimentVector,
  priceVector,
  volumeVector = 0,
  isScanning,
  coherence
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const angleRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = size / 2 - 40;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      // Draw outer glow
      const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius + 20);
      gradient.addColorStop(0, 'rgba(0, 212, 255, 0.05)');
      gradient.addColorStop(0.7, 'rgba(0, 212, 255, 0.02)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      // Draw concentric circles
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(center, center, (radius / 4) * i, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 212, 255, ${0.1 + i * 0.05})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw axis lines
      ctx.beginPath();
      ctx.moveTo(center - radius, center);
      ctx.lineTo(center + radius, center);
      ctx.moveTo(center, center - radius);
      ctx.lineTo(center, center + radius);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw diagonal lines
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        ctx.moveTo(center, center);
        ctx.lineTo(
          center + Math.cos(angle) * radius,
          center + Math.sin(angle) * radius
        );
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.stroke();

      // Draw axis labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BULLISH', center, center - radius - 10);
      ctx.fillText('BEARISH', center, center + radius + 15);
      ctx.textAlign = 'left';
      ctx.fillText('SELL', center - radius - 5, center + 4);
      ctx.textAlign = 'right';
      ctx.fillText('BUY', center + radius + 5, center + 4);

      if (isScanning) {
        // Scanning animation
        angleRef.current += 0.03;

        // Rotating scan line
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.lineTo(
          center + Math.cos(angleRef.current) * radius,
          center + Math.sin(angleRef.current) * radius
        );
        const scanGradient = ctx.createLinearGradient(
          center, center,
          center + Math.cos(angleRef.current) * radius,
          center + Math.sin(angleRef.current) * radius
        );
        scanGradient.addColorStop(0, 'rgba(0, 212, 255, 0.8)');
        scanGradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
        ctx.strokeStyle = scanGradient;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Scan sweep
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, angleRef.current - 0.5, angleRef.current, false);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 212, 255, 0.1)';
        ctx.fill();
      } else {
        // Draw vector point
        const x = center + (priceVector * radius);
        const y = center - (sentimentVector * radius);

        // Draw connection line
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.lineTo(x, y);
        const lineGradient = ctx.createLinearGradient(center, center, x, y);
        lineGradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
        lineGradient.addColorStop(1, 'rgba(0, 212, 255, 0.8)');
        ctx.strokeStyle = lineGradient;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw vector point glow
        const pointGradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
        const coherenceValue = parseFloat(coherence);
        const color = coherenceValue > 0.7 ? '0, 255, 136' : coherenceValue > 0.4 ? '255, 200, 0' : '255, 0, 85';
        pointGradient.addColorStop(0, `rgba(${color}, 0.8)`);
        pointGradient.addColorStop(0.5, `rgba(${color}, 0.3)`);
        pointGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = pointGradient;
        ctx.fillRect(x - 20, y - 20, 40, 40);

        // Draw vector point
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${color})`;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw crosshair at point
        ctx.beginPath();
        ctx.moveTo(x - 12, y);
        ctx.lineTo(x - 6, y);
        ctx.moveTo(x + 6, y);
        ctx.lineTo(x + 12, y);
        ctx.moveTo(x, y - 12);
        ctx.lineTo(x, y - 6);
        ctx.moveTo(x, y + 6);
        ctx.lineTo(x, y + 12);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [sentimentVector, priceVector, volumeVector, isScanning, coherence]);

  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-gray-300 tracking-wider">VECTOR FIELD</h3>
        </div>
        <div className={`text-xs font-mono px-2 py-1 rounded
          ${parseFloat(coherence) > 0.7
            ? 'bg-green-500/20 text-green-400'
            : parseFloat(coherence) > 0.4
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
          COHERENCE: {coherence}
        </div>
      </div>

      <div className="relative aspect-square">
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          className="w-full h-full"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div className="bg-black/30 rounded p-2">
          <p className="text-xs text-gray-500">SENTIMENT</p>
          <p className={`text-sm font-mono font-bold ${sentimentVector > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {sentimentVector > 0 ? '+' : ''}{sentimentVector.toFixed(3)}
          </p>
        </div>
        <div className="bg-black/30 rounded p-2">
          <p className="text-xs text-gray-500">PRICE</p>
          <p className={`text-sm font-mono font-bold ${priceVector > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {priceVector > 0 ? '+' : ''}{priceVector.toFixed(3)}
          </p>
        </div>
        <div className="bg-black/30 rounded p-2">
          <p className="text-xs text-gray-500">VOLUME</p>
          <p className={`text-sm font-mono font-bold ${volumeVector > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {volumeVector > 0 ? '+' : ''}{volumeVector.toFixed(3)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VectorScope;
