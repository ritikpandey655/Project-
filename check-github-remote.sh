#!/bin/bash
# PYQverse - GitHub Remote Reconnect Script

echo "======================================"
echo "   GitHub Remote Reconnect"
echo "======================================"
echo ""

cd /app

# Check current remote
echo "📡 Current Git Remote Status:"
REMOTE=$(git remote -v)
if [ -z "$REMOTE" ]; then
    echo "❌ No remote repository configured"
    echo ""
    echo "⚠️  You need to add your GitHub repository:"
    echo ""
    echo "Run this command with YOUR repository URL:"
    echo "git remote add origin https://github.com/YOUR_USERNAME/pyqverse.git"
    echo ""
    echo "या Emergent के 'Save to GitHub' feature का उपयोग करें"
    echo ""
    exit 1
else
    echo "✅ Remote configured:"
    echo "$REMOTE"
    echo ""
fi

# Check branch
echo "🌿 Current Branch:"
git branch -a
echo ""

# Check status
echo "📊 Git Status:"
git status -s | head -10
echo ""

# Check last commits
echo "📝 Last 3 Commits:"
git log --oneline -3
echo ""

echo "======================================"
echo "   Next Steps"
echo "======================================"
echo ""
echo "1. अगर remote नहीं है तो add करें:"
echo "   git remote add origin YOUR_GITHUB_URL"
echo ""
echo "2. Latest changes push करें:"
echo "   git add ."
echo "   git commit -m 'Deploy to Vercel'"
echo "   git push origin main"
echo ""
echo "3. Vercel Dashboard check करें:"
echo "   https://vercel.com/dashboard"
echo ""
echo "4. Test auto-deployment:"
echo "   - कोई file में छोटा change करें"
echo "   - Commit और push करें"
echo "   - Vercel में deployment दिखना चाहिए"
echo ""
echo "======================================"
echo ""
