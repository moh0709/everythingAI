import copy
import importlib.util
import pathlib
import threading
import unittest


POLLER_PATH = pathlib.Path(__file__).parents[1] / "scripts" / "atlas-cron-poller.py"
SPEC = importlib.util.spec_from_file_location("atlas_cron_poller", POLLER_PATH)
POLLER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(POLLER)

CONTRACT = "\n".join([
    "Atlas Delegation Contract",
    "Parent Forge Issue: #85",
    "Starting SHA: 538e38c62a10fe5693354db356a3965799e8d443",
    "Final SHA: pending",
    "Allowed Files: scripts/atlas-cron-poller.py",
    "Forbidden Files: PROJECT_STATE.md",
    "Validation Commands: npm test",
    "Reporting Destination: issue #85",
])


def make_issue(labels=None):
    return {
        "number": 900,
        "title": "Atlas delegated fixture",
        "state": "open",
        "labels": [
            {"name": name}
            for name in (labels or ["pm:ready", "atlas:ready", "pm:approved-delegation"])
        ],
        "body": CONTRACT,
    }


class FakeApiError(RuntimeError):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


class FakeGitHub:
    def __init__(self, issue=None, synchronize_claimants=False):
        self.issue = copy.deepcopy(issue or make_issue())
        self.ref_sha = None
        self.comments = []
        self.label_mutations = []
        self.fail_remove_ready = False
        self.fail_add_working = False
        self.comment_accept_then_fail = False
        self._mutex = threading.Lock()
        self._claim_barrier = threading.Barrier(2) if synchronize_claimants else None

    def _labels(self):
        return {entry["name"] for entry in self.issue["labels"]}

    def _set_labels(self, labels):
        self.issue["labels"] = [{"name": name} for name in sorted(labels)]

    def request(self, url, token, method="GET", data=None):
        del token
        if url.endswith("/git/ref/heads/main") and method == "GET":
            return {"object": {"sha": "a" * 40}}

        if url.endswith("/git/refs") and method == "POST":
            if self._claim_barrier:
                self._claim_barrier.wait(timeout=2)
            with self._mutex:
                if self.ref_sha is not None:
                    raise FakeApiError(422, "Reference already exists")
                self.ref_sha = data["sha"]
                return {"ref": data["ref"], "object": {"sha": self.ref_sha}}

        if "/git/ref/heads/atlas-claims/issue-900" in url and method == "GET":
            if self.ref_sha is None:
                raise FakeApiError(404, "Reference not found")
            return {"object": {"sha": self.ref_sha}}

        if "/git/refs/heads/atlas-claims/issue-900" in url and method == "DELETE":
            self.ref_sha = None
            return None

        if url.endswith("/issues/900") and method == "GET":
            return copy.deepcopy(self.issue)

        if url.endswith("/issues/900/labels") and method == "GET":
            return copy.deepcopy(self.issue["labels"])

        if url.endswith("/issues/900/labels/atlas:ready") and method == "DELETE":
            if self.fail_remove_ready:
                raise FakeApiError(503, "remove failed")
            labels = self._labels()
            labels.discard("atlas:ready")
            self._set_labels(labels)
            self.label_mutations.append((threading.current_thread().name, "remove-ready"))
            return copy.deepcopy(self.issue["labels"])

        if url.endswith("/issues/900/labels") and method == "POST":
            added = tuple(data["labels"])
            if "atlas:working" in added and self.fail_add_working:
                raise FakeApiError(503, "add failed")
            labels = self._labels()
            labels.update(added)
            self._set_labels(labels)
            self.label_mutations.append((threading.current_thread().name, f"add-{','.join(added)}"))
            return copy.deepcopy(self.issue["labels"])

        if "/issues/900/comments" in url and method == "GET":
            return copy.deepcopy(self.comments)

        if "/issues/900/comments" in url and method == "POST":
            self.comments.append({"body": data["body"]})
            if self.comment_accept_then_fail:
                raise FakeApiError(503, "response lost after acceptance")
            return copy.deepcopy(self.comments[-1])

        raise AssertionError(f"Unexpected API request: {method} {url}")


class AtlasClaimTests(unittest.TestCase):
    def claim(self, api, issue=None):
        return POLLER.claim_issue(
            copy.deepcopy(issue or make_issue()),
            "token",
            request=api.request,
            now=lambda: "2026-08-20T00:00:00Z",
        )

    def test_two_concurrent_pollers_have_one_winner_and_one_comment(self):
        api = FakeGitHub(synchronize_claimants=True)
        results = []

        def run_claim():
            results.append(self.claim(api))

        threads = [threading.Thread(target=run_claim, name=f"poller-{index}") for index in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=3)

        self.assertEqual(sorted(result["result"] for result in results), ["CLAIMED", "CLAIM_CONFLICT"])
        self.assertEqual(len(api.comments), 1)
        self.assertEqual(api._labels(), {"pm:ready", "pm:approved-delegation", "atlas:working"})
        self.assertEqual(len({owner for owner, _ in api.label_mutations}), 1)

    def test_stale_discovery_losing_ready_aborts_without_mutation(self):
        api = FakeGitHub(make_issue(["pm:ready", "pm:approved-delegation"]))
        result = self.claim(api, make_issue())

        self.assertEqual(result["result"], "NOT_RUNNABLE")
        self.assertEqual(api.label_mutations, [])
        self.assertEqual(api.comments, [])
        self.assertIsNone(api.ref_sha)

    def test_repeated_cron_tick_is_idempotent(self):
        api = FakeGitHub()
        first = self.claim(api)
        second = self.claim(api)

        self.assertEqual(first["result"], "CLAIMED")
        self.assertEqual(second["result"], "CLAIM_CONFLICT")
        self.assertEqual(len(api.comments), 1)
        self.assertEqual(len(api.label_mutations), 2)

    def test_existing_ownership_is_not_overwritten(self):
        api = FakeGitHub(make_issue(["pm:ready", "atlas:ready", "pm:approved-delegation", "atlas:working"]))
        result = self.claim(api, make_issue())

        self.assertEqual(result["result"], "NOT_RUNNABLE")
        self.assertEqual(api.label_mutations, [])
        self.assertEqual(api.comments, [])
        self.assertIsNone(api.ref_sha)

    def test_ready_removal_failure_is_a_claim_failure(self):
        api = FakeGitHub()
        api.fail_remove_ready = True
        result = self.claim(api)

        self.assertEqual(result["result"], "RUNTIME_ERROR")
        self.assertEqual(api._labels(), {"pm:ready", "atlas:ready", "pm:approved-delegation"})
        self.assertEqual(api.comments, [])
        self.assertIsNone(api.ref_sha)

    def test_working_add_failure_rolls_back_ready_and_releases_lock(self):
        api = FakeGitHub()
        api.fail_add_working = True
        result = self.claim(api)

        self.assertEqual(result["result"], "RUNTIME_ERROR")
        self.assertEqual(api._labels(), {"pm:ready", "atlas:ready", "pm:approved-delegation"})
        self.assertEqual(api.comments, [])
        self.assertIsNone(api.ref_sha)

    def test_ambiguous_comment_response_is_verified_without_duplicate(self):
        api = FakeGitHub()
        api.comment_accept_then_fail = True
        result = self.claim(api)

        self.assertEqual(result["result"], "CLAIMED")
        self.assertEqual(len(api.comments), 1)
        self.assertIn("atlas-claim:issue-900", api.comments[0]["body"])


if __name__ == "__main__":
    unittest.main()
