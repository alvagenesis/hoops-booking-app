import { useEffect, useRef, useState } from 'react';
import { useGlobalLoading } from '../contexts/LoadingContext';

export default function PageProgressBar() {
  const { isLoading } = useGlobalLoading();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const [fading, setFading] = useState(false);
  const timers = useRef([]);

  const clearTimers = () => timers.current.forEach(clearTimeout);

  useEffect(() => {
    if (isLoading) {
      clearTimers();
      setFading(false);
      setWidth(0);
      setVisible(true);
      // Double rAF so the browser paints width:0 before transitioning to 80%
      requestAnimationFrame(() => requestAnimationFrame(() => setWidth(80)));
    } else if (visible) {
      clearTimers();
      // Fill to 100%, then fade out, then unmount
      setWidth(100);
      timers.current = [
        setTimeout(() => setFading(true), 180),
        setTimeout(() => { setVisible(false); setWidth(0); setFading(false); }, 480),
      ];
    }
    return clearTimers;
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <div
      style={{
        width: `${width}%`,
        opacity: fading ? 0 : 1,
        transition: width === 100
          ? 'width 0.18s ease-out, opacity 0.3s ease-out'
          : 'width 1.8s ease-out',
      }}
      className="fixed top-16 left-0 h-0.5 z-[9999] rounded-r
                 bg-blue-500
                 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
    />
  );
}
