#!/bin/zsh
export JWT_SECRET=${JWT_SECRET:-test-secret}
echo "Starting dev server with JWT_SECRET=$JWT_SECRET"
npm start
