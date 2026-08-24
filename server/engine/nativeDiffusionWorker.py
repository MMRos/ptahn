#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ptahn Native Diffusion Worker (Zero External Apps)
Executes local text-to-image inference from .safetensors checkpoints via PyTorch & Diffusers.
"""

import sys
import os
import json
import argparse
import base64
import time

def parse_args():
    parser = argparse.ArgumentParser(description="Ptahn Native Diffusion Image Generator")
    parser.add_argument("--prompt", type=str, required=True, help="Image generation prompt")
    parser.add_argument("--negative_prompt", type=str, default="blurry, low quality, deformed, distorted, text, watermark, bad anatomy", help="Negative prompt")
    parser.add_argument("--model_path", type=str, required=True, help="Absolute path to .safetensors checkpoint")
    parser.add_argument("--output_path", type=str, required=True, help="Path where generated PNG should be saved")
    parser.add_argument("--width", type=int, default=512, help="Image width in pixels")
    parser.add_argument("--height", type=int, default=768, help="Image height in pixels")
    parser.add_argument("--steps", type=int, default=25, help="Number of inference steps")
    parser.add_argument("--cfg_scale", type=float, default=7.0, help="Guidance scale / CFG")
    parser.add_argument("--seed", type=int, default=-1, help="RNG seed (-1 for random)")
    return parser.parse_args()

def main():
    args = parse_args()
    
    if not os.path.exists(args.model_path):
        error_res = {
            "success": False,
            "error": f"Model file not found at: {args.model_path}"
        }
        print(json.dumps(error_res))
        sys.exit(1)

    os.makedirs(os.path.dirname(os.path.abspath(args.output_path)), exist_ok=True)

    try:
        import torch
        from diffusers import AutoPipelineForText2Image, StableDiffusionXLPipeline, StableDiffusionPipeline, DPMSolverMultistepScheduler

        device = "cuda" if torch.cuda.is_available() else "cpu"
        torch_dtype = torch.float16 if device == "cuda" else torch.float32

        # Configure deterministic or random seed
        if args.seed is None or args.seed < 0:
            generator_seed = int(time.time() * 1000) % (2**32)
        else:
            generator_seed = args.seed
        generator = torch.Generator(device=device).manual_seed(generator_seed)

        file_size_mb = os.path.getsize(args.model_path) / (1024 * 1024)
        if file_size_mb < 800:
            error_res = {
                "success": False,
                "error": f"Selected file '{os.path.basename(args.model_path)}' ({file_size_mb:.1f} MB) is too small to be a standalone base checkpoint. It appears to be a LoRA adapter or embedding. Please select a full checkpoint (.safetensors >= 2 GB, such as v6.safetensors or malaAnimeMixNSFW)."
            }
            print(json.dumps(error_res))
            sys.exit(1)

        # Load pipeline from .safetensors single file
        pipe = None
        load_errors = []

        # Attempt 1: StableDiffusionXLPipeline (SDXL models like v6, Animagine, Illustrious)
        try:
            pipe = StableDiffusionXLPipeline.from_single_file(
                args.model_path,
                torch_dtype=torch_dtype,
                use_safetensors=True
            )
        except Exception as e1:
            load_errors.append(f"SDXL: {str(e1)}")
            
            # Attempt 2: StableDiffusionPipeline (SD 1.5 fallback)
            try:
                pipe = StableDiffusionPipeline.from_single_file(
                    args.model_path,
                    torch_dtype=torch_dtype,
                    use_safetensors=True,
                    safety_checker=None
                )
            except Exception as e2:
                load_errors.append(f"SD15: {str(e2)}")
                raise RuntimeError(f"Failed to load checkpoint: {' | '.join(load_errors)}")

        # Configure fast high-quality scheduler
        try:
            pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True)
        except Exception:
            pass

        # VRAM & GPU Optimizations
        if device == "cuda":
            try:
                pipe.enable_model_cpu_offload()
            except Exception:
                pipe.to("cuda")
            
            try:
                if hasattr(pipe.vae, "enable_tiling"):
                    pipe.vae.enable_tiling()
                elif hasattr(pipe, "enable_vae_tiling"):
                    pipe.enable_vae_tiling()
            except Exception:
                pass

            try:
                if hasattr(pipe.vae, "enable_slicing"):
                    pipe.vae.enable_slicing()
                elif hasattr(pipe, "enable_vae_slicing"):
                    pipe.enable_vae_slicing()
            except Exception:
                pass
        else:
            pipe.to("cpu")

        # Execute Text-to-Image Generation
        result = pipe(
            prompt=args.prompt,
            negative_prompt=args.negative_prompt,
            width=args.width,
            height=args.height,
            num_inference_steps=args.steps,
            guidance_scale=args.cfg_scale,
            generator=generator
        )

        image = result.images[0]
        image.save(args.output_path, "PNG")

        # Read back as base64 data URI
        with open(args.output_path, "rb") as f:
            b64_data = base64.b64encode(f.read()).decode("utf-8")
        data_uri = f"data:image/png;base64,{b64_data}"

        response = {
            "success": True,
            "output_path": args.output_path,
            "filename": os.path.basename(args.output_path),
            "device": device,
            "model": os.path.basename(args.model_path),
            "seed": generator_seed,
            "base64": data_uri
        }
        print(json.dumps(response))
        sys.exit(0)

    except Exception as e:
        error_res = {
            "success": False,
            "error": f"[Native Diffusion Error]: {str(e)}"
        }
        print(json.dumps(error_res))
        sys.exit(1)

if __name__ == "__main__":
    main()
