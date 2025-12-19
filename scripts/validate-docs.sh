#!/bin/zsh

# Validation script for osint-dashboard docs
# Run with: zsh validate-docs.sh

echo "=== 1. Run full test suite ==="
npm test

echo "\n=== 2. Run coverage report ==="
npm test -- --coverage

echo "\n=== 3. Set JWT_SECRET and issue tokens via /login ==="
export JWT_SECRET="test-secret"

ADMIN_TOKEN=$(curl -s -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}' | jq -r '.token')

USER_TOKEN=$(curl -s -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"secret"}' | jq -r '.token')

echo "Admin token: $ADMIN_TOKEN"
echo "User token: $USER_TOKEN"

echo "\n=== 4. Protected routes checks ==="

echo "\n-- GET /results --"
curl -i http://localhost:4000/results -H "Authorization: Bearer $ADMIN_TOKEN"
curl -i http://localhost:4000/results -H "Authorization: Bearer $USER_TOKEN"
curl -i http://localhost:4000/results
curl -i http://localhost:4000/results -H "Authorization: Bearer invalidtoken"

echo "\n-- GET /results/export.csv --"
curl -i http://localhost:4000/results/export.csv -H "Authorization: Bearer $ADMIN_TOKEN"
curl -i http://localhost:4000/results/export.csv -H "Authorization: Bearer $USER_TOKEN"
curl -i http://localhost:4000/results
curl -i http://localhost:4000/results/export.csv -H "Authorization: Bearer invalidtoken"

echo "\n-- DELETE /results/:id --"
curl -i -X DELETE http://localhost:4000/results/42 -H "Authorization: Bearer $ADMIN_TOKEN"
curl -i -X DELETE http://localhost:4000/results/42 -H "Authorization: Bearer $USER_TOKEN"
curl -i -X DELETE http://localhost:4000/results/42
curl -i -X DELETE http://localhost:4000/results/42 -H "Authorization: Bearer invalidtoken"

echo "\n-- POST /scan --"
curl -i -X POST http://localhost:4000/scan \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com"}'

curl -i -X POST http://localhost:4000/scan \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com"}'

curl -i -X POST http://localhost:4000/scan \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com"}'

curl -i -X POST http://localhost:4000/scan \
  -H "Authorization: Bearer invalidtoken" \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com"}'

echo "\n=== Validation complete ==="
