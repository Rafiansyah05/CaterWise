'use client';
import { useEffect, useRef, useState } from 'react';

export function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'header';
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      setSettled(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -12% 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      onTransitionEnd={() => setSettled(true)}
      className={`reveal ${shown ? 'reveal-in' : ''} ${settled ? 'reveal-done' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
