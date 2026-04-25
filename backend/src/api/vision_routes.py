# backend/src/api/vision_routes.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from src.vision.architecture_parser import ArchitectureParser
import tempfile
from pathlib import Path

router = APIRouter(prefix="/api/vision", tags=["vision"])
parser = ArchitectureParser()

@router.post("/to-code")
async def image_to_code(file: UploadFile = File(...), image_type: str = "diagram"):
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    try:
        spec = await parser.parse_image(tmp_path, image_type)
        prompt = await parser.generate_implementation(spec)
        # Return prompt that frontend can send to the generation pipeline
        return {"spec": spec, "generation_prompt": prompt}
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        Path(tmp_path).unlink(missing_ok=True)
