#!/usr/bin/env bash
# fetch_github_data.sh - Retrieves live data for the Omnikon GitHub organization
# Requires jq to be installed.

# Load the PAT from .env (strip spaces around =)
ENV_FILE="$(dirname "$0")/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: .env file not found"
  exit 1
fi
# Extract token value (supports spaces around =)
TOKEN=$(grep -E "^GIT_OMNIKON_ALL" "$ENV_FILE" | cut -d'=' -f2- | tr -d ' \"')
if [[ -z "$TOKEN" ]]; then
  echo "Error: GitHub token not found in .env"
  exit 1
fi
ORG="Omnikon-Org"

# ------------------------------------------------------------
# Fetch organization repositories (first 100, pagination if needed)
if [[ -n "$TOKEN" ]]; then
  REPOS_RAW=$(curl -s -H "Authorization: token $TOKEN" "https://api.github.com/orgs/$ORG/repos?per_page=100")
else
  REPOS_RAW=$(curl -s "https://api.github.com/orgs/$ORG/repos?per_page=100")
fi

REPOS=$(echo "$REPOS_RAW" | jq '[.[] | select(.name != ".github")]')
PROJECT_COUNT=$(echo "$REPOS" | jq length)
TOTAL_STARS=$(echo "$REPOS" | jq '[.[] .stargazers_count] | add')
# Build repos array with needed fields
REPOS_DATA=$(echo "$REPOS" | jq '[.[] | {name: .name, description: .description, stars: .stargazers_count, html_url: .html_url, homepage: .homepage}]')

# ------------------------------------------------------------
# Fetch org members and ensure it's an array
if [[ -n "$TOKEN" ]]; then
  ORG_MEMBERS_RAW=$(curl -s -H "Authorization: token $TOKEN" "https://api.github.com/orgs/$ORG/members?per_page=100")
else
  ORG_MEMBERS_RAW=$(curl -s "https://api.github.com/orgs/$ORG/members?per_page=100")
fi

ORG_MEMBERS=$(echo "$ORG_MEMBERS_RAW" | jq 'if type=="array" then . else [] end')
ALL_USERS=$(echo "$ORG_MEMBERS" | jq 'unique_by(.login)')
PRIORITY_LOGINS=("RishiByte" "Pranav00076" "SharanyoBanerjee" "Yuvraj-Sarathe")
MEMBERS_DATA="[]"
# Add priority members first
for LOGIN in "${PRIORITY_LOGINS[@]}"; do
  MATCH=$(echo "$ALL_USERS" | jq -c ".[] | select(.login == \"$LOGIN\")")
  if [[ -n "$MATCH" ]]; then
    # Ensure MATCH is an array before adding
    MATCH_ARRAY=$(echo "$MATCH" | jq -c '[.]')
    MEMBERS_DATA=$(printf '%s\n%s' "$MEMBERS_DATA" "$MATCH_ARRAY" | jq -s 'add')
  fi
done
# Add remaining members
REMAINING=$(echo "$ALL_USERS" | jq -c --argjson p "$(printf '%s\n' "${PRIORITY_LOGINS[@]}" | jq -R . | jq -s .)" '[.[] | select(.login as $l | $p | index($l) | not)]')
MEMBERS_DATA=$(printf '%s\n%s' "$MEMBERS_DATA" "$REMAINING" | jq -s 'add')

CONTRIBUTOR_COUNT=$(echo "$MEMBERS_DATA" | jq length)

# ------------------------------------------------------------
# Output summary JSON
JSON_CONTENT=$(cat <<EOF
{
  "project_count": $PROJECT_COUNT,
  "total_stars": $TOTAL_STARS,
  "contributor_count": $CONTRIBUTOR_COUNT,
  "repos": $REPOS_DATA,
  "members": $MEMBERS_DATA
}
EOF
)

mkdir -p "$(dirname "$0")/public"
echo "$JSON_CONTENT" > "$(dirname "$0")/public/github_summary.json"
echo "$JSON_CONTENT" > "$(dirname "$0")/github_summary.json"

echo "GitHub summary written to github_summary.json and public/github_summary.json"
