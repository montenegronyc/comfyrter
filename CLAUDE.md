I need you to build a modern web application that converts natural language descriptions into ComfyUI workflow JSON files. Here are the detailed requirements:

## Core Functionality
1. **Input**: Accept natural language descriptions of desired image generation workflows (e.g., "Generate a fantasy landscape with a castle, then upscale it 2x and add film grain")
2. **Processing**: Parse the description and construct a valid ComfyUI workflow graph using all available node types including:
   - Basic nodes (KSampler, VAE Decode/Encode, LoadCheckpoint, etc.)
   - Image operations (upscaling, color correction, compositing)
   - ControlNet nodes
   - Custom nodes for effects and processing
   - LoRA loaders and model mixing
3. **Output**: 
   - Generate a valid ComfyUI JSON workflow file
   - Display a step-by-step text explanation of the workflow
   - Provide a download button for the JSON file

## Technical Requirements
- **Framework**: Use Next.js 14+ with App Router for Vercel deployment
- **Styling**: Implement a clean, modern UI using Tailwind CSS with:
  - Dark mode support
  - Responsive design
  - Clear visual hierarchy
  - Professional typography
- **State Management**: Use React hooks for local state
- **File Generation**: Implement client-side JSON file generation and download

## UI/UX Specifications
- **Layout**:
  - Header with app name and brief description
  - Large textarea for natural language input with placeholder examples
  - "Generate Workflow" button (primary CTA)
  - Results section showing:
    - Workflow explanation in readable steps
    - JSON preview (collapsible)
    - Download button
  - Example prompts section for user guidance

## Implementation Details
1. Create a comprehensive node mapping system that understands ComfyUI's node types and their connections
2. Implement natural language parsing logic that can identify:
   - Model requirements (checkpoints, LoRAs)
   - Generation parameters (steps, CFG, samplers)
   - Post-processing operations
   - Chaining operations in correct order
3. Build a workflow constructor that:
   - Creates unique node IDs
   - Properly connects inputs/outputs
   - Sets appropriate default values
   - Validates the workflow structure

## Code Structure