import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 'max-w-md',
}: DrawerProps) {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startYRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Mobile Visual Viewport listener for virtual keyboard resize
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const vv = window.visualViewport;
    if (!vv) return;

    const handleViewportChange = () => {
      if (window.innerWidth < 640) {
        setViewportHeight(vv.height);
      } else {
        setViewportHeight(null);
      }
    };

    vv.addEventListener('resize', handleViewportChange);
    vv.addEventListener('scroll', handleViewportChange);
    handleViewportChange();

    return () => {
      vv.removeEventListener('resize', handleViewportChange);
      vv.removeEventListener('scroll', handleViewportChange);
    };
  }, [isOpen]);

  // Keyboard focus-scroll helper: automatically scrolls focused input into comfortable view above keyboard
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')
      ) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 250);
      }
    };

    window.addEventListener('focusin', handleFocusIn);
    return () => window.removeEventListener('focusin', handleFocusIn);
  }, [isOpen]);

  // Touch gesture handlers for mobile swipe-down to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    // Only allow swipe down if content is scrolled to the top
    const scrollTop = scrollContainerRef.current?.scrollTop || 0;
    if (scrollTop <= 5) {
      startYRef.current = e.touches[0].clientY;
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    // Only allow dragging downward
    if (diff > 0) {
      setDragOffsetY(diff);
    } else {
      setDragOffsetY(0);
    }
  };

  const handleTouchEnd = () => {
    if (dragOffsetY > 80) {
      // Swiped down past threshold: dismiss
      onClose();
    }
    // Reset state
    setDragOffsetY(0);
    setIsDragging(false);
    startYRef.current = null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Responsive Panel Positioning:
          - Mobile (< sm): Bottom Sheet anchored to bottom (inset-x-0 bottom-0)
          - Desktop (>= sm): Right-sliding Drawer panel (sm:inset-y-0 sm:right-0 sm:left-auto)
      */}
      <div
        className="fixed inset-x-0 bottom-0 sm:inset-y-0 sm:right-0 sm:left-auto flex max-w-full z-50 pointer-events-none"
        style={{
          maxHeight: viewportHeight ? `${viewportHeight}px` : undefined,
        }}
      >
        <div
          className={`w-full sm:w-screen ${width} bg-white shadow-2xl flex flex-col 
            rounded-t-3xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-slate-200 
            pointer-events-auto transform transition-all ${
              isDragging ? 'duration-0' : 'duration-300'
            } ease-out max-h-[92dvh] sm:max-h-full overflow-hidden`}
          style={{
            transform: dragOffsetY > 0 ? `translateY(${dragOffsetY}px)` : undefined,
          }}
        >
          {/* Mobile Swipe-Down Handle Bar */}
          <div
            className="sm:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>

          {/* Drawer / Sheet Header */}
          <div
            className="px-5 sm:px-6 py-3.5 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0 select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">{title}</h2>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form Content: Scrollable above on-screen keyboard with momentum touch scrolling */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden p-5 sm:p-6 overscroll-contain"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
