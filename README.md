# Comfyrter - Natural Language to ComfyUI Workflow Generator

> Problem: It's hard to know what specific combination of ComfyUI nodes will play well together.
> Solution: This tool transforms your natural language requirements into ComfyUI workflow JSON files and workflow instructions.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/montenegronyc/comfyrter)
[![CI](https://github.com/montenegronyc/comfyrter/workflows/CI/badge.svg)](https://github.com/montenegronyc/comfyrter/actions)

## ✨ Features

- **🗣️ Natural Language Processing** - Describe workflows in plain English
- **🎯 Comprehensive Node Support** - Supports all major ComfyUI nodes including:
  - Samplers (KSampler, KSamplerAdvanced)
  - Model Loading (Checkpoints, LoRAs, VAE)
  - Image Processing (Upscaling, Effects, Blending)
  - ControlNet integration
  - Text encoding and conditioning
- **🌙 Dark Mode Support** - Beautiful UI that adapts to your preference
- **📱 Mobile Responsive** - Works perfectly on all devices
- **⚡ Instant Generation** - Fast workflow creation with real-time validation
- **💾 Easy Export** - One-click download of ComfyUI-ready JSON files
- **🎨 Modern UI** - Clean, intuitive interface built with Next.js 15 and Tailwind CSS

## 🚀 Quick Start

### Online (Recommended)

Visit [comfyrter.vercel.app](https://comfyrter.vercel.app) and start generating workflows immediately!

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/montenegronyc/comfyrter.git
   cd comfyrter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage Examples

### Basic Generation
```
Generate a fantasy landscape with a castle using euler sampler with 25 steps
```

### Advanced Workflows
```
Create a cyberpunk portrait at 768x768 resolution with cfg 7.5, then apply LoRA: cyberpunk_style.safetensors at strength 0.8, then upscale 2x using AI model and add film grain
```

### ControlNet Integration
```
Generate a character pose using ControlNet openpose guidance, then apply vintage effect with 50% opacity
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── workflow-generator.tsx
│   └── theme-toggle.tsx
├── lib/                  # Core libraries
│   ├── types.ts          # TypeScript types
│   ├── node-definitions.ts  # ComfyUI node mappings
│   ├── workflow-parser.ts   # Natural language parser
│   ├── workflow-constructor.ts  # JSON generator
│   └── utils.ts          # Utility functions
└── hooks/                # Custom React hooks
    └── use-theme.ts      # Theme management
```

## 🏗️ Architecture

### Core Components

1. **Natural Language Parser** (`workflow-parser.ts`)
   - Extracts parameters like models, steps, CFG, samplers
   - Identifies operations (generation, upscaling, effects)
   - Parses complex multi-step workflows

2. **Node Definition System** (`node-definitions.ts`)
   - Comprehensive ComfyUI node mappings
   - Input/output validation
   - Keyword-based node discovery

3. **Workflow Constructor** (`workflow-constructor.ts`)
   - Builds valid ComfyUI JSON workflows
   - Handles node connections and dependencies
   - Generates human-readable explanations

### Supported Operations

- **Image Generation** - Various samplers, schedulers, and parameters
- **Model Loading** - Checkpoints, LoRAs, VAE models
- **Upscaling** - Both latent and AI model-based upscaling
- **Effects** - Blending, filters, color correction
- **ControlNet** - Pose, depth, canny edge detection
- **Text Processing** - Positive/negative prompt encoding

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/amazing-feature`
3. Make your changes
4. Run tests: `npm run lint && npm run typecheck`
5. Commit your changes: `git commit -m 'feat: add amazing feature'`
6. Push to the branch: `git push origin feat/amazing-feature`
7. Open a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) - The amazing stable diffusion interface
- [Next.js](https://nextjs.org/) - The React framework for production
- [Tailwind CSS](https://tailwindcss.com/) - For beautiful, responsive styling
- [Lucide React](https://lucide.dev/) - For clean, consistent icons

## 🔗 Links

- **Live Demo**: [comfyrter.vercel.app](https://comfyrter.vercel.app)
- **GitHub**: [github.com/montenegronyc/comfyrter](https://github.com/montenegronyc/comfyrter)
- **ComfyUI Documentation**: [github.com/comfyanonymous/ComfyUI](https://github.com/comfyanonymous/ComfyUI)

---

Built with ❤️ by [montenegronyc](https://github.com/montenegronyc)
