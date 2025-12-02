#!/bin/bash

# Script to push plugin to GitHub
# Usage: ./push-to-github.sh

set -e

echo "🚀 Pushing strapi-plugin-filtered-relation to GitHub..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the plugin directory?"
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git remote add origin https://github.com/finnwasabi/strapi-plugin-filtered-relation.git
fi

# Add all files
echo "📝 Adding files..."
git add .

# Commit
echo "💾 Committing changes..."
git commit -m "Release v1.1.0 - Add status change dropdown feature

- Add status change dropdown at end of each item
- Dynamically fetch enum options from target model schema
- Move items between records using connect/disconnect API
- Dispatch custom events to refresh all fields without page reload
- Remove all console.log statements
- Update README with detailed options table and descriptions
- Update CHANGELOG with technical details
- Fully dynamic and reusable for any use case"

# Tag the release
echo "🏷️  Creating tag v1.1.0..."
git tag -a v1.1.0 -m "Version 1.1.0"

# Push to GitHub
echo "⬆️  Pushing to GitHub..."
git push origin main
git push origin v1.1.0

echo "✅ Successfully pushed to GitHub!"
echo "📦 Package: @tunghtml/strapi-plugin-filtered-relation@1.1.0"
echo "🔗 GitHub: https://github.com/finnwasabi/strapi-plugin-filtered-relation"
echo "🔗 NPM: https://www.npmjs.com/package/@tunghtml/strapi-plugin-filtered-relation"
