#! /bin/bash

set -e

npm run prettier
npm run lintfix
npm run typecheck
rm dist/*
npm run build
cp cron.php dist/
ssh florianlammel.com "rm /home/flammel/www/florianlammel.com/public/fancaly/*"
scp dist/* florianlammel.com:/home/flammel/www/florianlammel.com/public/fancaly/
ssh florianlammel.com "cd /home/flammel/www/florianlammel.com/public/fancaly/ && php cron.php"