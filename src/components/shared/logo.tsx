"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { useState } from "react";

interface LogoProps {
  href?: string;
  className?: string;
  width?: number;
  height?: number;
  showText?: boolean;
}

export function Logo({
  href = "/",
  className,
  width = 120,
  height = 40,
  showText = false,
}: LogoProps) {
  const [imageError, setImageError] = useState(false);

  const logoContent = (
    <div className={cn("flex items-center gap-2", className)}>
      {!imageError ? (
        <Image
          src="/logo.svg"
          alt="BAYTT"
          width={width}
          height={height}
          className="object-contain"
          priority
          onError={() => setImageError(true)}
          unoptimized
        />
      ) : (
        <span
          className="font-bold text-primary drop-shadow-glow whitespace-nowrap"
          style={{ 
            fontSize: `${Math.max(18, Math.min(32, width * 0.25))}px`, 
            lineHeight: 1,
            letterSpacing: '0.05em'
          }}
        >
          BAYTT
        </span>
      )}
      {showText && (
        <span className="text-xl font-bold text-primary drop-shadow-glow">
          BAYTT
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}

