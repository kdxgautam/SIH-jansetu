"""Where uploaded evidence lives.

A container filesystem is not durable: on Cloud Run every redeploy starts from a
fresh disk and two instances cannot see each other's writes, so local storage is
for development only. Setting UPLOAD_BUCKET moves evidence to Google Cloud
Storage. Downloads are always streamed through the API so that the existing
role and participation checks stay the only way to reach a file; no object is
ever public and no signed URL escapes that boundary.
"""
import os
from contextlib import suppress
from pathlib import Path

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", ".data/uploads")).resolve()
UPLOAD_BUCKET = os.getenv("UPLOAD_BUCKET", "").strip()
UPLOAD_PREFIX = os.getenv("UPLOAD_PREFIX", "evidence").strip("/")
CHUNK = 1024 * 1024


class TooLarge(Exception):
    """The caller sent more bytes than the per-file ceiling allows."""


class LocalStorage:
    """Development storage on the container filesystem."""

    name = "local"

    def save(self, storage_name, stream, max_bytes):
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        path = UPLOAD_DIR / storage_name
        size = 0
        try:
            with path.open("xb") as output:
                while chunk := stream.read(CHUNK):
                    size += len(chunk)
                    if size > max_bytes:
                        raise TooLarge
                    output.write(chunk)
        except BaseException:
            path.unlink(missing_ok=True)
            raise
        return size

    def delete(self, storage_name):
        (UPLOAD_DIR / storage_name).unlink(missing_ok=True)

    def open(self, storage_name):
        path = UPLOAD_DIR / storage_name
        return path.open("rb") if path.is_file() else None


class BucketStorage:
    """Durable storage in a private Google Cloud Storage bucket."""

    name = "bucket"

    def __init__(self, bucket_name, client=None):
        self.bucket_name = bucket_name
        self._client = client
        self._bucket = None

    def bucket(self):
        if self._bucket is None:
            if self._client is None:
                from google.cloud import storage  # Imported late so local runs need no cloud credentials.

                self._client = storage.Client()
            self._bucket = self._client.bucket(self.bucket_name)
        return self._bucket

    def blob(self, storage_name):
        return self.bucket().blob(f"{UPLOAD_PREFIX}/{storage_name}" if UPLOAD_PREFIX else storage_name)

    def save(self, storage_name, stream, max_bytes):
        blob = self.blob(storage_name)
        size = 0
        try:
            with blob.open("wb") as output:
                while chunk := stream.read(CHUNK):
                    size += len(chunk)
                    if size > max_bytes:
                        raise TooLarge
                    output.write(chunk)
        except BaseException:
            self.delete(storage_name)
            raise
        return size

    def delete(self, storage_name):
        with suppress(Exception):  # Already gone, or never written; nothing is left to clean up.
            self.blob(storage_name).delete()

    def open(self, storage_name):
        blob = self.blob(storage_name)
        try:
            return blob.open("rb")
        except Exception:
            return None


def chunks(stream):
    """Yield a stored file in fixed blocks, closing it once the response ends."""
    try:
        while block := stream.read(CHUNK):
            yield block
    finally:
        stream.close()


storage = BucketStorage(UPLOAD_BUCKET) if UPLOAD_BUCKET else LocalStorage()
