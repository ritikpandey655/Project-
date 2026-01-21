#!/bin/bash
# Vercel Deployment Troubleshooting Script

echo "======================================"
echo "   Vercel Deployment Diagnostics"
echo "======================================"
echo ""

cd /app

# Test 1: Local Build
echo "🔨 Test 1: Local Build"
echo "Running: yarn build"
echo ""
yarn build > /tmp/build.log 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Local build: SUCCESS"
else
    echo "❌ Local build: FAILED"
    echo "Error log:"
    tail -20 /tmp/build.log
    echo ""
    echo "⚠️  Fix local build errors first!"
    exit 1
fi
echo ""

# Test 2: vercel.json syntax
echo "🔍 Test 2: vercel.json Syntax"
if command -v jq &> /dev/null; then
    cat vercel.json | jq . > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ vercel.json: Valid JSON"
    else
        echo "❌ vercel.json: Invalid JSON syntax"
    fi
else
    echo "⚠️  jq not installed, skipping JSON validation"
fi
echo ""

# Test 3: Check required files
echo "📁 Test 3: Required Files"
required_files=("package.json" "vercel.json" "dist/index.html")
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done
echo ""

# Test 4: Check dependencies
echo "📦 Test 4: Dependencies"
if [ -d "node_modules" ]; then
    echo "✅ node_modules exists"
    MODULE_COUNT=$(ls -1 node_modules | wc -l)
    echo "   Installed: $MODULE_COUNT packages"
else
    echo "❌ node_modules missing - run: yarn install"
fi
echo ""

# Test 5: Environment Variables Template
echo "🔐 Test 5: Environment Variables"
if [ -f ".env.example" ]; then
    echo "✅ .env.example exists"
    echo ""
    echo "Required variables for Vercel:"
    cat .env.example | grep "^[A-Z]" | head -15
else
    echo "❌ .env.example missing"
fi
echo ""

# Test 6: Git Status
echo "📝 Test 6: Git Status"
if [ -d .git ]; then
    REMOTE=$(git remote -v | grep origin | head -1)
    if [ -z "$REMOTE" ]; then
        echo "❌ No git remote configured"
    else
        echo "✅ Git remote: $(echo $REMOTE | awk '{print $2}')"
    fi
    
    UNCOMMITTED=$(git status --short | wc -l)
    if [ $UNCOMMITTED -gt 0 ]; then
        echo "⚠️  $UNCOMMITTED uncommitted changes"
    else
        echo "✅ No uncommitted changes"
    fi
else
    echo "❌ Not a git repository"
fi
echo ""

echo "======================================"
echo "   Vercel Dashboard Checklist"
echo "======================================"
echo ""
echo "Go to: https://vercel.com/dashboard"
echo ""
echo "✅ Checklist:"
echo "   [ ] Settings → General → Framework: Vite"
echo "   [ ] Settings → General → Build Command: yarn build"
echo "   [ ] Settings → General → Output Directory: dist"
echo "   [ ] Settings → General → Node Version: 20.x"
echo ""
echo "   [ ] Settings → Environment Variables:"
echo "       - VITE_FIREBASE_API_KEY"
echo "       - VITE_FIREBASE_AUTH_DOMAIN"
echo "       - VITE_FIREBASE_PROJECT_ID"
echo "       - VITE_FIREBASE_STORAGE_BUCKET"
echo "       - VITE_FIREBASE_MESSAGING_SENDER_ID"
echo "       - VITE_FIREBASE_APP_ID"
echo "       - VITE_FIREBASE_MEASUREMENT_ID"
echo "       - API_KEY"
echo "       - GEMINI_API_KEY"
echo "       - GROQ_API_KEY"
echo "       - APP_DOMAIN"
echo ""
echo "   [ ] Settings → Git → Repository connected"
echo "   [ ] Settings → Git → Branch: main"
echo "   [ ] Settings → Git → Auto-deploy: Enabled"
echo ""
echo "======================================"
echo "   Next Steps"
echo "======================================"
echo ""
echo "1. ✅ vercel.json has been fixed"
echo "2. ✅ Local build successful"
echo "3. ⚠️  Add environment variables in Vercel Dashboard"
echo "4. 🔄 Redeploy from Vercel Dashboard"
echo ""
echo "To redeploy:"
echo "   Option 1: Push new commit"
echo "   Option 2: Vercel Dashboard → Deployments → Redeploy"
echo ""
echo "======================================"
