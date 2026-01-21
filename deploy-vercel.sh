#!/bin/bash
# PYQverse - Quick Vercel Deployment Script

echo "======================================"
echo "   PYQverse Vercel Deployment"
echo "======================================"
echo ""

# Step 1: Build Test
echo "📦 Step 1: Testing build..."
cd /app
yarn build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed! Fix errors before deploying."
    exit 1
fi

echo ""
echo "======================================"
echo "   Pre-Deployment Checklist"
echo "======================================"
echo ""
echo "✅ Build: Successful"
echo ""
echo "⚠️  Before deploying, ensure:"
echo "   1. Firebase authorized domains में www.pyqverse.in added है"
echo "   2. Vercel में environment variables set हैं"
echo "   3. Code Git repository में push किया है"
echo ""
echo "======================================"
echo "   Deployment Options"
echo "======================================"
echo ""
echo "Option 1: Vercel Dashboard"
echo "  → https://vercel.com/dashboard"
echo "  → Import Git repository"
echo "  → Deploy button click करें"
echo ""
echo "Option 2: Vercel CLI"
echo "  → vercel login"
echo "  → vercel --prod"
echo ""
echo "======================================"
echo "   Deployment URLs"
echo "======================================"
echo ""
echo "Production: https://www.pyqverse.in"
echo "Preview:    https://pyqverse.vercel.app"
echo ""
echo "======================================"

# Step 2: Git Status
echo ""
echo "📝 Git Status:"
cd /app
if [ -d .git ]; then
    git status -s | head -10
    echo ""
    echo "💡 Tip: git add . && git commit -m 'Deploy' && git push"
else
    echo "⚠️  Git not initialized. Run: git init"
fi

echo ""
echo "🚀 Ready to deploy!"
echo ""
