#! /bin/sh

echo "On -1"
curl -X PUT http://127.0.01:51179/characteristics --header "Content-Type:Application/json" --header "authorization: 031-45-154" --data "{ \"characteristics\": [{ \"aid\": 192, \"iid\": 14, \"value\": true}, { \"aid\": 193, \"iid\": 14, \"value\": true}] }"
sleep 2
echo "Off"
curl -X PUT http://127.0.01:51179/characteristics --header "Content-Type:Application/json" --header "authorization: 031-45-154" --data "{ \"characteristics\": [{ \"aid\": 192, \"iid\": 14, \"value\": false},{ \"aid\": 193, \"iid\": 14, \"value\": false}] }"
sleep 1
#[{"aid":2,"iid":14,"value":0}]
