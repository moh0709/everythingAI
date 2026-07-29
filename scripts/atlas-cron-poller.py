"""
Atlas Poller — checks GitHub issue queue for PM-approved Atlas delegations only.
Runs as a cron job script (no_agent=True).
Idempotent: re-checks labels before claiming to prevent duplicate claims.
Exits silently when no work is available.
"""
import datetime
import json
import re
import subprocess
import sys
import urllib.request

REPO = "moh0709/everythingAI"
WORKDIR = r"C:\temp\everythingAI"
REQUIRED_READY_LABELS = {"pm:ready", "atlas:ready", "pm:approved-delegation"}
BLOCKING_AGENT_LABELS = {
    "forge:ready", "forge:working", "forge:done", "forge:blocked",
    "hermes:ready", "hermes:working", "hermes:done", "hermes:blocked",
    "atlas:working", "atlas:done", "atlas:blocked",
}


def get_token():
    """Extract GitHub token from git credential manager."""
    try:
        proc = subprocess.run(
            ["git", "credential", "fill"],
            input="protocol=https\nhost=github.com\n",
            capture_output=True,
            text=True,
            cwd=WORKDIR,
            timeout=10
        )
        for line in proc.stdout.splitlines():
            if line.startswith("password="):
                return line[9:]
    except Exception as e:
        print(f"[atlas-cron] Token error: {e}", file=sys.stderr)
    return None


def api_request(url, token, method="GET", data=None):
    """Make a GitHub API request."""
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "atlas-cron-poller/1.0"
    }
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"[atlas-cron] API error {e.code}: {e.read().decode()[:200]}", file=sys.stderr)
        return None


def get_label_names(issue_num, token):
    """Get current label names for an issue."""
    url = f"https://api.github.com/repos/{REPO}/issues/{issue_num}/labels"
    labels = api_request(url, token)
    if labels is None:
        return set()
    return {l["name"] for l in labels}


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


def atlas_issue_is_eligible(labels, body):
    """Atlas must not claim generic queues or another agent's queue."""
    label_set = set(labels)
    return (
        REQUIRED_READY_LABELS.issubset(label_set)
        and label_set.isdisjoint(BLOCKING_AGENT_LABELS)
        and atlas_delegation_contract_present(body)
    )


def main():
    token = get_token()
    if not token:
        print("[atlas-cron] No token available", file=sys.stderr)
        sys.exit(1)

    # Query only for Atlas-specific issues that PM explicitly approved for delegation.
    url = f"https://api.github.com/repos/{REPO}/issues?state=open&labels=pm:ready,atlas:ready,pm:approved-delegation&per_page=5"
    issues = api_request(url, token)

    if issues is None:
        sys.exit(0)
    if len(issues) == 0:
        sys.exit(0)

    issue = issues[0]
    num = issue["number"]
    title = issue["title"]
    body = issue.get("body", "")

    # --- Idempotency gate: re-read current labels ---
    current_labels = get_label_names(num, token)
    if not atlas_issue_is_eligible(current_labels, body):
        print(f"[atlas-cron] Skipping issue #{num}: not an approved Atlas delegation", file=sys.stderr)
        sys.exit(0)

    print(f"[atlas-cron] Claiming issue #{num}: {title}")

    # --- Atomic claim ---
    # Remove atlas:ready
    del_url = f"https://api.github.com/repos/{REPO}/issues/{num}/labels/atlas:ready"
    api_request(del_url, token, method="DELETE")

    # Add atlas:working
    add_url = f"https://api.github.com/repos/{REPO}/issues/{num}/labels"
    api_request(add_url, token, method="POST", data={"labels": ["atlas:working"]})

    # --- Verify claim took effect ---
    final_labels = get_label_names(num, token)
    if "atlas:working" not in final_labels:
        print(f"[atlas-cron] ERROR: Claim verification failed for #{num}")
        sys.exit(0)

    # Post claim comment
    now = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    comment_url = f"https://api.github.com/repos/{REPO}/issues/{num}/comments"
    comment_body = (
        "## Claim Acknowledgement\n\n"
        f"**Agent:** Atlas (cron)\n"
        f"**Issue:** #{num}\n"
        f"**Claim Time:** {now}\n"
        f"**Status:** CLAIMED\n\n"
        "Atlas autonomously claimed this issue through the Atlas-specific label queue.\n\n"
        "Proceeding with implementation."
    )
    api_request(comment_url, token, method="POST", data={"body": comment_body})

    print(f"[atlas-cron] Successfully claimed issue #{num}")


if __name__ == "__main__":
    main()
