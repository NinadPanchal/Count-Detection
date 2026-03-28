import { useEffect, useState } from "react";

export function TickingNumber({ value, className = "stat-value tabular-nums" }: { value: number, className?: string }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (value === displayValue) return;
    
    let isMounted = true;
    
    const animate = () => {
      setDisplayValue(prev => {
        if (!isMounted) return prev;
        
        const diff = value - prev;
        if (Math.abs(diff) <= 0.5) return value;
        
        // Easing factor to create the "tick" slowdown effect
        const step = diff * 0.25;
        // Ensure minimum velocity to not hang indefinitely
        const next = Math.abs(step) < 0.5 ? prev + Math.sign(diff) * 0.5 : prev + step;
        
        return Number(next.toFixed(1)); // preserve 1 decimal for density sizes
      });
      
      if (Math.abs(value - displayValue) > 0.5 && isMounted) {
        requestAnimationFrame(animate);
      }
    };
    
    const raf = requestAnimationFrame(animate);
    return () => {
      isMounted = false;
      cancelAnimationFrame(raf);
    };
  }, [value, displayValue]);

  // Round display value for rendering cleanly unless it's distinctly a float measurement
  const roundedDisplay = displayValue % 1 === 0 ? displayValue : displayValue.toFixed(1);

  return <span className={className}>{roundedDisplay}</span>;
}
