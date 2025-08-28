#!/bin/bash

# Test script for autopush.sh
# This script demonstrates the improved autopush functionality

echo "=== Testing Improved autopush.sh ==="
echo

# Test 1: Check if we're in a git repository
echo "Test 1: Git repository check"
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo "✓ In a git repository"
else
    echo "✗ Not in a git repository"
    exit 1
fi

# Test 2: Check current branch
echo "Test 2: Current branch"
BRANCH_NAME=$(git branch --show-current)
echo "✓ Current branch: $BRANCH_NAME"

# Test 3: Check remote configuration
echo "Test 3: Remote configuration"
if git remote get-url origin > /dev/null 2>&1; then
    echo "✓ Remote 'origin' configured"
    echo "  URL: $(git remote get-url origin)"
else
    echo "✗ Remote 'origin' not found"
fi

# Test 4: Check sync function (dry run)
echo "Test 4: Sync function test"
git fetch origin > /dev/null 2>&1
behind_count=$(git rev-list --count HEAD..origin/$BRANCH_NAME 2>/dev/null || echo "0")
ahead_count=$(git rev-list --count origin/$BRANCH_NAME..HEAD 2>/dev/null || echo "0")

echo "  Behind remote: $behind_count commits"
echo "  Ahead of remote: $ahead_count commits"

if [ "$behind_count" -eq 0 ] && [ "$ahead_count" -eq 0 ]; then
    echo "✓ Branch is up to date"
elif [ "$behind_count" -gt 0 ]; then
    echo "⚠ Branch is behind remote"
elif [ "$ahead_count" -gt 0 ]; then
    echo "⚠ Branch is ahead of remote"
fi

echo
echo "=== Ready to run autopush.sh ==="
echo "Usage:"
echo "  ./autopush.sh                    # Default 5-second interval"
echo "  AUTOPUSH_SLEEP=10 ./autopush.sh  # 10-second interval"
echo "  AUTOPUSH_SLEEP=1 ./autopush.sh   # 1-second interval"
echo
echo "Press Ctrl+C to stop the script when running"