#!/usr/bin/env python3
"""
Simple load test for therapist list/search endpoints.
Usage:
  python scripts/load_test_therapists.py [--base-url URL] [--users N] [--requests N]
  pip install locust && locust -f scripts/locust_therapists.py --host=http://localhost:8000
"""
import argparse
import statistics
import time
import urllib.error
import urllib.parse
import urllib.request


def load_test(base_url: str, num_users: int, requests_per_user: int) -> dict:
    """Run simple load test with concurrent requests (sequential)."""
    base_url = base_url.rstrip("/")
    results = []

    for _i in range(num_users * requests_per_user):
        url = f"{base_url}/api/v1/therapists/?page_size=20"
        start = time.perf_counter()
        try:
            req = urllib.request.Request(url)
            req.add_header("Accept", "application/json")
            with urllib.request.urlopen(req, timeout=10) as resp:
                resp.read()
        except urllib.error.HTTPError as e:
            print(f"  HTTP {e.code}: {url}")
        except Exception as e:
            print(f"  Error: {e}")
        elapsed = time.perf_counter() - start
        results.append(elapsed)

    if not results:
        return {"error": "No successful requests"}
    return {
        "total_requests": len(results),
        "min_ms": min(results) * 1000,
        "max_ms": max(results) * 1000,
        "mean_ms": statistics.mean(results) * 1000,
        "median_ms": statistics.median(results) * 1000,
        "p95_ms": (
            sorted(results)[int(len(results) * 0.95)] * 1000
            if len(results) >= 20
            else max(results) * 1000
        ),
    }


def main():
    parser = argparse.ArgumentParser(description="Load test therapist list endpoint")
    parser.add_argument("--base-url", default="http://localhost:8000", help="API base URL")
    parser.add_argument("--users", type=int, default=5, help="Simulated users")
    parser.add_argument("--requests", type=int, default=20, help="Requests per user")
    args = parser.parse_args()

    total = args.users * args.requests
    print(f"Load test: {args.base_url}/api/v1/therapists/")
    print(f"  {args.users} users × {args.requests} requests = {total} total")
    print("Running...")

    start = time.perf_counter()
    stats = load_test(args.base_url, args.users, args.requests)
    total_time = time.perf_counter() - start

    if "error" in stats:
        print(f"  {stats['error']}")
        return 1

    print(f"\nResults ({total_time:.1f}s total):")
    print(f"  min: {stats['min_ms']:.0f} ms")
    print(f"  max: {stats['max_ms']:.0f} ms")
    print(f"  mean: {stats['mean_ms']:.0f} ms")
    print(f"  median: {stats['median_ms']:.0f} ms")
    print(f"  p95: {stats['p95_ms']:.0f} ms")
    print(f"  throughput: {total / total_time:.1f} req/s")
    return 0


if __name__ == "__main__":
    exit(main())
