
"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Dispatch, SetStateAction } from "react";

interface ColorPaletteProps {
  selectedColor: string;
  onColorChange: Dispatch<SetStateAction<string>>;
  colors?: string[];
}

const defaultColors = [
  "#FF5252", // Vibrant Red
  "#FF7043", // Vibrant Orange
  "#FFEE58", // Vibrant Yellow
  "#69F0AE", // Vibrant Green
  "#40C4FF", // Vibrant Blue
  "#7C4DFF", // Vibrant Indigo
  "#E040FB", // Vibrant Violet
  "#212121", // Near Black
  "#FFFFFF", // White (for eraser or white color)
  "#FF80AB", // Playful Pink
  "#BCAAA4", // Light Brown
  "#B0BEC5", // Light Gray
];

export default function ColorPalette({
  selectedColor,
  onColorChange,
  colors = defaultColors,
}: ColorPaletteProps) {
  return (
    <div className="flex flex-wrap gap-3 p-3 bg-card rounded-lg shadow-md">
      {colors.map((color) => (
        <Button
          key={color}
          aria-label={`Select color ${color}`}
          onClick={() => onColorChange(color)}
          className={cn(
            "h-10 w-10 rounded-full border-2 transition-all duration-150 ease-in-out transform hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-sm hover:shadow-md",
            selectedColor === color ? "ring-2 ring-offset-2 ring-primary scale-110 border-foreground shadow-lg" : "border-muted-foreground/30",
            color === "#FFFFFF" && selectedColor !== color && "border-neutral-400",
            color === "#FFFFFF" && selectedColor === color && "border-primary ring-primary" 
          )}
          style={{ backgroundColor: color }}
          title={color === "#FFFFFF" ? "Eraser / White" : color}
        />
      ))}
    </div>
  );
}
