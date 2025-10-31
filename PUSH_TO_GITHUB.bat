@echo off
echo ========================================
echo GreenScore - Push to GitHub
echo ========================================
echo.
echo This script will push your code to GitHub.
echo Make sure you have your Personal Access Token ready!
echo.
pause

git branch -M main
git push -u origin main

echo.
echo ========================================
echo Done! Check your GitHub repository:
echo https://github.com/ashargreenscore/GS
echo ========================================
pause

