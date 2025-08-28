
# === Auto-push loop ===
while true; do
  git add .
  git diff --cached --quiet && sleep 2 && continue
  git commit -m "auto: $(date)"
  git push origin $BRANCH_NAME
  sleep 2
done
