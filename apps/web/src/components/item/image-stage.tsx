import type { ItemImage } from '@norsumi/common';
import { Expand, Minimize, ZoomIn, ZoomOut } from 'lucide-react';
import { type MouseEvent, useEffect, useRef, useState } from 'react';
import { cn } from 'src/lib/utils';

const ZOOM = 2.4;

/**
 * Image with click-to-zoom (pans with the pointer) and a fullscreen toggle.
 * The dominant color fills the stage so the frame never flashes white.
 */
export function ImageStage({ image, alt }: { image: ItemImage; alt: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const [loaded, setLoaded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the image changes
  useEffect(() => {
    setZoomed(false);
    setLoaded(false);
  }, [image.url]);

  useEffect(() => {
    const onChange = () =>
      setFullscreen(document.fullscreenElement === stage.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const track = (e: MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stage.current?.requestFullscreen?.();
  };

  return (
    <div
      ref={stage}
      className="group/stage relative size-full overflow-hidden"
      style={{ backgroundColor: image.dominantColor }}
    >
      {/* Ambient glow from the image itself. */}
      <img
        src={image.thumbUrl}
        alt=""
        aria-hidden
        className="absolute inset-0 size-full scale-125 object-cover opacity-60 blur-3xl saturate-150"
      />
      <div className="absolute inset-0 bg-black/25" />

      <button
        type="button"
        tabIndex={-1}
        aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
        onClick={(e) => {
          track(e);
          setZoomed((z) => !z);
        }}
        onPointerMove={(e) => zoomed && track(e)}
        className={cn(
          'absolute inset-0 flex items-center justify-center p-4 sm:p-8',
          zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in',
        )}
      >
        <img
          src={image.url}
          alt={alt}
          draggable={false}
          onLoad={() => setLoaded(true)}
          style={{
            transformOrigin: origin,
            transform: zoomed ? `scale(${ZOOM})` : 'scale(1)',
          }}
          className={cn(
            'max-h-full max-w-full select-none rounded-xl object-contain shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)] transition-[transform,opacity,filter] duration-500 ease-out-expo',
            loaded ? 'opacity-100 blur-0' : 'opacity-0 blur-lg',
            zoomed && 'rounded-none duration-200',
          )}
        />
      </button>

      <div className="absolute right-3 bottom-3 flex gap-1.5 opacity-0 transition group-hover/stage:opacity-100">
        <StageButton
          label={zoomed ? 'Zoom out' : 'Zoom in'}
          onClick={() => setZoomed((z) => !z)}
        >
          {zoomed ? (
            <ZoomOut className="size-4" />
          ) : (
            <ZoomIn className="size-4" />
          )}
        </StageButton>
        <StageButton
          label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          onClick={toggleFullscreen}
        >
          {fullscreen ? (
            <Minimize className="size-4" />
          ) : (
            <Expand className="size-4" />
          )}
        </StageButton>
      </div>
    </div>
  );
}

function StageButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="grid size-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65"
    >
      {children}
    </button>
  );
}
