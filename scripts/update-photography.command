#!/bin/zsh
cd "$(dirname "$0")/.." || exit 1
python3 scripts/build_photography.py
result=$?
if [ "$result" -eq 0 ]; then
  echo 'Photography updated. Reload your local preview to see the changes.'
else
  echo 'Update failed. Please check the error above.'
fi
read -r '?Press Enter to close.'
exit "$result"
