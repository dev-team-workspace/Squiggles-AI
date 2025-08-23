
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eraser, Sparkles, Trash2, Download, ImagePlus, Paintbrush, PaintBucket, RectangleHorizontal, RectangleVertical, Wand2, FileText, Maximize, Minimize, Shapes, Square, Circle as CircleIcon, Minus, RotateCcw, SlidersHorizontal, Settings2 } from 'lucide-react';
import ColorPalette from './color-palette';
import { processDrawing, uploadUserImage } from '@/lib/actions';
import { useAuthContext } from '@/providers/firebase-provider';
import { useToast } from '@/hooks/use-toast';
import NextImage from 'next/image';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogModalDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogModalTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogDesc,
  DialogHeader,
  DialogTitle as DialogModalTitleMain,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import type { DailyStyle, ProcessDrawingResult } from '@/types';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';


const INITIAL_LANDSCAPE_WIDTH = 800;
const INITIAL_LANDSCAPE_HEIGHT = 450; // 16:9 aspect ratio
const INITIAL_PORTRAIT_WIDTH = 450;   // 9:16 aspect ratio
const INITIAL_PORTRAIT_HEIGHT = 800;

interface StyleOption {
  key: string;
  label: string;
  descriptionForAI: string | null;
  dataAiHint: string;
}

const baseAvailableStyles: StyleOption[] = [
  {
    key: 'photorealistic',
    label: 'Photo Realistic',
    descriptionForAI: 'A photorealistic image. Make it look like a real photo!',
    dataAiHint: 'photo real'
  },
  {
    key: 'cartoon',
    label: 'Cartoon Fun',
    descriptionForAI: 'A bright, colorful, and fun cartoon character or scene, with bold outlines and expressive features, suitable for a children\'s animated show.',
    dataAiHint: 'cartoon fun'
  },
  {
    key: 'storybook',
    label: 'Storybook Magic',
    descriptionForAI: 'A whimsical storybook illustration with soft colors, a gentle fantasy feel, and a narrative quality, like a page from a classic children\'s book.',
    dataAiHint: 'storybook illustration'
  },
  {
    key: 'claymation',
    label: 'Claymation Play',
    descriptionForAI: 'A claymation model, with visible clay textures, slightly exaggerated forms, and a stop-motion animation look.',
    dataAiHint: 'claymation model'
  },
  {
    key: 'watercolor',
    label: 'Watercolor Dream',
    descriptionForAI: 'A beautiful watercolor painting with soft, blended colors, visible brush strokes, and an artistic, dreamy quality.',
    dataAiHint: 'watercolor art'
  },
  {
    key: 'vintageToy',
    label: 'Vintage Toy',
    descriptionForAI: 'Transform this into a classic vintage toy, like a tin robot, a wooden pull-along animal, or a retro plastic doll. It should have a slightly worn, nostalgic feel with materials appropriate for classic toys.',
    dataAiHint: 'vintage toy'
  },
  {
    key: 'plushToy',
    label: 'Plushy Toy Friend',
    descriptionForAI: 'Transform this drawing into a soft, cuddly plush toy or stuffed animal. It should have visible fabric textures, stitching details (if appropriate for the style), and a cute, huggable appearance.',
    dataAiHint: 'plush toy'
  },
];

type CanvasTool = 'brush' | 'bucket' | 'rectangle' | 'circle' | 'line';

function hexToRgba(hex: string): [number, number, number, number] {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }
  return [r, g, b, 255];
}

const MOCK_USER_UID = 'QjPVfIY83bORnur1LVQkvuitMLB3';

interface ToolsContentProps {
  className?: string;
  inSheet?: boolean;
  currentColor: string;
  setCurrentColor: React.Dispatch<React.SetStateAction<string>>;
  lineWidth: number;
  setLineWidth: React.Dispatch<React.SetStateAction<number>>;
  currentTool: CanvasTool;
  setCurrentTool: React.Dispatch<React.SetStateAction<CanvasTool>>;
  canvasOrientation: 'landscape' | 'portrait';
  handleOrientationChangeRequest: (newOrientation: 'landscape' | 'portrait') => void;
  selectedStyleKey: string;
  setSelectedStyleKey: React.Dispatch<React.SetStateAction<string>>;
  availableStyles: StyleOption[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  clearCanvasAction: () => void;
}

const ToolsContent: React.FC<ToolsContentProps> = ({
  inSheet = false,
  currentColor, setCurrentColor, lineWidth, setLineWidth, currentTool, setCurrentTool,
  canvasOrientation, handleOrientationChangeRequest, selectedStyleKey, setSelectedStyleKey,
  availableStyles, fileInputRef, handleImageUpload, clearCanvasAction
}) => {
  return (
    <div className={cn("w-full", "space-y-4 p-4")}>
      <ColorPalette selectedColor={currentColor} onColorChange={setCurrentColor} />

      <div className={cn("flex flex-col gap-2", !inSheet && "sm:flex-row sm:flex-wrap sm:justify-center")}>
        <div className={cn("flex flex-row flex-wrap gap-2 justify-center", !inSheet && "sm:gap-3")}>
          <Button
              variant={currentTool === 'brush' ? 'default' : 'outline'}
              onClick={() => setCurrentTool('brush')}
              className="gap-1.5 px-3 flex-1 xs:flex-none"
              size="sm"
              aria-pressed={currentTool === 'brush'}
              title="Brush Tool"
          >
              <Paintbrush className="h-4 w-4" /> <span className={cn("hidden xs:inline")}>Brush</span>
          </Button>
          <Button
              variant={currentTool === 'bucket' ? 'default' : 'outline'}
              onClick={() => setCurrentTool('bucket')}
              className="gap-1.5 px-3 flex-1 xs:flex-none"
              size="sm"
              aria-pressed={currentTool === 'bucket'}
              title="Paint Bucket Tool"
          >
              <PaintBucket className="h-4 w-4" /> <span className={cn("hidden xs:inline")}>Bucket</span>
          </Button>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button variant={['rectangle', 'circle', 'line'].includes(currentTool) ? 'default' : 'outline'} className="gap-1.5 px-3 flex-1 xs:flex-none" size="sm" title="Shape Tools">
                <Shapes className="h-4 w-4" /> <span className={cn("hidden xs:inline")}>Shapes</span>
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Shape Tools</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCurrentTool('rectangle')} className="gap-1.5">
                  <Square className="h-4 w-4" /> Rectangle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentTool('circle')} className="gap-1.5">
                  <CircleIcon className="h-4 w-4" /> Circle/Ellipse
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentTool('line')} className="gap-1.5">
                  <Minus className="h-4 w-4" /> Line
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      
        <div className={cn("flex flex-row flex-wrap gap-2 justify-center", !inSheet && "sm:gap-3 sm:mt-0", inSheet && "mt-2")}>
           <div className="space-y-1.5 flex-grow xs:flex-grow-0 min-w-[120px] xs:min-w-0">
              <label htmlFor="lineWidth" className="text-xs font-medium text-foreground">Size: {lineWidth}px</label>
              <Slider
                  id="lineWidth"
                  min={2}
                  max={40}
                  step={1}
                  value={[lineWidth]}
                  onValueChange={(value) => setLineWidth(value[0])}
                  disabled={currentTool === 'bucket'}
                  className="w-full"
              />
              {currentTool === 'bucket' && <p className="text-xs text-muted-foreground">Size only for Brush/Shapes.</p> }
          </div>
          <Button
              variant="outline"
              size="sm"
              className="gap-1.5 px-3 flex-1 xs:flex-none"
              onClick={() => handleOrientationChangeRequest(canvasOrientation === 'landscape' ? 'portrait' : 'landscape')}
              title={canvasOrientation === 'landscape' ? "Switch to Portrait" : "Switch to Landscape"}
          >
              {canvasOrientation === 'landscape' ? <RectangleVertical className="h-4 w-4" /> : <RectangleHorizontal className="h-4 w-4" />}
              <span className="hidden sm:inline">To {canvasOrientation === 'landscape' ? 'Portrait' : 'Landscape'}</span>
          </Button>
          <Button onClick={() => setCurrentColor('#FFFFFF')} variant="outline" size="sm" className="justify-start gap-1.5 px-3 flex-1 xs:flex-none">
              <Eraser className="h-4 w-4" /> Eraser
          </Button>
        </div>
      </div>

      <div className={cn("flex flex-col gap-2", !inSheet && "xs:flex-row xs:flex-wrap xs:justify-center", inSheet && "mt-2")}>
          <div className={cn("w-full", !inSheet && "xs:w-auto min-w-[160px] sm:min-w-[180px] md:min-w-[200px]")}>
              <Select value={selectedStyleKey} onValueChange={setSelectedStyleKey}>
              <SelectTrigger className="w-full h-9 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5">
                  <Wand2 className="h-4 w-4 text-primary" />
                  <SelectValue placeholder="Select an AI Style" />
                  </div>
              </SelectTrigger>
              <SelectContent>
                  <SelectGroup>
                  <SelectLabel>AI Transformation Styles</SelectLabel>
                  {availableStyles.map(style => (
                      <SelectItem key={style.key} value={style.key} className="text-xs sm:text-sm">
                      {style.label}
                      </SelectItem>
                  ))}
                  </SelectGroup>
              </SelectContent>
              </Select>
          </div>
          <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
          />
          <div className={cn("w-full flex gap-2", !inSheet && "xs:w-auto")}>
              <Button variant="outline" size="sm" className="gap-1.5 px-3 flex-1 xs:flex-auto" onClick={() => fileInputRef.current?.click()} title="Upload Image">
                  <ImagePlus className="h-4 w-4" /> <span className={cn("hidden xs:inline")}>Upload</span>
              </Button>
              <Button onClick={clearCanvasAction} variant="outline" size="sm" className="gap-1.5 px-3 flex-1 xs:flex-auto text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/50" title="Clear Canvas">
                  <Trash2 className="h-4 w-4" /> <span className={cn("hidden xs:inline")}>Clear</span>
              </Button>
          </div>
      </div>
    </div>
  );
};


export default function DrawingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#212121');
  const [lineWidth, setLineWidth] = useState(8);
  const [lastPosition, setLastPosition] = useState<{ x: number; y: number } | null>(null);
  const [currentTool, setCurrentTool] = useState<CanvasTool>('brush');
  const [shapeStartPos, setShapeStartPos] = useState<{ x: number; y: number } | null>(null);
  const [uploadedImageToDraw, setUploadedImageToDraw] = useState<HTMLImageElement | null>(null);
  
  const [preservedDrawing, setPreservedDrawing] = useState<string | null>(null);

  const [canvasOrientation, setCanvasOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [canvasWidth, setCanvasWidth] = useState(INITIAL_LANDSCAPE_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(INITIAL_LANDSCAPE_HEIGHT);
  const [isOrientationAlertOpen, setIsOrientationAlertOpen] = useState(false);
  const [pendingOrientation, setPendingOrientation] = useState<'landscape' | 'portrait' | null>(null);

  const { user, profile, loading: authLoading, loadingProfile, profileError, isDevModeActive, addSimulatedCost, dailyStyle, refreshProfile } = useAuthContext();
  const { toast } = useToast();

  const [availableStyles, setAvailableStyles] = useState<StyleOption[]>(() => {
    const surpriseStyleBase = {
        key: 'surprise',
        label: 'Surprise Me!',
        descriptionForAI: "An imaginative and visually striking artistic interpretation; be creative and surprise me!",
        dataAiHint: 'creative art'
    };
    return [surpriseStyleBase, ...baseAvailableStyles];
  });

  const [selectedStyleKey, setSelectedStyleKey] = useState<string>(availableStyles[0].key);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [isToolsSheetOpen, setIsToolsSheetOpen] = useState(false);

  const [transformedImage, setTransformedImage] = useState<string | null>(null);
  const [originalDrawingForModal, setOriginalDrawingForModal] = useState<string | null>(null);
  const [generatedTitleForModal, setGeneratedTitleForModal] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRefinementPrompt, setCurrentRefinementPrompt] = useState('');
  const [isNoCreditsDialogOpen, setIsNoCreditsDialogOpen] = useState(false);


  useEffect(() => {
    const surpriseStyleBase = {
        key: 'surprise',
        label: 'Surprise Me!',
        descriptionForAI: "An imaginative and visually striking artistic interpretation; be creative and surprise me!",
        dataAiHint: 'creative art'
    };

    if (dailyStyle) {
      const dailySurpriseStyle: StyleOption = {
        key: 'surprise',
        label: `Today's Special: ${dailyStyle.name}`,
        descriptionForAI: dailyStyle.promptForAI,
        dataAiHint: dailyStyle.dataAiHint,
      };
      setAvailableStyles([dailySurpriseStyle, ...baseAvailableStyles]);
      if (selectedStyleKey === 'surprise' || !baseAvailableStyles.find(s => s.key === selectedStyleKey)) {
         setSelectedStyleKey('surprise');
      }
    } else {
      setAvailableStyles([surpriseStyleBase, ...baseAvailableStyles]);
       if (selectedStyleKey === 'surprise' && !baseAvailableStyles.find(s => s.key === selectedStyleKey) ) {
         setSelectedStyleKey('surprise');
       }
    }
  }, [dailyStyle, selectedStyleKey]);

  const getMainContext = useCallback(() => canvasRef.current?.getContext('2d', { willReadFrequently: true }), []);
  const getPreviewContext = useCallback(() => previewCanvasRef.current?.getContext('2d'), []);

  const initializeCanvas = useCallback((canvas: HTMLCanvasElement | null, width: number, height: number) => {
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  const drawImageOnCanvas = useCallback((canvas: HTMLCanvasElement, imageDataSource: string | HTMLImageElement, targetWidth: number, targetHeight: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error("drawImageOnCanvas: Canvas context not found");
        reject(new Error("Canvas context not found"));
        return;
      }

      const img = new window.Image();
      img.onload = () => {
          let drawX = 0;
          let drawY = 0;
          let drawWidth = targetWidth;
          let drawHeight = targetHeight;

          const canvasAspectRatio = targetWidth / targetHeight;
          const imageAspectRatio = img.naturalWidth / img.naturalHeight;

          if (imageAspectRatio > canvasAspectRatio) {
              drawWidth = targetWidth;
              drawHeight = targetWidth / imageAspectRatio;
              drawY = (targetHeight - drawHeight) / 2;
          } else { 
              drawHeight = targetHeight;
              drawWidth = targetHeight * imageAspectRatio;
              drawX = (targetWidth - drawWidth) / 2;
          }
          
          ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
          resolve();
      };
      img.onerror = (e) => {
          console.error("drawImageOnCanvas: Failed to load image for canvas", e);
          reject(new Error("Failed to load image for canvas"));
      };

      if (typeof imageDataSource === 'string') {
          img.src = imageDataSource;
      } else if (imageDataSource instanceof HTMLImageElement) {
          if (!imageDataSource.src) {
            console.warn("drawImageOnCanvas: HTMLImageElement has no src.");
            reject(new Error("HTMLImageElement has no src."));
            return;
          }
          img.src = imageDataSource.src;
      } else {
          console.error("drawImageOnCanvas: Invalid imageDataSource type", typeof imageDataSource);
          reject(new Error("Invalid imageDataSource type"));
      }
    });
  }, []);


  useEffect(() => {
    const mainCanvas = canvasRef.current;
    if (uploadedImageToDraw && mainCanvas) {
      const drawUploaded = async () => {
        const targetWidth = isImmersiveMode && canvasContainerRef.current ? canvasContainerRef.current.offsetWidth : canvasWidth;
        const targetHeight = isImmersiveMode && canvasContainerRef.current ? canvasContainerRef.current.offsetHeight : canvasHeight;

        initializeCanvas(mainCanvas, targetWidth, targetHeight);
        try {
          await drawImageOnCanvas(mainCanvas, uploadedImageToDraw, targetWidth, targetHeight);
          setOriginalDrawingForModal(mainCanvas.toDataURL('image/png'));
        } catch (error) {
          console.error("Error drawing uploaded image:", error);
          toast({ title: "Upload Error", description: "Could not draw the uploaded image.", variant: "destructive"});
        }
        setUploadedImageToDraw(null);
        setTransformedImage(null);
        setGeneratedTitleForModal(null);
        setCurrentRefinementPrompt('');
      };
      drawUploaded();
    }
  }, [uploadedImageToDraw, initializeCanvas, drawImageOnCanvas, toast, isImmersiveMode, canvasWidth, canvasHeight]);


// Effect for handling canvas setup and drawing preservation during mode/dimension transitions
useEffect(() => {
    const mainCanvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (!mainCanvas || !previewCanvas) return;

    console.log(`[Effect Mode/Dim Change] Fired. Mode: ${isImmersiveMode}, Preserved: ${!!preservedDrawing}, CanvasDims: ${canvasWidth}x${canvasHeight}`);

    const applyPreservedDrawing = (targetCanvas: HTMLCanvasElement, drawingData: string, w: number, h: number) => {
        console.log(`[Effect Mode/Dim Change] Attempting to draw preserved on canvas ${targetCanvas.id} of size ${w}x${h}`);
        drawImageOnCanvas(targetCanvas, drawingData, w, h)
            .then(() => {
                console.log(`[Effect Mode/Dim Change] Successfully drew preserved drawing. Clearing preservedDrawing state.`);
                setPreservedDrawing(null);
            })
            .catch(err => {
                console.error(`[Effect Mode/Dim Change] Error drawing preserved image:`, err);
                setPreservedDrawing(null); // Clear even on error to prevent stale state
            });
    };

    if (isImmersiveMode) {
        const container = canvasContainerRef.current;
        if (container) {
            const { offsetWidth, offsetHeight } = container;
            console.log(`[Effect Mode/Dim Change] Initializing immersive canvas to ${offsetWidth}x${offsetHeight}`);
            initializeCanvas(mainCanvas, offsetWidth, offsetHeight);
            initializeCanvas(previewCanvas, offsetWidth, offsetHeight);
            if (preservedDrawing) {
                applyPreservedDrawing(mainCanvas, preservedDrawing, offsetWidth, offsetHeight);
            }
        }
    } else { // Non-immersive mode
        console.log(`[Effect Mode/Dim Change] Initializing non-immersive canvas to ${canvasWidth}x${canvasHeight}`);
        initializeCanvas(mainCanvas, canvasWidth, canvasHeight);
        initializeCanvas(previewCanvas, canvasWidth, canvasHeight);
        if (preservedDrawing) {
            applyPreservedDrawing(mainCanvas, preservedDrawing, canvasWidth, canvasHeight);
        }
    }
}, [isImmersiveMode, canvasWidth, canvasHeight, preservedDrawing, initializeCanvas, drawImageOnCanvas]); // setPreservedDrawing removed as per React exhaustive-deps guidelines if it's only called in .then


// Effect for ResizeObserver in immersive mode & body scroll lock
// useEffect(() => {
//     const mainCanvas = canvasRef.current;
//     const previewCanvas = previewCanvasRef.current;
//     const container = canvasContainerRef.current;
//     let observer: ResizeObserver | null = null;

//     if (isImmersiveMode) {
//         console.log("[Effect Immersive Setup] Entering Immersive Mode. Setting body styles and ResizeObserver.");
//         document.body.classList.add('no-overscroll-canvas-active');
//         document.body.style.overflow = 'hidden';
//         document.body.style.overscrollBehaviorY = 'contain';


//         if (mainCanvas && previewCanvas && container) {
//             observer = new ResizeObserver(entries => {
//                 const currentMainCanvas = canvasRef.current; // Re-evaluate current ref inside observer
//                 const currentPreviewCanvas = previewCanvasRef.current;
//                 if (!currentMainCanvas || !currentPreviewCanvas) return;

//                 const currentDrawingDataUrl = currentMainCanvas.toDataURL('image/png');
//                 console.log("[ResizeObserver] Immersive canvas resized. Capturing and restoring drawing.");

//                 for (let entry of entries) {
//                     const { width, height } = entry.contentRect;
//                     initializeCanvas(currentMainCanvas, width, height);
//                     initializeCanvas(currentPreviewCanvas, width, height);
//                     drawImageOnCanvas(currentMainCanvas, currentDrawingDataUrl, width, height)
//                         .catch(err => console.error("Error redrawing in resize observer:", err));
//                 }
//             });
//             observer.observe(container);
//         }
//     } else {
//         console.log("[Effect Immersive Setup] Exiting Immersive Mode. Restoring body styles.");
//         document.body.classList.remove('no-overscroll-canvas-active');
//         document.body.style.overflow = '';
//         document.body.style.overscrollBehaviorY = '';
//     }

//     return () => {
//         console.log("[Effect Immersive Setup] Cleanup: Removing body styles and disconnecting observer.");
//         document.body.classList.remove('no-overscroll-canvas-active');
//         document.body.style.overflow = '';
//         document.body.style.overscrollBehaviorY = '';
//         if (observer) {
//             observer.disconnect();
//         }
//     };
// }, [isImmersiveMode, initializeCanvas, drawImageOnCanvas]);

useEffect(() => {
  const container = canvasContainerRef.current;
  const mainCanvas = canvasRef.current;
  const previewCanvas = previewCanvasRef.current;
  let observer: ResizeObserver | null = null;

  if (isImmersiveMode && container && mainCanvas && previewCanvas) {
    const handleResize = () => {
      const { width, height } = container.getBoundingClientRect();
      
      // Only resize if dimensions actually changed
      if (width !== mainCanvas.width || height !== mainCanvas.height) {
        mainCanvas.width = width;
        mainCanvas.height = height;
        previewCanvas.width = width;
        previewCanvas.height = height;
        
        // Redraw preserved content if available
        if (preservedDrawing) {
          const img = new Image();
          img.onload = () => {
            const ctx = mainCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
            }
          };
          img.src = preservedDrawing;
        }
      }
    };

    observer = new ResizeObserver(handleResize);
    observer.observe(container);

    // Initial setup
    handleResize();
  }

  return () => {
    if (observer) {
      observer.disconnect();
    }
  };
}, [isImmersiveMode, preservedDrawing]);
  const getCanvasPosition = useCallback((eventClientX: number, eventClientY: number) => {
    const canvas = previewCanvasRef.current || canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.floor((eventClientX - rect.left) * scaleX),
      y: Math.floor((eventClientY - rect.top) * scaleY),
    };
  }, []);

  const drawBrushStroke = useCallback((ctx: CanvasRenderingContext2D, from: {x: number, y: number}, to: {x: number, y: number}) => {
    ctx.beginPath();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }, [currentColor, lineWidth]);

  const drawLineOnCtx = useCallback((ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }, [currentColor, lineWidth]);

  const drawRectangleOnCtx = useCallback((ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = lineWidth;
    ctx.rect(x1, y1, x2 - x1, y2 - y1);
    ctx.stroke();
  }, [currentColor, lineWidth]);

  const drawCircleOnCtx = useCallback((ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = lineWidth;
    const radiusX = Math.abs(x2 - x1) / 2;
    const radiusY = Math.abs(y2 - y1) / 2;
    const centerX = Math.min(x1, x2) + radiusX;
    const centerY = Math.min(y1, y2) + radiusY;
    if (radiusX > 0 || radiusY > 0) {
        ctx.ellipse(centerX, centerY, Math.max(1, radiusX), Math.max(1, radiusY), 0, 0, 2 * Math.PI);
    }
    ctx.stroke();
  }, [currentColor, lineWidth]);


  const startDrawing = useCallback((pos: {x: number, y: number}) => {
    setIsDrawing(true);
    if (currentTool === 'brush') {
      setLastPosition(pos);
    } else if (['rectangle', 'circle', 'line'].includes(currentTool)) {
      setShapeStartPos(pos);
    }
  }, [currentTool]);

  const draw = useCallback((currentPosition: {x: number, y: number}) => {
  if (!isDrawing) return;

  const mainCtx = getMainContext();
  const previewCtx = getPreviewContext();

  if (currentTool === 'brush' && lastPosition) {
    // Draw to both canvases for brush strokes
    if (mainCtx) {
      drawBrushStroke(mainCtx, lastPosition, currentPosition);
    }
    if (previewCtx) {
      previewCtx.clearRect(0, 0, previewCanvasRef.current!.width, previewCanvasRef.current!.height);
      drawBrushStroke(previewCtx, lastPosition, currentPosition);
    }
    setLastPosition(currentPosition);
  } else if (['rectangle', 'circle', 'line'].includes(currentTool) && shapeStartPos) {
    // Only preview shapes on preview canvas
    if (previewCtx && previewCanvasRef.current) {
      previewCtx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
      switch (currentTool) {
        case 'rectangle':
          drawRectangleOnCtx(previewCtx, shapeStartPos.x, shapeStartPos.y, currentPosition.x, currentPosition.y);
          break;
        case 'circle':
          drawCircleOnCtx(previewCtx, shapeStartPos.x, shapeStartPos.y, currentPosition.x, currentPosition.y);
          break;
        case 'line':
          drawLineOnCtx(previewCtx, shapeStartPos.x, shapeStartPos.y, currentPosition.x, currentPosition.y);
          break;
      }
    }
  }
}, [isDrawing, currentTool, lastPosition, shapeStartPos, getMainContext, getPreviewContext, drawBrushStroke, drawRectangleOnCtx, drawCircleOnCtx, drawLineOnCtx]);
  const stopDrawing = useCallback((currentPosition?: {x: number, y: number}) => {
    if (!isDrawing) return;

    const mainCtx = getMainContext();
    const previewCtx = getPreviewContext();

    if (mainCtx && ['rectangle', 'circle', 'line'].includes(currentTool) && shapeStartPos && currentPosition) {
       switch (currentTool) {
          case 'rectangle':
            drawRectangleOnCtx(mainCtx, shapeStartPos.x, shapeStartPos.y, currentPosition.x, currentPosition.y);
            break;
          case 'circle':
            drawCircleOnCtx(mainCtx, shapeStartPos.x, shapeStartPos.y, currentPosition.x, currentPosition.y);
            break;
          case 'line':
            drawLineOnCtx(mainCtx, shapeStartPos.x, shapeStartPos.y, currentPosition.x, currentPosition.y);
            break;
        }
    }

    if (previewCtx && previewCanvasRef.current) {
      previewCtx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
    }

    setIsDrawing(false);
    setLastPosition(null);
    setShapeStartPos(null);
  }, [isDrawing, currentTool, shapeStartPos, getMainContext, getPreviewContext, drawRectangleOnCtx, drawCircleOnCtx, drawLineOnCtx]);


  const floodFill = useCallback((startX: number, startY: number, fillColorHex: string) => {
    const canvas = canvasRef.current;
    const ctx = getMainContext();
    if (!canvas || !ctx) return;

    const fillColorRgba = hexToRgba(fillColorHex);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    if (startX < 0 || startX >= canvas.width || startY < 0 || startY >= canvas.height) {
        return;
    }

    const targetColorRgba = [
      data[(startY * canvas.width + startX) * 4],
      data[(startY * canvas.width + startX) * 4 + 1],
      data[(startY * canvas.width + startX) * 4 + 2],
      data[(startY * canvas.width + startX) * 4 + 3],
    ];

    if (
      targetColorRgba[0] === fillColorRgba[0] &&
      targetColorRgba[1] === fillColorRgba[1] &&
      targetColorRgba[2] === fillColorRgba[2] &&
      targetColorRgba[3] === fillColorRgba[3]
    ) {
      return;
    }

    if (targetColorRgba.some(val => val === undefined)) {
        return;
    }

    const queue: [number, number][] = [[startX, startY]];
    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;

      const pixelIndex = (y * canvas.width + x) * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      const a = data[pixelIndex + 3];

      if (
        r === targetColorRgba[0] &&
        g === targetColorRgba[1] &&
        b === targetColorRgba[2] &&
        a === targetColorRgba[3]
      ) {
        data[pixelIndex] = fillColorRgba[0];
        data[pixelIndex + 1] = fillColorRgba[1];
        data[pixelIndex + 2] = fillColorRgba[2];
        data[pixelIndex + 3] = fillColorRgba[3];

        queue.push([x + 1, y]);
        queue.push([x - 1, y]);
        queue.push([x, y + 1]);
        queue.push([x, y - 1]);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [getMainContext]);


const handleCanvasInteractionStart = useCallback((event: React.MouseEvent | React.TouchEvent) => {
  // Prevent all default touch behaviors
  event.preventDefault();
  
  let clientX, clientY;
  
  if (event.type === 'touchstart') {
    const touchEvent = event.nativeEvent as TouchEvent;
    if (touchEvent.touches.length > 0) {
      clientX = touchEvent.touches[0].clientX;
      clientY = touchEvent.touches[0].clientY;
    }
  } else {
    const mouseEvent = event.nativeEvent as MouseEvent;
    clientX = mouseEvent.clientX;
    clientY = mouseEvent.clientY;
  }

  if (clientX === undefined || clientY === undefined) return;
  
  const pos = getCanvasPosition(clientX, clientY);

  if (currentTool === 'bucket') {
    floodFill(pos.x, pos.y, currentColor);
  } else {
    startDrawing(pos);
  }
}, [getCanvasPosition, currentTool, startDrawing, floodFill, currentColor]);

const handleCanvasInteractionMove = useCallback((event: React.MouseEvent | React.TouchEvent) => {
  if (!isDrawing) return;
  
  // Prevent default to stop scrolling
  event.preventDefault();

  let clientX, clientY;
  
  if (event.type === 'touchmove') {
    const touchEvent = event.nativeEvent as TouchEvent;
    if (touchEvent.touches.length > 0) {
      clientX = touchEvent.touches[0].clientX;
      clientY = touchEvent.touches[0].clientY;
    }
  } else {
    const mouseEvent = event.nativeEvent as MouseEvent;
    clientX = mouseEvent.clientX;
    clientY = mouseEvent.clientY;
  }

  if (clientX === undefined || clientY === undefined) return;
  
  const currentPosition = getCanvasPosition(clientX, clientY);
  draw(currentPosition);
}, [isDrawing, getCanvasPosition, draw]);

const handleCanvasInteractionEnd = useCallback((event: React.MouseEvent | React.TouchEvent) => {
  let finalPosition = undefined;
  
  if (event.type === 'mouseup') {
    const mouseEvent = event.nativeEvent as MouseEvent;
    finalPosition = getCanvasPosition(mouseEvent.clientX, mouseEvent.clientY);
  } 
  else if (event.type === 'touchend') {
    const touchEvent = event.nativeEvent as TouchEvent;
    if (touchEvent.changedTouches.length > 0) {
      finalPosition = getCanvasPosition(
        touchEvent.changedTouches[0].clientX, 
        touchEvent.changedTouches[0].clientY
      );
    }
  }

  stopDrawing(finalPosition);
}, [stopDrawing, getCanvasPosition]);

  const clearCanvasAction = useCallback(() => {
    const mainCanvas = canvasRef.current;
    if (mainCanvas) {
        initializeCanvas(mainCanvas, mainCanvas.width, mainCanvas.height);
    }
    if (previewCanvasRef.current) {
        const previewCtx = getPreviewContext();
        if (previewCtx) previewCtx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
    }
    setPreservedDrawing(null);
    setTransformedImage(null);
    setOriginalDrawingForModal(null);
    setGeneratedTitleForModal(null);
    setCurrentRefinementPrompt('');
  }, [initializeCanvas, getPreviewContext]);

const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  
  console.log('[ImageUpload] File input changed');
  const file = event.target.files?.[0];
  
  if (!file) {
    console.log('[ImageUpload] No file selected');
    return;
  }

  console.log('[ImageUpload] Selected file:', {
    name: file.name,
    type: file.type,
    size: file.size
  });

  const reader = new FileReader();
  
  reader.onloadstart = () => {
    console.log('[ImageUpload] Starting file read');
  };

  reader.onerror = (error) => {
    console.error('[ImageUpload] File read error:', error);
    toast({
      title: "Upload Error",
      description: "Failed to read the image file",
      variant: "destructive"
    });
  };

  reader.onload = (e) => {
    console.log('[ImageUpload] File read completed');
    const img = new window.Image();
    
    img.onerror = () => {
      console.error('[ImageUpload] Image load error');
      toast({
        title: "Image Error",
        description: "The uploaded file is not a valid image",
        variant: "destructive"
      });
    };

    img.onload = () => {
      console.log('[ImageUpload] Image loaded successfully', {
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });

      const MAX_DIMENSION = 800;
      let newW, newH;

      if (img.naturalWidth >= img.naturalHeight) {
        newW = Math.min(img.naturalWidth, MAX_DIMENSION);
        newH = Math.round((img.naturalHeight / img.naturalWidth) * newW);
      } else {
        newH = Math.min(img.naturalHeight, MAX_DIMENSION);
        newW = Math.round((img.naturalWidth / img.naturalHeight) * newH);
      }

      newW = Math.max(1, newW);
      newH = Math.max(1, newH);

      console.log('[ImageUpload] Calculated dimensions:', {
        width: newW,
        height: newH,
        orientation: newW >= newH ? 'landscape' : 'portrait'
      });

      if (!isImmersiveMode) {
        setCanvasWidth(newW);
        setCanvasHeight(newH);
        setCanvasOrientation(newW >= newH ? 'landscape' : 'portrait');
      }

      setUploadedImageToDraw(img);
      console.log('[ImageUpload] Image set for drawing');
    };

    img.src = e.target?.result as string;
  };

  reader.readAsDataURL(file);
  
  // Reset input to allow same file to be uploaded again
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
};

 const handleGenerateOrRegenerate = async ({
    useExistingOriginal = false,
    refinement = '',
  }: {
    useExistingOriginal?: boolean;
    refinement?: string;
  } = {}) => {
    
    console.log(`[DrawingCanvas] handleGenerateOrRegenerate called. Use existing: ${useExistingOriginal}, Refinement: "${refinement}"`);
    if (!user && !isDevModeActive) {
      toast({ title: "Authentication Required", description: "Please sign in to transform your drawing.", variant: "destructive" });
      return;
    }
    if (isLoadingAI) return;
    
    let drawingDataUrl: string | null = null;
    if (useExistingOriginal) {
        if (!originalDrawingForModal) {
            toast({ title: "Error", description: "No original drawing available for regeneration.", variant: "destructive" });
            return;
        }
        drawingDataUrl = originalDrawingForModal;
    } else {
        if (!canvasRef.current) {
            toast({ title: "Error", description: "Canvas not available.", variant: "destructive" });
            return;
        }
        drawingDataUrl = canvasRef.current.toDataURL('image/png');
        setOriginalDrawingForModal(drawingDataUrl); // Store for potential regeneration
    }

    if (!drawingDataUrl) {
      toast({ title: "Error", description: "No drawing data to process.", variant: "destructive" });
      return;
    }


    setIsLoadingAI(true);
    setTransformedImage(null);

    const currentUserId = isDevModeActive && !user ? MOCK_USER_UID : user!.uid;
    const selectedStyle = availableStyles.find(style => style.key === selectedStyleKey);

    if (!selectedStyle) {
        toast({ title: "Style Error", description: "Selected style not found.", variant: "destructive" });
        setIsLoadingAI(false);
        return;
    }
const path = `users/${currentUserId}/drawings/${Date.now()}_drawing.png`;
  const publicPath = `public/${Date.now()}_drawing.png`;
  
    console.log("[DrawingCanvas] Calling processDrawing. UserID:", currentUserId, "Is Dev Mode Active:", isDevModeActive, "Style Key:", selectedStyle.key, "Refinement:", refinement);
    const result: ProcessDrawingResult = await processDrawing(
      drawingDataUrl,
      currentUserId,
      selectedStyle.key,
      selectedStyle.descriptionForAI,
      refinement,
    
    );
    
    console.log('[DrawingCanvas] processDrawing result:', result);
    setIsLoadingAI(false);
    console.log('Transformed image URL:', result.transformedImageUrl);
    

    if (result.error) {
      toast({ title: "Transformation Error", description: result.error, variant: "destructive", duration: 8000 });
      console.log("[DrawingCanvas] Transformation error, ensuring modal is closed.");
      setIsModalOpen(true);
    } else if (result.transformedImageUrl) {
      console.log('[DrawingCanvas] Transformed image URL received, opening modal.');
      setTransformedImage(result.transformedImageUrl);
      setGeneratedTitleForModal(result.generatedTitle || "My Awesome Creation");
      setIsModalOpen(true);
      console.log("[DrawingCanvas] setIsModalOpen(true) called.");
      toast({ title: "Woohoo!", description: `Your masterpiece "${result.generatedTitle || 'My Awesome Creation'}" has been magically transformed!` });
      if (isDevModeActive && result.simulatedCost && addSimulatedCost) {
        addSimulatedCost(result.simulatedCost);
      }
    } else {
      console.error('[DrawingCanvas] processDrawing succeeded but returned no transformedImageUrl.');
      toast({ title: "Transformation Issue", description: "The AI transformation completed but did not return an image. Please try again.", variant: "destructive" });
      console.log("[DrawingCanvas] Transformation issue (no URL), ensuring modal is closed.");
      setIsModalOpen(false);
    }
  };


  
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!canvasRef.current || !user) return;
    setUploading(true);
    const dataUrl = canvasRef.current.toDataURL("image/png");
    try {
      const imageUrl = await uploadUserImage(dataUrl, user.uid);
      alert("Drawing uploaded successfully!");
      console.log("Image URL:", imageUrl);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

const handleDownload = async (url: string | null, filename: string) => {
  if (!url) {
    toast({ title: "Download Error", description: "No image available", variant: "destructive" });
    return;
  }

  try {
    let downloadUrl = url;
    const isFirebaseUrl = url.includes('firebasestorage.googleapis.com');

    if (isFirebaseUrl) {
      try {
        const storage = getStorage();
        // Get a fresh download URL without token
        const path = decodeURIComponent(url.split('/o/')[1].split('?')[0]);
        const fileRef = ref(storage, path);
        
        // Force a new download URL generation
        downloadUrl = await getDownloadURL(fileRef);
        
        // Create a blob URL to avoid token issues
        const response = await fetch(downloadUrl);
        const blob = await response.blob();
        downloadUrl = URL.createObjectURL(blob);
      } catch (error) {
        console.error('Firebase URL refresh failed:', error);
        throw new Error('Failed to get download URL');
      }
    }

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename.replace(/[^a-zA-Z0-9-_.]/g, '').replace(/\s+/g, '_');
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      if (downloadUrl.startsWith('blob:')) {
        URL.revokeObjectURL(downloadUrl);
      }
    }, 100);

  } catch (error) {
    console.error('Download failed:', error);
    toast({
      title: "Download Failed",
      description: "Could not download the image. Please try again.",
      variant: "destructive"
    });
  }
};

  const handleOrientationChangeRequest = (newOrientation: 'landscape' | 'portrait') => {
    if (isImmersiveMode) { 
        confirmOrientationChange(newOrientation);
        return;
    }
    if (newOrientation === canvasOrientation) return;

    const canvas = canvasRef.current;
    const ctx = getMainContext();
    let isEmpty = true;
    if (canvas && ctx) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i+3] > 0 && (data[i] !== 255 || data[i+1] !== 255 || data[i+2] !== 255) ) {
          isEmpty = false;
          break;
        }
      }
    }

    if (isEmpty) { 
      confirmOrientationChange(newOrientation);
    } else {
      setPendingOrientation(newOrientation);
      setIsOrientationAlertOpen(true);
    }
  };

  const confirmOrientationChange = (orientationToSet?: 'landscape' | 'portrait') => {
    const newOrientation = orientationToSet || pendingOrientation;
    if (!newOrientation) return;

    if (canvasRef.current) { 
        console.log("[confirmOrientationChange] Capturing drawing before orientation change.");
        setPreservedDrawing(canvasRef.current.toDataURL('image/png'));
    }

    let newWidth, newHeight;
    if (newOrientation === 'landscape') {
      newWidth = INITIAL_LANDSCAPE_WIDTH;
      newHeight = INITIAL_LANDSCAPE_HEIGHT;
    } else {
      newWidth = INITIAL_PORTRAIT_WIDTH;
      newHeight = INITIAL_PORTRAIT_HEIGHT;
    }
    
    if (!isImmersiveMode) {
      setCanvasWidth(newWidth);
      setCanvasHeight(newHeight);
    }
    setCanvasOrientation(newOrientation); 

    setIsOrientationAlertOpen(false);
    setPendingOrientation(null);
  };

  // const toggleImmersiveMode = () => {
  //   if (canvasRef.current) {
  //     console.log("[toggleImmersiveMode] Capturing drawing before mode toggle.");
  //     setPreservedDrawing(canvasRef.current.toDataURL('image/png'));
  //   }
  //   setIsImmersiveMode(prevMode => !prevMode);
  //   console.log(`[toggleImmersiveMode] Toggled immersive mode. New state: ${!isImmersiveMode}`);
  // };
const toggleImmersiveMode = useCallback(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  // Capture current drawing before switching modes
  const drawingData = canvas.toDataURL('image/png');
  setPreservedDrawing(drawingData);

  // Use setTimeout to ensure state update is complete before mode change
  setTimeout(() => {
    setIsImmersiveMode(prevMode => !prevMode);
  }, 50);
}, []);
  let isMakeRealButtonDisabled = isLoadingAI;
  if (!isDevModeActive && (!user || !profile)) { 
    if (authLoading || loadingProfile) { 
      isMakeRealButtonDisabled = true;
    }
  }
  // Credits check is removed as per prior request for temporary disabling.
  // else if (!isDevModeActive && profile && (profile as any).credits <= 0) { 
  //   isMakeRealButtonDisabled = true;
  // }
  
  const toolsContentProps = {
    currentColor, setCurrentColor, lineWidth, setLineWidth, currentTool, setCurrentTool,
    canvasOrientation, handleOrientationChangeRequest, selectedStyleKey, setSelectedStyleKey,
    availableStyles, fileInputRef, handleImageUpload, clearCanvasAction
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full h-full">
      <Card className={cn(
        "w-full shadow-2xl overflow-hidden transition-all duration-300 ease-in-out flex flex-col",
        isImmersiveMode
          ? "fixed inset-0 z-[100] max-w-none rounded-none m-0 p-0 bg-background"
          : "max-w-5xl"
      )}>
        {!isImmersiveMode && (
          <CardHeader className="text-center bg-primary/10 p-4 md:p-6 flex-shrink-0">
            <CardTitle className="text-2xl md:text-3xl font-bold text-primary">Let's Draw Some Squiggles!</CardTitle>
            <CardDescription className="text-sm md:text-base text-muted-foreground">Unleash your imagination on the canvas below.</CardDescription>
          </CardHeader>
        )}
        <CardContent className={cn(
          "flex flex-col items-center flex-grow",
          isImmersiveMode ? "p-1 sm:p-2 justify-between h-full overflow-hidden" : "p-3 md:p-6 gap-4"
        )}>
          {!isImmersiveMode && (
            <div className="flex flex-col items-center gap-3 w-full mb-4 flex-shrink-0">
             <ToolsContent {...toolsContentProps} inSheet={false} />
            </div>
          )}

          <div
  ref={canvasContainerRef}
  className={cn(
    "relative border-2 border-primary rounded-lg shadow-inner bg-white overflow-hidden touch-none", // Added touch-none
    isImmersiveMode ? "w-full flex-grow" : "mx-auto"
  )}
  style={{
    ...(!isImmersiveMode ? {
      width: `${canvasWidth}px`,
      height: `${canvasHeight}px`,
      maxWidth: '100%',
    } : {}),
    // Add touch-action for mobile
    touchAction: 'none'
  }}
>
            <canvas
              ref={canvasRef}
              id="main-drawing-canvas"
              className={cn("absolute top-0 left-0 w-full h-full")}
            />
            <canvas
              ref={previewCanvasRef}
              id="preview-drawing-canvas"
              onMouseDown={handleCanvasInteractionStart}
              onMouseMove={handleCanvasInteractionMove}
              onMouseUp={handleCanvasInteractionEnd}
              onMouseLeave={handleCanvasInteractionEnd}
              onTouchStart={handleCanvasInteractionStart}
              onTouchMove={handleCanvasInteractionMove}
              onTouchEnd={handleCanvasInteractionEnd}
               className={cn(
                "absolute top-0 left-0 w-full h-full z-10",
                currentTool === 'brush' ? 'cursor-crosshair' :
                currentTool === 'bucket' ? 'cursor-copy' :
                ['rectangle', 'circle', 'line'].includes(currentTool) ? 'cursor-default' : 'cursor-default'
              )}
            />
          </div>
           {isImmersiveMode && (
             <div className="flex justify-between items-center p-2 gap-2 border-t bg-background/80 backdrop-blur-sm flex-shrink-0 w-full mt-auto">
                <Sheet 
  open={isToolsSheetOpen} 
  onOpenChange={setIsToolsSheetOpen}
>
  <SheetTrigger asChild>
    <Button 
      variant="outline" 
      size="lg" 
      className="gap-2 z-50"
      onClick={() => setIsToolsSheetOpen(true)}
    >
      <SlidersHorizontal /> Tools
    </Button>
  </SheetTrigger>
  <SheetContent 
  side="bottom" 
  className="h-auto max-h-[65vh] flex flex-col p-7 z-[200] overflow-hidden"
  onInteractOutside={(e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.color-picker-container') || 
        target.closest('.react-colorful') ||
        target.closest('.tools-sheet-content')) {
      e.preventDefault();
    }
  }}
>
  <SheetHeader className="p-4 py-3 border-b sticky top-0 bg-background z-10">
    <SheetTitle>Drawing Tools & Settings</SheetTitle>
  </SheetHeader>
  <div className="flex-1 overflow-y-auto">
    <ToolsContent 
      {...toolsContentProps} 
      inSheet={true} 
      className="p-4"
      setCurrentTool={(tool) => {
        setCurrentTool(tool);
        setIsToolsSheetOpen(false);
      }}
    />
  </div>
  <SheetFooter className="p-4 border-t sticky bottom-0 bg-background">
    <Button 
      onClick={() => setIsToolsSheetOpen(false)}
      className="w-full sm:w-auto"
    >
      Done
    </Button>
  </SheetFooter>
</SheetContent>
</Sheet>

                <Button
                    size="lg"
                    onClick={() => handleGenerateOrRegenerate({})}
                    disabled={isMakeRealButtonDisabled}
                    className="gap-2 text-base sm:text-lg px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 bg-accent hover:bg-accent/90 text-accent-foreground flex-grow sm:flex-grow-0"
                    aria-label="Make it Real - transform drawing"
                >
                    {isLoadingAI ? <Spinner className="text-accent-foreground" /> : <Sparkles className="h-5 w-5" />}
                    Make it Real!
                </Button>

                <Button onClick={toggleImmersiveMode} variant="outline" size="lg" className="gap-2 z-50">
                    <Minimize /> Exit
                </Button>
             </div>
           )}
        </CardContent>
        {!isImmersiveMode && (
            <CardFooter className={cn(
            "flex flex-col sm:flex-row justify-center items-center gap-4 bg-primary/10 flex-shrink-0",
            "p-4 md:p-6"
            )}>
                <Button
                    onClick={toggleImmersiveMode}
                    variant="outline"
                    size="lg"
                    className="gap-2"
                    title="Enter Focus Mode"
                >
                    <Maximize /> Focus Mode
                </Button>
                <Button
                    size="lg"
                    onClick={() => {
                        // Credits check for non-dev mode
                        if (!isDevModeActive && user && profile && (profile as any).credits <= 0) {
                            console.log("[DrawingCanvas] User has no credits, opening no credits dialog.");
                            setIsNoCreditsDialogOpen(true);
                            return;
                        }
                        handleGenerateOrRegenerate({});
                    }}
                    disabled={isMakeRealButtonDisabled}
                    className="gap-2 text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 bg-accent hover:bg-accent/90 text-accent-foreground"
                    aria-label="Make it Real - transform drawing"
                >
                    {isLoadingAI ? <Spinner className="text-accent-foreground" /> : <Sparkles className="h-6 w-6" />}
                    Make it Real!
                </Button>
            </CardFooter>
        )}
      </Card>

     <Dialog open={isModalOpen} onOpenChange={(open) => { console.log("[DrawingCanvas] Results Modal onOpenChange, new open state:", open); setIsModalOpen(open); }}>
  <DialogContent className="sm:max-w-2xl lg:max-w-4xl bg-background p-0 z-[150] max-h-[85vh] overflow-hidden flex flex-col">
    <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
      <DialogModalTitleMain className="text-2xl font-bold text-primary text-center">
          {generatedTitleForModal || "Squiggle Revealed!"}
      </DialogModalTitleMain>
      <DialogDesc className="text-center text-muted-foreground">
        Here's your amazing creation! You can download both versions or try giving AI a hint to regenerate.
      </DialogDesc>
    </DialogHeader>
    
    <ScrollArea className="flex-1 px-6 overflow-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start pb-4"> 
        {originalDrawingForModal && (
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Your Drawing</h3>
            <div className="w-full aspect-video relative rounded-md overflow-hidden bg-muted">
                <NextImage src={originalDrawingForModal} alt="Original Drawing" fill style={{objectFit:"contain"}} data-ai-hint="child drawing" />
            </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(originalDrawingForModal, 'my_squiggle_drawing.png')}
                className="mt-2 gap-1 w-full"
                >
                <Download className="h-4 w-4" /> Download Drawing
              </Button>
          </div>
        )}
        {transformedImage && (
          <div className="flex flex-col items-center gap-2 p-4 border-2 border-primary rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-primary">Transformed Version</h3>
              <div className="w-full aspect-video relative rounded-md overflow-hidden bg-muted">
                <NextImage src={transformedImage} alt="Transformed Drawing" fill style={{objectFit:"contain"}} data-ai-hint={availableStyles.find(s=>s.key === selectedStyleKey)?.dataAiHint || 'ai generated art'} />
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleDownload(transformedImage, `${(generatedTitleForModal || 'transformed_squiggle').replace(/\s+/g, '_').toLowerCase()}_${selectedStyleKey}.png`)}
                className="mt-2 gap-1 w-full"
                >
                <Download className="h-4 w-4" /> Download Transformed
              </Button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="space-y-3 pb-4">
          {generatedTitleForModal && (
            <div className="text-center mb-3">
              <p className="text-sm text-muted-foreground">AI Suggested Title:</p>
              <p className="text-lg font-semibold text-accent">{generatedTitleForModal}</p>
            </div>
          )}
          <Input
            placeholder="Optional: Describe your drawing (e.g., 'a happy cat')"
            value={currentRefinementPrompt}
            onChange={(e) => setCurrentRefinementPrompt(e.target.value)}
            className="my-2"
          />
          <Button
            onClick={() => handleGenerateOrRegenerate({ useExistingOriginal: true, refinement: currentRefinementPrompt })}
            disabled={isLoadingAI || !originalDrawingForModal}
            className="w-full gap-2"
            variant="secondary"
          >
            {isLoadingAI ? <Spinner /> : <RotateCcw />}
            Regenerate with Hint
          </Button>
        </div>
      )}
    </ScrollArea>

    <DialogFooter className="p-6 pt-4 border-t flex-shrink-0">
      <DialogClose asChild>
        <Button type="button" variant="outline" className="w-full md:w-auto">
          Close
        </Button>
      </DialogClose>
    </DialogFooter>
  </DialogContent>
</Dialog>

      <AlertDialog open={isOrientationAlertOpen} onOpenChange={setIsOrientationAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogModalTitle>Change Canvas Orientation?</AlertDialogModalTitle>
            <AlertDialogModalDescription>
              Changing the orientation to {pendingOrientation} will clear your current drawing. Are you sure you want to proceed?
            </AlertDialogModalDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsOrientationAlertOpen(false); setPendingOrientation(null); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmOrientationChange()}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       {/* No Credits Dialog */}
      <AlertDialog open={isNoCreditsDialogOpen} onOpenChange={setIsNoCreditsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogModalTitle>Out of Squiggle Power!</AlertDialogModalTitle>
            <AlertDialogModalDescription>
              Oops! It looks like you're out of credits to transform drawings. Please buy more credits to continue the magic.
            </AlertDialogModalDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {/* This DialogClose is a bit of a hack to get the BuyCreditsDialog to work inside AlertDialog */}
            {/* A more robust solution might involve a separate modal system or lifting BuyCreditsDialog out */}
            <DialogClose asChild> 
              <Button onClick={() => {
                // This is a placeholder action. The actual BuyCreditsDialog trigger should be separate.
                // For now, we'll just close this dialog. The user needs to find the "Buy Credits" button elsewhere.
                // Ideally, we'd trigger the BuyCreditsDialog directly.
                setIsNoCreditsDialogOpen(false); // Close this dialog
                // Trigger BuyCreditsDialog - this part is tricky to do from inside AlertDialogAction
                // We might need a separate button in the UI or use a ref to trigger BuyCreditsDialog.
                toast({ title: "Tip:", description: "Find the 'Buy Credits' button in your profile or main menu." });
              }}>
                Go to Buy Credits
              </Button>
            </DialogClose>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
    

// "use client";

// import React, { useRef, useEffect, useState, useCallback } from 'react';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { Eraser, Sparkles, Trash2, Download, ImagePlus, Paintbrush, PaintBucket, RectangleHorizontal, RectangleVertical, Wand2, FileText, Maximize, Minimize, Shapes, Square, Circle as CircleIcon, Minus, RotateCcw, SlidersHorizontal, Settings2 } from 'lucide-react';
// import ColorPalette from './color-palette';
// import { processDrawing, uploadUserImage, type ProcessDrawingResult } from '@/lib/actions';
// import { useAuthContext } from '@/providers/firebase-provider';
// import { useToast } from '@/hooks/use-toast';
// import NextImage from 'next/image';
// import { Spinner } from '@/components/ui/spinner';
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { Input } from "@/components/ui/input";
// import { Slider } from "@/components/ui/slider";
// import {
//   Sheet,
//   SheetContent,
//   SheetHeader,
//   SheetTitle,
//   SheetTrigger,
//   SheetFooter,
//   SheetClose,
// } from "@/components/ui/sheet";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
//   SelectGroup,
//   SelectLabel,
// } from "@/components/ui/select";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
//   DropdownMenuLabel,
//   DropdownMenuSeparator
// } from "@/components/ui/dropdown-menu";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription as AlertDialogModalDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle as AlertDialogModalTitle,
// } from "@/components/ui/alert-dialog";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription as DialogDesc,
//   DialogHeader,
//   DialogTitle as DialogModalTitleMain,
//   DialogFooter,
//   DialogClose
// } from "@/components/ui/dialog";
// import { cn } from '@/lib/utils';
// import type { DailyStyle } from '@/types';

// const INITIAL_LANDSCAPE_WIDTH = 800;
// const INITIAL_LANDSCAPE_HEIGHT = 450; // 16:9 aspect ratio
// const INITIAL_PORTRAIT_WIDTH = 450;   // 9:16 aspect ratio
// const INITIAL_PORTRAIT_HEIGHT = 800;

// interface StyleOption {
//   key: string;
//   label: string;
//   descriptionForAI: string | null;
//   dataAiHint: string;
// }

// const baseAvailableStyles: StyleOption[] = [
//   {
//     key: 'photorealistic',
//     label: 'Photo Realistic',
//     descriptionForAI: 'A photorealistic image. Make it look like a real photo!',
//     dataAiHint: 'photo real'
//   },
//   {
//     key: 'cartoon',
//     label: 'Cartoon Fun',
//     descriptionForAI: 'A bright, colorful, and fun cartoon character or scene, with bold outlines and expressive features, suitable for a children\'s animated show.',
//     dataAiHint: 'cartoon fun'
//   },
//   {
//     key: 'storybook',
//     label: 'Storybook Magic',
//     descriptionForAI: 'A whimsical storybook illustration with soft colors, a gentle fantasy feel, and a narrative quality, like a page from a classic children\'s book.',
//     dataAiHint: 'storybook illustration'
//   },
//   {
//     key: 'claymation',
//     label: 'Claymation Play',
//     descriptionForAI: 'A claymation model, with visible clay textures, slightly exaggerated forms, and a stop-motion animation look.',
//     dataAiHint: 'claymation model'
//   },
//   {
//     key: 'watercolor',
//     label: 'Watercolor Dream',
//     descriptionForAI: 'A beautiful watercolor painting with soft, blended colors, visible brush strokes, and an artistic, dreamy quality.',
//     dataAiHint: 'watercolor art'
//   },
//   {
//     key: 'vintageToy',
//     label: 'Vintage Toy',
//     descriptionForAI: 'Transform this into a classic vintage toy, like a tin robot, a wooden pull-along animal, or a retro plastic doll. It should have a slightly worn, nostalgic feel with materials appropriate for classic toys.',
//     dataAiHint: 'vintage toy'
//   },
//   {
//     key: 'plushToy',
//     label: 'Plushy Toy Friend',
//     descriptionForAI: 'Transform this drawing into a soft, cuddly plush toy or stuffed animal. It should have visible fabric textures, stitching details (if appropriate for the style), and a cute, huggable appearance.',
//     dataAiHint: 'plush toy'
//   },
// ];

// type CanvasTool = 'brush' | 'bucket' | 'rectangle' | 'circle' | 'line';

// function hexToRgba(hex: string): [number, number, number, number] {
//   let r = 0, g = 0, b = 0;
//   if (hex.length === 4) {
//     r = parseInt(hex[1] + hex[1], 16);
//     g = parseInt(hex[2] + hex[2], 16);
//     b = parseInt(hex[3] + hex[3], 16);
//   } else if (hex.length === 7) {
//     r = parseInt(hex[1] + hex[2], 16);
//     g = parseInt(hex[3] + hex[4], 16);
//     b = parseInt(hex[5] + hex[6], 16);
//   }
//   return [r, g, b, 255];
// }

// const MOCK_USER_UID = 'dev-bypass-uid';

// interface ToolsContentProps {
//   inSheet?: boolean;
//   currentColor: string;
//   setCurrentColor: React.Dispatch<React.SetStateAction<string>>;
//   lineWidth: number;
//   setLineWidth: React.Dispatch<React.SetStateAction<number>>;
//   currentTool: CanvasTool;
//   setCurrentTool: React.Dispatch<React.SetStateAction<CanvasTool>>;
//   canvasOrientation: 'landscape' | 'portrait';
//   handleOrientationChangeRequest: (newOrientation: 'landscape' | 'portrait') => void;
//   selectedStyleKey: string;
//   setSelectedStyleKey: React.Dispatch<React.SetStateAction<string>>;
//   availableStyles: StyleOption[];
//   fileInputRef: React.RefObject<HTMLInputElement>;
//   handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
//   clearCanvasAction: () => void;
// }

// const ToolsContent: React.FC<ToolsContentProps> = ({
//   inSheet = false,
//   currentColor, setCurrentColor, lineWidth, setLineWidth, currentTool, setCurrentTool,
//   canvasOrientation, handleOrientationChangeRequest, selectedStyleKey, setSelectedStyleKey,
//   availableStyles, fileInputRef, handleImageUpload, clearCanvasAction
// }) => {
//   return (
//     <div className={cn("w-full", "space-y-4 p-4")}>
//       <ColorPalette selectedColor={currentColor} onColorChange={setCurrentColor} />

//       <div className={cn("flex flex-col gap-2", !inSheet && "sm:flex-row sm:flex-wrap sm:justify-center")}>
//         <div className={cn("flex flex-row flex-wrap gap-2 justify-center", !inSheet && "sm:gap-3")}>
//           <Button
//               variant={currentTool === 'brush' ? 'default' : 'outline'}
//               onClick={() => setCurrentTool('brush')}
//               className="gap-1.5 px-3 flex-1 xs:flex-none"
//               size="sm"
//               aria-pressed={currentTool === 'brush'}
//               title="Brush Tool"
//           >
//               <Paintbrush className="h-4 w-4" /> <span className={cn("hidden xs:inline")}>Brush</span>
//           </Button>
//           <Button
//               variant={currentTool === 'bucket' ? 'default' : 'outline'}
//               onClick={() => setCurrentTool('bucket')}
//               className="gap-1.5 px-3 flex-1 xs:flex-none"
//               size="sm"
//               aria-pressed={currentTool === 'bucket'}
//               title="Paint Bucket Tool"
//           >
//               <PaintBucket className="h-4 w-4" /> <span className={cn("hidden xs:inline")}>Bucket</span>
//           </Button>
//            <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//             <Button variant={['rectangle', 'circle', 'line'].includes(currentTool) ? 'default' : 'outline'} className="gap-1.5 px-3 flex-1 xs:flex-none" size="sm" title="Shape Tools">
//                 <Shapes className="h-4 w-4" /> <span className={cn("hidden xs:inline")}>Shapes</span>
//             </Button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent>
//               <DropdownMenuLabel>Shape Tools</DropdownMenuLabel>
//               <DropdownMenuSeparator />
//               <DropdownMenuItem onClick={() => setCurrentTool('rectangle')} className="gap-1.5">
//                   <Square className="h-4 w-4" /> Rectangle
//               </DropdownMenuItem>
//               <DropdownMenuItem onClick={() => setCurrentTool('circle')} className="gap-1.5">
//                   <CircleIcon className="h-4 w-4" /> Circle/Ellipse
//               </DropdownMenuItem>
//               <DropdownMenuItem onClick={() => setCurrentTool('line')} className="gap-1.5">
//                   <Minus className="h-4 w-4" /> Line
//               </DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>
//         </div>
      
//         <div className={cn("flex flex-row flex-wrap gap-2 justify-center", !inSheet && "sm:gap-3 sm:mt-0", inSheet && "mt-2")}>
//            <div className="space-y-1.5 flex-grow xs:flex-grow-0 min-w-[120px] xs:min-w-0">
//               <label htmlFor="lineWidth" className="text-xs font-medium text-foreground">Size: {lineWidth}px</label>
//               <Slider
//                   id="lineWidth"
//                   min={2}
//                   max={40}
//                   step={1}
//                   value={[lineWidth]}
//                   onValueChange={(value) => setLineWidth(value[0])}
//                   disabled={currentTool === 'bucket'}
//                   className="w-full"
//               />
//               {currentTool === 'bucket' && <p className="text-xs text-muted-foreground">Size only for Brush/Shapes.</p> }
//           </div>
//           <Button
//               variant="outline"
//               size="sm"
//               className="gap-1.5 px-3 flex-1 xs:flex-none"
//               onClick={() => handleOrientationChangeRequest(canvasOrientation === 'landscape' ? 'portrait' : 'landscape')}
//               title={canvasOrientation === 'landscape' ? "Switch to Portrait" : "Switch to Landscape"}
//           >
//               {canvasOrientation === 'landscape' ? <RectangleVertical className="h-4 w-4" /> : <RectangleHorizontal className="h-4 w-4" />}
//               <span className="hidden sm:inline">To {canvasOrientation === 'landscape' ? 'Portrait' : 'Landscape'}</span>
//           </Button>
//           <Button onClick={() => setCurrentColor('#FFFFFF')} variant="outline" size="sm" className="justify-start gap-1.5 px-3 flex-1 xs:flex-none">
//               <Eraser className="h-4 w-4" /> Eraser
//           </Button>
//         </div>
//       </div>

//       <div className={cn("flex flex-col gap-2", !inSheet && "xs:flex-row xs:flex-wrap xs:justify-center", inSheet && "mt-2")}>
//           <div className={cn("w-full", !inSheet && "xs:w-auto min-w-[160px] sm:min-w-[180px] md:min-w-[200px]")}>
//               <Select value={selectedStyleKey} onValueChange={setSelectedStyleKey}>
//               <SelectTrigger className="w-full h-9 text-xs sm:text-sm">
//                   <div className="flex items-center gap-1.5">
//                   <Wand2 className="h-4 w-4 text-primary" />
//                   <SelectValue placeholder="Select an AI Style" />
//                   </div>
//               </SelectTrigger>
//               <SelectContent>
//                   <SelectGroup>
//                   <SelectLabel>AI Transformation Styles</SelectLabel>
//                   {availableStyles.map(style => (
//                       <SelectItem key={style.key} value={style.key} className="text-xs sm:text-sm">
//                       {style.label}
//                       </SelectItem>
//                   ))}
//                   </SelectGroup>
//               </SelectContent>
//               </Select>
//           </div>
//           <input
//               type="file"
//               ref={fileInputRef}
//               onChange={handleImageUpload}
//               accept="image/*"
//               className="hidden"
//           />
//           <div className={cn("w-full flex gap-2", !inSheet && "xs:w-auto")}>
//               <Button variant="outline" size="sm" className="gap-1.5 px-3 flex-1 xs:flex-auto" onClick={() => fileInputRef.current?.click()} title="Upload Image">
//                   <ImagePlus className="h-4 w-4" /> <span className={cn("hidden xs:inline")}>Upload</span>
//               </Button>
//               <Button onClick={clearCanvasAction} variant="outline" size="sm" className="gap-1.5 px-3 flex-1 xs:flex-auto text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/50" title="Clear Canvas">
//                   <Trash2 className="h-4 w-4" /> <span className={cn("hidden xs:inline")}>Clear</span>
//               </Button>
//           </div>
//       </div>
//     </div>
//   );
// };


// export default function DrawingCanvas() {
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const previewCanvasRef = useRef<HTMLCanvasElement>(null);
//   const canvasContainerRef = useRef<HTMLDivElement>(null);
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const [isDrawing, setIsDrawing] = useState(false);
//   const [currentColor, setCurrentColor] = useState('#212121');
//   const [lineWidth, setLineWidth] = useState(8);
//   const [lastPosition, setLastPosition] = useState<{ x: number; y: number } | null>(null);
//   const [currentTool, setCurrentTool] = useState<CanvasTool>('brush');
//   const [shapeStartPos, setShapeStartPos] = useState<{ x: number; y: number } | null>(null);
//   const [uploadedImageToDraw, setUploadedImageToDraw] = useState<HTMLImageElement | null>(null);
  
//   const [preservedDrawing, setPreservedDrawing] = useState<string | null>(null);

//   const [canvasOrientation, setCanvasOrientation] = useState<'landscape' | 'portrait'>('landscape');
//   const [canvasWidth, setCanvasWidth] = useState(INITIAL_LANDSCAPE_WIDTH);
//   const [canvasHeight, setCanvasHeight] = useState(INITIAL_LANDSCAPE_HEIGHT);
//   const [isOrientationAlertOpen, setIsOrientationAlertOpen] = useState(false);
//   const [pendingOrientation, setPendingOrientation] = useState<'landscape' | 'portrait' | null>(null);

//   const { user, profile, loading: authLoading, loadingProfile, profileError, isDevModeActive, addSimulatedCost, dailyStyle, refreshProfile } = useAuthContext();
//   const { toast } = useToast();

//   const [availableStyles, setAvailableStyles] = useState<StyleOption[]>(() => {
//     const surpriseStyleBase = {
//         key: 'surprise',
//         label: 'Surprise Me!',
//         descriptionForAI: "An imaginative and visually striking artistic interpretation; be creative and surprise me!",
//         dataAiHint: 'creative art'
//     };
//     return [surpriseStyleBase, ...baseAvailableStyles];
//   });

//   const [selectedStyleKey, setSelectedStyleKey] = useState<string>(availableStyles[0].key);
//   const [isImmersiveMode, setIsImmersiveMode] = useState(false);
//   const [isToolsSheetOpen, setIsToolsSheetOpen] = useState(false);

//   const [transformedImage, setTransformedImage] = useState<string | null>(null);
//   const [originalDrawingForModal, setOriginalDrawingForModal] = useState<string | null>(null);
//   const [generatedTitleForModal, setGeneratedTitleForModal] = useState<string | null>(null);
//   const [isLoadingAI, setIsLoadingAI] = useState(false);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [currentRefinementPrompt, setCurrentRefinementPrompt] = useState('');
//   const [isNoCreditsDialogOpen, setIsNoCreditsDialogOpen] = useState(false);


//   useEffect(() => {
//     const surpriseStyleBase = {
//         key: 'surprise',
//         label: 'Surprise Me!',
//         descriptionForAI: "An imaginative and visually striking artistic interpretation; be creative and surprise me!",
//         dataAiHint: 'creative art'
//     };

//     if (dailyStyle) {
//       const dailySurpriseStyle: StyleOption = {
//         key: 'surprise',
//         label: `Today's Special: ${dailyStyle.name}`,
//         descriptionForAI: dailyStyle.promptForAI,
//         dataAiHint: dailyStyle.dataAiHint,
//       };
//       setAvailableStyles([dailySurpriseStyle, ...baseAvailableStyles]);
//       if (selectedStyleKey === 'surprise' || !baseAvailableStyles.find(s => s.key === selectedStyleKey)) {
//          setSelectedStyleKey('surprise');
//       }
//     } else {
//       setAvailableStyles([surpriseStyleBase, ...baseAvailableStyles]);
//        if (selectedStyleKey === 'surprise' && !baseAvailableStyles.find(s => s.key === selectedStyleKey) ) {
//          setSelectedStyleKey('surprise');
//        }
//     }
//   }, [dailyStyle, selectedStyleKey]);

//   const getMainContext = useCallback(() => canvasRef.current?.getContext('2d', { willReadFrequently: true }), []);
//   const getPreviewContext = useCallback(() => previewCanvasRef.current?.getContext('2d'), []);

//   const initializeCanvas = useCallback((canvas: HTMLCanvasElement | null, width: number, height: number) => {
//     if (canvas) {
//       canvas.width = width;
//       canvas.height = height;
//       const ctx = canvas.getContext('2d');
//       if (ctx) {
//         ctx.fillStyle = 'white';
//         ctx.fillRect(0, 0, canvas.width, canvas.height);
//       }
//     }
//   }, []);

//   const drawImageOnCanvas = useCallback((canvas: HTMLCanvasElement, imageDataSource: string | HTMLImageElement, targetWidth: number, targetHeight: number): Promise<void> => {
//     return new Promise((resolve, reject) => {
//       const ctx = canvas.getContext('2d');
//       if (!ctx) {
//         console.error("drawImageOnCanvas: Canvas context not found");
//         reject(new Error("Canvas context not found"));
//         return;
//       }

//       const img = new window.Image();
//       img.onload = () => {
//           let drawX = 0;
//           let drawY = 0;
//           let drawWidth = targetWidth;
//           let drawHeight = targetHeight;

//           const canvasAspectRatio = targetWidth / targetHeight;
//           const imageAspectRatio = img.naturalWidth / img.naturalHeight;

//           if (imageAspectRatio > canvasAspectRatio) {
//               drawWidth = targetWidth;
//               drawHeight = targetWidth / imageAspectRatio;
//               drawY = (targetHeight - drawHeight) / 2;
//           } else { 
//               drawHeight = targetHeight;
//               drawWidth = targetHeight * imageAspectRatio;
//               drawX = (targetWidth - drawWidth) / 2;
//           }
          
//           ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
//           resolve();
//       };
//       img.onerror = (e) => {
//           console.error("drawImageOnCanvas: Failed to load image for canvas", e);
//           reject(new Error("Failed to load image for canvas"));
//       };

//       if (typeof imageDataSource === 'string') {
//           img.src = imageDataSource;
//       } else if (imageDataSource instanceof HTMLImageElement) {
//           if (!imageDataSource.src) {
//             console.warn("drawImageOnCanvas: HTMLImageElement has no src.");
//             reject(new Error("HTMLImageElement has no src."));
//             return;
//           }
//           img.src = imageDataSource.src;
//       } else {
//           console.error("drawImageOnCanvas: Invalid imageDataSource type", typeof imageDataSource);
//           reject(new Error("Invalid imageDataSource type"));
//       }
//     });
//   }, []);


//   useEffect(() => {
//     const mainCanvas = canvasRef.current;
//     if (uploadedImageToDraw && mainCanvas) {
//       const drawUploaded = async () => {
//         const targetWidth = isImmersiveMode && canvasContainerRef.current ? canvasContainerRef.current.offsetWidth : canvasWidth;
//         const targetHeight = isImmersiveMode && canvasContainerRef.current ? canvasContainerRef.current.offsetHeight : canvasHeight;

//         initializeCanvas(mainCanvas, targetWidth, targetHeight);
//         try {
//           await drawImageOnCanvas(mainCanvas, uploadedImageToDraw, targetWidth, targetHeight);
//           setOriginalDrawingForModal(mainCanvas.toDataURL('image/png'));
//         } catch (error) {
//           console.error("Error drawing uploaded image:", error);
//           toast({ title: "Upload Error", description: "Could not draw the uploaded image.", variant: "destructive"});
//         }
//         setUploadedImageToDraw(null);
//         setTransformedImage(null);
//         setGeneratedTitleForModal(null);
//         setCurrentRefinementPrompt('');
//       };
//       drawUploaded();
//     }
//   }, [uploadedImageToDraw, initializeCanvas, drawImageOnCanvas, toast, isImmersiveMode, canvasWidth, canvasHeight]);


// // Effect for handling canvas setup and drawing preservation during mode/dimension transitions
// useEffect(() => {
//     const mainCanvas = canvasRef.current;
//     const previewCanvas = previewCanvasRef.current;
//     if (!mainCanvas || !previewCanvas) return;

//     console.log(`[Effect Mode/Dim Change] Fired. Mode: ${isImmersiveMode}, Preserved: ${!!preservedDrawing}, CanvasDims: ${canvasWidth}x${canvasHeight}`);

//     const applyPreservedDrawing = (targetCanvas: HTMLCanvasElement, drawingData: string, w: number, h: number) => {
//         console.log(`[Effect Mode/Dim Change] Attempting to draw preserved on canvas ${targetCanvas.id} of size ${w}x${h}`);
//         drawImageOnCanvas(targetCanvas, drawingData, w, h)
//             .then(() => {
//                 console.log(`[Effect Mode/Dim Change] Successfully drew preserved drawing. Clearing preservedDrawing state.`);
//                 setPreservedDrawing(null);
//             })
//             .catch(err => {
//                 console.error(`[Effect Mode/Dim Change] Error drawing preserved image:`, err);
//                 setPreservedDrawing(null); // Clear even on error to prevent stale state
//             });
//     };

//     if (isImmersiveMode) {
//         const container = canvasContainerRef.current;
//         if (container) {
//             const { offsetWidth, offsetHeight } = container;
//             console.log(`[Effect Mode/Dim Change] Initializing immersive canvas to ${offsetWidth}x${offsetHeight}`);
//             initializeCanvas(mainCanvas, offsetWidth, offsetHeight);
//             initializeCanvas(previewCanvas, offsetWidth, offsetHeight);
//             if (preservedDrawing) {
//                 applyPreservedDrawing(mainCanvas, preservedDrawing, offsetWidth, offsetHeight);
//             }
//         }
//     } else { // Non-immersive mode
//         console.log(`[Effect Mode/Dim Change] Initializing non-immersive canvas to ${canvasWidth}x${canvasHeight}`);
//         initializeCanvas(mainCanvas, canvasWidth, canvasHeight);
//         initializeCanvas(previewCanvas, canvasWidth, canvasHeight);
//         if (preservedDrawing) {
//             applyPreservedDrawing(mainCanvas, preservedDrawing, canvasWidth, canvasHeight);
//         }
//     }
// }, [isImmersiveMode, canvasWidth, canvasHeight, preservedDrawing, initializeCanvas, drawImageOnCanvas]); // setPreservedDrawing removed as per React exhaustive-deps guidelines if it's only called in .then


// // Effect for ResizeObserver in immersive mode & body scroll lock
// useEffect(() => {
//     const mainCanvas = canvasRef.current;
//     const previewCanvas = previewCanvasRef.current;
//     const container = canvasContainerRef.current;
//     let observer: ResizeObserver | null = null;

//     if (isImmersiveMode) {
//         console.log("[Effect Immersive Setup] Entering Immersive Mode. Setting body styles and ResizeObserver.");
//         document.body.classList.add('no-overscroll-canvas-active');
//         document.body.style.overflow = 'hidden';
//         document.body.style.overscrollBehaviorY = 'contain';


//         if (mainCanvas && previewCanvas && container) {
//             observer = new ResizeObserver(entries => {
//                 const currentMainCanvas = canvasRef.current; // Re-evaluate current ref inside observer
//                 const currentPreviewCanvas = previewCanvasRef.current;
//                 if (!currentMainCanvas || !currentPreviewCanvas) return;

//                 const currentDrawingDataUrl = currentMainCanvas.toDataURL('image/png');
//                 console.log("[ResizeObserver] Immersive canvas resized. Capturing and restoring drawing.");

//                 for (let entry of entries) {
//                     const { width, height } = entry.contentRect;
//                     initializeCanvas(currentMainCanvas, width, height);
//                     initializeCanvas(currentPreviewCanvas, width, height);
//                     drawImageOnCanvas(currentMainCanvas, currentDrawingDataUrl, width, height)
//                         .catch(err => console.error("Error redrawing in resize observer:", err));
//                 }
//             });
//             observer.observe(container);
//         }
//     } else {
//         console.log("[Effect Immersive Setup] Exiting Immersive Mode. Restoring body styles.");
//         document.body.classList.remove('no-overscroll-canvas-active');
//         document.body.style.overflow = '';
//         document.body.style.overscrollBehaviorY = '';
//     }

//     return () => {
//         console.log("[Effect Immersive Setup] Cleanup: Removing body styles and disconnecting observer.");
//         document.body.classList.remove('no-overscroll-canvas-active');
//         document.body.style.overflow = '';
//         document.body.style.overscrollBehaviorY = '';
//         if (observer) {
//             observer.disconnect();
//         }
//     };
// }, [isImmersiveMode, initializeCanvas, drawImageOnCanvas]);


//   const getCanvasPosition = useCallback((eventClientX: number, eventClientY: number) => {
//     const canvas = previewCanvasRef.current || canvasRef.current;
//     if (!canvas) return { x: 0, y: 0 };
//     const rect = canvas.getBoundingClientRect();
//     const scaleX = canvas.width / rect.width;
//     const scaleY = canvas.height / rect.height;
//     return {
//       x: Math.floor((eventClientX - rect.left) * scaleX),
//       y: Math.floor((eventClientY - rect.top) * scaleY),
//     };
//   }, []);

//   const drawBrushStroke = useCallback((ctx: CanvasRenderingContext2D, from: {x: number, y: number}, to: {x: number, y: number}) => {
//     ctx.beginPath();
//     ctx.strokeStyle = currentColor;
//     ctx.lineWidth = lineWidth;
//     ctx.lineCap = 'round';
//     ctx.lineJoin = 'round';
//     ctx.moveTo(from.x, from.y);
//     ctx.lineTo(to.x, to.y);
//     ctx.stroke();
//   }, [currentColor, lineWidth]);

//   const drawLineOnCtx = useCallback((ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
//     ctx.beginPath();
//     ctx.strokeStyle = currentColor;
//     ctx.lineWidth = lineWidth;
//     ctx.lineCap = 'round';
//     ctx.moveTo(x1, y1);
//     ctx.lineTo(x2, y2);
//     ctx.stroke();
//   }, [currentColor, lineWidth]);

//   const drawRectangleOnCtx = useCallback((ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
//     ctx.beginPath();
//     ctx.strokeStyle = currentColor;
//     ctx.lineWidth = lineWidth;
//     ctx.rect(x1, y1, x2 - x1, y2 - y1);
//     ctx.stroke();
//   }, [currentColor, lineWidth]);

//   const drawCircleOnCtx = useCallback((ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
//     ctx.beginPath();
//     ctx.strokeStyle = currentColor;
//     ctx.lineWidth = lineWidth;
//     const radiusX = Math.abs(x2 - x1) / 2;
//     const radiusY = Math.abs(y2 - y1) / 2;
//     const centerX = Math.min(x1, x2) + radiusX;
//     const centerY = Math.min(y1, y2) + radiusY;
//     if (radiusX > 0 || radiusY > 0) {
//         ctx.ellipse(centerX, centerY, Math.max(1, radiusX), Math.max(1, radiusY), 0, 0, 2 * Math.PI);
//     }
//     ctx.stroke();
//   }, [currentColor, lineWidth]);


//   const startDrawing = useCallback((pos: {x: number, y: number}) => {
//     setIsDrawing(true);
//     if (currentTool === 'brush') {
//       setLastPosition(pos);
//     } else if (['rectangle', 'circle', 'line'].includes(currentTool)) {
//       setShapeStartPos(pos);
//     }
//   }, [currentTool]);

//   const draw = useCallback((currentPosition: {x: number, y: number}) => {
//     if (!isDrawing) return;

//     if (currentTool === 'brush' && lastPosition) {
//       const mainCtx = getMainContext();
//       if (mainCtx) {
//         drawBrushStroke(mainCtx, lastPosition, currentPosition);
//         setLastPosition(currentPosition);
//       }
//     } else if (['rectangle', 'circle', 'line'].includes(currentTool) && shapeStartPos) {
//       const previewCtx = getPreviewContext();
//       if (previewCtx && previewCanvasRef.current) {
//         previewCtx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
//         switch (currentTool) {
//           case 'rectangle':
//             drawRectangleOnCtx(previewCtx, shapeStartPos.x, shapeStartPos.y, currentPosition.x, currentPosition.y);
//             break;
//           case 'circle':
//             drawCircleOnCtx(previewCtx, shapeStartPos.x, shapeStartPos.y, currentPosition.x, currentPosition.y);
//             break;
//           case 'line':
//             drawLineOnCtx(previewCtx, shapeStartPos.x, shapeStartPos.y, currentPosition.x, currentPosition.y);
//             break;
//         }
//       }
//     }
//   }, [isDrawing, currentTool, lastPosition, shapeStartPos, getMainContext, getPreviewContext, drawBrushStroke, drawRectangleOnCtx, drawCircleOnCtx, drawLineOnCtx]);

//   const stopDrawing = useCallback((currentPosition?: {x: number, y: number}) => {
//     if (!isDrawing) return;

//     const mainCtx = getMainContext();
//     const previewCtx = getPreviewContext();

//     if (mainCtx && ['rectangle', 'circle', 'line'].includes(currentTool) && shapeStartPos && currentPosition) {
//        switch (currentTool) {
//           case 'rectangle':
//             drawRectangleOnCtx(mainCtx, shapeStartPos.x, shapeStartPos.y, currentPosition.x, currentPosition.y);
//             break;
//           case 'circle':
//             drawCircleOnCtx(mainCtx, shapeStartPos.x, shapeStartPos.y, currentPosition.x, currentPosition.y);
//             break;
//           case 'line':
//             drawLineOnCtx(mainCtx, shapeStartPos.x, shapeStartPos.y, currentPosition.x, currentPosition.y);
//             break;
//         }
//     }

//     if (previewCtx && previewCanvasRef.current) {
//       previewCtx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
//     }

//     setIsDrawing(false);
//     setLastPosition(null);
//     setShapeStartPos(null);
//   }, [isDrawing, currentTool, shapeStartPos, getMainContext, getPreviewContext, drawRectangleOnCtx, drawCircleOnCtx, drawLineOnCtx]);


//   const floodFill = useCallback((startX: number, startY: number, fillColorHex: string) => {
//     const canvas = canvasRef.current;
//     const ctx = getMainContext();
//     if (!canvas || !ctx) return;

//     const fillColorRgba = hexToRgba(fillColorHex);
//     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
//     const data = imageData.data;

//     if (startX < 0 || startX >= canvas.width || startY < 0 || startY >= canvas.height) {
//         return;
//     }

//     const targetColorRgba = [
//       data[(startY * canvas.width + startX) * 4],
//       data[(startY * canvas.width + startX) * 4 + 1],
//       data[(startY * canvas.width + startX) * 4 + 2],
//       data[(startY * canvas.width + startX) * 4 + 3],
//     ];

//     if (
//       targetColorRgba[0] === fillColorRgba[0] &&
//       targetColorRgba[1] === fillColorRgba[1] &&
//       targetColorRgba[2] === fillColorRgba[2] &&
//       targetColorRgba[3] === fillColorRgba[3]
//     ) {
//       return;
//     }

//     if (targetColorRgba.some(val => val === undefined)) {
//         return;
//     }

//     const queue: [number, number][] = [[startX, startY]];
//     while (queue.length > 0) {
//       const [x, y] = queue.shift()!;
//       if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;

//       const pixelIndex = (y * canvas.width + x) * 4;
//       const r = data[pixelIndex];
//       const g = data[pixelIndex + 1];
//       const b = data[pixelIndex + 2];
//       const a = data[pixelIndex + 3];

//       if (
//         r === targetColorRgba[0] &&
//         g === targetColorRgba[1] &&
//         b === targetColorRgba[2] &&
//         a === targetColorRgba[3]
//       ) {
//         data[pixelIndex] = fillColorRgba[0];
//         data[pixelIndex + 1] = fillColorRgba[1];
//         data[pixelIndex + 2] = fillColorRgba[2];
//         data[pixelIndex + 3] = fillColorRgba[3];

//         queue.push([x + 1, y]);
//         queue.push([x - 1, y]);
//         queue.push([x, y + 1]);
//         queue.push([x, y - 1]);
//       }
//     }
//     ctx.putImageData(imageData, 0, 0);
//   }, [getMainContext]);


//   const handleCanvasInteractionStart = useCallback((event: React.MouseEvent | React.TouchEvent) => {
//     if (event.type === 'touchstart' && event.cancelable) {
//         event.preventDefault();
//     }
//     const nativeEvent = event.nativeEvent instanceof TouchEvent ? event.nativeEvent.touches[0] : event.nativeEvent;
//     const pos = getCanvasPosition(nativeEvent.clientX, nativeEvent.clientY);

//     if (currentTool === 'bucket') {
//       floodFill(pos.x, pos.y, currentColor);
//     } else {
//       startDrawing(pos);
//     }
//   }, [getCanvasPosition, currentTool, startDrawing, floodFill, currentColor]);

//   const handleCanvasInteractionMove = useCallback((event: React.MouseEvent | React.TouchEvent) => {
//     if (!isDrawing) return; 

//     if (event.cancelable) {
//       event.preventDefault();
//     }

//     const nativeEvent = event.nativeEvent instanceof TouchEvent ? event.nativeEvent.touches[0] : event.nativeEvent;
//     if (!nativeEvent) return;

//     const currentPosition = getCanvasPosition(nativeEvent.clientX, nativeEvent.clientY);
//     draw(currentPosition);
//   }, [isDrawing, getCanvasPosition, draw]);


//   const handleCanvasInteractionEnd = useCallback((event: React.MouseEvent | React.TouchEvent) => {
//     let finalPosition = undefined;
//     if (event.type === 'mouseup' || event.type === 'touchend') {
//         const nativeEvent = event.nativeEvent instanceof TouchEvent ? (event.nativeEvent.changedTouches[0] || event.nativeEvent.touches[0]) : event.nativeEvent;
//         if(nativeEvent) {
//             finalPosition = getCanvasPosition(nativeEvent.clientX, nativeEvent.clientY);
//         }
//     }
//     stopDrawing(finalPosition);
//   }, [stopDrawing, getCanvasPosition]);


//   const clearCanvasAction = useCallback(() => {
//     const mainCanvas = canvasRef.current;
//     if (mainCanvas) {
//         initializeCanvas(mainCanvas, mainCanvas.width, mainCanvas.height);
//     }
//     if (previewCanvasRef.current) {
//         const previewCtx = getPreviewContext();
//         if (previewCtx) previewCtx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
//     }
//     setPreservedDrawing(null);
//     setTransformedImage(null);
//     setOriginalDrawingForModal(null);
//     setGeneratedTitleForModal(null);
//     setCurrentRefinementPrompt('');
//   }, [initializeCanvas, getPreviewContext]);

//   const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (file) {
//       const reader = new FileReader();
//       reader.onload = (e) => {
//         const img = new window.Image();
//         img.onload = () => {
//           const { naturalWidth, naturalHeight } = img;
//           const MAX_DIMENSION = 800;

//           let newW, newH;
//           if (naturalWidth >= naturalHeight) {
//             newW = Math.min(naturalWidth, MAX_DIMENSION);
//             newH = Math.round((naturalHeight / naturalWidth) * newW);
//           } else {
//             newH = Math.min(naturalHeight, MAX_DIMENSION);
//             newW = Math.round((naturalWidth / naturalHeight) * newH);
//           }
//           newW = Math.max(1, newW);
//           newH = Math.max(1, newH);

//           if (!isImmersiveMode) {
//             setCanvasWidth(newW);
//             setCanvasHeight(newH);
//             setCanvasOrientation(newW >= newH ? 'landscape' : 'portrait');
//           }
//           setUploadedImageToDraw(img); 
//         };
//         img.src = e.target?.result as string;
//       };
//       reader.readAsDataURL(file);
//       if (fileInputRef.current) {
//         fileInputRef.current.value = '';
//       }
//     }
//   };

//   const handleGenerateOrRegenerate = async ({
//     useExistingOriginal = false,
//     refinement = '',
//   }: {
//     useExistingOriginal?: boolean;
//     refinement?: string;
//   } = {}) => {
//     console.log(`[DrawingCanvas] handleGenerateOrRegenerate called. Use existing: ${useExistingOriginal}, Refinement: "${refinement}"`);
//     if (!user && !isDevModeActive) {
//       toast({ title: "Authentication Required", description: "Please sign in to transform your drawing.", variant: "destructive" });
//       return;
//     }
//     if (isLoadingAI) return;
    
//     let drawingDataUrl: string | null = null;
//     if (useExistingOriginal) {
//         if (!originalDrawingForModal) {
//             toast({ title: "Error", description: "No original drawing available for regeneration.", variant: "destructive" });
//             return;
//         }
//         drawingDataUrl = originalDrawingForModal;
//     } else {
//         if (!canvasRef.current) {
//             toast({ title: "Error", description: "Canvas not available.", variant: "destructive" });
//             return;
//         }
//         drawingDataUrl = canvasRef.current.toDataURL('image/png');
//         setOriginalDrawingForModal(drawingDataUrl); // Store for potential regeneration
//     }

//     if (!drawingDataUrl) {
//       toast({ title: "Error", description: "No drawing data to process.", variant: "destructive" });
//       return;
//     }


//     setIsLoadingAI(true);
//     setTransformedImage(null);

//     const currentUserId = isDevModeActive && !user ? MOCK_USER_UID : user!.uid;
//     const selectedStyle = availableStyles.find(style => style.key === selectedStyleKey);

//     if (!selectedStyle) {
//         toast({ title: "Style Error", description: "Selected style not found.", variant: "destructive" });
//         setIsLoadingAI(false);
//         return;
//     }

//     console.log("[DrawingCanvas] Calling processDrawing. UserID:", currentUserId, "Is Dev Mode Active:", isDevModeActive, "Style Key:", selectedStyle.key, "Refinement:", refinement);
//     const result: ProcessDrawingResult = await processDrawing(
//       drawingDataUrl,
//       currentUserId,
//       selectedStyle.key,
//       selectedStyle.descriptionForAI,
//       refinement
//     );
    
//     console.log('[DrawingCanvas] processDrawing result:', result);
//     setIsLoadingAI(false);

//     if (result.error) {
//       toast({ title: "Transformation Error", description: result.error, variant: "destructive", duration: 8000 });
//       console.log("[DrawingCanvas] Transformation error, ensuring modal is closed.");
//       setIsModalOpen(false);
//     } else if (result.transformedImageUrl) {
//       console.log('[DrawingCanvas] Transformed image URL received, opening modal.');
//       setTransformedImage(result.transformedImageUrl);
//       setGeneratedTitleForModal(result.generatedTitle || "My Awesome Creation");
//       setIsModalOpen(true);
//       console.log("[DrawingCanvas] setIsModalOpen(true) called.");
//       toast({ title: "Woohoo!", description: `Your masterpiece "${result.generatedTitle || 'My Awesome Creation'}" has been magically transformed!` });
//       if (isDevModeActive && result.simulatedCost && addSimulatedCost) {
//         addSimulatedCost(result.simulatedCost);
//       }
//     } else {
//       console.error('[DrawingCanvas] processDrawing succeeded but returned no transformedImageUrl.');
//       toast({ title: "Transformation Issue", description: "The AI transformation completed but did not return an image. Please try again.", variant: "destructive" });
//       console.log("[DrawingCanvas] Transformation issue (no URL), ensuring modal is closed.");
//       setIsModalOpen(false);
//     }
//   };


  
//   const [uploading, setUploading] = useState(false);

//   const handleUpload = async () => {
//     if (!canvasRef.current || !user) return;
//     setUploading(true);
//     const dataUrl = canvasRef.current.toDataURL("image/png");
//     try {
//       const imageUrl = await uploadUserImage(dataUrl, user.uid);
//       alert("Drawing uploaded successfully!");
//       console.log("Image URL:", imageUrl);
//     } catch (err) {
//       console.error("Upload failed:", err);
//       alert("Upload failed");
//     } finally {
//       setUploading(false);
//     }
//   };


// const handleDownload = (imageUrl: string | null, filename: string) => {
//     if (!imageUrl) return;
//     const link = document.createElement('a');
//     link.href = imageUrl;
//     link.download = filename;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };

//   const handleOrientationChangeRequest = (newOrientation: 'landscape' | 'portrait') => {
//     if (isImmersiveMode) { 
//         confirmOrientationChange(newOrientation);
//         return;
//     }
//     if (newOrientation === canvasOrientation) return;

//     const canvas = canvasRef.current;
//     const ctx = getMainContext();
//     let isEmpty = true;
//     if (canvas && ctx) {
//       const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
//       const data = imageData.data;
//       for (let i = 0; i < data.length; i += 4) {
//         if (data[i+3] > 0 && (data[i] !== 255 || data[i+1] !== 255 || data[i+2] !== 255) ) {
//           isEmpty = false;
//           break;
//         }
//       }
//     }

//     if (isEmpty) { 
//       confirmOrientationChange(newOrientation);
//     } else {
//       setPendingOrientation(newOrientation);
//       setIsOrientationAlertOpen(true);
//     }
//   };

//   const confirmOrientationChange = (orientationToSet?: 'landscape' | 'portrait') => {
//     const newOrientation = orientationToSet || pendingOrientation;
//     if (!newOrientation) return;

//     if (canvasRef.current) { 
//         console.log("[confirmOrientationChange] Capturing drawing before orientation change.");
//         setPreservedDrawing(canvasRef.current.toDataURL('image/png'));
//     }

//     let newWidth, newHeight;
//     if (newOrientation === 'landscape') {
//       newWidth = INITIAL_LANDSCAPE_WIDTH;
//       newHeight = INITIAL_LANDSCAPE_HEIGHT;
//     } else {
//       newWidth = INITIAL_PORTRAIT_WIDTH;
//       newHeight = INITIAL_PORTRAIT_HEIGHT;
//     }
    
//     if (!isImmersiveMode) {
//       setCanvasWidth(newWidth);
//       setCanvasHeight(newHeight);
//     }
//     setCanvasOrientation(newOrientation); 

//     setIsOrientationAlertOpen(false);
//     setPendingOrientation(null);
//   };

//   const toggleImmersiveMode = () => {
//     if (canvasRef.current) {
//       console.log("[toggleImmersiveMode] Capturing drawing before mode toggle.");
//       setPreservedDrawing(canvasRef.current.toDataURL('image/png'));
//     }
//     setIsImmersiveMode(prevMode => !prevMode);
//     console.log(`[toggleImmersiveMode] Toggled immersive mode. New state: ${!isImmersiveMode}`);
//   };

//   let isMakeRealButtonDisabled = isLoadingAI;
//   if (!isDevModeActive && (!user || !profile)) { 
//     if (authLoading || loadingProfile) { 
//       isMakeRealButtonDisabled = true;
//     }
//   }
//   // Credits check is removed as per prior request for temporary disabling.
//   // else if (!isDevModeActive && profile && (profile as any).credits <= 0) { 
//   //   isMakeRealButtonDisabled = true;
//   // }
  
//   const toolsContentProps = {
//     currentColor, setCurrentColor, lineWidth, setLineWidth, currentTool, setCurrentTool,
//     canvasOrientation, handleOrientationChangeRequest, selectedStyleKey, setSelectedStyleKey,
//     availableStyles, fileInputRef, handleImageUpload, clearCanvasAction
//   };

//   return (
//     <div className="flex flex-col items-center gap-6 w-full h-full">
//       <Card className={cn(
//         "w-full shadow-2xl overflow-hidden transition-all duration-300 ease-in-out flex flex-col",
//         isImmersiveMode
//           ? "fixed inset-0 z-[100] max-w-none rounded-none m-0 p-0 bg-background"
//           : "max-w-5xl"
//       )}>
//         {!isImmersiveMode && (
//           <CardHeader className="text-center bg-primary/10 p-4 md:p-6 flex-shrink-0">
//             <CardTitle className="text-2xl md:text-3xl font-bold text-primary">Let's Draw Some Squiggles!</CardTitle>
//             <CardDescription className="text-sm md:text-base text-muted-foreground">Unleash your imagination on the canvas below.</CardDescription>
//           </CardHeader>
//         )}
//         <CardContent className={cn(
//           "flex flex-col items-center flex-grow",
//           isImmersiveMode ? "p-1 sm:p-2 justify-between h-full overflow-hidden" : "p-3 md:p-6 gap-4"
//         )}>
//           {!isImmersiveMode && (
//             <div className="flex flex-col items-center gap-3 w-full mb-4 flex-shrink-0">
//              <ToolsContent {...toolsContentProps} inSheet={false} />
//             </div>
//           )}

//           <div
//             ref={canvasContainerRef}
//             className={cn(
//               "relative border-2 border-primary rounded-lg shadow-inner bg-white overflow-hidden", 
//               isImmersiveMode ? "w-full flex-grow" : "mx-auto"
//             )}
//             style={!isImmersiveMode ? {
//                 width: `${canvasWidth}px`,
//                 height: `${canvasHeight}px`,
//                 maxWidth: '100%',
//             } : {
//                 maxWidth: '100%',
//                 // Removed explicit aspect ratio in immersive mode to allow free scaling with rotation
//             }}
//           >
//             <canvas
//               ref={canvasRef}
//               id="main-drawing-canvas"
//               className={cn("absolute top-0 left-0 w-full h-full")}
//             />
//             <canvas
//               ref={previewCanvasRef}
//               id="preview-drawing-canvas"
//               onMouseDown={handleCanvasInteractionStart}
//               onMouseMove={handleCanvasInteractionMove}
//               onMouseUp={handleCanvasInteractionEnd}
//               onMouseLeave={handleCanvasInteractionEnd}
//               onTouchStart={handleCanvasInteractionStart}
//               onTouchMove={handleCanvasInteractionMove}
//               onTouchEnd={handleCanvasInteractionEnd}
//                className={cn(
//                 "absolute top-0 left-0 w-full h-full z-10",
//                 currentTool === 'brush' ? 'cursor-crosshair' :
//                 currentTool === 'bucket' ? 'cursor-copy' :
//                 ['rectangle', 'circle', 'line'].includes(currentTool) ? 'cursor-default' : 'cursor-default'
//               )}
//             />
//           </div>
//            {isImmersiveMode && (
//              <div className="flex justify-between items-center p-2 gap-2 border-t bg-background/80 backdrop-blur-sm flex-shrink-0 w-full mt-auto">
//                 <Sheet 
//                   open={isToolsSheetOpen} 
//                   onOpenChange={(open) => {
//                     console.log('[DrawingCanvas] Tools Sheet onOpenChange, new open state:', open);
//                     setIsToolsSheetOpen(open);
//                   }}
//                 >
//                   <SheetTrigger asChild>
//                     <Button 
//                       variant="outline" 
//                       size="lg" 
//                       className="gap-2"
//                       onClick={() => {
//                         console.log('[DrawingCanvas] Tools button clicked. Current isToolsSheetOpen:', isToolsSheetOpen);
//                         setIsToolsSheetOpen(true); // Directly set to true to open
//                       }}
//                     >
//                       <SlidersHorizontal /> Tools
//                     </Button>
//                   </SheetTrigger>
//                   <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
//                      <SheetHeader className="p-4 py-3 border-b">
//                         <SheetTitle>Drawing Tools & Settings</SheetTitle>
//                      </SheetHeader>
//                     <ScrollArea className="flex-1">
//                         <ToolsContent {...toolsContentProps} inSheet={true} />
//                     </ScrollArea>
//                     <SheetFooter className="p-4 border-t">
//                         <SheetClose asChild>
//                             <Button type="button" className="w-full sm:w-auto">Done</Button>
//                         </SheetClose>
//                     </SheetFooter>
//                   </SheetContent>
//                 </Sheet>

//                 <Button
//                     size="lg"
//                     onClick={() => handleGenerateOrRegenerate({})}
//                     disabled={isMakeRealButtonDisabled}
//                     className="gap-2 text-base sm:text-lg px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 bg-accent hover:bg-accent/90 text-accent-foreground flex-grow sm:flex-grow-0"
//                     aria-label="Make it Real - transform drawing"
//                 >
//                     {isLoadingAI ? <Spinner className="text-accent-foreground" /> : <Sparkles className="h-5 w-5" />}
//                     Make it Real!
//                 </Button>

//                 <Button onClick={toggleImmersiveMode} variant="outline" size="lg" className="gap-2">
//                     <Minimize /> Exit
//                 </Button>
//              </div>
//            )}
//         </CardContent>
//         {!isImmersiveMode && (
//             <CardFooter className={cn(
//             "flex flex-col sm:flex-row justify-center items-center gap-4 bg-primary/10 flex-shrink-0",
//             "p-4 md:p-6"
//             )}>
//                 <Button
//                     onClick={toggleImmersiveMode}
//                     variant="outline"
//                     size="lg"
//                     className="gap-2"
//                     title="Enter Focus Mode"
//                 >
//                     <Maximize /> Focus Mode
//                 </Button>
//                 <Button
//                     size="lg"
//                     onClick={() => {
//                         // Credits check for non-dev mode
//                         if (!isDevModeActive && user && profile && (profile as any).credits <= 0) {
//                             console.log("[DrawingCanvas] User has no credits, opening no credits dialog.");
//                             setIsNoCreditsDialogOpen(true);
//                             return;
//                         }
//                         handleGenerateOrRegenerate({});
//                     }}
//                     disabled={isMakeRealButtonDisabled}
//                     className="gap-2 text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 bg-accent hover:bg-accent/90 text-accent-foreground"
//                     aria-label="Make it Real - transform drawing"
//                 >
//                     {isLoadingAI ? <Spinner className="text-accent-foreground" /> : <Sparkles className="h-6 w-6" />}
//                     Make it Real!
//                 </Button>
//             </CardFooter>
//         )}
//       </Card>

//       <Dialog open={isModalOpen} onOpenChange={(open) => { console.log("[DrawingCanvas] Results Modal onOpenChange, new open state:", open); setIsModalOpen(open); }}>
//         <DialogContent className="sm:max-w-2xl lg:max-w-4xl bg-background p-0 z-[150]">
//           <DialogHeader className="p-6 pb-4 border-b">
//             <DialogModalTitleMain className="text-2xl font-bold text-primary text-center">
//                 {generatedTitleForModal || "Squiggle Revealed!"}
//             </DialogModalTitleMain>
//             <DialogDesc className="text-center text-muted-foreground">
//               Here's your amazing creation! You can download both versions or try giving AI a hint to regenerate.
//             </DialogDesc>
//           </DialogHeader>
//           <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"> 
//             {originalDrawingForModal && (
//               <div className="flex flex-col items-center gap-2 p-4 border rounded-lg shadow-sm">
//                 <h3 className="text-lg font-semibold text-foreground">Your Drawing</h3>
//                 <div className="w-full aspect-video relative rounded-md overflow-hidden bg-muted">
//                     <NextImage src={originalDrawingForModal} alt="Original Drawing" fill style={{objectFit:"contain"}} data-ai-hint="child drawing" />
//                 </div>
//                  <Button
//                     variant="outline"
//                     size="sm"
//                     onClick={() => handleDownload(originalDrawingForModal, 'my_squiggle_drawing.png')}
//                     className="mt-2 gap-1 w-full"
//                     >
//                     <Download className="h-4 w-4" /> Download Drawing
//                 </Button>
//               </div>
//             )}
//             {transformedImage && (
//               <div className="flex flex-col items-center gap-2 p-4 border-2 border-primary rounded-lg shadow-md">
//                 <h3 className="text-lg font-semibold text-primary">Transformed Version</h3>
//                  <div className="w-full aspect-video relative rounded-md overflow-hidden bg-muted">
//                     <NextImage src={transformedImage} alt="Transformed Drawing" fill style={{objectFit:"contain"}} data-ai-hint={availableStyles.find(s=>s.key === selectedStyleKey)?.dataAiHint || 'ai generated art'} />
//                 </div>
//                  <Button
//                     variant="default"
//                     size="sm"
//                     onClick={() => handleDownload(transformedImage, `${(generatedTitleForModal || 'transformed_squiggle').replace(/\s+/g, '_').toLowerCase()}_${selectedStyleKey}.png`)}
//                     className="mt-2 gap-1 w-full"
//                     >
//                     <Download className="h-4 w-4" /> Download Transformed
//                 </Button>
//               </div>
//             )}
//           </div>

//            {isModalOpen && (
//             <div className="px-6 pb-4 space-y-3">
//                 {generatedTitleForModal && (
//                 <div className="text-center mb-3">
//                     <p className="text-sm text-muted-foreground">AI Suggested Title:</p>
//                     <p className="text-lg font-semibold text-accent">{generatedTitleForModal}</p>
//                 </div>
//                 )}
//                 <Input
//                     placeholder="Optional: Describe your drawing (e.g., 'a happy cat')"
//                     value={currentRefinementPrompt}
//                     onChange={(e) => setCurrentRefinementPrompt(e.target.value)}
//                     className="my-2"
//                 />
//                 <Button
//                     onClick={() => handleGenerateOrRegenerate({ useExistingOriginal: true, refinement: currentRefinementPrompt })}
//                     disabled={isLoadingAI || !originalDrawingForModal}
//                     className="w-full gap-2"
//                     variant="secondary"
//                 >
//                     {isLoadingAI ? <Spinner /> : <RotateCcw />}
//                     Regenerate with Hint
//                 </Button>
//             </div>
//            )}

//           <DialogFooter className="p-6 pt-4 border-t">
//             <DialogClose asChild>
//               <Button type="button" variant="outline" className="w-full md:w-auto">
//                 Close
//               </Button>
//             </DialogClose>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       <AlertDialog open={isOrientationAlertOpen} onOpenChange={setIsOrientationAlertOpen}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogModalTitle>Change Canvas Orientation?</AlertDialogModalTitle>
//             <AlertDialogModalDescription>
//               Changing the orientation to {pendingOrientation} will clear your current drawing. Are you sure you want to proceed?
//             </AlertDialogModalDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel onClick={() => { setIsOrientationAlertOpen(false); setPendingOrientation(null); }}>Cancel</AlertDialogCancel>
//             <AlertDialogAction onClick={() => confirmOrientationChange()}>Confirm</AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>

//        {/* No Credits Dialog */}
//       <AlertDialog open={isNoCreditsDialogOpen} onOpenChange={setIsNoCreditsDialogOpen}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogModalTitle>Out of Squiggle Power!</AlertDialogModalTitle>
//             <AlertDialogModalDescription>
//               Oops! It looks like you're out of credits to transform drawings. Please buy more credits to continue the magic.
//             </AlertDialogModalDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel>Cancel</AlertDialogCancel>
//             {/* This DialogClose is a bit of a hack to get the BuyCreditsDialog to work inside AlertDialog */}
//             {/* A more robust solution might involve a separate modal system or lifting BuyCreditsDialog out */}
//             <DialogClose asChild> 
//               <Button onClick={() => {
//                 // This is a placeholder action. The actual BuyCreditsDialog trigger should be separate.
//                 // For now, we'll just close this dialog. The user needs to find the "Buy Credits" button elsewhere.
//                 // Ideally, we'd trigger the BuyCreditsDialog directly.
//                 setIsNoCreditsDialogOpen(false); // Close this dialog
//                 // Trigger BuyCreditsDialog - this part is tricky to do from inside AlertDialogAction
//                 // We might need a separate button in the UI or use a ref to trigger BuyCreditsDialog.
//                 toast({ title: "Tip:", description: "Find the 'Buy Credits' button in your profile or main menu." });
//               }}>
//                 Go to Buy Credits
//               </Button>
//             </DialogClose>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>

//     </div>
//   );
// }
    