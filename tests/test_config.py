from contextlib import redirect_stdout
from dataclasses import replace
import io
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from agent_context_mcp.config import HTTPSettings, local_token, read_token
from agent_context_mcp.server import main


class ConfigTests(unittest.TestCase):
    def test_http_fails_closed(self):
        settings = HTTPSettings(Path("unused.sqlite3"))
        with self.assertRaises(ValueError):
            settings.validate()
        settings = replace(settings, allow_unauthenticated_local=True)
        self.assertIs(settings.validate(), settings)
        with self.assertRaises(ValueError):
            replace(settings, host="0.0.0.0").validate()

    def test_tokens_are_validated_and_hidden(self):
        token = "x" * 64
        settings = HTTPSettings(Path("unused.sqlite3"), token=token)
        self.assertNotIn(token, repr(settings))
        for candidate in ["", "short", "x" * 513, "has spaces" * 5, "é" * 40]:
            with patch.dict(os.environ, {"AGENT_CONTEXT_TOKEN": candidate}, clear=True):
                with self.assertRaises(ValueError):
                    read_token()

    def test_token_file_and_conflicting_sources(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "token"
            path.write_text("x" * 64 + "\n")
            with patch.dict(os.environ, {}, clear=True):
                self.assertEqual(read_token(path), "x" * 64)
            with patch.dict(os.environ, {"AGENT_CONTEXT_TOKEN": "y" * 64}, clear=True):
                with self.assertRaises(ValueError):
                    read_token(path)

    def test_invalid_allowlists_and_limits(self):
        settings = HTTPSettings(Path("unused.sqlite3"), token="x" * 64)
        for changes in [{"allowed_hosts": ("*",)}, {"allowed_hosts": ("https://example.com",)},
                        {"allowed_origins": ("https://example.com/path",)},
                        {"requests_per_minute": 0}, {"max_inflight": 0}, {"max_body_bytes": 1}, {"port": 0}]:
            with self.assertRaises(ValueError):
                replace(settings, **changes).validate()

    def test_keygen_is_safe_to_use_as_a_token(self):
        output = io.StringIO()
        with redirect_stdout(output):
            main(["keygen"])
        token = output.getvalue().strip()
        self.assertGreaterEqual(len(token), 48)
        HTTPSettings(Path("unused.sqlite3"), token=token).validate()

    def test_dashboard_token_is_persistent_and_private(self):
        with tempfile.TemporaryDirectory() as directory:
            database = Path(directory) / "data" / "context.sqlite3"
            with patch.dict(os.environ, {}, clear=True):
                first = local_token(database)
                self.assertEqual(first, local_token(database))
                self.assertGreaterEqual(len(first), 48)
                secret_file = database.parent / "access-token"
                if os.name != "nt":
                    self.assertEqual(secret_file.stat().st_mode & 0o777, 0o600)
