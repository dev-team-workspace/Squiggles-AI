
import type { SVGProps } from 'react';

export function LogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="currentColor"
      aria-label="Squiggles Logo"
      {...props}
    >
      {/* Simple abstract squiggle resembling a happy face or creature */}
      <path d="M20,80 Q30,45 50,50 T80,80 M25,70 Q40,35 50,40 T75,70" stroke="currentColor" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
      <circle cx="35" cy="35" r="6" fill="currentColor" className="text-accent" />
      <circle cx="65" cy="35" r="6" fill="currentColor" className="text-accent" />
      <path d="M40,65 Q50,75 60,65" stroke="currentColor" strokeWidth="7" fill="none" strokeLinecap="round" className="text-primary" />
       {/* Sparkles */}
      <path d="M15 15 L 25 25 M 25 15 L 15 25" stroke="currentColor" strokeWidth="3" className="text-accent opacity-80" />
      <path d="M85 15 L 75 25 M 75 15 L 85 25" stroke="currentColor" strokeWidth="3" className="text-accent opacity-80" />
      <path d="M50 10 L 50 20 M 45 15 L 55 15" stroke="currentColor" strokeWidth="3" className="text-accent opacity-80" />
    </svg>
  );
}
