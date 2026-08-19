"""Atlas poller for explicitly PM-approved delegation issues.

The issue-scoped Git ref is the cross-machine claim authority. GitHub creates a
ref atomically, so concurrent pollers agree on one owner before any issue labels
or comments are mutated.
"""

import datetime
import json
import re
import subprocess
import sys
import urllib.error
import urllib.request


REPO = "moh0709/everythingAI"
WORKDIR = r"C:\temp\everythingAI"
API_ROOT = f"https://api.github.com/repos/{REPO}"
REQUIRED_READY_LABELS = {"pm:ready", "atlas:ready", "pm:approved-delegation"}
BLOCKING_AGENT_LABELS = {
    "forge:ready", "forge:working", "forge:done", "forge:blocked",
    "hermes:ready", "hermes:working", "hermes:done", "hermes:blocked",
    "atlas:working", "atlas:done", "atlas:blocked", "pm:review",
}


class ApiRequestError(RuntimeError):
    """GitHub API failure with an inspectable HTTP status when available."""

    def __init__(self, message, status=None):
        super().__init__(message)
        self.status = status


def get_token():
    """Extract a GitHub token from git credential manager."""
    try:
        proc = subprocess.run(
            ["git", "credential", "fill"],
            input="protocol=https\nhost=github.com\n",
            capture_output=True,
            text=True,
            cwd=WORKDIR,
            timeout=10,
            check=False,
        )
        for line in proc.stdout.splitlines():
            if line.startswith("password="):
                return line[9:]
    except Exception as error:
        print(f"[atlas-cron] Token error: {error}", file=sys.stderr)
    return None


def api_request(url, token, method="GET", data=None):
    """Make a GitHub API request and fail explicitly on transport/API errors."""
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "atlas-cron-poller/2.0",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    body = json.dumps(data).encode() if data is not None else None
    http_request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(http_request, timeout=15) as response:
            payload = response.read()
            return json.loads(payload) if payload else None
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")[:200]
        raise ApiRequestError(f"GitHub API {error.code}: {detail}", error.code) from error
    except (urllib.error.URLError, TimeoutError) as error:
        raise ApiRequestError(f"GitHub transport error: {error}") from error


def label_names(issue_or_labels):
    """Normalize either an issue or a GitHub labels array to a set of names."""
    labels = issue_or_labels.get("labels", []) if isinstance(issue_or_labels, dict) else issue_or_labels
    return {
        entry.get("name") if isinstance(entry, dict) else str(entry)
        for entry in (labels or [])
        if entry
    }


def get_label_names(issue_num, token, request=api_request):
    labels = request(f"{API_ROOT}/issues/{issue_num}/labels", token)
    return label_names(labels)


def atlas_delegation_contract_present(body):
    """Return true only for an explicit PM-approved Atlas delegation contract."""
    text = body or ""
    required_patterns = [
        r"Atlas Delegation Contract",
        r"Parent Forge Issue:\s*#\d+",
        r"Starting SHA:\s*[a-f0-9]{40}",
        r"Final SHA:\s*(pending|[a-f0-9]{40})",
        r"Allowed Files:\s*\S+",
        r"Forbidden Files:\s*\S+",
        r"Validation Commands:\s*\S+",
        r"Reporting Destination:\s*\S+",
    ]
    return all(re.search(pattern, text, re.IGNORECASE) for pattern in required_patterns)


def atlas_issue_is_eligible(issue_or_labels, body=None):
    """Atlas must not claim generic queues or another agent's queue."""
    if isinstance(issue_or_labels, dict):
        issue = issue_or_labels
        labels = label_names(issue)
        body = issue.get("body", "")
        if str(issue.get("state", "")).lower() != "open":
            return False
    else:
        labels = label_names(issue_or_labels)
    return (
        REQUIRED_READY_LABELS.issubset(labels)
        and labels.isdisjoint(BLOCKING_AGENT_LABELS)
        and atlas_delegation_contract_present(body)
    )


def claim_ref(issue_number):
    return f"refs/heads/atlas-claims/issue-{int(issue_number)}"


def claim_marker(issue_number):
    return f"<!-- atlas-claim:issue-{int(issue_number)} -->"


def _ref_api_suffix(ref):
    return ref.removeprefix("refs/")


def acquire_remote_claim_lock(issue_number, token, request=api_request):
    """Atomically create the fixed issue ref; a 422 means another owner won."""
    ref = claim_ref(issue_number)
    base = request(f"{API_ROOT}/git/ref/heads/main", token)
    base_sha = base.get("object", {}).get("sha") if isinstance(base, dict) else None
    if not base_sha:
        return {"ok": False, "result": "RUNTIME_ERROR", "evidence": ["main ref had no target SHA"]}
    try:
        created = request(
            f"{API_ROOT}/git/refs",
            token,
            method="POST",
            data={"ref": ref, "sha": base_sha},
        )
    except Exception as error:
        if getattr(error, "status", None) == 422:
            return {
                "ok": False,
                "result": "CLAIM_CONFLICT",
                "evidence": [f"remote claim lock already exists: {ref}"],
            }
        return {"ok": False, "result": "RUNTIME_ERROR", "evidence": [f"claim lock failed: {error}"]}
    target_sha = created.get("object", {}).get("sha") if isinstance(created, dict) else None
    return {
        "ok": True,
        "result": "CLAIMED",
        "lock": {"ref": ref, "sha": target_sha or base_sha},
    }


def release_remote_claim_lock(lock, token, request=api_request):
    """Delete only the exact ref target acquired by this claimant."""
    suffix = _ref_api_suffix(lock["ref"])
    try:
        live = request(f"{API_ROOT}/git/ref/{suffix}", token)
        live_sha = live.get("object", {}).get("sha") if isinstance(live, dict) else None
        if live_sha != lock["sha"]:
            return False
        request(f"{API_ROOT}/git/refs/{suffix}", token, method="DELETE")
        return True
    except Exception:
        return False


def _result(result, issue=None, evidence=None, lock=None):
    payload = {"ok": result == "CLAIMED", "result": result, "evidence": evidence or []}
    if issue is not None:
        payload["issue"] = issue
    if lock is not None:
        payload["lock"] = lock
    return payload


def _restore_ready_if_safe(issue_number, token, request=api_request):
    """Restore readiness after a partial winner failure only if ownership is clean."""
    try:
        labels = get_label_names(issue_number, token, request)
        if not labels.isdisjoint(BLOCKING_AGENT_LABELS):
            return False
        request(
            f"{API_ROOT}/issues/{issue_number}/labels",
            token,
            method="POST",
            data={"labels": ["atlas:ready"]},
        )
        return "atlas:ready" in get_label_names(issue_number, token, request)
    except Exception:
        return False


def _claim_acknowledgement(issue, claimed_at, lock):
    marker = claim_marker(issue["number"])
    return (
        f"{marker}\n"
        "## Claim Acknowledgement\n\n"
        "**Agent:** Atlas (cron)\n"
        f"**Issue:** #{issue['number']}\n"
        f"**Claim Time:** {claimed_at}\n"
        "**Status:** CLAIMED\n"
        f"**Remote Lock:** `{lock['ref']}` at `{lock['sha']}`\n\n"
        "Atlas claimed this issue through the PM-approved Atlas queue."
    )


def _comment_exists(issue_number, marker, token, request=api_request):
    comments = request(f"{API_ROOT}/issues/{issue_number}/comments?per_page=100", token)
    return any(marker in (comment.get("body") or "") for comment in (comments or []))


def claim_issue(issue, token, request=api_request, now=None):
    """Claim one discovered Atlas issue with cross-machine atomic ownership."""
    if not atlas_issue_is_eligible(issue):
        return _result("NOT_RUNNABLE", issue, ["discovered issue is not Atlas-eligible"])

    issue_number = int(issue["number"])
    lock_attempt = acquire_remote_claim_lock(issue_number, token, request)
    if not lock_attempt["ok"]:
        return lock_attempt
    lock = lock_attempt["lock"]

    try:
        live_issue = request(f"{API_ROOT}/issues/{issue_number}", token)
    except Exception as error:
        released = release_remote_claim_lock(lock, token, request)
        return _result("RUNTIME_ERROR", issue, [f"live issue re-read failed: {error}", f"lock_released={released}"])

    if not atlas_issue_is_eligible(live_issue):
        released = release_remote_claim_lock(lock, token, request)
        return _result("NOT_RUNNABLE", live_issue, ["live issue became ineligible", f"lock_released={released}"])

    try:
        request(
            f"{API_ROOT}/issues/{issue_number}/labels/atlas:ready",
            token,
            method="DELETE",
        )
        after_removal = get_label_names(issue_number, token, request)
        if "atlas:ready" in after_removal or not after_removal.isdisjoint(BLOCKING_AGENT_LABELS):
            raise ApiRequestError("atlas:ready removal did not produce a clean transition state")
    except Exception as error:
        restored = _restore_ready_if_safe(issue_number, token, request)
        released = release_remote_claim_lock(lock, token, request) if restored else False
        return _result(
            "RUNTIME_ERROR",
            live_issue,
            [f"atlas:ready removal failed: {error}", f"ready_restored={restored}", f"lock_released={released}"],
            None if released else lock,
        )

    try:
        request(
            f"{API_ROOT}/issues/{issue_number}/labels",
            token,
            method="POST",
            data={"labels": ["atlas:working"]},
        )
    except Exception as error:
        restored = _restore_ready_if_safe(issue_number, token, request)
        released = release_remote_claim_lock(lock, token, request) if restored else False
        return _result(
            "RUNTIME_ERROR",
            live_issue,
            [f"atlas:working addition failed: {error}", f"ready_restored={restored}", f"lock_released={released}"],
            None if released else lock,
        )

    try:
        final_labels = get_label_names(issue_number, token, request)
    except Exception as error:
        return _result("RUNTIME_ERROR", live_issue, [f"final label verification failed: {error}"], lock)
    forbidden_final = (BLOCKING_AGENT_LABELS - {"atlas:working"}) | {"atlas:ready"}
    if "atlas:working" not in final_labels or not final_labels.isdisjoint(forbidden_final):
        return _result(
            "RUNTIME_ERROR",
            live_issue,
            [f"final labels are not exclusively Atlas-owned: {sorted(final_labels)}"],
            lock,
        )

    claimed_at = (now or (lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()))()
    if not isinstance(claimed_at, str):
        claimed_at = claimed_at.isoformat()
    marker = claim_marker(issue_number)
    try:
        if not _comment_exists(issue_number, marker, token, request):
            request(
                f"{API_ROOT}/issues/{issue_number}/comments",
                token,
                method="POST",
                data={"body": _claim_acknowledgement(live_issue, claimed_at, lock)},
            )
    except Exception as error:
        try:
            if not _comment_exists(issue_number, marker, token, request):
                return _result("RUNTIME_ERROR", live_issue, [f"claim acknowledgement failed: {error}"], lock)
        except Exception as verify_error:
            return _result(
                "RUNTIME_ERROR",
                live_issue,
                [f"claim acknowledgement failed: {error}", f"comment verification failed: {verify_error}"],
                lock,
            )

    return _result(
        "CLAIMED",
        live_issue,
        [f"remote claim lock={lock['ref']}", "labels=atlas:ready -> atlas:working", f"comment_marker={marker}"],
        lock,
    )


def main():
    token = get_token()
    if not token:
        print("[atlas-cron] No token available", file=sys.stderr)
        return 1

    queue_url = (
        f"{API_ROOT}/issues?state=open&labels="
        "pm:ready,atlas:ready,pm:approved-delegation&per_page=5"
    )
    try:
        issues = api_request(queue_url, token)
    except Exception as error:
        print(f"[atlas-cron] Queue lookup failed: {error}", file=sys.stderr)
        return 1
    if not issues:
        return 0

    result = claim_issue(issues[0], token)
    print(json.dumps(result, sort_keys=True))
    return 1 if result["result"] == "RUNTIME_ERROR" else 0


if __name__ == "__main__":
    sys.exit(main())
