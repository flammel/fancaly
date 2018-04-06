#! /bin/bash

set -e

npm run build
scp dist/* florianlammel.com:/home/flammel/www/florianlammel.com/public/fancaly/