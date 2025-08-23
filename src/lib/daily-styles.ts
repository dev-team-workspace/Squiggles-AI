
import type { DailyStyle } from '@/types';
import { Sparkles, Film, PocketKnife, Ghost, Palette, Zap } from 'lucide-react'; // Example icons

// Define a list of unique daily styles
export const dailyArtStyles: DailyStyle[] = [
  {
    id: 'dreamscape',
    name: 'Dreamscape Fantasy',
    description: 'Transform your doodle into a surreal, dreamlike landscape with floating islands and glowing flora.',
    promptForAI: 'A surreal, dreamlike fantasy landscape based on the drawing, featuring floating islands, glowing flora, and a soft, ethereal atmosphere. Cinematic lighting.',
    icon: Sparkles,
    dataAiHint: 'dreamscape fantasy',
  },
  {
    id: 'retro_sci_fi',
    name: 'Retro Sci-Fi Poster',
    description: 'Imagine your creation as a 1950s science fiction movie poster with bold colors and classic typography.',
    promptForAI: 'A retro 1950s science fiction movie poster style. The image should have bold, slightly desaturated colors, classic sci-fi typography (if applicable to the subject), and a sense of pulp adventure. Grainy texture.',
    icon: Film,
    dataAiHint: 'retro scifi',
  },
  {
    id: 'origami_art',
    name: 'Origami Unfolded',
    description: 'See your doodle reimagined as an intricate origami paper sculpture, with crisp folds and delicate paper textures.',
    promptForAI: 'An intricate origami paper sculpture. The subject should appear as if made from folded paper, with visible crisp folds, paper texture, and a clean, minimalist background. Soft studio lighting.',
    icon: PocketKnife,
    dataAiHint: 'origami paper',
  },
  {
    id: 'spooky_cute',
    name: 'Spooky Cute Friends',
    description: 'A friendly ghost or a cute monster in a slightly spooky but charming, Tim Burton-esque style.',
    promptForAI: 'A "spooky cute" character style, reminiscent of Tim Burton\'s art but kid-friendly. Think charming ghosts, friendly monsters, with slightly exaggerated features, muted colors with pops of accent color, and a whimsical, slightly eerie vibe.',
    icon: Ghost,
    dataAiHint: 'spooky cute',
  },
  {
    id: 'stained_glass',
    name: 'Stained Glass Window',
    description: 'Your doodle transformed into a vibrant stained glass window with bold black outlines and luminous colors.',
    promptForAI: 'A vibrant stained glass window design. The image should have bold black outlines separating sections of luminous, translucent color, as if light is shining through it.',
    icon: Palette,
    dataAiHint: 'stained glass',
  },
  {
    id: 'electric_neon',
    name: 'Electric Neon Glow',
    description: 'See your art come alive with bright, glowing neon lines on a dark, futuristic background.',
    promptForAI: 'A vibrant, electric neon sign style. The main elements should be outlined or filled with bright, glowing neon lines. The background should be dark or futuristic to make the neon pop. Consider light bloom effects.',
    icon: Zap,
    dataAiHint: 'neon glow',
  },
];

/**
 * Gets the daily style based on the current date.
 * Cycles through the available styles.
 * @param date The current date.
 * @returns A DailyStyle object or null if no styles are defined.
 */
export function getDailyStyle(date: Date): DailyStyle | null {
  if (dailyArtStyles.length === 0) {
    return null;
  }
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const styleIndex = (dayOfYear - 1) % dailyArtStyles.length; // -1 because dayOfYear is 1-indexed
  return dailyArtStyles[styleIndex];
}
