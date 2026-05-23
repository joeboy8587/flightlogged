#!/usr/bin/env python3
"""SHA-256 a file and emit the footer block to stdout.

Usage:
  python hash_artifact.py /mnt/documents/watchtower/2026-05-23-low-alt-digest.md
"""
import hashlib, sys, pathlib

def main():
    if len(sys.argv) != 2:
        print("usage: hash_artifact.py <path>", file=sys.stderr); sys.exit(2)
    p = pathlib.Path(sys.argv[1])
    data = p.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    print(f"SHA-256: {digest}")
    print(f"Bytes:   {len(data)}")
    print(f"File:    {p}")

if __name__ == "__main__":
    main()
