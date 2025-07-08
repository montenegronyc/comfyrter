import { WorkflowGenerator } from '@/components/workflow-generator'
import { ThemeToggle } from '@/components/theme-toggle'
import { Wand2 } from 'lucide-react'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section with Splash Image */}
      <div className="relative overflow-hidden">
        {/* Floating Theme Toggle */}
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background"></div>
        <Image 
          src="/comfyrter_image_v01.png" 
          alt="Comfyrter Hero" 
          width={1920}
          height={600}
          priority
          className="w-full h-[400px] sm:h-[500px] lg:h-[600px] object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="mb-4 text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight drop-shadow-2xl">
              Comfyrter
            </h1>
            <p className="text-xl sm:text-2xl lg:text-3xl font-medium drop-shadow-lg">
              Generate ComfyUI Workflows with Natural Language
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto max-w-6xl px-4 py-8">
        {/* Description Section */}
        <div className="mb-12 text-center">
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Transform your creative ideas into ComfyUI workflow JSON files. 
            Simply describe what features and attributes you want, and we&apos;ll generate the complete workflow for you.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Wand2 className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold">Natural Language Processing</h3>
            <p className="text-sm text-muted-foreground">
              Describe your workflow in plain English. Our parser understands models, parameters, effects, and more.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="mb-2 font-semibold">Comprehensive Node Support</h3>
            <p className="text-sm text-muted-foreground">
              Supports all major ComfyUI nodes including samplers, LoRAs, ControlNet, upscaling, and effects.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="mb-2 font-semibold">Ready-to-Use JSON</h3>
            <p className="text-sm text-muted-foreground">
              Download perfectly formatted ComfyUI workflow JSON files ready for immediate import and use.
            </p>
          </div>
        </div>

        {/* Workflow Generator */}
        <WorkflowGenerator />
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-8">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="rounded bg-primary p-1">
                <Wand2 className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium">Comfyrter</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a
                href="https://github.com/comfyanonymous/ComfyUI"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                ComfyUI Documentation
              </a>
              <a
                href="https://leetowndrow.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                leetowndrow.com
              </a>
              <a
                href="https://github.com/montenegronyc"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Built by montenegronyc
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}