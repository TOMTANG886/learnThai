

import argparse
import hashlib
from pathlib import Path


def make_hash(text: str, lang: str) -> str:
	raw = f"{text}|{lang}".encode("utf-8")
	return hashlib.sha256(raw).hexdigest()


def generate_audio(text: str, lang: str, output_dir: Path, filename: str | None = None) -> Path:
	# Local import so script can still show helpful errors if gTTS is missing.
	from gtts import gTTS

	output_dir.mkdir(parents=True, exist_ok=True)
	if filename:
		out_name = filename if filename.endswith(".mp3") else f"{filename}.mp3"
	else:
		out_name = f"{make_hash(text, lang)}.mp3"

	out_path = output_dir / out_name
	tts = gTTS(text, lang=lang)
	tts.save(str(out_path))
	return out_path


def main() -> None:
	parser = argparse.ArgumentParser(description="Local gTTS helper for Thai audio generation")
	parser.add_argument("--text", default="โรงพยาบาล", help="Text to synthesize")
	parser.add_argument("--lang", default="th", help="Language code (e.g. th, en)")
	parser.add_argument(
		"--output-dir",
		default="web/public/assets/audio",
		help="Output folder for generated mp3",
	)
	parser.add_argument(
		"--filename",
		default="",
		help="Optional output filename (without extension or with .mp3)",
	)
	args = parser.parse_args()

	out = generate_audio(
		text=args.text,
		lang=args.lang,
		output_dir=Path(args.output_dir),
		filename=args.filename or None,
	)
	print(f"Generated: {out}")


if __name__ == "__main__":
	main()