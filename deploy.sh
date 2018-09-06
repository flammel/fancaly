#! /bin/bash

set -e

npm run prettier
npm run lintfix
npm run typecheck
rm -f dist/*
npm run build
ssh flammel@florianlammel.com "rm -f /home/flammel/www/florianlammel.com/public/fancaly/*"
scp dist/* flammel@florianlammel.com:/home/flammel/www/florianlammel.com/public/fancaly/
ssh flammel@florianlammel.com "cd /home/flammel/ && php fancaly-cron.php"