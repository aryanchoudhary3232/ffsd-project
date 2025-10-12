#!/bin/bash

# Array of GitHub usernames
usernames=("Anchal-T" "aryanchoudhary3232" "Shreyaan16" "Battleconxxx" "arungujjar123")

# Folder to save logs
mkdir -p git-logs-per-member

# Loop through each username
for user in "${usernames[@]}"
do
    git log --author="$user" --pretty=fuller --stat > "git-logs-per-member/$user.txt"
done

echo "Full commit logs generated per user in git-logs-per-member/"
