xcopy "Animated Product Slider" "Solar panel\Animated Product Slider" /E /I /H /Y
git add "Solar panel\Animated Product Slider"
git rm -r --cached "Animated Product Slider"
git commit -m "Moved Animated Product Slider"
git push
