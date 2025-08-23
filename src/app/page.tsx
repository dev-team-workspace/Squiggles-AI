
"use client"; // Required for useState and useEffect

import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles, Lightbulb, ShieldCheck, Wand2, Edit3, Users, Heart, MessageCircle, Mail, ChevronLeft, ChevronRight } from 'lucide-react'; // Added Chevron icons
import Image from 'next/image';
import { AspectRatio } from "@/components/ui/aspect-ratio"; // Added for YouTube embed
import { LogoIcon } from '@/components/icons/logo-icon'; // Import LogoIcon
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { useState, useEffect, useCallback } from 'react'; // Added useState, useEffect, useCallback

// export const metadata: Metadata = { // Cannot export metadata from client component
//   title: 'Squiggles: Turn Doodles into Magical AI Art!',
//   description: "Welcome to Squiggles! Transform your child's imaginative drawings into amazing, realistic art with the power of AI. Fun, safe, and full of wonder. Start creating today!",
//   keywords: ['ai art generator', 'kids drawing app', 'doodle to art', 'ai image transformation', 'creative app for children', 'Squiggles'],
// };

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex flex-col items-center text-center p-6 bg-card rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
      <div className="p-3 mb-4 bg-primary/20 rounded-full text-primary">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}



const firebaseBucketName = "doodlemagic.firebasestorage.app";

const carouselImages = [
  { src: `https://firebasestorage.googleapis.com/v0/b/${firebaseBucketName}/o/mpgallery%2Fcarousel_image_1.png?alt=media&token=f8d4cc39-28c9-4ddd-85b6-c4a1bdc40c56`, alt: 'Squiggle Transformation Example 1', dataAiHint: 'doodle art' },
  { src: `https://firebasestorage.googleapis.com/v0/b/${firebaseBucketName}/o/mpgallery%2Fcarousel_image_2.png?alt=media&token=8933daf9-b3c3-4b93-ad36-7392ecea8218`, alt: 'Squiggle Transformation Example 2', dataAiHint: 'childs art' },
  { src: `https://firebasestorage.googleapis.com/v0/b/${firebaseBucketName}/o/mpgallery%2Fcarousel_image_3.png?alt=media&token=cb8d532e-d970-400a-aaa3-1d9f77460478`, alt: 'Squiggle Transformation Example 3', dataAiHint: 'creative ai' },
  { src: `https://firebasestorage.googleapis.com/v0/b/${firebaseBucketName}/o/mpgallery%2Fcarousel_image_4.png?alt=media&token=6434b616-8578-4e5f-a857-a2b87cbd9730`, alt: 'Squiggle Transformation Example 4', dataAiHint: 'fantasy drawing' },
  { src: `https://firebasestorage.googleapis.com/v0/b/${firebaseBucketName}/o/mpgallery%2Fcarousel_image_5.png?alt=media&token=1a5c8141-2816-451e-924e-52399a06b0d5`, alt: 'Squiggle Transformation Example 5', dataAiHint: 'fantasy drawing' },
];

export default function LandingPage() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % carouselImages.length);
  }, []);

  const prevImage = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + carouselImages.length) % carouselImages.length);
  };

  useEffect(() => {
    const timer = setTimeout(nextImage, 5000); 
    return () => clearTimeout(timer); 
  }, [currentIndex, nextImage]);


  return (
    <div className="flex flex-col items-center justify-center min-h-full text-center">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-16 lg:py-20 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_550px]"> {/* Adjusted grid and gap for better spacing */}
            <div className="flex flex-col justify-center space-y-4 text-center lg:text-left">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter xs:text-4xl sm:text-5xl md:text-6xl text-primary flex items-center justify-center lg:justify-start gap-2"> {/* Adjusted font sizes */}
                  <LogoIcon className="h-8 w-8 xs:h-10 xs:w-10 md:h-12 md:w-12 inline-block" />
                  Squiggles
                </h1>
                <p className="text-xl md:text-2xl font-semibold text-foreground"> {/* Adjusted font sizes */}
                  Where Your Doodles Dance to Life!
                </p>
                <p className="max-w-[600px] text-muted-foreground text-sm xs:text-base md:text-lg/relaxed mx-auto lg:mx-0"> 
                  Transform your child's imaginative drawings into magical, realistic art with the power of AI. Fun, safe, and full of wonder!
                </p>
              </div>
              <div className="flex flex-col gap-3 min-[450px]:flex-row justify-center lg:justify-start">
                <Button asChild size="lg" className="text-base xs:text-lg px-6 xs:px-8 py-3 xs:py-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 bg-accent hover:bg-accent/90 text-accent-foreground">
                   <Link href="/draw">Start Drawing Now!</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-base xs:text-lg px-6 xs:px-8 py-3 xs:py-4 rounded-full transform hover:scale-105 transition-all duration-200">
                   <Link href="/public-gallery">Explore Public Gallery</Link>
                </Button>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-md sm:max-w-lg lg:max-w-none aspect-video overflow-hidden rounded-xl object-cover object-center lg:order-last shadow-2xl border-4 border-primary/30"> {/* Ensured w-full and max-w constraints */}
              {carouselImages.map((image, index) => (
                <div
                  key={image.src + index} // Unique key for each image
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    index === currentIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    style={{ objectFit: 'cover' }} 
                    className="object-center"
                    data-ai-hint={image.dataAiHint}
                    priority={index === 0} 
                  />
                </div>
              ))}
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-1 top-1/2 -translate-y-1/2 transform bg-black/30 hover:bg-black/50 text-white rounded-full h-8 w-8 sm:h-10 sm:w-10" // Adjusted size
                onClick={prevImage}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" /> {/* Adjusted icon size */}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 transform bg-black/30 hover:bg-black/50 text-white rounded-full h-8 w-8 sm:h-10 sm:w-10" // Adjusted size
                onClick={nextImage}
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" /> {/* Adjusted icon size */}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="w-full py-12 md:py-16 lg:py-20 bg-background"> {/* Adjusted padding */}
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-10 md:mb-12"> {/* Adjusted margin */}
            <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm text-primary font-semibold">How It Works</div>
            <h2 className="text-2xl xs:text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-foreground">Unleash Creativity in 3 Simple Steps</h2> {/* Adjusted font sizes */}
            <p className="max-w-[900px] text-muted-foreground text-sm xs:text-base md:text-lg/relaxed"> {/* Adjusted font sizes */}
              Creating magical art with Squiggles is as easy as 1-2-3!
            </p>
          </div>
          <div className="mx-auto grid items-start gap-6 sm:gap-8 sm:max-w-4xl sm:grid-cols-2 md:gap-10 lg:max-w-5xl lg:grid-cols-3"> {/* Adjusted gap */}
            <FeatureCard
              icon={<Edit3 className="h-8 w-8" />}
              title="1. Doodle Freely"
              description="Let your child's imagination run wild on our simple and intuitive digital canvas. Pick colors, draw shapes, and create anything!"
            />
            <FeatureCard
              icon={<Sparkles className="h-8 w-8" />}
              title="2. AI Magic"
              description="With one click, our smart AI transforms the doodle into a stunning, realistic image, while keeping the original charm."
            />
            <FeatureCard
              icon={<Users className="h-8 w-8" />}
              title="3. Save & Share"
              description="Download your masterpiece, save it to your private gallery, or share it with the world in our public showcase!"
            />
          </div>
        </div>
      </section>

      {/* Features Highlight Section */}
      <section id="features" className="w-full py-12 md:py-16 lg:py-20 bg-primary/5"> {/* Adjusted padding */}
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-10 md:mb-12"> {/* Adjusted margin */}
            <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm text-primary font-semibold">Why Squiggles?</div>
            <h2 className="text-2xl xs:text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-foreground">Packed with Amazing Features</h2> {/* Adjusted font sizes */}
          </div>
          <div className="mx-auto grid max-w-5xl items-center gap-6 md:grid-cols-2 md:gap-10 lg:grid-cols-3"> {/* Adjusted gap */}
            <FeatureCard
              icon={<Wand2 className="h-8 w-8" />}
              title="AI-Powered Transformation"
              description="Watch as simple doodles turn into incredible images with various artistic styles."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-8 w-8" />}
              title="Safe & Kid-Friendly"
              description="A secure environment with content moderation for public sharing, designed for children."
            />
            <FeatureCard
              icon={<Lightbulb className="h-8 w-8" />}
              title="Boosts Creativity"
              description="Encourages artistic expression and shows kids the magic of their own imagination."
            />
          </div>
        </div>
      </section>

      {/* Watch Squiggles in Action Section */}
      <section id="video-guide" className="w-full py-12 md:py-16 lg:py-20 bg-muted/50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-10 md:mb-12">
            <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary font-semibold">Quick Guide</div>
            <h2 className="text-2xl xs:text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-foreground">Watch Squiggles in Action!</h2>
            <p className="max-w-[700px] text-muted-foreground text-sm xs:text-base md:text-lg/relaxed">
              See how easy and fun it is to transform your doodles into amazing AI art with Squiggles.
            </p>
          </div>
          <div className="mx-auto max-w-3xl">
            <AspectRatio ratio={16 / 9} className="rounded-xl overflow-hidden shadow-2xl border-4 border-primary/20">
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0" // Replace dQw4w9WgXcQ with your actual YouTube video ID
                title="Squiggles App Tutorial Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              />
            </AspectRatio>
          </div>
        </div>
      </section>

      {/* About Squiggles Section */}
      <section id="about" className="w-full py-12 md:py-16 lg:py-20 bg-background border-t"> {/* Adjusted padding */}
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-10 md:mb-12"> {/* Adjusted margin */}
            <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm text-primary font-semibold flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Our Story
            </div>
            <h2 className="text-2xl xs:text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-foreground">About Squiggles</h2> {/* Adjusted font sizes */}
          </div>
          <div className="mx-auto max-w-3xl text-left space-y-6 text-muted-foreground text-sm xs:text-base md:text-lg/relaxed"> {/* Adjusted font sizes */}
            <p>
              Hi there! I'm the creator of Squiggles. This whole idea sparked while I was playing with my son. He was making these wonderfully imaginative drawings, and I found myself tinkering with AI tools to see if I could bring them to life in different styles. Watching his face light up when he saw his doodles transformed was priceless!
            </p>
            <p>
              I realized that this joy of co-creating with AI shouldn't require a deep dive into complex tools or coding. Squiggles was born from that thought: a simple, fun, and safe way for kids (and adults!) to engage with the magic of artificial intelligence and see their imagination take new forms.
            </p>
            <p>
              You'll also notice Squiggles uses a "pay-as-you-go" model for AI transformations. Like many of you, I'm not a big fan of endless subscriptions for everything. I wanted to keep things fair and transparent. Unfortunately, running the AI models that power these transformations has real processing costs. If it were free to run, Squiggles would be free to use! This model allows you to only pay for the AI magic you use.
            </p>
            <p className="font-semibold text-foreground">
              Squiggles is a labor of love, and I'm always looking for ways to make it better. If you have any suggestions, ideas for new styles, or just want to share your thoughts, please reach out! Your feedback is incredibly valuable.
            </p>
            <div className="flex justify-center">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg" className="text-base xs:text-lg"> {/* Adjusted font size */}
                    <MessageCircle className="mr-2 h-5 w-5" /> Share Your Feedback
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px]">
                  <DialogHeader>
                    <DialogTitle className="text-center text-primary">Share Your Feedback!</DialogTitle>
                    <DialogDescription className="text-center pt-2">
                      We'd love to hear your thoughts, suggestions, or any ideas you have to make Squiggles even better.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 text-center">
                    <p className="text-muted-foreground">
                      Please send us an email at:
                    </p>
                    <p className="font-semibold text-lg text-foreground mt-1">
                      squiggles.ai@gmail.com
                    </p>
                  </div>
                  <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-center gap-2 pt-2">
                    <Button asChild size="lg" className="w-full sm:w-auto">
                      <Link href="mailto:squiggles.ai@gmail.com?subject=Feedback%20for%20Squiggles">
                        <Mail className="mr-2 h-5 w-5" /> Open Email Client
                      </Link>
                    </Button>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary" size="lg" className="w-full sm:w-auto">
                        Close
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="w-full py-12 md:py-16 lg:py-20 border-t"> {/* Adjusted padding */}
        <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
          <div className="space-y-3">
            <h2 className="text-2xl xs:text-3xl font-bold tracking-tighter md:text-4xl/tight text-foreground">Ready to Squiggle?</h2> {/* Adjusted font sizes */}
            <p className="mx-auto max-w-[600px] text-muted-foreground text-sm xs:text-base md:text-lg/relaxed"> {/* Adjusted font sizes */}
              Join Squiggles today and start a magical journey of art and imagination.
              Your first few transformations are on us!
            </p>
          </div>
          <div className="mx-auto w-full max-w-sm space-y-2">
            <Button asChild size="lg" className="w-full text-base xs:text-lg bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/draw">Create Your First Masterpiece</Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Sign up for free and let the fun begin!
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
