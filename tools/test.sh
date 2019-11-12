#! /bin/sh

echo "On -1"
curl -X PUT http://127.0.01:51826/characteristics --header "Content-Type:Application/json" --header "authorization: 031-45-154" --data "{ \"characteristics\": [{ \"aid\": 2, \"iid\": 10, \"value\": 1}] }"
sleep 1
echo "Off"
curl -X PUT http://127.0.01:51826/characteristics --header "Content-Type:Application/json" --header "authorization: 031-45-154" --data "{ \"characteristics\": [{ \"aid\": 2, \"iid\": 10, \"value\": 0}] }"
sleep 1
#echo "On -2 "
#curl -X PUT http://127.0.01:51826/characteristics --header "Content-Type:Application/json" --header "authorization: 031-45-154" --data "{ \"characteristics\": [{ \"aid\": 3, \"iid\": 14, \"value\": 50}] }"
#sleep 1
#echo "Off"
#curl -X PUT http://127.0.01:51826/characteristics --header "Content-Type:Application/json" --header "authorization: 031-45-154" --data "{ \"characteristics\": [{ \"aid\": 3, \"iid\": 14, \"value\": 0}] }"
#[{"aid":2,"iid":14,"value":0}]
