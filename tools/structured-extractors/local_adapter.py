#!/usr/bin/env python3
"""EverythingAI Phase 12.4 benchmark-only local structured extractor adapter."""

from __future__ import annotations

import argparse
import csv
import hashlib
import importlib.metadata
import io
import json
import os
from pathlib import Path
import resource
import subprocess
import sys
import time

PROCESS_START = time.perf_counter()


def fail(code: str, message: str) -> None:
    sys.stderr.write(json.dumps({"error": {"code": code, "message": message}}) + "\n")
    raise SystemExit(2)


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail("RUNTIME_LOCK_INVALID", str(exc))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return "sha256:" + digest.hexdigest()


def verify_source_fingerprint(request: dict) -> Path:
    source = Path(request["file"]["source_path"]).resolve(strict=True)
    stat = source.stat()
    expected = request["file"]["source_fingerprint"]

    if source.is_file() is False:
        fail("SOURCE_NOT_FILE", str(source))
    if int(stat.st_size) != int(expected["size_bytes"]):
        fail("SOURCE_FINGERPRINT_MISMATCH", "size changed after benchmark authorization")
    if sha256_file(source) != expected["hash"]:
        fail("SOURCE_FINGERPRINT_MISMATCH", "hash changed after benchmark authorization")

    observed_mtime_ms = stat.st_mtime * 1000
    if abs(observed_mtime_ms - float(expected["mtime_ms"])) > 2.0:
        fail("SOURCE_FINGERPRINT_MISMATCH", "mtime changed after benchmark authorization")

    return source


def require_model_marker(candidate: dict) -> None:
    expected = sorted(
        f'{item["name"]}@{item["revision"]}'
        for item in candidate.get("models", [])
    )
    roots = []
    for env_name in candidate["runtime"].get("required_environment", []):
        raw = os.environ.get(env_name)
        if not raw:
            fail("REQUIRED_ENV_MISSING", env_name)
        roots.append(Path(raw).resolve())

    matched = False
    for root in roots:
        marker = root / ".everythingai-phase12-model-lock.json"
        if not marker.is_file():
            continue
        try:
            observed = sorted(load_json(marker).get("model_revisions", []))
        except Exception:
            continue
        if observed == expected:
            matched = True
            break

    if not matched:
        fail(
            "MODEL_LOCK_MARKER_MISSING",
            "Exact Phase 12 model revision marker is required before execution.",
        )


def peak_rss_mb() -> float:
    own = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    children = resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss
    value = max(own, children)
    if sys.platform == "darwin":
        return round(value / (1024 * 1024), 2)
    return round(value / 1024, 2)


def tesseract_version() -> str:
    result = subprocess.run(
        ["tesseract", "--version"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        timeout=10,
        shell=False,
    )
    first = result.stdout.splitlines()[0].strip()
    parts = first.split()
    return parts[1] if len(parts) >= 2 else ""


def block_type(label: str) -> str:
    mapping = {
        "title": "heading",
        "section_header": "heading",
        "text": "paragraph",
        "paragraph": "paragraph",
        "list_item": "list_item",
        "caption": "caption",
        "page_header": "header",
        "page_footer": "footer",
        "footnote": "footnote",
    }
    return mapping.get((label or "").lower(), "paragraph")


def make_page(block_ids: list[str]) -> dict:
    return {
        "page_id": "page-1",
        "page_number": 1,
        "width": None,
        "height": None,
        "unit": None,
        "rotation": 0,
        "native_text_available": False,
        "native_text_character_count": 0,
        "ocr_used": True,
        "ocr_reason": "phase12_fixed_scan_benchmark",
        "block_ids": block_ids,
        "evidence_mode": "ocr",
    }


def extraction_base(
    request: dict,
    candidate: dict,
    provider: str,
    model: str,
    blocks: list[dict],
    plain_text: str,
) -> dict:
    configuration_contract = {
        "candidate_id": candidate["candidate_id"],
        "models": candidate.get("models", []),
        "case": request["file"]["file_id"],
    }
    configuration_hash = hashlib.sha256(
        json.dumps(configuration_contract, sort_keys=True).encode("utf-8")
    ).hexdigest()[:24]

    return {
        "schema_version": "1.0",
        "file_id": request["file"]["file_id"],
        "source_path": request["file"]["source_path"],
        "source_fingerprint": request["file"]["source_fingerprint"],
        "mime_type": request["file"].get("mime_type"),
        "extractor": {
            "id": request["adapter"]["id"],
            "version": request["adapter"]["version"],
            "provider": provider,
            "model": model,
            "configuration_hash": configuration_hash,
            "local": True,
        },
        "extraction_mode": "ocr",
        "extracted_at": None,
        "status": "success",
        "pages": [make_page([item["block_id"] for item in blocks])],
        "blocks": blocks,
        "tables": [],
        "figures": [],
        "warnings": [],
        "plain_text": plain_text,
        "filesystem_mutation_allowed": False,
        "execution_allowed": False,
        "automatic_approval_allowed": False,
    }


def sanitized_environment() -> dict[str, str]:
    denied = {
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "ALL_PROXY",
        "http_proxy",
        "https_proxy",
        "all_proxy",
    }
    return {key: value for key, value in os.environ.items() if key not in denied}


def run_tesseract(request: dict, candidate: dict, source: Path) -> tuple[dict, str, float]:
    actual = tesseract_version()
    expected = candidate["software"]["version"]
    if actual != expected:
        fail("SOFTWARE_VERSION_MISMATCH", f"expected={expected};actual={actual}")

    started = time.perf_counter()
    completed = subprocess.run(
        [
            "tesseract",
            str(source),
            "stdout",
            "-l",
            "eng",
            "--psm",
            "6",
            "tsv",
        ],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=90,
        shell=False,
        env=sanitized_environment(),
    )
    if completed.returncode != 0:
        fail("TESSERACT_FAILED", completed.stderr[:500])

    rows = csv.DictReader(io.StringIO(completed.stdout), delimiter="\t")
    lines: dict[tuple[str, str, str, str], list[dict]] = {}
    for row in rows:
        text = (row.get("text") or "").strip()
        if not text:
            continue
        key = (
            row.get("page_num") or "1",
            row.get("block_num") or "0",
            row.get("par_num") or "0",
            row.get("line_num") or "0",
        )
        lines.setdefault(key, []).append(row)

    blocks = []
    for _, words in sorted(lines.items()):
        text = " ".join((word.get("text") or "").strip() for word in words).strip()
        if not text:
            continue

        confidences = []
        for word in words:
            try:
                confidence_value = float(word.get("conf") or "-1")
            except ValueError:
                continue
            if confidence_value >= 0:
                confidences.append(confidence_value)

        confidence = None
        if confidences:
            confidence = {
                "value": round(sum(confidences) / len(confidences), 2),
                "scale": "0_100",
                "source": "tesseract_tsv",
            }

        index = len(blocks) + 1
        blocks.append(
            {
                "block_id": f"block-{index}",
                "page_id": "page-1",
                "block_type": "paragraph",
                "reading_order": index - 1,
                "bbox": None,
                "text": text,
                "evidence_mode": "ocr",
                "confidence": confidence,
                "native_object_ref": None,
                "parent_block_id": None,
                "child_block_ids": [],
            }
        )

    plain_text = "\n".join(item["text"] for item in blocks)
    model = f'tessdata_best-eng@{candidate["models"][0]["revision"]}'
    extraction = extraction_base(
        request,
        candidate,
        "tesseract-ocr",
        model,
        blocks,
        plain_text,
    )
    return extraction, actual, (time.perf_counter() - started) * 1000


def docling_stream_from_source(source: Path):
    from PIL import Image
    from docling.datamodel.base_models import DocumentStream

    buffer = io.BytesIO()
    with Image.open(source) as image:
        image.convert("RGB").save(buffer, format="PNG")
    buffer.seek(0)
    return DocumentStream(name="phase12-ocr-scan.png", stream=buffer)


def run_docling(
    request: dict,
    candidate: dict,
    source: Path,
) -> tuple[dict, str, float, float]:
    expected = candidate["software"]["version"]
    actual = importlib.metadata.version("docling")
    if actual != expected:
        fail("SOFTWARE_VERSION_MISMATCH", f"expected={expected};actual={actual}")

    tess_actual = tesseract_version()
    if tess_actual != "5.5.3":
        fail("TESSERACT_VERSION_MISMATCH", f"expected=5.5.3;actual={tess_actual}")

    import_ready = time.perf_counter()

    from docling.datamodel.accelerator_options import (
        AcceleratorDevice,
        AcceleratorOptions,
    )
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import (
        OcrMode,
        PdfPipelineOptions,
        TesseractCliOcrOptions,
    )
    from docling.document_converter import DocumentConverter, ImageFormatOption

    options = PdfPipelineOptions(
        artifacts_path=Path(os.environ["DOCLING_ARTIFACTS_PATH"]),
        do_ocr=True,
        do_table_structure=False,
        enable_remote_services=False,
        allow_external_plugins=False,
        accelerator_options=AcceleratorOptions(
            device=AcceleratorDevice.CPU,
            num_threads=max(1, min(4, os.cpu_count() or 1)),
        ),
    )
    options.ocr_options = TesseractCliOcrOptions(
        lang=["eng"],
        mode=OcrMode.FULL_PAGE,
    )

    converter = DocumentConverter(
        allowed_formats=[InputFormat.IMAGE],
        format_options={
            InputFormat.IMAGE: ImageFormatOption(pipeline_options=options),
        },
    )

    started = time.perf_counter()
    result = converter.convert(
        docling_stream_from_source(source),
        max_num_pages=1,
        max_file_size=25 * 1024 * 1024,
    )
    document = result.document

    blocks = []
    for item in getattr(document, "texts", []) or []:
        provenance = getattr(item, "prov", []) or []
        if provenance and getattr(provenance[0], "page_no", 1) != 1:
            continue

        text = str(getattr(item, "text", "") or "").strip()
        if not text:
            continue

        label_value = getattr(getattr(item, "label", None), "value", None)
        if label_value is None:
            label_value = str(getattr(item, "label", "text"))

        index = len(blocks) + 1
        blocks.append(
            {
                "block_id": f"block-{index}",
                "page_id": "page-1",
                "block_type": block_type(label_value),
                "reading_order": index - 1,
                "bbox": None,
                "text": text,
                "evidence_mode": "ocr",
                "confidence": None,
                "native_object_ref": str(getattr(item, "self_ref", "")) or None,
                "parent_block_id": None,
                "child_block_ids": [],
            }
        )

    plain_text = str(document.export_to_markdown() or "").strip()
    if not plain_text:
        plain_text = "\n".join(item["text"] for item in blocks)

    model = "+".join(
        f'{item["name"]}@{item["revision"]}'
        for item in candidate.get("models", [])
    )
    extraction = extraction_base(
        request,
        candidate,
        "docling-project",
        model,
        blocks,
        plain_text,
    )
    runtime_ms = (time.perf_counter() - started) * 1000
    cold_start_ms = (import_ready - PROCESS_START) * 1000
    return extraction, actual, runtime_ms, cold_start_ms


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate", choices=["docling", "tesseract"], required=True)
    parser.add_argument("--runtime-lock", required=True)
    args = parser.parse_args()

    lock = load_json(Path(args.runtime_lock).resolve(strict=True))
    candidate = lock["candidates"][args.candidate]
    require_model_marker(candidate)

    try:
        request = json.loads(sys.stdin.read())
    except Exception as exc:
        fail("REQUEST_JSON_INVALID", str(exc))

    if request.get("local_only") is not True:
        fail("UNSAFE_REQUEST_AUTHORITY", "local_only=true is required")
    if request.get("remote_processing_allowed") is not False:
        fail("UNSAFE_REQUEST_AUTHORITY", "remote processing is forbidden")
    if request.get("read_only") is not True:
        fail("UNSAFE_REQUEST_AUTHORITY", "read_only=true is required")
    if request.get("filesystem_mutation_allowed") is not False:
        fail("UNSAFE_REQUEST_AUTHORITY", "filesystem mutation is forbidden")
    if request.get("execution_allowed") is not False:
        fail("UNSAFE_REQUEST_AUTHORITY", "application execution authority is forbidden")
    if request.get("automatic_approval_allowed") is not False:
        fail("UNSAFE_REQUEST_AUTHORITY", "automatic approval is forbidden")

    source = verify_source_fingerprint(request)
    cold_start_ms = (time.perf_counter() - PROCESS_START) * 1000

    try:
        if args.candidate == "tesseract":
            extraction, actual_version, runtime_ms = run_tesseract(
                request,
                candidate,
                source,
            )
        else:
            extraction, actual_version, runtime_ms, cold_start_ms = run_docling(
                request,
                candidate,
                source,
            )
    except subprocess.TimeoutExpired:
        fail("EXTRACTOR_TIMEOUT", "local extractor exceeded adapter timeout")
    except ModuleNotFoundError as exc:
        fail("DEPENDENCY_MISSING", str(exc))
    except Exception as exc:
        fail("EXTRACTOR_FAILED", str(exc))

    response = {
        "protocol_version": request["protocol_version"],
        "request_id": request["request_id"],
        "status": "ok",
        "adapter": request["adapter"],
        "extraction": extraction,
        "runtime_identity": {
            "candidate_id": candidate["candidate_id"],
            "software_version": actual_version,
            "model_revisions": sorted(
                f'{item["name"]}@{item["revision"]}'
                for item in candidate.get("models", [])
            ),
        },
        "benchmark_telemetry": {
            "runtime_ms": round(runtime_ms, 2),
            "peak_rss_mb": peak_rss_mb(),
            "cold_start_ms": round(cold_start_ms, 2),
        },
    }
    sys.stdout.write(json.dumps(response, separators=(",", ":"), sort_keys=True))


if __name__ == "__main__":
    main()
