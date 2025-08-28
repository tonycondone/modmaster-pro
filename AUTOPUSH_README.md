# Auto-Push Script Documentation

## Overview

The `autopush.sh` script is an intelligent Git automation tool that continuously monitors your repository for changes and automatically commits and pushes them to the remote repository. It includes robust conflict resolution and error handling to ensure smooth operation.

## Features

### 🔄 **Automatic Conflict Resolution**
- Detects when local branch is behind remote
- Attempts rebase first, falls back to merge if needed
- Handles push conflicts gracefully

### 🔁 **Retry Logic**
- Configurable retry attempts (default: 3)
- Automatic sync with remote before retry
- Safe force push for feature branches only

### 🎨 **Enhanced User Experience**
- Colored output for better visibility
- Timestamped commit messages
- Real-time status updates

### ⚙️ **Configurable Settings**
- Adjustable sleep interval via environment variable
- Configurable retry attempts
- Safe defaults for production use

## Usage

### Basic Usage
```bash
./autopush.sh
```
Runs with default 5-second interval between checks.

### Custom Interval
```bash
# 10-second interval
AUTOPUSH_SLEEP=10 ./autopush.sh

# 1-second interval (for rapid development)
AUTOPUSH_SLEEP=1 ./autopush.sh

# 30-second interval (for less frequent updates)
AUTOPUSH_SLEEP=30 ./autopush.sh
```

### Testing
```bash
./test_autopush.sh
```
Runs diagnostic tests to verify your setup before using autopush.

## Configuration

### Environment Variables
- `AUTOPUSH_SLEEP`: Sleep interval in seconds (default: 5)
- `MAX_RETRIES`: Number of retry attempts (hardcoded: 3)

### Git Configuration
- Requires a git repository
- Requires remote 'origin' to be configured
- Works with any branch (main, feature branches, etc.)

## Safety Features

### 🔒 **Protected Branches**
- Force push is disabled for `main` and `master` branches
- Only feature branches can use force push as last resort
- Uses `--force-with-lease` for safer force pushing

### 🛡️ **Error Handling**
- Graceful interruption with Ctrl+C
- Comprehensive error messages
- Automatic rollback on failed operations

### 📊 **Status Monitoring**
- Real-time commit and push status
- Detailed error reporting
- Branch synchronization status

## Workflow

1. **Initialization**
   - Validates git repository
   - Checks remote configuration
   - Performs initial sync with remote

2. **Main Loop**
   - Monitors for file changes
   - Commits changes with timestamp
   - Pushes to remote repository
   - Handles conflicts automatically

3. **Conflict Resolution**
   - Fetches latest changes
   - Attempts rebase first
   - Falls back to merge if needed
   - Retries push after sync

## Troubleshooting

### Common Issues

**Push Rejected**
```
! [rejected] main -> main (non-fast-forward)
```
- The script will automatically handle this by syncing with remote

**Branch Behind Remote**
```
hint: Updates were rejected because the tip of your current branch is behind
```
- Script detects this and pulls latest changes before retrying

**Manual Intervention Required**
- If automatic resolution fails, the script will exit gracefully
- Check git status and resolve conflicts manually
- Restart the script when ready

### Best Practices

1. **Use Feature Branches**
   - Create feature branches for development
   - Main branch is protected from force push
   - Easier conflict resolution

2. **Monitor Output**
   - Watch for warning messages
   - Check commit history regularly
   - Verify pushes in remote repository

3. **Set Appropriate Intervals**
   - Use longer intervals for production
   - Shorter intervals for active development
   - Balance between responsiveness and performance

## Examples

### Development Workflow
```bash
# Start autopush in background
AUTOPUSH_SLEEP=2 ./autopush.sh &

# Make changes to files
# Script automatically commits and pushes

# Stop autopush
kill %1
```

### Production Deployment
```bash
# Use longer interval for production
AUTOPUSH_SLEEP=30 ./autopush.sh
```

### Feature Branch Development
```bash
# Create and switch to feature branch
git checkout -b feature/new-feature

# Start autopush (safe force push enabled)
AUTOPUSH_SLEEP=5 ./autopush.sh
```

## Integration

The script can be integrated into:
- CI/CD pipelines
- Development workflows
- Automated deployment systems
- Code review processes

## Security Considerations

- Script only modifies tracked files
- No automatic deletion of files
- Safe force push only on feature branches
- Comprehensive logging for audit trails

## Support

For issues or questions:
1. Run `./test_autopush.sh` for diagnostics
2. Check git status and remote configuration
3. Review error messages in script output
4. Verify repository permissions and access