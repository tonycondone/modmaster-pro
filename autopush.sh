#!/bin/bash

# === Auto-push script with conflict resolution ===
# This script automatically commits and pushes changes while handling common git issues

# Configuration
BRANCH_NAME=$(git branch --show-current)
REMOTE_NAME="origin"
SLEEP_INTERVAL=2
MAX_RETRIES=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to sync with remote
sync_with_remote() {
    print_status "Syncing with remote..."
    
    # Fetch latest changes
    git fetch $REMOTE_NAME
    
    # Check if we're behind remote
    if git status --porcelain | grep -q "behind"; then
        print_warning "Local branch is behind remote. Attempting to pull..."
        
        # Try to pull with rebase first
        if git pull --rebase $REMOTE_NAME $BRANCH_NAME; then
            print_success "Successfully pulled and rebased"
        else
            print_warning "Rebase failed, trying merge..."
            git reset --hard HEAD
            if git pull $REMOTE_NAME $BRANCH_NAME; then
                print_success "Successfully pulled with merge"
            else
                print_error "Failed to sync with remote. Manual intervention required."
                return 1
            fi
        fi
    fi
}

# Function to commit and push changes
commit_and_push() {
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        # Check if there are changes to commit
        if git diff --cached --quiet && git diff --quiet; then
            print_status "No changes to commit"
            return 0
        fi
        
        # Add all changes
        git add .
        
        # Commit with timestamp
        local commit_msg="auto: $(date '+%a, %b %d, %Y %I:%M:%S %p')"
        if git commit -m "$commit_msg"; then
            print_success "Committed changes: $commit_msg"
        else
            print_warning "No changes to commit"
            return 0
        fi
        
        # Try to push
        if git push $REMOTE_NAME $BRANCH_NAME; then
            print_success "Successfully pushed to $REMOTE_NAME/$BRANCH_NAME"
            return 0
        else
            retry_count=$((retry_count + 1))
            print_warning "Push failed (attempt $retry_count/$MAX_RETRIES)"
            
            if [ $retry_count -lt $MAX_RETRIES ]; then
                print_status "Attempting to sync with remote and retry..."
                if sync_with_remote; then
                    print_status "Retrying push..."
                    continue
                else
                    print_error "Failed to sync with remote"
                    return 1
                fi
            else
                print_error "Max retries reached. Manual intervention required."
                return 1
            fi
        fi
    done
}

# Main execution
main() {
    print_status "Starting auto-push loop for branch: $BRANCH_NAME"
    print_status "Remote: $REMOTE_NAME"
    print_status "Sleep interval: ${SLEEP_INTERVAL}s"
    
    # Initial sync
    if ! sync_with_remote; then
        print_error "Initial sync failed. Exiting."
        exit 1
    fi
    
    # Main loop
    while true; do
        print_status "Checking for changes..."
        
        if commit_and_push; then
            print_success "Cycle completed successfully"
        else
            print_error "Cycle failed. Waiting before retry..."
        fi
        
        print_status "Sleeping for ${SLEEP_INTERVAL} seconds..."
        sleep $SLEEP_INTERVAL
    done
}

# Handle script interruption
trap 'print_status "Auto-push script interrupted. Exiting..."; exit 0' INT TERM

# Run main function
main