"""Minimal test runner for tests/test_m2144_phase1.py (pytest-free env)."""
import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import tests.test_m2144_phase1 as suite

failed = 0
for name in sorted(dir(suite)):
    if not name.startswith("test_"):
        continue
    fn = getattr(suite, name)
    try:
        fn()
        print(f"PASS {name}")
    except Exception:
        failed += 1
        print(f"FAIL {name}")
        traceback.print_exc()

if failed:
    print(f"{failed} test(s) failed")
    sys.exit(1)
print("ALL BACKEND PHASE1 TESTS PASSED")
