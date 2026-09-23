import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase, main

from PIL import Image

from externalize_pet_assets import (
    deduplicate_near_images,
    externalize_pet,
    hardlink_duplicate_frames,
    parse_package_roots,
)


class ExternalizePetAssetsTest(TestCase):
    def test_missing_pet_json_fails(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaisesRegex(FileNotFoundError, "No Lottie JSON files"):
                externalize_pet("vzai", root / "lottie", root / "public")

    def test_invalid_package_mapping_fails(self) -> None:
        with TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "expected PET=PATH"):
                parse_package_roots(Path(directory), ["unknown=package"])

    def test_missing_shared_image_fails(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "lottie" / "xiaoyin"
            source.mkdir(parents=True)
            (source / "idle.json").write_text(
                json.dumps({"assets": [{"p": "missing.webp", "e": 0}]}),
                encoding="utf-8",
            )
            with self.assertRaisesRegex(FileNotFoundError, "Missing shared image"):
                externalize_pet("xiaoyin", root / "lottie", root / "public")

    def test_near_duplicate_images_share_one_asset(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "lottie" / "xiaoyin"
            images = root / "public" / "xiaoyin"
            source.mkdir(parents=True)
            images.mkdir(parents=True)
            first = Image.new("RGBA", (64, 64), "red")
            second = first.copy()
            second.putpixel((0, 0), (254, 0, 0, 255))
            first.save(images / "first.webp", lossless=True)
            second.save(images / "second.webp", lossless=True)
            animation = {
                "assets": [
                    {"id": "first", "p": "first.webp", "e": 0, "w": 64, "h": 64},
                    {"id": "second", "p": "second.webp", "e": 0, "w": 64, "h": 64},
                ],
                "layers": [{"refId": "first"}, {"refId": "second"}],
            }
            path = source / "idle.json"
            path.write_text(json.dumps(animation), encoding="utf-8")

            result = deduplicate_near_images(
                "xiaoyin",
                root / "lottie",
                root / "public",
                0.0015,
            )
            deduped = json.loads(path.read_text(encoding="utf-8"))

            self.assertEqual(result["near_duplicate_files_removed"], 1)
            self.assertEqual(len(deduped["assets"]), 1)
            self.assertEqual(len({layer["refId"] for layer in deduped["layers"]}), 1)
            self.assertEqual(len(list(images.glob("*.webp"))), 1)

    def test_exact_duplicate_frames_become_hardlinks(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "a.png").write_bytes(b"same frame")
            (root / "b.png").write_bytes(b"same frame")

            result = hardlink_duplicate_frames(root)

            self.assertEqual(result["hardlinked_duplicate_frames"], 1)
            self.assertTrue(os.path.samefile(root / "a.png", root / "b.png"))


if __name__ == "__main__":
    main()
