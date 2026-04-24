#!/bin/bash
# Delete all forecaster runs from the API

BASE_URL="http://localhost:8000/api/v1/forecaster/runs"
IDS=(53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34 33 32 31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 9 8 7 6 5 4 3 2 1)

for id in "${IDS[@]}"; do
  echo -n "Deleting run $id... "
  status=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "${BASE_URL}/${id}")
  echo "HTTP $status"
done

echo "Done."
