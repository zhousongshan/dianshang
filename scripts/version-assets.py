"""Give local JS/CSS URLs content versions so browsers load changed assets."""

import hashlib
import re
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


def version_assets(root: Path) -> int:
    index = root / "index.html"
    source = index.read_text(encoding="utf-8")
    pattern = re.compile(
        r"(?P<prefix><(?:script|link)\b[^>]*?\b(?:src|href)\s*=\s*[\"'])"
        r"(?P<url>\./[^\"'<>]+)(?P<quote>[\"'])",
        re.IGNORECASE,
    )
    count = 0

    def update(match):
        nonlocal count
        url = urlsplit(match["url"])
        asset = (root / url.path).resolve()
        if asset.suffix.lower() not in {".js", ".css"}:
            return match[0]
        if not asset.is_relative_to(root.resolve()) or not asset.is_file():
            raise ValueError(f"Missing local asset: {url.path}")
        version = hashlib.sha256(asset.read_bytes()).hexdigest()[:12]
        params = [(key, value) for key, value in parse_qsl(url.query) if key != "v"]
        params.append(("v", version))
        updated = urlunsplit(("", "", url.path, urlencode(params), url.fragment))
        count += 1
        return match["prefix"] + updated + match["quote"]

    result = pattern.sub(update, source)
    if result != source:
        index.write_text(result, encoding="utf-8")
    return count


if __name__ == "__main__":
    print(f"Versioned {version_assets(Path(__file__).resolve().parent.parent)} local assets.")
