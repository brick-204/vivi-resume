from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path

from PIL import Image, ImageChops, ImageStat


PETS = ("vzai", "xiaoyin")
VZAI_NAMES = {
    "image_base_clean": "body.webp",
    "image_pen_crop": "pen.webp",
}


def encode_webp(raw: bytes) -> bytes:
    output = io.BytesIO()
    with Image.open(io.BytesIO(raw)) as image:
        image.save(output, "WEBP", quality=82, method=6)
    return output.getvalue()


def pet_json_files(lottie_root: Path, pet: str) -> list[Path]:
    source_dir = lottie_root / pet
    files = sorted(source_dir.glob("*.json"))
    if not files:
        raise FileNotFoundError(f"No Lottie JSON files found in {source_dir}")
    return files


def coalesce_image_assets(animation: dict) -> int:
    seen: dict[tuple, str] = {}
    remap: dict[str, str] = {}
    assets = []
    for asset in animation.get("assets", []):
        asset_id = asset.get("id")
        image = asset.get("p")
        if not asset_id or not image:
            assets.append(asset)
            continue
        key = (image, asset.get("u"), asset.get("e"), asset.get("w"), asset.get("h"))
        if key in seen:
            remap[asset_id] = seen[key]
        else:
            seen[key] = asset_id
            assets.append(asset)
    if not remap:
        return 0

    def update_refs(value: object) -> None:
        if isinstance(value, dict):
            if value.get("refId") in remap:
                value["refId"] = remap[value["refId"]]
            for child in value.values():
                update_refs(child)
        elif isinstance(value, list):
            for child in value:
                update_refs(child)

    animation["assets"] = assets
    update_refs(animation)
    return len(remap)


def externalize_pet(pet: str, lottie_root: Path, public_root: Path) -> dict[str, int]:
    output_dir = public_root / pet
    output_dir.mkdir(parents=True, exist_ok=True)
    before = after = coalesced = 0

    for path in pet_json_files(lottie_root, pet):
        before += path.stat().st_size
        animation = json.loads(path.read_text(encoding="utf-8"))
        for asset in animation.get("assets", []):
            uri = asset.get("p", "")
            if asset.get("e") == 0 and uri:
                image_path = output_dir / uri
                if not image_path.is_file():
                    raise FileNotFoundError(f"Missing shared image: {image_path}")
                continue
            if not uri.startswith("data:image"):
                continue
            raw = base64.b64decode(uri.split(",", 1)[1])
            webp = encode_webp(raw)
            filename = VZAI_NAMES.get(asset.get("id")) if pet == "vzai" else None
            filename = filename or f"{hashlib.sha256(webp).hexdigest()[:16]}.webp"
            (output_dir / filename).write_bytes(webp)
            asset["p"] = filename
            asset["u"] = f"pets/{pet}/"
            asset["e"] = 0

        coalesced += coalesce_image_assets(animation)
        serialized = json.dumps(animation, ensure_ascii=False, separators=(",", ":")) + "\n"
        path.write_text(serialized, encoding="utf-8")
        after += len(serialized.encode("utf-8"))

    shared_files = list(output_dir.glob("*.webp"))
    return {
        "json_before": before,
        "json_after": after,
        "shared_webp_bytes": sum(path.stat().st_size for path in shared_files),
        "shared_webp_files": len(shared_files),
        "asset_nodes_removed": coalesced,
    }


def visual_thumbnail(path: Path) -> Image.Image:
    with Image.open(path) as image:
        rgba = image.convert("RGBA").resize((64, 64), Image.Resampling.LANCZOS)
    alpha = rgba.getchannel("A")
    rgb = Image.new("RGB", rgba.size)
    rgb.paste(rgba.convert("RGB"), mask=alpha)
    return Image.merge("RGBA", (*rgb.split(), alpha))


def visual_distance(left: Image.Image, right: Image.Image) -> float:
    means = ImageStat.Stat(ImageChops.difference(left, right)).mean
    return sum(means) / (len(means) * 255)


def referenced_images(pet: str, lottie_root: Path) -> set[str]:
    names: set[str] = set()
    for path in pet_json_files(lottie_root, pet):
        animation = json.loads(path.read_text(encoding="utf-8"))
        names.update(
            asset["p"]
            for asset in animation.get("assets", [])
            if asset.get("e") == 0 and asset.get("p")
        )
    return names


def deduplicate_near_images(
    pet: str,
    lottie_root: Path,
    public_root: Path,
    threshold: float,
) -> dict[str, int]:
    output_dir = public_root / pet
    files = [output_dir / name for name in sorted(referenced_images(pet, lottie_root))]
    previews = {path: visual_thumbnail(path) for path in files}
    parent = {path: path for path in files}

    def find(path: Path) -> Path:
        while parent[path] != path:
            parent[path] = parent[parent[path]]
            path = parent[path]
        return path

    for index, left in enumerate(files):
        for right in files[index + 1:]:
            if visual_distance(previews[left], previews[right]) <= threshold:
                left_root, right_root = find(left), find(right)
                if left_root != right_root:
                    parent[right_root] = left_root

    groups: dict[Path, list[Path]] = {}
    for path in files:
        groups.setdefault(find(path), []).append(path)

    replacements: dict[str, str] = {}
    removed_bytes = 0
    for group in groups.values():
        if len(group) < 2:
            continue
        canonical = min(group, key=lambda path: (path.stat().st_size, path.name))
        for duplicate in group:
            if duplicate != canonical:
                replacements[duplicate.name] = canonical.name
                removed_bytes += duplicate.stat().st_size

    coalesced = 0
    if replacements:
        for path in pet_json_files(lottie_root, pet):
            animation = json.loads(path.read_text(encoding="utf-8"))
            for asset in animation.get("assets", []):
                if asset.get("p") in replacements:
                    asset["p"] = replacements[asset["p"]]
            coalesced += coalesce_image_assets(animation)
            path.write_text(
                json.dumps(animation, ensure_ascii=False, separators=(",", ":")) + "\n",
                encoding="utf-8",
            )
        for filename in replacements:
            (output_dir / filename).unlink()

    active = referenced_images(pet, lottie_root)
    stale = [path for path in output_dir.glob("*.webp") if path.name not in active]
    stale_bytes = sum(path.stat().st_size for path in stale)
    for path in stale:
        path.unlink()
    return {
        "near_duplicate_files_removed": len(replacements),
        "near_duplicate_bytes_removed": removed_bytes,
        "stale_files_removed": len(stale),
        "stale_bytes_removed": stale_bytes,
        "near_asset_nodes_removed": coalesced,
    }


def hardlink_duplicate_frames(root: Path) -> dict[str, int]:
    files = sorted(root.rglob("*.png"))
    if not files:
        raise FileNotFoundError(f"No PNG frames found in {root}")
    groups: dict[str, list[Path]] = {}
    for path in files:
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        groups.setdefault(digest, []).append(path)

    linked = shared_bytes = 0
    for group in groups.values():
        canonical = group[0]
        for duplicate in group[1:]:
            if os.path.samefile(canonical, duplicate):
                continue
            temporary = duplicate.with_name(f".{duplicate.name}.dedupe")
            os.link(canonical, temporary)
            temporary.replace(duplicate)
            linked += 1
            shared_bytes += duplicate.stat().st_size
    return {
        "hardlinked_duplicate_frames": linked,
        "shared_frame_bytes": shared_bytes,
    }


def write_self_contained_package(
    pet: str,
    lottie_root: Path,
    public_root: Path,
    package_root: Path,
) -> dict[str, int]:
    output_dir = package_root / "animations"
    output_dir.mkdir(parents=True, exist_ok=True)
    total = 0

    for path in pet_json_files(lottie_root, pet):
        animation = json.loads(path.read_text(encoding="utf-8"))
        for asset in animation.get("assets", []):
            filename = asset.get("p", "")
            if asset.get("e") != 0 or not filename:
                continue
            image_path = public_root / pet / filename
            if not image_path.is_file():
                raise FileNotFoundError(f"Missing shared image: {image_path}")
            asset["p"] = "data:image/webp;base64," + base64.b64encode(
                image_path.read_bytes()
            ).decode("ascii")
            asset["e"] = 1
            asset.pop("u", None)

        filename = path.name.removeprefix(f"pet-{pet}-")
        serialized = json.dumps(animation, ensure_ascii=False, separators=(",", ":")) + "\n"
        (output_dir / filename).write_text(serialized, encoding="utf-8")
        total += len(serialized.encode("utf-8"))

    return {
        "package_json_bytes": total,
        "package_json_files": len(list(output_dir.glob("*.json"))),
    }


def resolve_path(root: Path, value: str) -> Path:
    path = Path(value).expanduser()
    return (root / path).resolve() if not path.is_absolute() else path.resolve()


def parse_package_roots(root: Path, values: list[str]) -> dict[str, Path]:
    result: dict[str, Path] = {}
    for value in values:
        pet, separator, path = value.partition("=")
        if not separator or pet not in PETS or not path:
            raise ValueError(f"Invalid --package-root {value!r}; expected PET=PATH")
        result[pet] = resolve_path(root, path)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Externalize built-in pet images as shared WebP assets.",
    )
    parser.add_argument("--root", required=True, help="Project or bundle root directory")
    parser.add_argument("--lottie-root", default="src/assets/lottie")
    parser.add_argument("--public-root", default="public/pets")
    parser.add_argument(
        "--near-dedupe-threshold",
        type=float,
        default=0.0015,
        help="Merge visually indistinguishable xiaoyin WebP frames; 0 disables it",
    )
    parser.add_argument(
        "--package-root",
        action="append",
        default=[],
        metavar="PET=PATH",
        help="Also write self-contained package JSON for a pet; repeat as needed",
    )
    parser.add_argument(
        "--hardlink-frames",
        action="append",
        default=[],
        metavar="PATH",
        help="Replace exact duplicate PNG frames with hardlinks; repeat as needed",
    )
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    if not root.is_dir():
        parser.error(f"root directory does not exist: {root}")
    lottie_root = resolve_path(root, args.lottie_root)
    public_root = resolve_path(root, args.public_root)
    try:
        package_roots = parse_package_roots(root, args.package_root)
        for pet in PETS:
            result = externalize_pet(pet, lottie_root, public_root)
            if pet == "xiaoyin" and args.near_dedupe_threshold > 0:
                dedupe_result = deduplicate_near_images(
                    pet,
                    lottie_root,
                    public_root,
                    args.near_dedupe_threshold,
                )
                result.update(dedupe_result)
                shared_files = list((public_root / pet).glob("*.webp"))
                result["shared_webp_bytes"] = sum(path.stat().st_size for path in shared_files)
                result["shared_webp_files"] = len(shared_files)
            if pet in package_roots:
                result.update(
                    write_self_contained_package(
                        pet,
                        lottie_root,
                        public_root,
                        package_roots[pet],
                    )
                )
            print(pet, json.dumps(result, ensure_ascii=False))
        for value in args.hardlink_frames:
            frames_root = resolve_path(root, value)
            print(
                "frames",
                json.dumps(hardlink_duplicate_frames(frames_root), ensure_ascii=False),
            )
    except (FileNotFoundError, OSError, ValueError) as error:
        parser.error(str(error))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
