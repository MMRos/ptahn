#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ptahn Native Vision Worker (Zero External Apps)
Inspects real pixels using PyTorch + Transformers BLIP on local GPU (RTX 5060 Ti).
"""

import sys
import os
import json
import argparse
import base64
import io
import re

def parse_args():
    parser = argparse.ArgumentParser(description="Ptahn Native Visual Classifier")
    parser.add_argument("--image_path", type=str, default="", help="Absolute path to image file")
    parser.add_argument("--image_base64", type=str, default="", help="Base64 encoded image string")
    parser.add_argument("--entity_title", type=str, default="", help="Character or location name")
    return parser.parse_args()

def clean_tags(tags_list):
    seen = set()
    cleaned = []
    for t in tags_list:
        t = t.strip().lower()
        t = re.sub(r'^(the\s+|a\s+|an\s+)', '', t)
        if t and t not in seen and len(t) > 1:
            seen.add(t)
            cleaned.append(t)
    return cleaned

def main():
    args = parse_args()

    image_source = None
    if args.image_path and os.path.exists(args.image_path):
        image_source = args.image_path
    elif args.image_base64:
        image_source = args.image_base64

    if not image_source:
        print(json.dumps({"success": False, "error": "No valid image path or base64 data provided"}))
        sys.exit(1)

    try:
        import torch
        from PIL import Image
        from transformers import BlipProcessor, BlipForConditionalGeneration

        device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Load local cached BLIP model
        model_id = "Salesforce/blip-image-captioning-base"
        processor = BlipProcessor.from_pretrained(model_id)
        model = BlipForConditionalGeneration.from_pretrained(model_id).to(device)

        if os.path.isfile(image_source):
            raw_image = Image.open(image_source).convert("RGB")
        else:
            # Decode base64
            b64_data = re.sub(r'^data:image\/[a-zA-Z]+;base64,', '', image_source)
            raw_image = Image.open(io.BytesIO(base64.b64decode(b64_data))).convert("RGB")

        # 1. Unconditional visual scene description
        inputs = processor(raw_image, return_tensors="pt").to(device)
        out = model.generate(**inputs, max_new_tokens=50)
        scene_caption = processor.decode(out[0], skip_special_tokens=True).strip()

        # 2. Targeted Visual Probing (clothing, anatomy, pose)
        prompts = [
            ("clothing", "the clothing worn is"),
            ("state", "the character is"),
            ("features", "the visual features are")
        ]

        probing_results = {}
        for key, p in prompts:
            inp = processor(raw_image, text=p, return_tensors="pt").to(device)
            gen = model.generate(**inp, max_new_tokens=40)
            probing_results[key] = processor.decode(gen[0], skip_special_tokens=True).strip()

        # 3. Extract precise tags based on factual visual detections
        extracted_tags = []
        combined_desc = f"{scene_caption} {probing_results.get('clothing', '')} {probing_results.get('state', '')} {probing_results.get('features', '')}".lower()

        # Clothing / Nudity factual recognition
        if "naked" in combined_desc or "nude" in combined_desc or "bare" in combined_desc:
            extracted_tags.append("nude")
            if "breasts" in combined_desc or "boo" in combined_desc:
                extracted_tags.append("large breasts")
        elif "bikini" in combined_desc or "swimsuit" in combined_desc:
            extracted_tags.append("bikini")
        elif "underwear" in combined_desc or "panties" in combined_desc or "bra" in combined_desc or "lingerie" in combined_desc:
            extracted_tags.append("underwear")
        elif "school uniform" in combined_desc or "uniform" in combined_desc:
            extracted_tags.append("school uniform")
        elif "dress" in combined_desc:
            extracted_tags.append("dress")
        elif "jacket" in combined_desc or "coat" in combined_desc or "hoodie" in combined_desc:
            extracted_tags.append("hoodie")
        elif "sweater" in combined_desc:
            extracted_tags.append("sweater")

        # Distinct anatomical / fantasy features
        if "cat girl" in combined_desc or "cat ears" in combined_desc or "tail" in combined_desc:
            extracted_tags.append("cat girl")
            extracted_tags.append("tail")
        if "wings" in combined_desc or "bat wings" in combined_desc or "devil" in combined_desc or "succubus" in combined_desc:
            extracted_tags.append("succubus wings")
        if "horns" in combined_desc:
            extracted_tags.append("horns")
        if "red hair" in combined_desc:
            extracted_tags.append("red hair")

        # Pose / Action factual recognition
        if "sitting" in combined_desc:
            extracted_tags.append("sitting")
        elif "kneeling" in combined_desc or "all fours" in combined_desc:
            extracted_tags.append("kneeling")
        elif "lying" in combined_desc or "bed" in combined_desc:
            extracted_tags.append("lying down")
        elif "standing" in combined_desc:
            extracted_tags.append("standing")

        # Emotion / Expression
        if "smiling" in combined_desc or "happy" in combined_desc:
            extracted_tags.append("smiling")
        elif "blushing" in combined_desc or "shy" in combined_desc:
            extracted_tags.append("blushing")
        elif "crying" in combined_desc:
            extracted_tags.append("crying")
        elif "angry" in combined_desc:
            extracted_tags.append("angry")

        final_tags = clean_tags(extracted_tags)
        if not final_tags:
            # Fallback to key words from visual caption
            final_tags = clean_tags(scene_caption.split())[:5]

        output = {
            "success": True,
            "caption": scene_caption,
            "probing": probing_results,
            "tags": ", ".join(final_tags)
        }
        print(json.dumps(output))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
