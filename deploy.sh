#! /bin/bash

set -e

npm run prettier
npm run lintfix
npm run typecheck
npm run build
scp dist/* florianlammel.com:/home/flammel/www/florianlammel.com/public/fancaly/