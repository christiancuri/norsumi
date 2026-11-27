import { LogoMark } from 'src/components/brand/logo';

export function ScreenFallback() {
  return (
    <div className="grid h-dvh place-items-center bg-background">
      <LogoMark className="size-10 animate-pulse" />
    </div>
  );
}

export function PageFallback() {
  return <div className="min-h-[60vh]" />;
}
